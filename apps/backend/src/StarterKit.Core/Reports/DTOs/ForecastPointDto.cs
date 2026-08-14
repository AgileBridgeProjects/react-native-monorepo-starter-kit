namespace StarterKit.Core.Reports.DTOs;

public sealed record ForecastPointDto(
    DateOnly Date,
    decimal Value,
    decimal Lower,
    decimal Upper,
    bool IsLowConfidence
);
