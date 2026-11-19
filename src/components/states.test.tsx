import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ApiError } from '../lib/api';
import { ErrorBoundary } from './ErrorBoundary';
import { DashboardSkeleton, EmptyState, ErrorState } from './states';

describe('loading, empty and error states', () => {
  it('announces the skeleton to screen readers', () => {
    render(<DashboardSkeleton />);
    expect(screen.getByRole('status', { name: 'Loading the orders' })).toBeInTheDocument();
  });

  it('renders an empty state', () => {
    render(<EmptyState title="Nothing here">Add something</EmptyState>);
    expect(screen.getByRole('heading', { name: 'Nothing here' })).toBeInTheDocument();
  });

  it.each([
    [new ApiError(0, 'x', 'NETWORK'), "You're offline"],
    [new ApiError(503, 'Connect a database', 'NO_STORAGE'), 'One more setup step'],
    [new ApiError(503, 'down', 'DB_UNAVAILABLE'), 'The database is napping'],
    [new ApiError(500, 'oops', 'SERVER_ERROR'), 'The elves dropped something'],
    [new Error('weird'), 'Something went wrong'],
  ])('explains %s', (error, title) => {
    render(<ErrorState error={error} />);
    expect(screen.getByRole('heading', { name: title })).toBeInTheDocument();
  });

  it('offers a retry button', async () => {
    const retry = vi.fn();
    render(<ErrorState error={new ApiError(500, 'oops')} onRetry={retry} />);
    await userEvent.click(screen.getByRole('button', { name: /try again/i }));
    expect(retry).toHaveBeenCalled();
  });
});

describe('ErrorBoundary', () => {
  it('shows a friendly fallback instead of a blank page when something crashes', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    function Boom(): never {
      throw new Error('kaboom');
    }
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>,
    );
    expect(screen.getByRole('heading', { name: 'Oh crumbs!' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reload/i })).toBeInTheDocument();
  });
});
