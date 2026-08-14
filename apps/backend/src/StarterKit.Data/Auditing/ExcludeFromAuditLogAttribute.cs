namespace StarterKit.Data.Auditing;

/// <summary>
/// Opt-out attribute for the <see cref="AuditLogInterceptor"/>.
/// Apply to entities that should NOT have their changes recorded in the <c>AuditLogs</c>
/// table. The default is audited — exclusion must be explicitly declared.
///
/// Use cases: the <c>AuditLog</c> entity itself (prevents infinite recursion), auth/role
/// entities bootstrapped before user identity is available, and high-volume append-only
/// entities where audit volume would be prohibitive.
/// </summary>
[AttributeUsage(AttributeTargets.Class, Inherited = false)]
public sealed class ExcludeFromAuditLogAttribute : Attribute { }
