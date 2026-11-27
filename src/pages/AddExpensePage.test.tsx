import { screen } from '@testing-library/react';
import type { UserEvent } from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { renderApp } from '../test/renderApp';

async function fillInBasicFields(user: UserEvent) {
  await user.type(screen.getByLabelText('Description'), 'Fish thali lunch');
  await user.type(screen.getByLabelText('Amount (₹)'), '1250.50');
  await user.selectOptions(screen.getByLabelText('Paid by'), 'Kabir');
  await user.type(screen.getByLabelText('Date'), '2026-03-16');
  await user.selectOptions(screen.getByLabelText('Category'), 'Food');
}

function expectToBeOnExpensesPage() {
  expect(screen.getByRole('heading', { level: 1, name: 'Expenses' })).toBeInTheDocument();
}

describe('Add expense form', () => {
  it('shows an error next to every invalid field at once, and saves nothing', async () => {
    const { store, user } = renderApp({ route: '/expenses/new' });

    await user.click(screen.getByRole('button', { name: 'Save' }));

    // toHaveAccessibleDescription checks the message is linked to that exact field.
    expect(screen.getByLabelText('Description')).toHaveAccessibleDescription('Description is required');
    expect(screen.getByLabelText('Amount (₹)')).toHaveAccessibleDescription('Amount is required');
    expect(screen.getByLabelText('Paid by')).toHaveAccessibleDescription('Choose who paid');
    expect(screen.getByLabelText('Date')).toHaveAccessibleDescription('Date is required');
    expect(screen.getByLabelText('Category')).toHaveAccessibleDescription('Choose a category');

    expect(store.getState().trip.expenses).toHaveLength(6);
    expect(screen.getByRole('heading', { level: 1, name: 'Add expense' })).toBeInTheDocument();
  });

  it('shows "Amount must be more than ₹0" for a negative amount', async () => {
    const { user } = renderApp({ route: '/expenses/new' });

    await user.type(screen.getByLabelText('Amount (₹)'), '-50');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(screen.getByLabelText('Amount (₹)')).toHaveAccessibleDescription(
      'Amount must be more than ₹0',
    );
  });

  it('saves a valid expense, goes to Expenses and says it was added', async () => {
    const { store, user } = renderApp({ route: '/expenses/new' });

    await fillInBasicFields(user);
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(store.getState().trip.expenses).toHaveLength(7);
    expect(store.getState().trip.expenses.at(-1)).toMatchObject({
      description: 'Fish thali lunch',
      amount: 125050,
      paidBy: 'm3',
      date: '2026-03-16',
      category: 'Food',
      split: { type: 'equal', memberIds: ['m1', 'm2', 'm3', 'm4', 'm5'] },
    });

    expectToBeOnExpensesPage();
    expect(screen.getByRole('status')).toHaveTextContent('Expense “Fish thali lunch” was added.');
    expect(screen.getByRole('row', { name: /Fish thali lunch/ })).toBeInTheDocument();
  });

  it('shows how much is left to assign for exact amounts, then saves once it adds up', async () => {
    const { store, user } = renderApp({ route: '/expenses/new' });

    await fillInBasicFields(user);
    await user.click(screen.getByRole('radio', { name: 'Exact amounts' }));
    await user.type(screen.getByLabelText('Aarav'), '500');
    await user.type(screen.getByLabelText('Diya'), '738');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(screen.getByText('₹12.50 left to assign')).toBeInTheDocument();
    expect(store.getState().trip.expenses).toHaveLength(6);

    await user.clear(screen.getByLabelText('Diya'));
    await user.type(screen.getByLabelText('Diya'), '750.50');
    expect(screen.queryByText(/left to assign/)).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(store.getState().trip.expenses.at(-1)?.split).toEqual({
      type: 'exact',
      shares: { m1: 50000, m2: 75050 },
    });
    expectToBeOnExpensesPage();
  });

  it('saves a percentage split as percentages', async () => {
    const { store, user } = renderApp({ route: '/expenses/new' });

    await fillInBasicFields(user);
    await user.click(screen.getByRole('radio', { name: 'Percentages' }));
    await user.type(screen.getByLabelText('Meera'), '60');
    await user.type(screen.getByLabelText('Rohan'), '40');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(store.getState().trip.expenses.at(-1)?.split).toEqual({
      type: 'percent',
      shares: { m4: 60, m5: 40 },
    });
  });

  it('Cancel goes back to Expenses without saving anything', async () => {
    const { store, user } = renderApp({ route: '/expenses/new' });

    await fillInBasicFields(user);
    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expectToBeOnExpensesPage();
    expect(store.getState().trip.expenses).toHaveLength(6);
    expect(screen.queryByText('Fish thali lunch')).not.toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});
