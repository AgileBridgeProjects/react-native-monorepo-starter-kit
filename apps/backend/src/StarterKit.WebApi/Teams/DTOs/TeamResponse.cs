using StarterKit.Data.Teams.Enums;

namespace StarterKit.WebApi.Teams.DTOs;

public sealed record TeamResponse
{
    public Guid Id { get; init; }
    public Guid SeasonId { get; init; }
    public string Name { get; init; } = string.Empty;
    public string? Description { get; init; }
    public AgeGroup? AgeGroup { get; init; }
    public string? LogoUrl { get; init; }
    public int UserCount { get; init; }
    public DateTime CreatedAt { get; init; }
    public string? CreatedBy { get; init; }
    public DateTime? UpdatedAt { get; init; }
    public string? UpdatedBy { get; init; }
    public bool IsDeleted { get; init; }
    public DateTime? DeletedAt { get; init; }
}
