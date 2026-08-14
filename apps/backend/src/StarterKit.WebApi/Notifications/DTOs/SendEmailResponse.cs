namespace StarterKit.WebApi.Notifications.DTOs;

/// <summary>Delivery summary returned after a bulk email send.</summary>
public sealed record SendEmailResponse(int TotalRecipients, int Delivered, int Failed);
