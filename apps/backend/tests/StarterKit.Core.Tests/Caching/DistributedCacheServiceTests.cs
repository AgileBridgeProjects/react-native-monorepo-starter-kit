using FluentAssertions;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using StarterKit.Core.Caching;

namespace StarterKit.Core.Tests.Caching;

public abstract class DistributedCacheServiceTests
{
    // Use the real in-memory distributed cache — identical backing store to production.
    private static IDistributedCache BuildCache()
    {
        var opts = Options.Create(new MemoryDistributedCacheOptions());
        return new MemoryDistributedCache(opts);
    }

    private static DistributedCacheService BuildSut(IDistributedCache? cache = null) =>
        new(cache ?? BuildCache(), NullLogger<DistributedCacheService>.Instance);

    public sealed class GetOrCreateAsync_Tests : DistributedCacheServiceTests
    {
        [Fact]
        public async Task GetOrCreateAsync_CacheMiss_InvokesFactoryAndReturnValue()
        {
            var sut = BuildSut();
            var factoryCallCount = 0;

            var result = await sut.GetOrCreateAsync(
                "test-key",
                async ct =>
                {
                    factoryCallCount++;
                    await Task.Yield();
                    return "hello";
                },
                TimeSpan.FromMinutes(1)
            );

            result.Should().Be("hello");
            factoryCallCount.Should().Be(1);
        }

        [Fact]
        public async Task GetOrCreateAsync_CacheHit_DoesNotInvokeFactory()
        {
            var sut = BuildSut();
            var factoryCallCount = 0;

            // Prime the cache
            await sut.GetOrCreateAsync(
                "test-key",
                _ => Task.FromResult("cached"),
                TimeSpan.FromMinutes(1)
            );

            // Second call should hit cache
            var result = await sut.GetOrCreateAsync(
                "test-key",
                _ =>
                {
                    factoryCallCount++;
                    return Task.FromResult("should-not-be-returned");
                },
                TimeSpan.FromMinutes(1)
            );

            result.Should().Be("cached");
            factoryCallCount.Should().Be(0);
        }

        [Fact]
        public async Task GetOrCreateAsync_DifferentKeys_StoredIndependently()
        {
            var sut = BuildSut();

            var a = await sut.GetOrCreateAsync(
                "key-a",
                _ => Task.FromResult("value-a"),
                TimeSpan.FromMinutes(1)
            );
            var b = await sut.GetOrCreateAsync(
                "key-b",
                _ => Task.FromResult("value-b"),
                TimeSpan.FromMinutes(1)
            );

            a.Should().Be("value-a");
            b.Should().Be("value-b");
        }

        [Fact]
        public async Task GetOrCreateAsync_ComplexObject_RoundTripsCorrectly()
        {
            var sut = BuildSut();
            var expected = new List<string> { "alpha", "beta", "gamma" };

            await sut.GetOrCreateAsync(
                "list-key",
                _ => Task.FromResult<List<string>>(expected),
                TimeSpan.FromMinutes(1)
            );
            var result = await sut.GetOrCreateAsync(
                "list-key",
                _ => Task.FromResult(new List<string>()),
                TimeSpan.FromMinutes(1)
            );

            result.Should().BeEquivalentTo(expected);
        }
    }

    public sealed class SetAsync_Tests : DistributedCacheServiceTests
    {
        [Fact]
        public async Task SetAsync_OverwritesExistingEntry()
        {
            var sut = BuildSut();

            await sut.SetAsync("key", "original", TimeSpan.FromMinutes(1));
            await sut.SetAsync("key", "overwritten", TimeSpan.FromMinutes(1));

            // GetOrCreateAsync should return the overwritten value without calling the factory
            var factoryCalled = false;
            var result = await sut.GetOrCreateAsync(
                "key",
                _ =>
                {
                    factoryCalled = true;
                    return Task.FromResult("factory-value");
                },
                TimeSpan.FromMinutes(1)
            );

            result.Should().Be("overwritten");
            factoryCalled.Should().BeFalse();
        }
    }

    public sealed class RemoveAsync_Tests : DistributedCacheServiceTests
    {
        [Fact]
        public async Task RemoveAsync_AfterRemoval_FactoryIsCalledOnNextGet()
        {
            var sut = BuildSut();

            await sut.GetOrCreateAsync(
                "key",
                _ => Task.FromResult("initial"),
                TimeSpan.FromMinutes(1)
            );
            await sut.RemoveAsync("key");

            var factoryCallCount = 0;
            var result = await sut.GetOrCreateAsync(
                "key",
                _ =>
                {
                    factoryCallCount++;
                    return Task.FromResult("refreshed");
                },
                TimeSpan.FromMinutes(1)
            );

            result.Should().Be("refreshed");
            factoryCallCount.Should().Be(1);
        }

        [Fact]
        public async Task RemoveAsync_NonExistentKey_DoesNotThrow()
        {
            var sut = BuildSut();

            var act = () => sut.RemoveAsync("does-not-exist");

            await act.Should().NotThrowAsync();
        }
    }
}
