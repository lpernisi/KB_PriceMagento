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
    consumerKey: '',
    consumerSecret: '',
    accessToken: '',
    accessTokenSecret: '',
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
          consumerKey: data.config.consumer_key || '',
          consumerSecret: data.config.consumer_secret || '',
          accessToken: data.config.access_token || '',
          accessTokenSecret: data.config.access_token_secret || '',
          isConnected: false,
        });
      }
    } catch (error) {
      console.error('Error loading config:', error);
    }
  };

  const connect = async (magentoUrl, consumerKey, consumerSecret, accessToken, accessTokenSecret) => {
    setLoading(true);
    try {
      const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
      
      const oauthConfig = {
        magento_url: magentoUrl,
        consumer_key: consumerKey,
        consumer_secret: consumerSecret,
        access_token: accessToken,
        access_token_secret: accessTokenSecret,
      };
      
      // Test connection
      const testResponse = await fetch(`${API}/test-connection`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(oauthConfig),
      });
      
      if (!testResponse.ok) {
        let errorMessage = 'Connessione fallita';
        try {
          const error = await testResponse.json();
          errorMessage = error.detail || errorMessage;
        } catch (e) {
          // If response body can't be parsed as JSON, use default message
        }
        throw new Error(errorMessage);
      }
      
      // Get store views
      const storesResponse = await fetch(`${API}/store-views`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(oauthConfig),
      });
      
      if (!storesResponse.ok) {
        let errorMessage = 'Errore nel recupero degli store';
        try {
          const error = await storesResponse.json();
          errorMessage = error.detail || errorMessage;
        } catch (e) {
          // If response body can't be parsed as JSON, use default message
        }
        throw new Error(errorMessage);
      }
      
      const stores = await storesResponse.json();
      
      // Save config
      await fetch(`${API}/save-config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(oauthConfig),
      });
      
      setConfig({
        magentoUrl,
        consumerKey,
        consumerSecret,
        accessToken,
        accessTokenSecret,
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
      consumerKey: '',
      consumerSecret: '',
      accessToken: '',
      accessTokenSecret: '',
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
