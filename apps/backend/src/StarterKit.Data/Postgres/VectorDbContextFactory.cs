using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace StarterKit.Data.Postgres;

public class VectorDbContextFactory : IDesignTimeDbContextFactory<VectorDbContext>
{
    public VectorDbContext CreateDbContext(string[] args)
    {
        // Fall back to a placeholder so EF design-time tools (migrations add, migrations list)
        // can instantiate the context without a real database. EF only needs to build the model
        // for these operations — no actual connection is made.
        //
        // NOTE: if this placeholder is active you are missing POSTGRES_PASSWORD.
        // 'dotnet ef migrations add' will succeed, but 'dotnet ef database update' will fail
        // with a Postgres connection error. Set the POSTGRES_PASSWORD environment variable
        // before running any command that needs to connect to a live database.
        var password = Environment.GetEnvironmentVariable("POSTGRES_PASSWORD");
        if (string.IsNullOrWhiteSpace(password))
        {
            Console.Error.WriteLine(
                "[VectorDbContextFactory] WARNING: POSTGRES_PASSWORD not set — using design-time "
                    + "placeholder. This is only valid for 'migrations add/list'. "
                    + "Set POSTGRES_PASSWORD before running 'dotnet ef database update'."
            );
            password = "design-time-placeholder";
        }

        var optionsBuilder = new DbContextOptionsBuilder<VectorDbContext>();
        optionsBuilder.UseNpgsql(
            $"Host=localhost;Port=5432;Database=starterkit_vector;Username=postgres;Password={password}",
            npgsql => npgsql.UseVector()
        );

        return new VectorDbContext(optionsBuilder.Options);
    }
}
