import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { DatabaseProvider } from './context/DatabaseContext.tsx';
import { AuthProvider } from './context/AuthContext.tsx';
import { testSupabaseConnection } from './lib/testSupabaseConnection';

testSupabaseConnection();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <DatabaseProvider>
        <App />
      </DatabaseProvider>
    </AuthProvider>
  </StrictMode>,
);