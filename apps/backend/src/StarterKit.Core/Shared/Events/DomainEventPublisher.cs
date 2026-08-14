using Mediator;

namespace StarterKit.Core.Shared.Events;

/// <summary>
/// Publishes domain events via Mediator after the originating action has persisted.
/// Inject this into services that need to raise domain events.
/// </summary>
public interface IDomainEventPublisher
{
    Task PublishAsync(INotification domainEvent, CancellationToken cancellationToken = default);
}

public sealed class DomainEventPublisher : IDomainEventPublisher
{
    private readonly IPublisher _publisher;

    public DomainEventPublisher(IPublisher publisher) => _publisher = publisher;

    public async Task PublishAsync(
        INotification domainEvent,
        CancellationToken cancellationToken = default
    ) => await _publisher.Publish(domainEvent, cancellationToken);
}
