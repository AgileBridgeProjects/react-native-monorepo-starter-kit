using Mediator;

namespace StarterKit.Data.DomainEvents;

/// <summary>
/// Mixin interface for entities that can raise domain events.
/// Events are collected during the transaction and dispatched pre-commit
/// by <see cref="SqlServer.AppDbContext.SaveChangesAsync"/>.
/// </summary>
public interface IHasDomainEvents
{
    IReadOnlyList<INotification> DomainEvents { get; }
    void ClearDomainEvents();
}
