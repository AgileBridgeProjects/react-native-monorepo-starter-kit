using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;
using Microsoft.Extensions.Configuration;
using StarterKit.Data.Persistence;

namespace StarterKit.Data;

public class AppDbContextFactory : IDesignTimeDbContextFactory<AppDbContext>
{
    public AppDbContext CreateDbContext(string[] args)
    {
        var optionsBuilder = new DbContextOptionsBuilder<AppDbContext>();

        // 1. Try environment variable (Docker, CI)
        var connectionString =
            Environment.GetEnvironmentVariable("ConnectionStrings__DefaultConnection")
            ?? Environment.GetEnvironmentVariable("CONNECTIONSTRINGS__DEFAULTCONNECTION");

        // 2. Fall back to user-secrets / appsettings via IConfiguration
        if (string.IsNullOrWhiteSpace(connectionString))
        {
            var configuration = new ConfigurationBuilder()
                .SetBasePath(Directory.GetCurrentDirectory())
                .AddJsonFile("appsettings.json", optional: true)
                .AddUserSecrets<AppDbContextFactory>(optional: true)
                .AddEnvironmentVariables()
                .Build();

            connectionString = configuration.GetConnectionString("DefaultConnection");
        }

        // Fall back to a placeholder so EF design-time tools (migrations add, migrations list)
        // can instantiate the context without a real database. EF only needs to build the model
        // for these operations — no actual connection is made.
        //
        // NOTE: if this placeholder is active you are missing a real connection string.
        // 'dotnet ef migrations add' will succeed, but 'dotnet ef database update' will fail
        // with a SQL connection error. Set ConnectionStrings:DefaultConnection via user-secrets
        // or the ConnectionStrings__DefaultConnection environment variable before running
        // any command that needs to connect to a live database.
        if (string.IsNullOrWhiteSpace(connectionString))
        {
            Console.Error.WriteLine(
                "[AppDbContextFactory] WARNING: No connection string found — using design-time "
                    + "placeholder. This is only valid for 'migrations add/list'. "
                    + "Set ConnectionStrings:DefaultConnection via user-secrets or env var "
                    + "before running 'dotnet ef database update'."
            );
            connectionString =
                "Host=localhost;Port=5432;Database=starterkit_design;Username=postgres;Password=postgres";
        }

        optionsBuilder.UseNpgsql(connectionString);

        return new AppDbContext(optionsBuilder.Options);
    }
}
