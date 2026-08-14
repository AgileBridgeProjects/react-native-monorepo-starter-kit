namespace StarterKit.Data.Exceptions;

/// <summary>
/// Thrown when a required entity cannot be found by its identifier.
/// Extends <see cref="InvalidOperationException"/> so that existing test assertions
/// against <c>InvalidOperationException</c> remain valid.
/// Caught globally by <c>EntityNotFoundExceptionHandler</c> and mapped to HTTP 404.
/// </summary>
public sealed class EntityNotFoundException : InvalidOperationException
{
    public EntityNotFoundException(string entityName, Guid id)
        : base($"{entityName} with id '{id}' was not found.")
    {
        EntityName = entityName;
        Id = id;
    }

    public EntityNotFoundException(string entityName, string compositeKey)
        : base($"{entityName} with key '{compositeKey}' was not found.")
    {
        EntityName = entityName;
    }

    public string EntityName { get; }
    public Guid Id { get; }
}
