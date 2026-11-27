/** Router state that the Add expense page passes to Expenses after a save. */
export interface ExpenseAddedState {
  addedExpenseDescription: string;
}

/**
 * Router state is untyped (it lives in the browser's history), so check its
 * shape before using it. Returns the added expense's description, or null.
 */
export function getAddedExpenseDescription(state: unknown): string | null {
  if (
    typeof state === 'object' &&
    state !== null &&
    'addedExpenseDescription' in state &&
    typeof state.addedExpenseDescription === 'string'
  ) {
    return state.addedExpenseDescription;
  }
  return null;
}
