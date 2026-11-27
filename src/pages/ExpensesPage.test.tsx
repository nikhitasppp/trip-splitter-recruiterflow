import { screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { sampleExpenses } from '../data/sampleData';
import { EXPENSES_STORAGE_KEY } from '../store/storage';
import { renderApp } from '../test/renderApp';

function balanceTexts(): (string | null)[] {
  const balances = screen.getByRole('region', { name: 'Balances' });
  return within(balances)
    .getAllByRole('listitem')
    .map((item) => item.textContent);
}

/** The Description column of each row in the table, top to bottom. */
function shownDescriptions(): (string | null)[] {
  const bodyRows = screen.getAllByRole('row').slice(1); // skip the header row
  return bodyRows.map((row) => within(row).getAllByRole('cell')[1]?.textContent ?? null);
}

/**
 * The lines inside the details a toggle button has opened. Finding them via
 * aria-controls also proves the button is linked to what it opens.
 */
function openedLines(toggle: HTMLElement): (string | null)[] {
  const detailsId = toggle.getAttribute('aria-controls');
  const details = detailsId === null ? null : document.getElementById(detailsId);
  if (details === null) throw new Error('This button has nothing open');
  return within(details)
    .getAllByRole('listitem')
    .map((item) => item.textContent);
}

describe('Expenses page', () => {
  it('shows each member’s balance in words', () => {
    renderApp();

    expect(balanceTexts()).toEqual([
      'Aarav gets back ₹18,554.20',
      'Diya owes ₹3,695.78',
      'Kabir gets back ₹554.08',
      'Meera owes ₹8,112.50',
      'Rohan owes ₹7,300.00',
    ]);
  });

  it('shows "settled up" for members with a zero balance', () => {
    const scubaOnly = sampleExpenses.filter((expense) => expense.id === 'e3');

    renderApp({ expenses: scubaOnly });

    expect(balanceTexts()).toContain('Aarav settled up');
    expect(balanceTexts()).toContain('Kabir gets back ₹7,000.00');
  });

  it('lists expenses newest first, with every column filled in', () => {
    renderApp();

    expect(shownDescriptions()).toEqual([
      'Airport cab',
      'Groceries',
      'Scuba diving',
      'Scooter rental',
      'Villa booking',
      'Beach shack dinner',
    ]);

    const airportCab = screen.getByRole('row', { name: /Airport cab/ });
    expect(within(airportCab).getAllByRole('cell').map((cell) => cell.textContent)).toEqual([
      '15 Mar 2026',
      'Airport cab',
      'Travel',
      'Aarav',
      '₹1,499.99',
      // The Split cell holds the summary and its "View split" button.
      'Percentages, 3 peopleView split',
      'Delete',
    ]);
  });

  it('filters by category and totals only the expenses shown', async () => {
    const { user } = renderApp();
    expect(screen.getByText(/Total shown/)).toHaveTextContent('Total shown: ₹42,249.99');

    await user.selectOptions(screen.getByLabelText('Category'), 'Food');

    expect(shownDescriptions()).toEqual(['Groceries', 'Beach shack dinner']);
    expect(screen.getByText(/Total shown/)).toHaveTextContent('Total shown: ₹4,250.00');
  });

  it('does nothing if the user cancels the delete', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
    const { store, user } = renderApp();

    await user.click(screen.getByRole('button', { name: 'Delete Villa booking' }));

    expect(confirmSpy).toHaveBeenCalledWith('Delete "Villa booking"? This can\'t be undone.');
    expect(store.getState().trip.expenses).toHaveLength(6);
    expect(shownDescriptions()).toContain('Villa booking');
  });

  it('deletes after confirmation and updates balances, total and localStorage at once', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const { user } = renderApp();

    await user.click(screen.getByRole('button', { name: 'Delete Villa booking' }));

    expect(shownDescriptions()).not.toContain('Villa booking');
    expect(screen.getByText(/Total shown/)).toHaveTextContent('Total shown: ₹18,249.99');
    // Aarav no longer paid ₹24,000 for the villa, so he now owes money.
    expect(balanceTexts()[0]).toBe('Aarav owes ₹645.80');

    const saved = localStorage.getItem(EXPENSES_STORAGE_KEY) ?? '';
    expect(saved).not.toContain('Villa booking');
    expect(saved).toContain('Airport cab');
  });

  it('shows an empty state when there are no expenses at all', () => {
    renderApp({ expenses: [] });

    expect(screen.getByText(/No expenses yet/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Add the first one' })).toHaveAttribute(
      'href',
      '/expenses/new',
    );
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(balanceTexts().every((text) => text?.endsWith('settled up'))).toBe(true);
  });

  it('shows an empty state when no expenses match the category', async () => {
    const { user } = renderApp();

    await user.selectOptions(screen.getByLabelText('Category'), 'Other');

    expect(screen.getByText(/No Other expenses/)).toBeInTheDocument();
    expect(screen.getByText(/Total shown/)).toHaveTextContent('Total shown: ₹0.00');

    await user.click(screen.getByRole('button', { name: 'Show all categories' }));

    expect(shownDescriptions()).toHaveLength(6);
  });
});

