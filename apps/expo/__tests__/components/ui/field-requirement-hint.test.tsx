import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import {
  FieldRequirementHint,
  useFieldRequirementLabel,
} from '@/components/ui/field-requirement-hint';

import { renderTree, textChildren } from '@/test/utils/rtr';

vi.mock('@lib/i18n', () => ({
  useTranslation: (ns: string) => ({ t: (key: string) => `${ns}:${key}` }),
}));

function HookProbe({ requirement }: { requirement?: 'required' | 'optional' }) {
  const label = useFieldRequirementLabel(requirement);
  return React.createElement('Text', null, label ?? 'none');
}

describe('FieldRequirementHint', () => {
  it('names a required field', () => {
    const { root } = renderTree(<FieldRequirementHint requirement="required" />);

    expect(textChildren(root)).toContain('common:field.required');
  });

  it('names an optional field', () => {
    const { root } = renderTree(<FieldRequirementHint requirement="optional" />);

    expect(textChildren(root)).toContain('common:field.optional');
  });

  it('renders nothing when a field has no requirement set', () => {
    const { root } = renderTree(<FieldRequirementHint />);

    expect(root.findAll((n) => n.type === 'Text')).toHaveLength(0);
  });

  describe('useFieldRequirementLabel', () => {
    it('returns the translated word so accessibility labels can include it', () => {
      const { root } = renderTree(<HookProbe requirement="optional" />);

      expect(textChildren(root)).toContain('common:field.optional');
    });

    it('returns undefined when there is no requirement', () => {
      const { root } = renderTree(<HookProbe />);

      expect(textChildren(root)).toContain('none');
    });
  });
});
