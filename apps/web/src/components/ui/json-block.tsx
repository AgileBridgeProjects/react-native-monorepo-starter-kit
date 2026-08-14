import { Typography } from '@/components/ui/typography';

export interface JsonBlockProps {
  label: string;
  json: string | null;
}

export function JsonBlock({ label, json }: JsonBlockProps) {
  if (!json) return null;
  let formatted = json;
  try {
    formatted = JSON.stringify(JSON.parse(json), null, 2);
  } catch {
    // leave raw
  }
  return (
    <div className="mb-4">
      <Typography variant="label" className="mb-1">
        {label}
      </Typography>
      <pre className="overflow-auto rounded border border-border bg-surface p-3 text-xs text-content">
        {formatted}
      </pre>
    </div>
  );
}
