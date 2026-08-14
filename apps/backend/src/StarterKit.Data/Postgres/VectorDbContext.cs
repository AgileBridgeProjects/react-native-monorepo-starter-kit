using Microsoft.EntityFrameworkCore;

namespace StarterKit.Data.Postgres;

public class VectorDbContext : DbContext
{
    public VectorDbContext(DbContextOptions<VectorDbContext> options)
        : base(options) { }

    // Vector DbSets will be added here as AI entities are defined
    // e.g. public DbSet<GameEmbedding> GameEmbeddings => Set<GameEmbedding>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Enable pgvector extension
        modelBuilder.HasPostgresExtension("vector");

        // Entity configurations will be applied here
        // e.g. modelBuilder.ApplyConfigurationsFromAssembly(typeof(VectorDbContext).Assembly);
    }
}
