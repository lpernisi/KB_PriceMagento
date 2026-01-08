import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

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
  const [vatRates, setVatRates] = useState({});
  const [loading, setLoading] = useState(false);
  const [autoLoginAttempted, setAutoLoginAttempted] = useState(false);

  const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

  // Load VAT rates
  const loadVatRates = useCallback(async () => {
    try {
      const response = await fetch(`${API}/vat-rates`);
      const data = await response.json();
      if (data.success && data.vat_rates) {
        const ratesMap = {};
        data.vat_rates.forEach(rate => {
          ratesMap[rate.store_id] = rate.vat_rate;
        });
        setVatRates(ratesMap);
      }
    } catch (error) {
      console.error('Error loading VAT rates:', error);
    }
  }, [API]);

  // Save VAT rates
  const saveVatRates = async (rates) => {
    try {
      const ratesArray = Object.entries(rates).map(([storeId, vatRate]) => {
        const store = storeViews.find(s => s.id === parseInt(storeId));
        return {
          store_id: parseInt(storeId),
          store_name: store?.name || '',
          vat_rate: parseFloat(vatRate) || 0
        };
      });

      const response = await fetch(`${API}/vat-rates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vat_rates: ratesArray }),
      });

      if (response.ok) {
        setVatRates(rates);
        return { success: true };
      }
      return { success: false, error: 'Errore nel salvataggio' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  // Try auto-login on mount
  useEffect(() => {
    const attemptAutoLogin = async () => {
      if (autoLoginAttempted) return;
      setAutoLoginAttempted(true);
      
      try {
        const response = await fetch(`${API}/load-config`);
        const data = await response.json();
        
        if (data.success && data.config) {
          const savedConfig = data.config;
          
          // Check if we have all required fields
          if (savedConfig.magento_url && savedConfig.consumer_key && 
              savedConfig.consumer_secret && savedConfig.access_token && 
              savedConfig.access_token_secret) {
            
            // Try to connect automatically
            setLoading(true);
            
            const oauthConfig = {
              magento_url: savedConfig.magento_url,
              consumer_key: savedConfig.consumer_key,
              consumer_secret: savedConfig.consumer_secret,
              access_token: savedConfig.access_token,
              access_token_secret: savedConfig.access_token_secret,
            };
            
            // Test connection
            const testResponse = await fetch(`${API}/test-connection`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(oauthConfig),
            });
            
            if (testResponse.ok) {
              // Get store views
              const storesResponse = await fetch(`${API}/store-views`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(oauthConfig),
              });
              
              if (storesResponse.ok) {
                const stores = await storesResponse.json();
                
                setConfig({
                  magentoUrl: savedConfig.magento_url,
                  consumerKey: savedConfig.consumer_key,
                  consumerSecret: savedConfig.consumer_secret,
                  accessToken: savedConfig.access_token,
                  accessTokenSecret: savedConfig.access_token_secret,
                  isConnected: true,
                });
                setStoreViews(stores);
                setSelectedStore(stores.length > 0 ? stores[0] : null);
                
                // Load VAT rates
                await loadVatRates();
              }
            } else {
              // Connection failed, show form with saved values
              setConfig({
                magentoUrl: savedConfig.magento_url,
                consumerKey: savedConfig.consumer_key,
                consumerSecret: savedConfig.consumer_secret,
                accessToken: savedConfig.access_token,
                accessTokenSecret: savedConfig.access_token_secret,
                isConnected: false,
              });
            }
            
            setLoading(false);
          }
        }
      } catch (error) {
        console.error('Auto-login error:', error);
        setLoading(false);
      }
    };
    
    attemptAutoLogin();
  }, [API, autoLoginAttempted, loadVatRates]);

  const connect = async (magentoUrl, consumerKey, consumerSecret, accessToken, accessTokenSecret) => {
    setLoading(true);
    try {
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
        } catch (e) {}
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
        } catch (e) {}
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
      
      // Load VAT rates
      await loadVatRates();
      
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
    vatRates,
    setVatRates,
    saveVatRates,
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
