import './captureHash';
import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import './lib/auth';
import App from './App.tsx';
import './index.css';
import './locales/i18n';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);