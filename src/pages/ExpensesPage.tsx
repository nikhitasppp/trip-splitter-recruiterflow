import { useState, type ChangeEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { BalanceList } from '../components/BalanceList';
import { ExpenseTable } from '../components/ExpenseTable';
import { computeBalances } from '../logic/balances';
import {
  ALL_CATEGORIES,
  filterByCategory,
  sortNewestFirst,
  sumAmounts,
  type CategoryFilter,
} from '../logic/expenseList';
import { formatRupees } from '../logic/money';
import { suggestSettlements } from '../logic/settlements';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { deleteExpense, selectExpenses, selectMembers } from '../store/tripSlice';
import { CATEGORIES, isCategory, type Expense } from '../types';
import { getAddedExpenseDescription } from './addedExpenseState';

export function ExpensesPage() {
  const members = useAppSelector(selectMembers);
  const expenses = useAppSelector(selectExpenses);
  const dispatch = useAppDispatch();
  const location = useLocation();
  const navigate = useNavigate();

  // Only this page uses the filter, so it is local state rather than Redux.
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>(ALL_CATEGORIES);

  // Everything below is derived from Redux data on each render, never stored.
  // After a delete, Redux has a new expenses array, so these update straight away.
  const balances = computeBalances(members, expenses);
  // Payments come from the overall balances (which already include every
  // expense's shares), never from a single expense's shares.
  const payments = suggestSettlements(balances);
  const visibleExpenses = sortNewestFirst(filterByCategory(expenses, categoryFilter));
  const visibleTotal = sumAmounts(visibleExpenses);
  const addedDescription = getAddedExpenseDescription(location.state);

  function handleCategoryChange(event: ChangeEvent<HTMLSelectElement>) {
    const { value } = event.target;
    setCategoryFilter(isCategory(value) ? value : ALL_CATEGORIES);
  }

  function handleDelete(expense: Expense) {
    if (window.confirm(`Delete "${expense.description}"? This can't be undone.`)) {
      dispatch(deleteExpense(expense.id));
    }
  }

  function dismissAddedMessage() {
    // Replacing the history entry clears the router state, so the message won't come back.
    void navigate('/', { replace: true });
  }

  function renderExpenseList() {
    if (expenses.length === 0) {
      return (
        <p className="empty-state">
          No expenses yet. <Link to="/expenses/new">Add the first one</Link>.
        </p>
      );
    }

    if (visibleExpenses.length === 0) {
      return (
        <p className="empty-state">
          No {categoryFilter} expenses.{' '}
          <button
            type="button"
            className="link-button"
            onClick={() => setCategoryFilter(ALL_CATEGORIES)}
          >
            Show all categories
          </button>
        </p>
      );
    }

    return <ExpenseTable expenses={visibleExpenses} members={members} onDelete={handleDelete} />;
  }

  return (
    <>
      <h1>Expenses</h1>

      {addedDescription !== null && (
        <div className="notice" role="status">
          <p>Expense “{addedDescription}” was added.</p>
          <button type="button" className="button button--small" onClick={dismissAddedMessage}>
            Dismiss
          </button>
        </div>
      )}

      <section aria-labelledby="balances-heading">
        <h2 id="balances-heading">Balances</h2>
        <BalanceList members={members} balances={balances} payments={payments} />
      </section>

      <section aria-labelledby="expense-list-heading">
        <h2 id="expense-list-heading">Expense list</h2>

        <div className="toolbar">
          <div className="field field--inline">
            <label htmlFor="category-filter">Category</label>
            <select id="category-filter" value={categoryFilter} onChange={handleCategoryChange}>
              <option value={ALL_CATEGORIES}>All categories</option>
              {CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>
          <p className="total">
            Total shown: <strong>{formatRupees(visibleTotal)}</strong>
          </p>
        </div>

        {renderExpenseList()}
      </section>
    </>
  );
}
