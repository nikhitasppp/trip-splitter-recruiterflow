import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router';
import { App } from './App';
import './index.css';
import { createAppStore } from './store/store';

const rootElement = document.getElementById('root');
if (rootElement === null) {
  throw new Error('index.html is missing <div id="root">');
}

const store = createAppStore();

createRoot(rootElement).render(
  <StrictMode>
    <Provider store={store}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </Provider>
  </StrictMode>,
);
