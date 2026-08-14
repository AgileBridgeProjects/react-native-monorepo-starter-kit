/// <reference types="@testing-library/jest-dom" />
import { fireEvent, render, screen } from '@testing-library/react';
import type { TextareaHTMLAttributes } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { TextAreaField } from '../text-area-field';

interface MockTextAreaProps {
  value?: string;
  placeholder?: string;
  inputAttr?: TextareaHTMLAttributes<HTMLTextAreaElement>;
  onValueChanged?: (event: { value: string }) => void;
}

vi.mock('devextreme-react/text-area', () => ({
  default: ({ value, placeholder, inputAttr, onValueChanged }: MockTextAreaProps) => (
    <textarea
      {...inputAttr}
      value={value}
      placeholder={placeholder}
      onChange={(event) => onValueChanged?.({ value: event.target.value })}
    />
  ),
}));

describe('TextAreaField', () => {
  it('renders a labelled textarea with description and hint text', () => {
    render(
      <TextAreaField
        id="notes"
        label="Notes"
        description="Add context for generation."
        hint="Keep it concise."
        value="Existing notes"
        onChange={vi.fn()}
        placeholder="Enter notes"
      />,
    );

    const textarea = screen.getByLabelText('Notes');

    expect(textarea).toHaveValue('Existing notes');
    expect(textarea).toHaveAttribute('placeholder', 'Enter notes');
    expect(screen.getByText('Add context for generation.')).toBeTruthy();
    expect(screen.getByText('Keep it concise.')).toBeTruthy();
    expect(textarea).toHaveAttribute('aria-describedby', 'notes-description notes-hint');
  });

  it('calls onChange with the updated value', () => {
    const onChange = vi.fn();

    render(<TextAreaField id="notes" label="Notes" value="" onChange={onChange} />);

    fireEvent.change(screen.getByLabelText('Notes'), { target: { value: 'Use this source' } });

    expect(onChange).toHaveBeenCalledWith('Use this source');
  });

  it('shows an inline error and marks the textarea as invalid', () => {
    render(
      <TextAreaField
        id="notes"
        label="Notes"
        hint="Hidden while error is present."
        error="Notes are required."
        value=""
        onChange={vi.fn()}
      />,
    );

    const textarea = screen.getByLabelText('Notes');

    expect(textarea).toHaveAttribute('aria-invalid', 'true');
    expect(textarea).toHaveAttribute('aria-describedby', 'notes-error');
    expect(screen.getByRole('alert')).toHaveTextContent('Notes are required.');
    expect(screen.queryByText('Hidden while error is present.')).toBeNull();
  });
});
