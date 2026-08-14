using FluentAssertions;
using Serilog.Core;
using Serilog.Events;
using StarterKit.Core.Observability.Redaction;

namespace StarterKit.Core.Tests.Observability;

public class PiiDestructuringPolicyTests
{
    // Minimal factory that wraps each non-sensitive value as a scalar, mirroring how Serilog
    // would represent it — enough to assert the policy's masking behaviour.
    private sealed class ScalarFactory : ILogEventPropertyValueFactory
    {
        public LogEventPropertyValue CreatePropertyValue(object? value, bool destructureObjects) =>
            new ScalarValue(value);
    }

    private readonly PiiDestructuringPolicy _sut = new();

    private static Dictionary<string, object?> ScalarProps(LogEventPropertyValue value)
    {
        var structure = value.Should().BeOfType<StructureValue>().Subject;
        return structure.Properties.ToDictionary(p => p.Name, p => (p.Value as ScalarValue)?.Value);
    }

    [Fact]
    public void Masks_sensitive_properties_and_preserves_the_rest()
    {
        var sample = new
        {
            Email = "jane@example.com",
            FirstName = "Jane",
            PhoneNumber = "+27123456789",
            IdNumber = "9001011234088",
            ClubName = "Acme",
            Score = 42,
        };

        var handled = _sut.TryDestructure(sample, new ScalarFactory(), out var result);

        handled.Should().BeTrue();
        var props = ScalarProps(result);
        props["Email"].Should().Be("[Redacted]");
        props["FirstName"].Should().Be("[Redacted]");
        props["PhoneNumber"].Should().Be("[Redacted]");
        props["IdNumber"].Should().Be("[Redacted]");
        // Non-PII fields are preserved verbatim.
        props["ClubName"].Should().Be("Acme");
        props["Score"].Should().Be(42);
    }

    [Fact]
    public void Defers_to_serilog_for_objects_without_pii()
    {
        var sample = new { ClubName = "Acme", Score = 1 };

        var handled = _sut.TryDestructure(sample, new ScalarFactory(), out _);

        // No sensitive properties → policy opts out so Serilog handles it normally.
        handled.Should().BeFalse();
    }

    [Theory]
    [InlineData("a string")]
    [InlineData(42)]
    public void Ignores_scalars_and_strings(object value)
    {
        _sut.TryDestructure(value, new ScalarFactory(), out _).Should().BeFalse();
    }
}
