import { useState } from 'react';
import { formatDate } from '../logic/dates';
import { getMemberName } from '../logic/expenseList';
import { formatRupees } from '../logic/money';
import { describeShare, describeSplit, listShares } from '../logic/splits';
import type { Expense, Member } from '../types';

interface ExpenseTableProps {
  /** Already filtered and sorted by the page. */
  expenses: Expense[];
  members: Member[];
  onDelete: (expense: Expense) => void;
}

export function ExpenseTable({ expenses, members, onDelete }: ExpenseTableProps) {
  // On narrow screens the table scrolls sideways inside this box.
  // tabIndex={0} lets keyboard users focus the box and scroll it with arrow keys.
  return (
    <div className="table-scroll" role="region" aria-labelledby="expense-table-caption" tabIndex={0}>
      <table className="expense-table">
        <caption id="expense-table-caption" className="visually-hidden">
          Expenses, newest first
        </caption>
        <thead>
          <tr>
            <th scope="col">Date</th>
            <th scope="col">Description</th>
            <th scope="col">Category</th>
            <th scope="col">Paid by</th>
            <th scope="col" className="numeric">
              Amount
            </th>
            <th scope="col">Expense breakdown</th>
            <th scope="col">
              <span className="visually-hidden">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {expenses.map((expense) => (
            <tr key={expense.id}>
              <td className="nowrap">{formatDate(expense.date)}</td>
              <td>{expense.description}</td>
              <td>{expense.category}</td>
              <td>{getMemberName(members, expense.paidBy)}</td>
              <td className="numeric nowrap">{formatRupees(expense.amount)}</td>
              <SplitCell expense={expense} members={members} />
              <td>
                <button
                  type="button"
                  className="button button--danger button--small"
                  onClick={() => onDelete(expense)}
                  aria-label={`Delete ${expense.description}`}
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

interface SplitCellProps {
  expense: Expense;
  members: Member[];
}

/** The Expense breakdown column: the split type, and a button that shows each member's share of this expense. */
function SplitCell({ expense, members }: SplitCellProps) {
  // Each row opens and closes on its own, so the state lives here.
  const [isOpen, setIsOpen] = useState(false);
  const detailsId = `split-details-${expense.id}`;
  const label = isOpen ? 'Hide split' : 'View split';

  return (
    <td>
      <div className="split-summary">
        <span>{describeSplit(expense.split)}</span>
        {/* Like Delete, the screen-reader label names the expense: "View split for Groceries". */}
        <button
          type="button"
          className="link-button"
          aria-expanded={isOpen}
          aria-controls={isOpen ? detailsId : undefined}
          aria-label={`${label} for ${expense.description}`}
          onClick={() => setIsOpen((open) => !open)}
        >
          {label}
        </button>
      </div>

      {isOpen && (
        <ul id={detailsId} className="split-details">
          {listShares(expense.amount, expense.split).map((share) => (
            <li key={share.memberId}>{describeShare(share, members)}</li>
          ))}
        </ul>
      )}
    </td>
  );
}
