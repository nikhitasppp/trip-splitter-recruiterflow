import { combineReducers, configureStore } from '@reduxjs/toolkit';
import { sampleMembers } from '../data/sampleData';
import { loadExpenses, saveExpenses } from './storage';
import { tripReducer } from './tripSlice';

const rootReducer = combineReducers({ trip: tripReducer });

export type RootState = ReturnType<typeof rootReducer>;

/** The state the app opens with: the five members, plus saved expenses (or the sample data). */
function loadInitialState(): RootState {
  return { trip: { members: sampleMembers, expenses: loadExpenses() } };
}

/**
 * Creates the Redux store. Tests pass their own starting state; the app uses
 * whatever is in localStorage.
 */
export function createAppStore(preloadedState: RootState = loadInitialState()) {
  const store = configureStore({ reducer: rootReducer, preloadedState });

  // Save the expenses whenever they change. Doing it here keeps reducers pure
  // and means any future action that changes expenses is saved automatically.
  let lastSavedExpenses = store.getState().trip.expenses;
  store.subscribe(() => {
    const { expenses } = store.getState().trip;
    if (expenses !== lastSavedExpenses) {
      saveExpenses(expenses);
      lastSavedExpenses = expenses;
    }
  });

  return store;
}

export type AppStore = ReturnType<typeof createAppStore>;
export type AppDispatch = AppStore['dispatch'];
