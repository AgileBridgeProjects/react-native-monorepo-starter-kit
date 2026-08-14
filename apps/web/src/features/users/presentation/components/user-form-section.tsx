'use client';

import { cn } from '@starterkit/shared';
import { Typography } from '@/components/ui';

interface UserFormSectionProps {
  title: string;
  first?: boolean;
}

export function UserFormSection({ title, first }: UserFormSectionProps) {
  return (
    <Typography as="div" variant="section-label" className={cn(!first && 'pt-3')}>
      {title}
    </Typography>
  );
}
