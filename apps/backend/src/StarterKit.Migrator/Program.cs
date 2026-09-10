using Azure.Identity;
using Azure.Storage.Blobs;
using Azure.Storage.Blobs.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Options;
using Npgsql;
using StarterKit.Data.Persistence;
using StarterKit.Data.Postgres;
using StarterKit.Migrator.Options;
using StarterKit.Migrator.Seeders;

var builder = Host.CreateApplicationBuilder(args);

// Host.CreateApplicationBuilder registers appsettings.json relative to Directory.GetCurrentDirectory(),
// which resolves to the wrong path when the migrator is invoked from a parent directory via
// `dotnet run --project`. Rebuild config with the correct base path so user secrets still win.
builder.Configuration.Sources.Clear();
builder
    .Configuration.AddJsonFile(
        Path.Combine(AppContext.BaseDirectory, "appsettings.json"),
        optional: false,
        reloadOnChange: false
    )
    .AddUserSecrets<Program>(optional: true)
    .AddEnvironmentVariables()
    .AddCommandLine(args);

builder
    .Services.AddOptions<RetryOptions>()
    .BindConfiguration(RetryOptions.SectionName)
    .ValidateDataAnnotations()
    .ValidateOnStart();

builder
    .Services.AddOptions<BlobContainersOptions>()
    .BindConfiguration(BlobContainersOptions.SectionName);

var host = builder.Build();

var retryOptions = host.Services.GetRequiredService<IOptions<RetryOptions>>().Value;
var blobContainersOptions = host
    .Services.GetRequiredService<IOptions<BlobContainersOptions>>()
    .Value;

var sqlConnection =
    builder.Configuration.GetConnectionString("DefaultConnection")
    ?? throw new InvalidOperationException(
        "ConnectionStrings:DefaultConnection is not configured."
    );

var vectorConnection = builder.Configuration.GetConnectionString("VectorConnection");

// ── PostgreSQL migrations ────────────────────────────────────────────────────
Console.WriteLine("Applying PostgreSQL migrations...");

var sqlOptions = new DbContextOptionsBuilder<AppDbContext>().UseNpgsql(sqlConnection).Options;

for (var attempt = 1; attempt <= retryOptions.MaxRetries; attempt++)
{
    try
    {
        await using var db = new AppDbContext(sqlOptions);
        await db.Database.MigrateAsync();
        break;
    }
    catch (Exception ex) when (attempt < retryOptions.MaxRetries)
    {
        Console.WriteLine(
            $"PostgreSQL not ready (attempt {attempt}/{retryOptions.MaxRetries}): {ex.Message}. Retrying in {retryOptions.RetryDelayMilliseconds}ms..."
        );
        await Task.Delay(retryOptions.RetryDelayMilliseconds);
    }
}

Console.WriteLine("PostgreSQL migrations applied.");

// ── Row Level Security (defense in depth) ────────────────────────────────────
// Enable RLS deny-by-default on every public table so the Supabase Data API
// (PostgREST's anon/authenticated roles) can never read business data — even if
// the `public` schema is accidentally left exposed in the dashboard. No FORCE and
// no policies: the table owner (the role EF Core connects as) still bypasses RLS,
// so the .NET data layer is unaffected. Idempotent; covers any newly added tables.
// See docs/standards/supabase.md § RLS.
Console.WriteLine("Enabling Row Level Security on public tables...");
await using (var connection = new NpgsqlConnection(sqlConnection))
{
    await connection.OpenAsync();
    await using var cmd = new NpgsqlCommand(
        """
        DO $$
        DECLARE r record;
        BEGIN
          FOR r IN SELECT tablename FROM pg_tables WHERE schemaname = 'public'
          LOOP
            EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', r.tablename);
          END LOOP;
        END $$;
        """,
        connection
    );
    await cmd.ExecuteNonQueryAsync();
}
Console.WriteLine("Row Level Security enabled.");

// ── PostgreSQL seed data ─────────────────────────────────────────────────────
Console.WriteLine("Checking PostgreSQL seed data...");

await using (var connection = new NpgsqlConnection(sqlConnection))
{
    await connection.OpenAsync();

    if (await RolesSeeder.HasBeenSeededAsync(connection))
    {
        Console.WriteLine("Roles seed data already present — skipping.");
    }
    else
    {
        Console.WriteLine("Seeding Roles data...");
        await RolesSeeder.SeedAsync(connection);
        Console.WriteLine("Roles seed data applied.");
    }

    await RolesSeeder.ApplyDescriptionsAsync(connection);
    Console.WriteLine("Role descriptions applied.");

    await RolesSeeder.ApplyRoleFlagsAsync(connection);
    Console.WriteLine("Role flags applied.");

    await RolesSeeder.SyncRolePermissionsAsync(connection);
    Console.WriteLine("Role permissions synced.");

    if (await DevAdminSeeder.HasBeenSeededAsync(connection))
    {
        Console.WriteLine("Dev admin club already present — skipping.");
    }
    else
    {
        Console.WriteLine("Seeding dev admin club...");
        await DevAdminSeeder.SeedAsync(connection);
        Console.WriteLine("Dev admin club seeded.");
    }
}

