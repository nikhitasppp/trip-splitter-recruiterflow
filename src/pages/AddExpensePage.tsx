import { useNavigate } from 'react-router';
import { ExpenseForm } from '../components/ExpenseForm';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { addExpense, selectMembers } from '../store/tripSlice';
import type { NewExpense } from '../types';
import type { ExpenseAddedState } from './addedExpenseState';

export function AddExpensePage() {
  const members = useAppSelector(selectMembers);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  function handleSave(expense: NewExpense) {
    dispatch(addExpense(expense));

    // The success message travels to the Expenses page in router state.
    const state: ExpenseAddedState = { addedExpenseDescription: expense.description };
    // navigate() can return a promise in some router modes; `void` says we don't need to wait.
    void navigate('/', { state });
  }

  function handleCancel() {
    void navigate('/');
  }

  return (
    <>
      <h1>Add expense</h1>
      <ExpenseForm members={members} onSave={handleSave} onCancel={handleCancel} />
    </>
  );
}
