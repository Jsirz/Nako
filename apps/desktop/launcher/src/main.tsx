import { preventFileDropNavigation } from '../../../../modules/contracts/shared/fileDrop';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles.css';

preventFileDropNavigation();
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
