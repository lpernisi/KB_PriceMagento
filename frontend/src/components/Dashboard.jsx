import React, { useState, useEffect, useCallback } from 'react';
import { useMagento } from '../context/MagentoContext';
import { ProductTable } from './ProductTable';
import { VatSettings } from './VatSettings';
import { Button } from './ui/button';
import { Input } from './ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './ui/dialog';
import { 
  Store, 
  LogOut, 
  Search, 
  RefreshCw, 
  Loader2,
  Package,
  ChevronLeft,
  ChevronRight,
  Download,
  Upload,
  Settings,
  FileSpreadsheet
} from 'lucide-react';
import { Toaster, toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export const Dashboard = () => {
  const { config, storeViews, selectedStore, setSelectedStore, disconnect, vatRates } = useMagento();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 20,
    totalCount: 0,
  });
  const [showVatSettings, setShowVatSettings] = useState(false);
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);

  const fetchProducts = useCallback(async () => {
    if (!config.isConnected) return;
    
    setLoading(true);
    try {
      const params = new URLSearchParams({
        store_id: selectedStore?.id || 0,
        page: pagination.page,
        page_size: pagination.pageSize,
      });
      
      if (searchTerm) {
        params.append('search', searchTerm);
      }

      const response = await fetch(`${API}/products?${params}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          magento_url: config.magentoUrl,
          consumer_key: config.consumerKey,
          consumer_secret: config.consumerSecret,
          access_token: config.accessToken,
          access_token_secret: config.accessTokenSecret,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Errore nel recupero prodotti');
      }

      const data = await response.json();
      setProducts(data.items || []);
      setPagination(prev => ({
        ...prev,
        totalCount: data.total_count || 0,
      }));
    } catch (error) {
      console.error('Error fetching products:', error);
      toast.error(error.message || 'Errore nel caricamento prodotti');
    } finally {
      setLoading(false);
    }
  }, [config, selectedStore, pagination.page, pagination.pageSize, searchTerm]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleStoreChange = (storeId) => {
    const store = storeViews.find(s => s.id.toString() === storeId);
    setSelectedStore(store);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setPagination(prev => ({ ...prev, page: 1 }));
    fetchProducts();
  };

  const handlePriceUpdate = async (sku, priceData) => {
    try {
      const response = await fetch(`${API}/update-price`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          magento_url: config.magentoUrl,
          consumer_key: config.consumerKey,
          consumer_secret: config.consumerSecret,
          access_token: config.accessToken,
          access_token_secret: config.accessTokenSecret,
          sku,
          store_id: selectedStore?.id || 0,
          ...priceData,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Errore aggiornamento');
      }

      toast.success('Prezzo aggiornato con successo');
      fetchProducts();
      return true;
    } catch (error) {
      toast.error(error.message || 'Errore aggiornamento prezzo');
      return false;
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const response = await fetch(`${API}/export-prices`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          magento_url: config.magentoUrl,
          consumer_key: config.consumerKey,
          consumer_secret: config.consumerSecret,
          access_token: config.accessToken,
          access_token_secret: config.accessTokenSecret,
        }),
      });

      if (!response.ok) {
        throw new Error('Errore durante l\'export');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `prezzi_magento_${new Date().toISOString().slice(0,10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
      
      toast.success('Export completato!');
    } catch (error) {
      toast.error(error.message || 'Errore durante l\'export');
    } finally {
      setExporting(false);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const response = await fetch(`${API}/download-template`);
      
      if (!response.ok) {
        throw new Error('Errore download template');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'template_prezzi.xlsx';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (error) {
      toast.error('Errore download template');
    }
  };

  const handleImport = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImporting(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const params = new URLSearchParams({
        magento_url: config.magentoUrl,
        consumer_key: config.consumerKey,
        consumer_secret: config.consumerSecret,
        access_token: config.accessToken,
        access_token_secret: config.accessTokenSecret,
      });

      const response = await fetch(`${API}/import-prices?${params}`, {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (result.success) {
        toast.success(`${result.updated_count} prodotti aggiornati`);
        if (result.errors && result.errors.length > 0) {
          toast.warning(`${result.errors.length} errori durante l'import`);
          console.log('Import errors:', result.errors);
        }
        fetchProducts();
      } else {
        throw new Error(result.detail || 'Errore durante l\'import');
      }
    } catch (error) {
      toast.error(error.message || 'Errore durante l\'import');
    } finally {
      setImporting(false);
      event.target.value = '';
    }
  };

  const totalPages = Math.ceil(pagination.totalCount / pagination.pageSize);

  return (
    <div className="min-h-screen bg-slate-50/50">
      <Toaster position="top-right" richColors />
      
      {/* Top Bar */}
      <header className="h-16 border-b bg-white/80 backdrop-blur-md sticky top-0 z-40 flex items-center px-6 justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-[#002FA7] flex items-center justify-center">
              <Store className="h-4 w-4 text-white" />
            </div>
            <h1 className="text-xl font-bold tracking-tight font-['Chivo'] text-slate-900">
              Price Manager
            </h1>
          </div>
          
          {/* Store Selector */}
          <div className="ml-6">
            <Select
              value={selectedStore?.id?.toString() || ''}
              onValueChange={handleStoreChange}
            >
              <SelectTrigger 
                className="w-[220px] h-10 border-slate-200 bg-white shadow-sm hover:bg-slate-50 transition-colors"
                data-testid="store-selector"
              >
                <SelectValue placeholder="Seleziona Store" />
              </SelectTrigger>
              <SelectContent className="shadow-[0_4px_20px_rgba(0,0,0,0.08)]">
                {storeViews.map((store) => (
                  <SelectItem 
                    key={store.id} 
                    value={store.id.toString()}
                    data-testid={`store-option-${store.id}`}
                  >
                    {store.name} ({store.code})
                    {vatRates[store.id] ? ` - IVA ${vatRates[store.id]}%` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* VAT Settings */}
          <Dialog open={showVatSettings} onOpenChange={setShowVatSettings}>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                data-testid="vat-settings-button"
              >
                <Settings className="h-4 w-4" />
                Aliquote IVA
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Configurazione Aliquote IVA</DialogTitle>
                <DialogDescription>
                  Imposta l'aliquota IVA per ogni store. I prezzi importati verranno convertiti automaticamente in prezzi netti.
                </DialogDescription>
              </DialogHeader>
              <VatSettings onClose={() => setShowVatSettings(false)} />
            </DialogContent>
          </Dialog>

          {/* Download Template */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadTemplate}
            className="gap-2"
            data-testid="download-template-button"
          >
            <FileSpreadsheet className="h-4 w-4" />
            Template
          </Button>

          {/* Export */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            disabled={exporting}
            className="gap-2"
            data-testid="export-button"
          >
            {exporting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            Export
          </Button>

          {/* Import */}
          <div className="relative">
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleImport}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              disabled={importing}
              data-testid="import-input"
            />
            <Button
              variant="outline"
              size="sm"
              disabled={importing}
              className="gap-2 pointer-events-none"
            >
              {importing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              Import
            </Button>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={fetchProducts}
            disabled={loading}
            className="gap-2"
            data-testid="refresh-button"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Aggiorna
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={disconnect}
            className="gap-2 text-slate-500 hover:text-slate-700"
            data-testid="disconnect-button"
          >
            <LogOut className="h-4 w-4" />
            Disconnetti
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-6 max-w-7xl mx-auto">
        {/* Search Bar */}
        <div className="mb-6">
          <form onSubmit={handleSearch} className="flex gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                type="text"
                placeholder="Cerca per SKU o nome prodotto..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-10 border-slate-200"
                data-testid="search-input"
              />
            </div>
            <Button 
              type="submit" 
              variant="secondary"
              className="h-10"
              data-testid="search-button"
            >
              Cerca
            </Button>
          </form>
        </div>

        {/* Products Table */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-[0_2px_8px_rgba(0,0,0,0.04)] overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-[#002FA7]" />
            </div>
          ) : products.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
              <Package className="h-12 w-12 mb-4" />
              <p className="text-lg font-medium">Nessun prodotto trovato</p>
              <p className="text-sm">Prova a modificare i filtri di ricerca</p>
            </div>
          ) : (
            <ProductTable 
              products={products} 
              onPriceUpdate={handlePriceUpdate}
              storeId={selectedStore?.id || 0}
            />
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-4 flex items-center justify-between">
            <p className="text-sm text-slate-500">
              Pagina {pagination.page} di {totalPages} ({pagination.totalCount} prodotti)
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page === 1}
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                data-testid="prev-page-button"
              >
                <ChevronLeft className="h-4 w-4" />
                Precedente
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page >= totalPages}
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                data-testid="next-page-button"
              >
                Successiva
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
