import { Route, Routes } from 'react-router';
import { Layout } from './components/Layout';
import { AddExpensePage } from './pages/AddExpensePage';
import { ExpensesPage } from './pages/ExpensesPage';
import { NotFoundPage } from './pages/NotFoundPage';

/** The app's routes. The router itself is added in main.tsx (or MemoryRouter in tests). */
export function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<ExpensesPage />} />
        <Route path="expenses/new" element={<AddExpensePage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
