import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderApp } from './test/renderApp';

describe('navigation', () => {
  it('marks the current page in the navbar', async () => {
    const { user } = renderApp({ route: '/' });
    expect(screen.getByRole('link', { name: 'Expenses' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Add expense' })).not.toHaveAttribute('aria-current');

    await user.click(screen.getByRole('link', { name: 'Add expense' }));

    expect(screen.getByRole('heading', { level: 1, name: 'Add expense' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Add expense' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Expenses' })).not.toHaveAttribute('aria-current');
  });

  it('shows "Page not found" with a link back to Expenses for unknown URLs', async () => {
    const { user } = renderApp({ route: '/no/such/page' });

    expect(screen.getByRole('heading', { name: 'Page not found' })).toBeInTheDocument();

    await user.click(screen.getByRole('link', { name: 'Back to Expenses' }));

    expect(screen.getByRole('heading', { level: 1, name: 'Expenses' })).toBeInTheDocument();
  });
});
