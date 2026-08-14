import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { MasterDetailEditPanel } from '../master-detail-edit-panel';

describe('MasterDetailEditPanel', () => {
  it('renders title, description, body, and footer actions', () => {
    render(
      <MasterDetailEditPanel
        title="Question"
        description="Edit the generated item."
        isDirty
        unsavedLabel="Unsaved"
        cancelLabel="Cancel"
        saveLabel="Save"
        onCancel={vi.fn()}
        onSave={vi.fn()}
        testId="edit-panel"
      >
        <div>Form fields</div>
      </MasterDetailEditPanel>,
    );

    expect(screen.getByTestId('edit-panel')).toBeTruthy();
    expect(screen.getByText('Question')).toBeTruthy();
    expect(screen.getByText('Edit the generated item.')).toBeTruthy();
    expect(screen.getByText('Form fields')).toBeTruthy();
    expect(screen.getByText('Unsaved')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Save' })).toBeTruthy();
  });

  it('calls footer action handlers', () => {
    const onCancel = vi.fn();
    const onSave = vi.fn();

    render(
      <MasterDetailEditPanel
        cancelLabel="Cancel"
        saveLabel="Save"
        onCancel={onCancel}
        onSave={onSave}
      >
        <div>Form fields</div>
      </MasterDetailEditPanel>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(onCancel).toHaveBeenCalledOnce();
    expect(onSave).toHaveBeenCalledOnce();
  });
});
