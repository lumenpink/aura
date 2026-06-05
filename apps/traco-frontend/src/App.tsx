import React from 'react';
import { Logo } from '@aura/ui';

export const App: React.FC = () => {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      fontFamily: 'sans-serif',
      backgroundColor: '#fafafa',
      color: '#202023'
    }}>
      <Logo size="large" />
      <h1 style={{ fontWeight: 300, marginTop: '2rem' }}>Aura Traço</h1>
      <p style={{ color: '#666' }}>Assinatura Digital de Prontuários Médicos</p>
    </div>
  );
};

export default App;
