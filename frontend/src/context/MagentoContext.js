import React, { createContext, useContext, useState, useEffect } from 'react';

const MagentoContext = createContext(null);

export const useMagento = () => {
  const context = useContext(MagentoContext);
  if (!context) {
    throw new Error('useMagento must be used within MagentoProvider');
  }
  return context;
};

export const MagentoProvider = ({ children }) => {
  const [config, setConfig] = useState({
    magentoUrl: '',
    accessToken: '',
    isConnected: false,
  });
  const [storeViews, setStoreViews] = useState([]);
  const [selectedStore, setSelectedStore] = useState(null);
  const [loading, setLoading] = useState(false);

  // Try to load saved config on mount
  useEffect(() => {
    loadSavedConfig();
  }, []);

  const loadSavedConfig = async () => {
    try {
      const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
      const response = await fetch(`${API}/load-config`);
      const data = await response.json();
      
      if (data.success && data.config) {
        setConfig({
          magentoUrl: data.config.magento_url || '',
          accessToken: data.config.access_token || '',
          isConnected: false,
        });
      }
    } catch (error) {
      console.error('Error loading config:', error);
    }
  };

  const connect = async (magentoUrl, accessToken) => {
    setLoading(true);
    try {
      const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
      
      // Test connection
      const testResponse = await fetch(`${API}/test-connection`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ magento_url: magentoUrl, access_token: accessToken }),
      });
      
      if (!testResponse.ok) {
        const error = await testResponse.json();
        throw new Error(error.detail || 'Connessione fallita');
      }
      
      // Get store views
      const storesResponse = await fetch(`${API}/store-views`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ magento_url: magentoUrl, access_token: accessToken }),
      });
      
      if (!storesResponse.ok) {
        throw new Error('Errore nel recupero degli store');
      }
      
      const stores = await storesResponse.json();
      
      // Save config
      await fetch(`${API}/save-config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ magento_url: magentoUrl, access_token: accessToken }),
      });
      
      setConfig({
        magentoUrl,
        accessToken,
        isConnected: true,
      });
      setStoreViews(stores);
      setSelectedStore(stores.length > 0 ? stores[0] : null);
      
      return { success: true };
    } catch (error) {
      console.error('Connection error:', error);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  const disconnect = () => {
    setConfig({
      magentoUrl: '',
      accessToken: '',
      isConnected: false,
    });
    setStoreViews([]);
    setSelectedStore(null);
  };

  const value = {
    config,
    storeViews,
    selectedStore,
    setSelectedStore,
    loading,
    connect,
    disconnect,
  };

  return (
    <MagentoContext.Provider value={value}>
      {children}
    </MagentoContext.Provider>
  );
};

export default MagentoContext;
