namespace StarterKit.Core.Notifications.DTOs;

/// <summary>
/// The outcome of a bulk communication dispatch (email or SMS).
/// </summary>
public sealed record DispatchResult(
    /// <summary>Total number of eligible recipients found.</summary>
    int TotalRecipients,
    /// <summary>Number of messages successfully dispatched.</summary>
    int Delivered,
    /// <summary>Number of messages that failed to dispatch.</summary>
    int Failed
);
