using System.Linq.Expressions;
using System.Reflection;

namespace StarterKit.Data.Extensions;

internal static class QueryableExtensions
{
    /// <summary>
    /// Applies <paramref name="predicate"/> only when <paramref name="condition"/> is <c>true</c>;
    /// otherwise returns the query unchanged. Use to build conditional filter chains without
    /// intermediate <c>if</c> statements.
    /// </summary>
    public static IQueryable<T> WhereIf<T>(
        this IQueryable<T> query,
        bool condition,
        Expression<Func<T, bool>> predicate
    ) => condition ? query.Where(predicate) : query;

    /// <summary>
    /// Applies pagination to a query, clamping <paramref name="page"/> to a minimum of 1
    /// so that <c>page=0</c> or negative values never produce a negative Skip.
    /// </summary>
    public static IQueryable<T> ApplyPaging<T>(this IQueryable<T> query, int page, int pageSize)
    {
        var safePage = Math.Max(1, page);
        var offset = ((long)safePage - 1) * pageSize;
        if (offset > int.MaxValue)
            throw new ArgumentOutOfRangeException(
                nameof(page),
                page,
                "The requested page produces a skip offset that exceeds the supported range."
            );
        return query.Skip((int)offset).Take(pageSize);
    }

    /// <summary>
    /// Applies a dynamic sort to any IQueryable using a property name string.
    /// Falls back to <paramref name="defaultSort"/> when <paramref name="sortBy"/> is null/empty.
    /// Uses expression trees (built-in to .NET) — no extra NuGet package required.
    /// Property name matching is case-insensitive; an invalid name results in a 400 ArgumentException.
    /// </summary>
    public static IOrderedQueryable<T> ApplySorting<T>(
        this IQueryable<T> query,
        string? sortBy,
        bool sortDescending,
        string defaultSort
    )
    {
        if (string.IsNullOrWhiteSpace(sortBy))
            sortBy = defaultSort;

        var property =
            typeof(T).GetProperty(
                sortBy,
                BindingFlags.IgnoreCase | BindingFlags.Public | BindingFlags.Instance
            )
            ?? throw new ArgumentException(
                $"Invalid sort column '{sortBy}'. Must be a valid property on {typeof(T).Name}.",
                nameof(sortBy)
            );

        var param = Expression.Parameter(typeof(T), "x");
        var propertyAccess = Expression.MakeMemberAccess(param, property);
        var keySelector = Expression.Lambda(propertyAccess, param);

        var methodName = sortDescending ? "OrderByDescending" : "OrderBy";
        var orderMethod = typeof(Queryable)
            .GetMethods(BindingFlags.Static | BindingFlags.Public)
            .First(m => m.Name == methodName && m.GetParameters().Length == 2)
            .MakeGenericMethod(typeof(T), property.PropertyType);

        return (IOrderedQueryable<T>)orderMethod.Invoke(null, [query, keySelector])!;
    }
}
