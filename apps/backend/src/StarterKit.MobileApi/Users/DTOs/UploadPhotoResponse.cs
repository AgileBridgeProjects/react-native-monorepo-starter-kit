namespace StarterKit.MobileApi.Users.DTOs;

/// <summary>Result returned after uploading a full-body or face onboarding photo.</summary>
public sealed record UploadPhotoResponse(string BlobPath, string Url);
