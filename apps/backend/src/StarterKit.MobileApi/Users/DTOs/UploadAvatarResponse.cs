namespace StarterKit.MobileApi.Users.DTOs;

/// <summary>Result returned after uploading a new avatar image.</summary>
public sealed record UploadAvatarResponse(string AvatarBlobPath, string AvatarUrl);
