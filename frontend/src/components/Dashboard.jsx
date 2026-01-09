import React, { useState, useEffect, useCallback } from 'react';
import { useMagento } from '../context/MagentoContext';
import { ProductTable } from './ProductTable';
import { PendingChanges } from './PendingChanges';
import { ApprovedChanges } from './ApprovedChanges';
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from './ui/tabs';
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
  Settings,
  FileSpreadsheet,
  Clock,
  CheckCircle,
  User
} from 'lucide-react';
import { Toaster, toast } from 'sonner';

export const Dashboard = () => {
  const { 
    config, 
    storeViews, 
    selectedStore, 
    setSelectedStore, 
    disconnect, 
    vatRates,
    currentUser,
    setCurrentUser,
    PYTHON_API
  } = useMagento();
  
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 20,
    totalCount: 0,
  });
  const [showVatSettings, setShowVatSettings] = useState(false);
  const [showUserSettings, setShowUserSettings] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [activeTab, setActiveTab] = useState('pending');
  const [tempUser, setTempUser] = useState(currentUser);

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

      const response = await fetch(`${PYTHON_API}/products?${params}`, {
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
  }, [config, selectedStore, pagination.page, pagination.pageSize, searchTerm, PYTHON_API]);

  useEffect(() => {
    if (activeTab === 'products') {
      fetchProducts();
    }
  }, [fetchProducts, activeTab]);

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

  const handleExport = async () => {
    setExporting(true);
    try {
      const response = await fetch(`${PYTHON_API}/export-prices`, {
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
      const response = await fetch(`${PYTHON_API}/download-template`);
      
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
              value={selectedStore?.id?.toString() || 'none'}
              onValueChange={handleStoreChange}
            >
              <SelectTrigger 
                className="w-[220px] h-10 border-slate-200 bg-white shadow-sm hover:bg-slate-50 transition-colors"
                data-testid="store-selector"
              >
                <SelectValue placeholder="Seleziona Store" />
              </SelectTrigger>
              <SelectContent className="shadow-[0_4px_20px_rgba(0,0,0,0.08)]">
                {storeViews.length === 0 ? (
                  <SelectItem value="none" disabled>Nessuno store</SelectItem>
                ) : (
                  storeViews.map((store) => (
                    <SelectItem 
                      key={store.id} 
                      value={store.id.toString()}
                    >
                      {store.name} ({store.code})
                      {vatRates[store.id] ? ` - IVA ${vatRates[store.id]}%` : ''}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* User Settings */}
          <Dialog open={showUserSettings} onOpenChange={setShowUserSettings}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <User className="h-4 w-4" />
                {currentUser}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-sm">
              <DialogHeader>
                <DialogTitle>Utente Corrente</DialogTitle>
                <DialogDescription>
                  Questo nome verrà registrato nel log delle modifiche
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <Input
                  value={tempUser}
                  onChange={(e) => setTempUser(e.target.value)}
                  placeholder="Nome utente"
                />
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowUserSettings(false)}>
                    Annulla
                  </Button>
                  <Button onClick={() => {
                    setCurrentUser(tempUser);
                    setShowUserSettings(false);
                    toast.success('Utente aggiornato');
                  }}>
                    Salva
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* VAT Settings */}
          <Dialog open={showVatSettings} onOpenChange={setShowVatSettings}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Settings className="h-4 w-4" />
                IVA
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Configurazione Aliquote IVA</DialogTitle>
                <DialogDescription>
                  I prezzi importati verranno convertiti automaticamente in prezzi netti.
                </DialogDescription>
              </DialogHeader>
              <VatSettings onClose={() => setShowVatSettings(false)} />
            </DialogContent>
          </Dialog>

          {/* Template */}
          <Button variant="outline" size="sm" onClick={handleDownloadTemplate} className="gap-2">
            <FileSpreadsheet className="h-4 w-4" />
            Template
          </Button>

          {/* Export */}
          <Button variant="outline" size="sm" onClick={handleExport} disabled={exporting} className="gap-2">
            {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Export
          </Button>

          <Button variant="ghost" size="sm" onClick={disconnect} className="gap-2 text-slate-500 hover:text-slate-700">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </header>

      {/* Main Content with Tabs */}
      <main className="p-6 max-w-7xl mx-auto">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-white border shadow-sm">
            <TabsTrigger value="pending" className="gap-2">
              <Clock className="h-4 w-4" />
              In Attesa
            </TabsTrigger>
            <TabsTrigger value="approved" className="gap-2">
              <CheckCircle className="h-4 w-4" />
              Approvati
            </TabsTrigger>
            <TabsTrigger value="products" className="gap-2">
              <Package className="h-4 w-4" />
              Prodotti Magento
            </TabsTrigger>
          </TabsList>

          {/* Pending Changes Tab */}
          <TabsContent value="pending">
            <PendingChanges />
          </TabsContent>

          {/* Approved Changes Tab */}
          <TabsContent value="approved">
            <ApprovedChanges />
          </TabsContent>

          {/* Products Tab */}
          <TabsContent value="products" className="space-y-6">
            {/* Search Bar */}
            <div className="flex gap-3">
              <form onSubmit={handleSearch} className="flex gap-3 flex-1 max-w-md">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    type="text"
                    placeholder="Cerca per SKU o nome prodotto..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 h-10 border-slate-200"
                  />
                </div>
                <Button type="submit" variant="secondary" className="h-10">
                  Cerca
                </Button>
              </form>
              <Button variant="outline" size="sm" onClick={fetchProducts} disabled={loading} className="gap-2 h-10">
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                Aggiorna
              </Button>
            </div>

            {/* Products Table */}
            <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
              {loading ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="h-8 w-8 animate-spin text-[#002FA7]" />
                </div>
              ) : products.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                  <Package className="h-12 w-12 mb-4" />
                  <p className="text-lg font-medium">Nessun prodotto trovato</p>
                </div>
              ) : (
                <ProductTable products={products} storeId={selectedStore?.id || 0} />
              )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-500">
                  Pagina {pagination.page} di {totalPages} ({pagination.totalCount} prodotti)
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={pagination.page === 1}
                    onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Precedente
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={pagination.page >= totalPages}
                    onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                  >
                    Successiva
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Dashboard;
