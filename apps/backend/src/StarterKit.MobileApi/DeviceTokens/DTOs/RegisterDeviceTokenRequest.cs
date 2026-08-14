namespace StarterKit.MobileApi.DeviceTokens.DTOs;

public sealed class RegisterDeviceTokenRequest
{
    public required string Platform { get; set; }
    public required string Token { get; set; }
}
