import { createSlice, nanoid, type PayloadAction } from '@reduxjs/toolkit';
import { sampleExpenses, sampleMembers } from '../data/sampleData';
import type { Expense, Member, NewExpense } from '../types';
import type { RootState } from './store';

/** Only the data the whole app shares lives in Redux. Everything else is derived or local. */
export interface TripState {
  members: Member[];
  expenses: Expense[];
}

const initialState: TripState = {
  members: sampleMembers,
  expenses: sampleExpenses,
};

const tripSlice = createSlice({
  name: 'trip',
  initialState,
  reducers: {
    addExpense: {
      reducer(state, action: PayloadAction<Expense>) {
        state.expenses.push(action.payload);
      },
      // Reducers must be pure, so the random id is created here,
      // when the action is made, instead of inside the reducer.
      prepare(expense: NewExpense) {
        return { payload: { ...expense, id: nanoid() } };
      },
    },
    deleteExpense(state, action: PayloadAction<string>) {
      state.expenses = state.expenses.filter((expense) => expense.id !== action.payload);
    },
  },
});

export const { addExpense, deleteExpense } = tripSlice.actions;
export const tripReducer = tripSlice.reducer;

export const selectMembers = (state: RootState) => state.trip.members;
export const selectExpenses = (state: RootState) => state.trip.expenses;