// ── Dev survey assignments ─────────────────────────────────────────
// ── Dev admin Supabase (GoTrue) auth user ────────────────────────────────────
// DEVELOPMENT ONLY: ensure admin@starterkit.local exists in GoTrue with the known dev password
// so it can sign in immediately. Never seed a known password outside Development.
if (builder.Environment.IsDevelopment())
{
    var supabaseEnabled = builder.Configuration.GetValue<bool>("Supabase:Enabled");
    var supabaseUrl =
        builder.Configuration["Supabase:InternalUrl"]
        ?? builder.Configuration["Supabase:ApiExternalUrl"];
    var serviceRoleKey = builder.Configuration["Supabase:ServiceRoleKey"];
    var anonKey = builder.Configuration["Supabase:AnonKey"];

    if (
        supabaseEnabled
        && !string.IsNullOrWhiteSpace(supabaseUrl)
        && !string.IsNullOrWhiteSpace(serviceRoleKey)
    )
    {
        try
        {
            Console.WriteLine("Ensuring dev admin Supabase auth user...");
            await SupabaseAuthSeeder.SeedDevAdminAsync(
                supabaseUrl,
                serviceRoleKey,
                anonKey,
                DevAdminSeeder.StarterKitClubId
            );
            Console.WriteLine("Dev admin Supabase auth user ready.");
        }
        catch (Exception ex)
        {
            // Best-effort: the DB user is already seeded. If GoTrue is unreachable the admin
            // simply can't sign in until this runs successfully — surface it, don't abort.
            Console.WriteLine(
                $"WARNING: failed to seed dev admin Supabase auth user ({ex.Message}). "
                    + "admin@starterkit.local will not be able to sign in until GoTrue is reachable and the migrator re-runs."
            );
        }
    }
    else
    {
        Console.WriteLine(
            "Supabase not configured for the migrator — skipping dev admin auth user seed."
        );
    }
}

// ── PostgreSQL vector-store migrations ───────────────────────────────────────
if (!string.IsNullOrWhiteSpace(vectorConnection))
{
    try
    {
        Console.WriteLine("Applying PostgreSQL vector-store migrations...");

        var pgOptions = new DbContextOptionsBuilder<VectorDbContext>()
            .UseNpgsql(vectorConnection, npgsql => npgsql.UseVector())
            .Options;

        await using var db = new VectorDbContext(pgOptions);
        await db.Database.MigrateAsync();

        Console.WriteLine("PostgreSQL vector-store migrations applied.");
    }
    catch (Exception ex)
    {
        Console.WriteLine($"WARNING: PostgreSQL vector-store migrations failed — {ex.Message}");
        Console.WriteLine("Continuing with remaining setup tasks...");
    }
}
else
{
    Console.WriteLine(
        "VectorConnection not configured — skipping PostgreSQL vector-store migrations."
    );
}

Console.WriteLine("All done.");

// ── Azure Blob Storage containers ────────────────────────────────────────────
// Build a client in whichever mode is configured. Connection string = Azurite /
// docker-compose; account name = deployed environments using Managed Identity.
// Both paths must run the same container + CORS setup so deployed storage accounts
// (e.g. ststarterkitdev) get the cross-origin rule too — without it, the web apps'
// canvas-based colour extraction fails on remote images and falls back to default.
var storageConnectionString = builder.Configuration["AzureStorage:ConnectionString"];
var storageAccountName = builder.Configuration["AzureStorage:AccountName"];
var storageCorsAllowedOrigins = builder
    .Configuration.GetSection("AzureStorage:CorsAllowedOrigins")
    .Get<string[]>();

BlobServiceClient? blobServiceClient = null;
if (!string.IsNullOrWhiteSpace(storageConnectionString) && storageConnectionString != "#")
{
    // Pin to V2024_11_04 — the default SDK version (2026-02-06) is unsupported by Azurite 3.35.0.
    var blobOptions = new BlobClientOptions(BlobClientOptions.ServiceVersion.V2024_11_04);
    blobServiceClient = new BlobServiceClient(storageConnectionString, blobOptions);
}
else if (!string.IsNullOrWhiteSpace(storageAccountName) && storageAccountName != "#")
{
    var uri = new Uri($"https://{storageAccountName}.blob.core.windows.net");
    blobServiceClient = new BlobServiceClient(uri, new DefaultAzureCredential());
}

if (blobServiceClient is not null)
{
    Console.WriteLine("Ensuring Azure Blob Storage containers exist...");

    var containers = blobContainersOptions.Containers;

    foreach (var container in containers)
    {
        var containerClient = blobServiceClient.GetBlobContainerClient(container);
        await containerClient.CreateIfNotExistsAsync(PublicAccessType.None);
        Console.WriteLine($"  Container '{container}' ready.");
    }

    Console.WriteLine("Blob Storage containers ready.");

    // Allow browsers to read blob images cross-origin — required for the admin
    // portal AND the Expo web app's canvas-based colour extraction (card/game theming).
    // Wrapped so a missing data-plane permission on a Managed Identity surfaces as a
    // warning rather than aborting the whole migration run.
    try
    {
        var blobProperties = (await blobServiceClient.GetPropertiesAsync()).Value;
        var allowedOrigins = storageCorsAllowedOrigins is { Length: > 0 }
            ? string.Join(", ", storageCorsAllowedOrigins)
            : "http://localhost:8081, https://yourapp.example.com, https://yourapp.example.com, https://yourapp.example.com";
        blobProperties.Cors =
        [
            new BlobCorsRule
            {
                AllowedOrigins = allowedOrigins,
                AllowedMethods = "GET,HEAD,OPTIONS",
                AllowedHeaders = "*",
                ExposedHeaders = "*",
                MaxAgeInSeconds = 3600,
            },
        ];
        await blobServiceClient.SetPropertiesAsync(blobProperties);
        Console.WriteLine("Blob Storage CORS rules applied.");
    }
    catch (Exception ex)
    {
        Console.WriteLine(
            $"WARNING: failed to apply Blob Storage CORS rules ({ex.Message}). "
                + "Web colour extraction will fall back to defaults until CORS is configured."
        );
    }
}
else
{
    Console.WriteLine(
        "AzureStorage not configured (no ConnectionString or AccountName) — skipping blob setup."
    );
}
