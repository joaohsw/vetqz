import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../src/index.css';
import CoilLanding from '../src/pages/CoilLanding';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <CoilLanding />
  </StrictMode>,
);
