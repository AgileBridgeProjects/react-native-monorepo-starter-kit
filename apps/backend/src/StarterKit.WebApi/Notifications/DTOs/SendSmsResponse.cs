namespace StarterKit.WebApi.Notifications.DTOs;

/// <summary>Delivery summary returned after a bulk SMS send.</summary>
public sealed record SendSmsResponse(int TotalRecipients, int Delivered, int Failed);
