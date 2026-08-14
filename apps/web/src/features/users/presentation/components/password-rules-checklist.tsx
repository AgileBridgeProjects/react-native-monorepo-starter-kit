import { cn, PASSWORD_MIN_LENGTH, PASSWORD_RULES } from '@starterkit/shared';
import { Typography } from '@/components/ui';

interface PasswordRulesChecklistProps {
  password: string;
  translationFn: (key: string, options?: Record<string, unknown>) => string;
  i18nPrefix: string;
}

export function PasswordRulesChecklist({
  password,
  translationFn: t,
  i18nPrefix,
}: PasswordRulesChecklistProps) {
  if (!password || password.length === 0) return null;

  return (
    <ul className="space-y-xs">
      {PASSWORD_RULES.map((rule) => {
        const met = rule.test(password);
        return (
          <li
            key={rule.key}
            className={cn('flex items-center gap-xs text-xs', met ? 'text-success' : 'text-error')}
          >
            <Typography variant="caption" as="span" aria-hidden="true">
              {met ? '✓' : '✗'}
            </Typography>
            <Typography variant="caption" as="span">
              {t(`${i18nPrefix}.${rule.key}`, { min: PASSWORD_MIN_LENGTH })}
            </Typography>
          </li>
        );
      })}
    </ul>
  );
}
