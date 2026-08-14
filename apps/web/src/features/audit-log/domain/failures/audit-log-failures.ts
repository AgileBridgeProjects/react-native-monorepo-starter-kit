// TODO(i18n): Failure messages are hardcoded English strings.
// Replace with localised keys once i18n is set up for apps/web.

export class AuditLogNotFoundFailure extends Error {
  constructor(id: string) {
    super(`Audit log entry "${id}" was not found.`);
    this.name = 'AuditLogNotFoundFailure';
  }
}
