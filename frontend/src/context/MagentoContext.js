import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const MagentoContext = createContext(null);

export const useMagento = () => {
  const context = useContext(MagentoContext);
  if (!context) {
    throw new Error('useMagento must be used within MagentoProvider');
  }
  return context;
};

// API URLs
const PYTHON_API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const CSHARP_API = process.env.REACT_APP_CSHARP_API_URL || 'https://pricing.kvstore.online/api';

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
  
  // Current user (for audit)
  const [currentUser, setCurrentUser] = useState(localStorage.getItem('currentUser') || 'Operatore');

  // Load VAT rates
  const loadVatRates = useCallback(async () => {
    try {
      const response = await fetch(`${PYTHON_API}/vat-rates`);
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
  }, []);

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

      const response = await fetch(`${PYTHON_API}/vat-rates`, {
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
        const response = await fetch(`${PYTHON_API}/load-config`);
        const data = await response.json();
        
        if (data.success && data.config) {
          const savedConfig = data.config;
          
          if (savedConfig.magento_url && savedConfig.consumer_key && 
              savedConfig.consumer_secret && savedConfig.access_token && 
              savedConfig.access_token_secret) {
            
            setLoading(true);
            
            const oauthConfig = {
              magento_url: savedConfig.magento_url,
              consumer_key: savedConfig.consumer_key,
              consumer_secret: savedConfig.consumer_secret,
              access_token: savedConfig.access_token,
              access_token_secret: savedConfig.access_token_secret,
            };
            
            const testResponse = await fetch(`${PYTHON_API}/test-connection`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(oauthConfig),
            });
            
            if (testResponse.ok) {
              const storesResponse = await fetch(`${PYTHON_API}/store-views`, {
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
                
                await loadVatRates();
              }
            } else {
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
  }, [autoLoginAttempted, loadVatRates]);

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
      
      const testResponse = await fetch(`${PYTHON_API}/test-connection`, {
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
      
      const storesResponse = await fetch(`${PYTHON_API}/store-views`, {
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
      
      await fetch(`${PYTHON_API}/save-config`, {
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

  // C# API Methods
  const importPricesToSqlServer = async (prices, notes = '') => {
    try {
      const response = await fetch(`${CSHARP_API}/prices/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prices: prices,
          importedBy: currentUser,
          notes: notes
        }),
      });
      return await response.json();
    } catch (error) {
      return { success: false, errors: [error.message] };
    }
  };

  const getPendingChanges = async (page = 1, pageSize = 50, storeCode = null) => {
    try {
      const params = new URLSearchParams({ page, pageSize });
      if (storeCode) params.append('storeCode', storeCode);
      
      const response = await fetch(`${CSHARP_API}/prices/pending?${params}`);
      return await response.json();
    } catch (error) {
      return { items: [], totalCount: 0 };
    }
  };

  const getApprovedChanges = async (page = 1, pageSize = 50) => {
    try {
      const response = await fetch(`${CSHARP_API}/prices/approved?page=${page}&pageSize=${pageSize}`);
      return await response.json();
    } catch (error) {
      return { items: [], totalCount: 0 };
    }
  };

  const approveChanges = async (priceChangeIds, notes = '') => {
    try {
      const response = await fetch(`${CSHARP_API}/prices/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          priceChangeIds,
          approvedBy: currentUser,
          notes
        }),
      });
      return await response.json();
    } catch (error) {
      return { success: false, message: error.message };
    }
  };

  const rejectChanges = async (priceChangeIds, reason) => {
    try {
      const response = await fetch(`${CSHARP_API}/prices/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          priceChangeIds,
          rejectedBy: currentUser,
          reason
        }),
      });
      return await response.json();
    } catch (error) {
      return { success: false, message: error.message };
    }
  };

  const publishToMagento = async (priceChangeIds) => {
    try {
      const response = await fetch(`${CSHARP_API}/prices/publish`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Magento-Url': config.magentoUrl,
          'X-Magento-ConsumerKey': config.consumerKey,
          'X-Magento-ConsumerSecret': config.consumerSecret,
          'X-Magento-AccessToken': config.accessToken,
          'X-Magento-AccessTokenSecret': config.accessTokenSecret,
        },
        body: JSON.stringify({
          priceChangeIds,
          publishedBy: currentUser
        }),
      });
      return await response.json();
    } catch (error) {
      return { success: false, publishedCount: 0, errors: [{ error: error.message }] };
    }
  };

  const getPriceHistory = async (sku) => {
    try {
      const response = await fetch(`${CSHARP_API}/prices/history/${encodeURIComponent(sku)}`);
      return await response.json();
    } catch (error) {
      return { changes: [], logs: [] };
    }
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
    currentUser,
    setCurrentUser: (user) => {
      setCurrentUser(user);
      localStorage.setItem('currentUser', user);
    },
    // C# API methods
    importPricesToSqlServer,
    getPendingChanges,
    getApprovedChanges,
    approveChanges,
    rejectChanges,
    publishToMagento,
    getPriceHistory,
    PYTHON_API,
    CSHARP_API,
  };

  return (
    <MagentoContext.Provider value={value}>
      {children}
    </MagentoContext.Provider>
  );
};

export default MagentoContext;