describe('Balance cards', () => {
  it('open one at a time to show who pays whom, and close again', async () => {
    const { user } = renderApp();
    const aarav = screen.getByRole('button', { name: 'Aarav gets back ₹18,554.20' });
    const diya = screen.getByRole('button', { name: 'Diya owes ₹3,695.78' });
    expect(aarav).toHaveAttribute('aria-expanded', 'false');

    await user.click(aarav);

    expect(aarav).toHaveAttribute('aria-expanded', 'true');
    expect(openedLines(aarav)).toEqual([
      'Receives from Meera — ₹8,112.50',
      'Receives from Rohan — ₹7,300.00',
      'Receives from Diya — ₹3,141.70',
    ]);

    await user.click(diya);

    expect(aarav).toHaveAttribute('aria-expanded', 'false');
    expect(diya).toHaveAttribute('aria-expanded', 'true');
    expect(openedLines(diya)).toEqual(['Pays Aarav — ₹3,141.70', 'Pays Kabir — ₹554.08']);

    await user.click(diya);

    expect(diya).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText(/Pays Aarav/)).not.toBeInTheDocument();
  });

  it('explain that the payments settle the overall balances, not single expenses', async () => {
    const { user } = renderApp();
    const diya = screen.getByRole('button', { name: 'Diya owes ₹3,695.78' });

    await user.click(diya);

    expect(
      screen.getByText(
        'These suggested payments settle your overall trip balances. Individual expense shares are already included.',
      ),
    ).toBeInTheDocument();
  });

  it('says "No payments needed" for someone who is settled up', async () => {
    const scubaOnly = sampleExpenses.filter((expense) => expense.id === 'e3');
    const { user } = renderApp({ expenses: scubaOnly });

    await user.click(screen.getByRole('button', { name: 'Aarav settled up' }));

    expect(screen.getByText('No payments needed')).toBeInTheDocument();
    expect(screen.queryByText(/These suggested payments/)).not.toBeInTheDocument();
  });

  it('can be opened and closed with the keyboard', async () => {
    const { user } = renderApp();
    const aarav = screen.getByRole('button', { name: 'Aarav gets back ₹18,554.20' });

    // Tab past the two navbar links to the first card.
    await user.tab();
    await user.tab();
    await user.tab();
    expect(aarav).toHaveFocus();

    await user.keyboard('{Enter}');
    expect(aarav).toHaveAttribute('aria-expanded', 'true');

    await user.keyboard(' ');
    expect(aarav).toHaveAttribute('aria-expanded', 'false');
  });

  it('update straight away after an expense is deleted', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const { user } = renderApp();

    await user.click(screen.getByRole('button', { name: 'Delete Scuba diving' }));

    // Kabir no longer paid ₹10,500 for scuba (his ₹3,500 share goes too):
    // ₹554.08 − ₹10,500 + ₹3,500 = −₹6,445.92, and only Aarav is owed money.
    const kabir = screen.getByRole('button', { name: 'Kabir owes ₹6,445.92' });
    await user.click(kabir);

    expect(openedLines(kabir)).toEqual(['Pays Aarav — ₹6,445.92']);
  });
});

describe('Split details in the table', () => {
  it('is headed "Expense breakdown"', () => {
    renderApp();

    expect(screen.getByRole('columnheader', { name: 'Expense breakdown' })).toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: 'Split' })).not.toBeInTheDocument();
  });

  it('shows each member’s percentage and amount, and hides them again', async () => {
    const { user } = renderApp();
    const toggle = screen.getByRole('button', { name: 'View split for Airport cab' });

    await user.click(toggle);

    expect(toggle).toHaveAccessibleName('Hide split for Airport cab');
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(openedLines(toggle)).toEqual([
      'Aarav — 33.33% · ₹499.95',
      'Diya — 33.33% · ₹499.95',
      'Kabir — 33.34% · ₹500.09',
    ]);

    await user.click(toggle);

    expect(toggle).toHaveAccessibleName('View split for Airport cab');
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
  });

  it('shows ₹100 split three ways as ₹33.34, ₹33.33 and ₹33.33', async () => {
    const { user } = renderApp({
      expenses: [
        {
          id: 'x1',
          description: 'Chai and snacks',
          amount: 10000,
          paidBy: 'm1',
          date: '2026-03-16',
          category: 'Food',
          split: { type: 'equal', memberIds: ['m1', 'm2', 'm3'] },
        },
      ],
    });

    const toggle = screen.getByRole('button', { name: 'View split for Chai and snacks' });
    await user.click(toggle);

    expect(openedLines(toggle)).toEqual(['Aarav — ₹33.34', 'Diya — ₹33.33', 'Kabir — ₹33.33']);
  });

  it('shows the exact amount entered for each member', async () => {
    const { user } = renderApp();
    const toggle = screen.getByRole('button', { name: 'View split for Scuba diving' });

    await user.click(toggle);

    expect(openedLines(toggle)).toEqual([
      'Kabir — ₹3,500.00',
      'Meera — ₹3,500.00',
      'Rohan — ₹3,500.00',
    ]);
  });
});
