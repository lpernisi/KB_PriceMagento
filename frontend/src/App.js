import React from 'react';
import '@/App.css';
import { MagentoProvider, useMagento } from './context/MagentoContext';
import { ConfigForm } from './components/ConfigForm';
import { Dashboard } from './components/Dashboard';

const AppContent = () => {
  const { config } = useMagento();

  if (!config.isConnected) {
    return <ConfigForm />;
  }

  return <Dashboard />;
};

function App() {
  return (
    <MagentoProvider>
      <AppContent />
    </MagentoProvider>
  );
}

export default App;
