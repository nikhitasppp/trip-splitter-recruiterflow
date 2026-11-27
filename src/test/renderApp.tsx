import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router';
import { App } from '../App';
import { sampleExpenses, sampleMembers } from '../data/sampleData';
import { createAppStore } from '../store/store';
import type { Expense } from '../types';

interface RenderAppOptions {
  /** The URL to start on. */
  route?: string;
  /** The expenses in Redux at the start. Defaults to the sample data. */
  expenses?: Expense[];
}

/** Renders the whole app (routes + real Redux store) at a given URL. */
export function renderApp({ route = '/', expenses = sampleExpenses }: RenderAppOptions = {}) {
  const store = createAppStore({ trip: { members: sampleMembers, expenses } });
  const user = userEvent.setup();

  render(
    <Provider store={store}>
      <MemoryRouter initialEntries={[route]}>
        <App />
      </MemoryRouter>
    </Provider>,
  );

  return { store, user };
}
