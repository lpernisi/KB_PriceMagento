import React, { useState, useEffect, useCallback } from 'react';
import { useMagento } from '../context/MagentoContext';
import { Button } from './ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from './ui/dialog';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from './ui/alert';
import { Badge } from './ui/badge';
import { 
  Loader2, 
  CheckCircle, 
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Rocket,
  AlertTriangle,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import { toast } from 'sonner';

const formatPrice = (price) => {
  if (price === null || price === undefined) return '—';
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
  }).format(price);
};

export const ApprovedChanges = () => {
  const { selectedStore, getApprovedRows, publishBatch } = useMagento();
  
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 50, totalCount: 0 });
  
  // Pubblicazione
  const [showPublishDialog, setShowPublishDialog] = useState(false);
  const [selectedBatchId, setSelectedBatchId] = useState(null);
  const [publishing, setPublishing] = useState(false);
  const [publishResult, setPublishResult] = useState(null);

  const fetchRows = useCallback(async () => {
    if (!selectedStore?.code) return;
    
    setLoading(true);
    try {
      const result = await getApprovedRows(
        selectedStore.code,
        pagination.page, 
        pagination.pageSize
      );
      
      if (result.error) {
        toast.error(result.error);
        setRows([]);
      } else {
        setRows(result.items || []);
        setPagination(prev => ({ 
          ...prev, 
          totalCount: result.totalCount || 0 
        }));
      }
    } catch (error) {
      toast.error('Errore nel caricamento');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [getApprovedRows, selectedStore, pagination.page, pagination.pageSize]);

  useEffect(() => {
    fetchRows();
  }, [fetchRows]);

  // Raggruppa righe per batchId
  const batchGroups = rows.reduce((acc, row) => {
    const batchId = row.batchId;
    if (!acc[batchId]) {
      acc[batchId] = [];
    }
    acc[batchId].push(row);
    return acc;
  }, {});

  const openPublishDialog = (batchId) => {
    setSelectedBatchId(batchId);
    setPublishResult(null);
    setShowPublishDialog(true);
  };

  const handlePublish = async () => {
    if (!selectedBatchId) return;
    
    setPublishing(true);
    setPublishResult(null);
    
    try {
      const result = await publishBatch(selectedBatchId);
      setPublishResult(result);
      
      if (result.error) {
        toast.error(result.error);
      } else if (result.success === true || result.esito === 'success') {
        toast.success(`Batch #${selectedBatchId} pubblicato su Magento`);
        fetchRows();
      } else if (result.esito === 'partial') {
        toast.warning('Pubblicazione parziale: alcuni SKU hanno avuto errori');
      } else {
        toast.error('Pubblicazione fallita');
      }
    } catch (error) {
      toast.error('Errore durante la pubblicazione');
      setPublishResult({ error: error.message });
    } finally {
      setPublishing(false);
    }
  };

  const totalPages = Math.ceil(pagination.totalCount / pagination.pageSize);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-emerald-500" />
            Batch Approvati
          </h2>
          <Badge variant="secondary">{pagination.totalCount} righe</Badge>
        </div>
        
        <Button
          variant="outline"
          size="sm"
          onClick={fetchRows}
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Aggiorna
        </Button>
      </div>

      {/* Info Box */}
      <Alert className="bg-blue-50 border-blue-200">
        <AlertTriangle className="h-4 w-4 text-blue-600" />
        <AlertTitle className="text-blue-800">Pubblicazione su Magento</AlertTitle>
        <AlertDescription className="text-blue-700">
          I batch approvati devono essere pubblicati esplicitamente su Magento.
          L'approvazione è una validazione interna, la pubblicazione applica i prezzi sul negozio.
        </AlertDescription>
      </Alert>

      {/* Contenuto */}
      <div className="space-y-6">
        {loading ? (
          <div className="flex items-center justify-center py-20 bg-white rounded-lg border">
            <Loader2 className="h-8 w-8 animate-spin text-[#002FA7]" />
          </div>
        ) : Object.keys(batchGroups).length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-lg border text-slate-400">
            <Rocket className="h-12 w-12 mb-4" />
            <p className="text-lg font-medium">Nessun batch approvato</p>
            <p className="text-sm">Approva i batch dalla sezione "In Attesa"</p>
          </div>
        ) : (
          Object.entries(batchGroups).map(([batchId, batchRows]) => (
            <div key={batchId} className="bg-white rounded-lg border shadow-sm overflow-hidden">
              {/* Batch Header */}
              <div className="flex items-center justify-between px-4 py-3 bg-emerald-50 border-b">
                <div className="flex items-center gap-3">
                  <Badge className="bg-emerald-100 text-emerald-700 font-mono">
                    Batch #{batchId}
                  </Badge>
                  <span className="text-sm text-slate-500">
                    {batchRows.length} righe
                  </span>
                  <Badge variant="outline" className="text-emerald-600 border-emerald-300">
                    Approvato
                  </Badge>
                </div>
                <Button
                  size="sm"
                  onClick={() => openPublishDialog(batchId)}
                  className="bg-[#002FA7] hover:bg-[#002FA7]/90"
                >
                  <Rocket className="h-4 w-4 mr-2" />
                  Pubblica su Magento
                </Button>
              </div>

              {/* Batch Rows Table - SOLO LETTURA */}
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/50">
                    <TableHead className="text-xs uppercase">SKU</TableHead>
                    <TableHead className="text-xs uppercase">Store</TableHead>
                    <TableHead className="text-xs uppercase text-right">Prezzo Attuale</TableHead>
                    <TableHead className="text-xs uppercase text-right">Nuovo Prezzo</TableHead>
                    <TableHead className="text-xs uppercase">Stato</TableHead>
                    <TableHead className="text-xs uppercase">Errore</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {batchRows.map((row) => (
                    <TableRow key={row.rowId} className="hover:bg-slate-50">
                      <TableCell className="font-mono text-xs">{row.sku}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {row.store}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm text-slate-500">
                        {formatPrice(row.currentPrice)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm font-medium">
                        {formatPrice(row.newPrice)}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant="outline"
                          className={`text-xs ${
                            row.stato === 'Published' 
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                              : ''
                          }`}
                        >
                          {row.stato}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-red-500 max-w-[150px] truncate">
                        {row.errore || '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-500">
            Pagina {pagination.page} di {totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page === 1}
              onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page >= totalPages}
              onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Dialog conferma pubblicazione */}
      <Dialog open={showPublishDialog} onOpenChange={setShowPublishDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Rocket className="h-5 w-5 text-[#002FA7]" />
              Pubblica su Magento
            </DialogTitle>
            <DialogDescription>
              Stai per pubblicare il Batch #{selectedBatchId} su Magento.
              <br /><br />
              Questa azione applicherà i nuovi prezzi direttamente sul negozio Magento.
            </DialogDescription>
          </DialogHeader>

          {/* Risultato pubblicazione */}
          {publishResult && (
            <div className="py-4 space-y-3">
              {publishResult.esito === 'success' || publishResult.success === true ? (
                <Alert className="bg-emerald-50 border-emerald-200">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <AlertTitle className="text-emerald-800">Pubblicazione completata</AlertTitle>
                  <AlertDescription className="text-emerald-700">
                    Tutti i prezzi sono stati aggiornati su Magento.
                  </AlertDescription>
                </Alert>
              ) : publishResult.esito === 'partial' ? (
                <Alert className="bg-amber-50 border-amber-200">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <AlertTitle className="text-amber-800">Pubblicazione parziale</AlertTitle>
                  <AlertDescription className="text-amber-700">
                    Alcuni SKU non sono stati aggiornati. Controlla gli errori.
                  </AlertDescription>
                </Alert>
              ) : publishResult.error || publishResult.esito === 'error' ? (
                <Alert className="bg-red-50 border-red-200">
                  <XCircle className="h-4 w-4 text-red-600" />
                  <AlertTitle className="text-red-800">Pubblicazione fallita</AlertTitle>
                  <AlertDescription className="text-red-700">
                    {publishResult.error || 'Errore durante la pubblicazione'}
                  </AlertDescription>
                </Alert>
              ) : null}

              {/* Lista errori per riga */}
              {publishResult.errori && publishResult.errori.length > 0 && (
                <div className="max-h-40 overflow-y-auto border rounded p-2 bg-slate-50">
                  <p className="text-xs font-medium text-slate-500 mb-2">Errori per SKU:</p>
                  {publishResult.errori.map((err, idx) => (
                    <div key={idx} className="text-xs text-red-600 py-1 border-b last:border-0">
                      <span className="font-mono">{err.sku}</span>: {err.errore}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPublishDialog(false)}>
              {publishResult ? 'Chiudi' : 'Annulla'}
            </Button>
            {!publishResult && (
              <Button
                onClick={handlePublish}
                disabled={publishing}
                className="bg-[#002FA7] hover:bg-[#002FA7]/90"
              >
                {publishing ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Rocket className="h-4 w-4 mr-2" />
                )}
                Conferma Pubblicazione
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ApprovedChanges;
