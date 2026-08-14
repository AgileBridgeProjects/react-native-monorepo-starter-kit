import { ClubFormInline } from '@features/clubs/presentation/components/club-form-inline';
import type { ClubFormData } from '@features/clubs/presentation/utils/club-schema';
import { render, screen } from '@testing-library/react';
import { useForm } from 'react-hook-form';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@lib/i18n', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('@features/clubs/presentation/components/logo-upload-field', () => ({
  LogoUploadField: () => null,
}));

vi.mock('devextreme-react/text-box', () => ({
  default: ({ inputAttr }: { inputAttr?: { id?: string } }) => <input id={inputAttr?.id} />,
}));

vi.mock('devextreme-react/number-box', () => ({
  default: ({ inputAttr }: { inputAttr?: { id?: string } }) => (
    <input id={inputAttr?.id} type="number" />
  ),
}));

vi.mock('devextreme-react/select-box', () => ({
  default: ({ id }: { id?: string }) => <input id={id} />,
}));

vi.mock('@/components/ui', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/components/ui')>();
  return {
    ...actual,
    DateRangeBox: ({ id }: { id?: string }) => <input id={id} />,
  };
});

const defaultValues: ClubFormData = {
  name: '',
  streetAddress: '',
  city: '',
  state: '',
  zipCode: '',
  timezone: null,
  maxAthletes: null,
  logoUrl: null,
  seasonName: '',
  seasonStartDate: '',
  seasonEndDate: '',
};

function ProfileHarness({ showSeasonSection = false }: { showSeasonSection?: boolean }) {
  const { control, setValue } = useForm<ClubFormData>({ defaultValues });

  return (
    <ClubFormInline
      control={control}
      errors={{}}
      setValue={setValue}
      onLogoFile={vi.fn()}
      onLogoRemove={vi.fn()}
      showSeasonSection={showSeasonSection}
    />
  );
}

describe('ClubFormInline', () => {
  it('renders the club profile fields with a split address', () => {
    render(<ProfileHarness />);

    expect(screen.getByLabelText(/clubs:form\.name\.label/)).toBeInTheDocument();
    expect(screen.getByLabelText(/clubs:form\.streetAddress\.label/)).toBeInTheDocument();
    expect(screen.getByLabelText(/clubs:form\.city\.label/)).toBeInTheDocument();
    expect(screen.getByLabelText(/clubs:form\.state\.label/)).toBeInTheDocument();
    expect(screen.getByLabelText(/clubs:form\.zipCode\.label/)).toBeInTheDocument();
    expect(screen.getByLabelText(/clubs:form\.maxAthletes\.label/)).toBeInTheDocument();
  });

  it('hides the season section by default (edit mode)', () => {
    render(<ProfileHarness />);

    expect(screen.queryByText('clubs:form.section.season')).not.toBeInTheDocument();
  });

  it('shows the season section when showSeasonSection is true (create mode)', () => {
    render(<ProfileHarness showSeasonSection />);

    expect(screen.getByText('clubs:form.section.season')).toBeInTheDocument();
    expect(screen.getByLabelText(/clubs:form\.season\.name\.label/)).toBeInTheDocument();
  });
});
