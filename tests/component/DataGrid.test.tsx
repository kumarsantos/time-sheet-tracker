// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DataGrid } from '@/components/shared/DataGrid';

const { pushMock, currentParams } = vi.hoisted(() => ({
  pushMock: vi.fn(),
  currentParams: { value: new URLSearchParams('') },
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
  usePathname: () => '/acme-analytics/timesheets',
  useSearchParams: () => currentParams.value,
}));

interface Row {
  id: string;
  weekNumber: number;
  status: string;
}

const columns = [{ key: 'weekNumber', header: 'Week #', sortable: true }];
const rows: Row[] = [
  { id: '1', weekNumber: 1, status: 'INCOMPLETE' },
  { id: '2', weekNumber: 2, status: 'COMPLETED' },
];

function renderServer(meta?: Parameters<typeof DataGrid<Row>>[0]['meta']) {
  return render(<DataGrid columns={columns} data={rows} mode="server" meta={meta} />);
}

const expectedUrl = (query: string) => `/acme-analytics/timesheets?${query}`;

describe('DataGrid (server mode) — sorting', () => {
  it('sorts a new column descending on the first click (single-click feedback)', async () => {
    currentParams.value = new URLSearchParams('');
    renderServer({ page: 1, pageSize: 5, total: 32, totalPages: 7 });

    await userEvent.click(screen.getByText('Week #'));

    expect(pushMock).toHaveBeenCalledWith(expectedUrl('sort=weekNumber&order=desc&page=1'), {
      scroll: false,
    });
  });

  it('toggles the active column ascending on the next click', async () => {
    currentParams.value = new URLSearchParams('sort=weekNumber&order=desc');
    renderServer({ page: 1, pageSize: 5, total: 32, totalPages: 7 });

    await userEvent.click(screen.getByText('Week #'));

    expect(pushMock).toHaveBeenCalledWith(expectedUrl('sort=weekNumber&order=asc&page=1'), {
      scroll: false,
    });
  });

  it('renders sortable headers as keyboard-focusable buttons with aria-sort', () => {
    currentParams.value = new URLSearchParams('sort=weekNumber&order=desc');
    renderServer({ page: 1, pageSize: 5, total: 32, totalPages: 7 });

    const headerCell = screen.getByRole('columnheader', { name: /week #/i });
    expect(headerCell).toHaveAttribute('aria-sort', 'descending');

    const sortButton = screen.getByRole('button', { name: /week #/i });
    expect(sortButton).toHaveAttribute('type', 'button');
  });

  it('marks unsorted columns as aria-sort=none', () => {
    currentParams.value = new URLSearchParams('');
    renderServer({ page: 1, pageSize: 5, total: 32, totalPages: 7 });

    expect(screen.getByRole('columnheader', { name: /week #/i })).toHaveAttribute(
      'aria-sort',
      'none',
    );
  });
});

describe('DataGrid (server mode) — pagination footer', () => {
  it('hides the footer when everything fits on page 1', () => {
    currentParams.value = new URLSearchParams('');
    renderServer({ page: 1, pageSize: 5, total: 3, totalPages: 1 });

    expect(screen.queryByLabelText('Rows per page')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /previous/i })).not.toBeInTheDocument();
  });

  it('shows the footer when there is more than one page', () => {
    currentParams.value = new URLSearchParams('');
    renderServer({ page: 1, pageSize: 5, total: 32, totalPages: 7 });

    expect(screen.getByLabelText('Rows per page')).toBeInTheDocument();
  });

  it('writes the new page size into the limit query param', async () => {
    currentParams.value = new URLSearchParams('page=1&limit=5');
    renderServer({ page: 1, pageSize: 5, total: 32, totalPages: 7 });

    await userEvent.selectOptions(screen.getByLabelText('Rows per page'), '10');

    expect(pushMock).toHaveBeenCalledWith(expectedUrl('page=1&limit=10'), { scroll: false });
  });
});

describe('DataGrid (client mode)', () => {
  it('hides the footer when rows fit on a single default page', () => {
    render(<DataGrid columns={columns} data={rows} mode="client" />);

    expect(screen.queryByLabelText('Rows per page')).not.toBeInTheDocument();
  });
});
