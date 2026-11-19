import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { showConsoleGreeting } from './lib/consoleGreeting';
import './index.css';

showConsoleGreeting();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
