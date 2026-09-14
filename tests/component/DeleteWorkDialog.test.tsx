// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DeleteWorkDialog } from '@/components/timesheets/details/DeleteWorkDialog';

const handlers = {
  onCancel: vi.fn(),
  onConfirm: vi.fn(),
};

function renderDialog(isPending = false) {
  return render(
    <DeleteWorkDialog
      open
      isPending={isPending}
      onCancel={handlers.onCancel}
      onConfirm={handlers.onConfirm}
    />,
  );
}

describe('DeleteWorkDialog', () => {
  it('renders the confirmation copy', async () => {
    renderDialog();
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Delete work' })).toBeInTheDocument();
  });

  it('fires onConfirm when the user confirms', async () => {
    renderDialog();
    await userEvent.click(await screen.findByRole('button', { name: 'Delete' }));
    expect(handlers.onConfirm).toHaveBeenCalledTimes(1);
  });

  it('fires onCancel when the user declines', async () => {
    renderDialog();
    await userEvent.click(await screen.findByRole('button', { name: 'Cancel' }));
    expect(handlers.onCancel).toHaveBeenCalledTimes(1);
  });

  it('disables the delete button while pending', async () => {
    renderDialog(true);
    expect(await screen.findByRole('button', { name: 'Deleting…' })).toBeDisabled();
  });
});
