using Azure.Identity;
using Azure.Storage.Blobs;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using StarterKit.Core.Storage.Interfaces;

namespace StarterKit.Core.Storage;

/// <summary>
/// Extension methods for registering Azure Blob Storage services.
/// </summary>
public static class BlobStorageExtensions
{
    /// <summary>
    /// Registers <see cref="AzureStorageOptions"/> (with validation) and a
    /// <see cref="BlobServiceClient"/> singleton into the DI container.
    ///
    /// Mode is selected at startup:
    /// <list type="bullet">
    ///   <item><description>
    ///     <b>Azurite / docker-compose</b> — <see cref="AzureStorageOptions.UseConnectionString"/>
    ///     is <see langword="true"/>; a connection-string–based client is returned.
    ///   </description></item>
    ///   <item><description>
    ///     <b>Managed Identity (deployed)</b> — <see cref="AzureStorageOptions.AccountName"/> is
    ///     used to build the service URI; <see cref="DefaultAzureCredential"/> handles auth.
    ///   </description></item>
    /// </list>
    /// </summary>
    public static IServiceCollection AddAzureBlobStorage(this IServiceCollection services)
    {
        services
            .AddOptions<AzureStorageOptions>()
            .BindConfiguration(AzureStorageOptions.SectionName)
            .Validate(
                opts =>
                    opts.UseConnectionString
                        ? true
                        : !string.IsNullOrWhiteSpace(opts.AccountName) && opts.AccountName != "#",
                "AzureStorage:AccountName must be set when AzureStorage:ConnectionString is not provided. "
                    + "In deployed environments this is injected by Key Vault. "
                    + "In docker-compose, set AzureStorage__ConnectionString to the Azurite connection string."
            )
            .ValidateOnStart();

        services.AddSingleton(sp =>
        {
            var opts = sp.GetRequiredService<IOptions<AzureStorageOptions>>().Value;

            if (opts.UseConnectionString)
            {
                var connectionString = opts.ConnectionString!;
                // Pin to an API version supported by the local Azurite emulator.
                // The default SDK version (2026-02-06) is newer than Azurite 3.35.0.
                var devOptions = new BlobClientOptions(
                    BlobClientOptions.ServiceVersion.V2024_11_04
                );
                return new BlobServiceClient(connectionString, devOptions);
            }

            var uri = new Uri($"https://{opts.AccountName}.blob.core.windows.net");
            return new BlobServiceClient(uri, new DefaultAzureCredential());
        });

        // TimeProvider is registered by the composition root (Program.cs), not here — see
        // DevClockGate for why this must be a single registration per host.
        services.AddSingleton<IBlobStorageService, BlobStorageService>();

        return services;
    }
}
