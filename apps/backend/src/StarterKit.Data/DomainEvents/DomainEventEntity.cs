using Mediator;

namespace StarterKit.Data.DomainEvents;

/// <summary>
/// Base class for entities that need to raise domain events.
/// Call <see cref="AddDomainEvent"/> to queue an event for deferred dispatch.
/// </summary>
public abstract class DomainEventEntity : IHasDomainEvents
{
    private readonly List<INotification> _domainEvents = [];

    public IReadOnlyList<INotification> DomainEvents => _domainEvents.AsReadOnly();

    public void AddDomainEvent(INotification domainEvent) => _domainEvents.Add(domainEvent);

    public void ClearDomainEvents() => _domainEvents.Clear();
}
