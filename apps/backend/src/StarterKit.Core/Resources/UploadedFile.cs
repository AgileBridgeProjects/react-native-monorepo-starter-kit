namespace StarterKit.Core.Resources;

/// <summary>
/// Wraps an uploaded file so that services can infer the file name and content type
/// from the upload rather than receiving them as discrete parameters.
/// </summary>
public sealed record UploadedFile(
    string FileName,
    string ContentType,
    long ContentLength,
    Stream Content
);
