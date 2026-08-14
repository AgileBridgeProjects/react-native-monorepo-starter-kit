using System.Net.Mime;
using FluentAssertions;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.Formats;
using SixLabors.ImageSharp.Formats.Gif;
using SixLabors.ImageSharp.Formats.Jpeg;
using SixLabors.ImageSharp.Formats.Png;
using SixLabors.ImageSharp.Formats.Webp;
using SixLabors.ImageSharp.PixelFormats;
using StarterKit.Core.Storage;

namespace StarterKit.Core.Tests.Storage;

public class ImageSignatureValidatorTests
{
    private static async Task<byte[]> EncodeAsync(IImageEncoder encoder)
    {
        using var image = new Image<Rgba32>(2, 2);
        using var stream = new MemoryStream();
        await image.SaveAsync(stream, encoder);
        return stream.ToArray();
    }

    [Theory]
    [MemberData(nameof(ValidEncoderCases))]
    public async Task HasValidSignatureAsync_WhenBytesMatchDeclaredType_ReturnsTrue(
        string contentType,
        IImageEncoder encoder
    )
    {
        var bytes = await EncodeAsync(encoder);
        using var stream = new MemoryStream(bytes);

        var result = await ImageSignatureValidator.HasValidSignatureAsync(
            stream,
            contentType,
            CancellationToken.None
        );

        result.Should().BeTrue();
    }

    public static IEnumerable<object[]> ValidEncoderCases()
    {
        yield return [MediaTypeNames.Image.Jpeg, new JpegEncoder()];
        yield return [MediaTypeNames.Image.Png, new PngEncoder()];
        yield return [MediaTypeNames.Image.Gif, new GifEncoder()];
        yield return [MediaTypeNames.Image.Webp, new WebpEncoder()];
    }

    [Fact]
    public async Task HasValidSignatureAsync_WhenBytesDoNotMatchDeclaredType_ReturnsFalse()
    {
        // Declares JPEG but the bytes are actually a real, valid PNG.
        var bytes = await EncodeAsync(new PngEncoder());
        using var stream = new MemoryStream(bytes);

        var result = await ImageSignatureValidator.HasValidSignatureAsync(
            stream,
            MediaTypeNames.Image.Jpeg,
            CancellationToken.None
        );

        result.Should().BeFalse();
    }

    [Fact]
    public async Task HasValidSignatureAsync_WhenBytesAreNotAnImageAtAll_ReturnsFalse()
    {
        using var stream = new MemoryStream("not an image"u8.ToArray());

        var result = await ImageSignatureValidator.HasValidSignatureAsync(
            stream,
            MediaTypeNames.Image.Jpeg,
            CancellationToken.None
        );

        result.Should().BeFalse();
    }

    [Fact]
    public async Task HasValidSignatureAsync_WhenStreamIsEmpty_ReturnsFalse()
    {
        using var stream = new MemoryStream([]);

        var result = await ImageSignatureValidator.HasValidSignatureAsync(
            stream,
            MediaTypeNames.Image.Jpeg,
            CancellationToken.None
        );

        result.Should().BeFalse();
    }

    [Fact]
    public async Task HasValidSignatureAsync_LeavesStreamPositionedAtZero()
    {
        var bytes = await EncodeAsync(new JpegEncoder());
        using var stream = new MemoryStream(bytes);

        await ImageSignatureValidator.HasValidSignatureAsync(
            stream,
            MediaTypeNames.Image.Jpeg,
            CancellationToken.None
        );

        stream.Position.Should().Be(0);
    }

    [Fact]
    public async Task HasValidSignatureAsync_OnUnrecognisedBytes_LeavesStreamPositionedAtZero()
    {
        using var stream = new MemoryStream("not an image"u8.ToArray());

        await ImageSignatureValidator.HasValidSignatureAsync(
            stream,
            MediaTypeNames.Image.Jpeg,
            CancellationToken.None
        );

        stream.Position.Should().Be(0);
    }
}
