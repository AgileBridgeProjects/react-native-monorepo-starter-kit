using FluentAssertions;
using StarterKit.Core.Notifications.Helpers;

namespace StarterKit.Core.Tests.Notifications.Helpers;

public abstract class PiiMaskerTests
{
    public sealed class MaskEmail : PiiMaskerTests
    {
        [Theory]
        [InlineData("alice@example.com", "al***@example.com")]
        [InlineData("dev@example.com", "de***@example.com")]
        public void MaskEmail_LongLocalPart_KeepsFirstTwoAndDomain(string input, string expected)
        {
            PiiMasker.MaskEmail(input).Should().Be(expected);
        }

        [Theory]
        [InlineData("a@x.io")]
        [InlineData("bo@x.io")]
        [InlineData("")]
        [InlineData("not-an-email")]
        public void MaskEmail_ShortOrInvalid_FullyRedacts(string input)
        {
            PiiMasker.MaskEmail(input).Should().Be("***@***");
        }
    }

    public sealed class MaskPhone : PiiMaskerTests
    {
        [Theory]
        [InlineData("+27821234567", "+27***4567")]
        [InlineData("0821234567", "082***4567")]
        public void MaskPhone_LongNumber_KeepsFirstThreeAndLastFour(string input, string expected)
        {
            PiiMasker.MaskPhone(input).Should().Be(expected);
        }

        [Theory]
        [InlineData("")]
        [InlineData("1234")]
        [InlineData("12")]
        public void MaskPhone_ShortOrEmpty_FullyRedacts(string input)
        {
            PiiMasker.MaskPhone(input).Should().Be("***");
        }
    }
}
