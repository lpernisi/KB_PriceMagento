import React, { useState, useEffect, useCallback } from 'react';
import { useMagento } from '../context/MagentoContext';
import { Button } from './ui/button';
import { Checkbox } from './ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';
import { Badge } from './ui/badge';
import { 
  Loader2, 
  CheckCircle, 
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Upload,
  Rocket
} from 'lucide-react';
import { toast } from 'sonner';

const formatPrice = (price) => {
  if (price === null || price === undefined) return '—';
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
  }).format(price);
};

const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('it-IT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export const ApprovedChanges = () => {
  const { getApprovedChanges, publishToMagento, config } = useMagento();
  
  const [changes, setChanges] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 50, totalCount: 0 });
  const [publishing, setPublishing] = useState(false);

  const fetchChanges = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getApprovedChanges(pagination.page, pagination.pageSize);
      setChanges(result.items || []);
      setPagination(prev => ({ ...prev, totalCount: result.totalCount || 0 }));
    } catch (error) {
      toast.error('Errore nel caricamento');
    } finally {
      setLoading(false);
    }
  }, [getApprovedChanges, pagination.page, pagination.pageSize]);

  useEffect(() => {
    fetchChanges();
  }, [fetchChanges]);

  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedIds(changes.map(c => c.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id, checked) => {
    if (checked) {
      setSelectedIds(prev => [...prev, id]);
    } else {
      setSelectedIds(prev => prev.filter(i => i !== id));
    }
  };

  const handlePublish = async () => {
    if (selectedIds.length === 0) {
      toast.warning('Seleziona almeno una modifica');
      return;
    }

    if (!config.isConnected) {
      toast.error('Connessione a Magento non attiva');
      return;
    }
    
    setPublishing(true);
    try {
      const result = await publishToMagento(selectedIds);
      
      if (result.publishedCount > 0) {
        toast.success(`${result.publishedCount} modifiche pubblicate su Magento`);
      }
      
      if (result.failedCount > 0) {
        toast.error(`${result.failedCount} modifiche non pubblicate`);
        result.errors?.forEach(err => {
          console.error(`SKU ${err.sku}: ${err.error}`);
        });
      }
      
      setSelectedIds([]);
      fetchChanges();
    } catch (error) {
      toast.error('Errore durante la pubblicazione');
    } finally {
      setPublishing(false);
    }
  };

  const totalPages = Math.ceil(pagination.totalCount / pagination.pageSize);

  return (
    <div className="space-y-4">
      {/* Actions Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-emerald-500" />
            Modifiche Approvate
          </h2>
          {selectedIds.length > 0 && (
            <Badge variant="secondary">{selectedIds.length} selezionate</Badge>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchChanges}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Aggiorna
          </Button>
          
          <Button
            size="sm"
            onClick={handlePublish}
            disabled={selectedIds.length === 0 || publishing || !config.isConnected}
            className="bg-[#002FA7] hover:bg-[#002FA7]/90"
          >
            {publishing ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Rocket className="h-4 w-4 mr-2" />
            )}
            Pubblica su Magento
          </Button>
        </div>
      </div>

      {!config.isConnected && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-amber-700 text-sm">
          ⚠️ Connessione a Magento non attiva. Connettiti per pubblicare le modifiche.
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-[#002FA7]" />
          </div>
        ) : changes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <Upload className="h-12 w-12 mb-4" />
            <p className="text-lg font-medium">Nessuna modifica da pubblicare</p>
            <p className="text-sm">Approva le modifiche in attesa per vederle qui</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectedIds.length === changes.length && changes.length > 0}
                    onCheckedChange={handleSelectAll}
                  />
                </TableHead>
                <TableHead className="text-xs uppercase">SKU</TableHead>
                <TableHead className="text-xs uppercase">Prodotto</TableHead>
                <TableHead className="text-xs uppercase">Store</TableHead>
                <TableHead className="text-xs uppercase text-right">Prezzo Base</TableHead>
                <TableHead className="text-xs uppercase text-right">Prezzo Scontato</TableHead>
                <TableHead className="text-xs uppercase">Date Sconto</TableHead>
                <TableHead className="text-xs uppercase">Approvato da</TableHead>
                <TableHead className="text-xs uppercase">Data Approvazione</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {changes.map((change) => (
                <TableRow key={change.id} className="hover:bg-slate-50">
                  <TableCell>
                    <Checkbox
                      checked={selectedIds.includes(change.id)}
                      onCheckedChange={(checked) => handleSelectOne(change.id, checked)}
                    />
                  </TableCell>
                  <TableCell className="font-mono text-xs">{change.sku}</TableCell>
                  <TableCell className="max-w-[200px] truncate" title={change.productName}>
                    {change.productName}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {change.storeCode}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    {formatPrice(change.newBasePrice)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    {formatPrice(change.newSpecialPrice)}
                  </TableCell>
                  <TableCell className="text-xs text-slate-500">
                    {change.newSpecialPriceFrom && (
                      <div>{formatDate(change.newSpecialPriceFrom).split(',')[0]}</div>
                    )}
                    {change.newSpecialPriceTo && (
                      <div>→ {formatDate(change.newSpecialPriceTo).split(',')[0]}</div>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">{change.approvedBy}</TableCell>
                  <TableCell className="text-xs text-slate-500">
                    {formatDate(change.approvedAt)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
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
    </div>
  );
};

export default ApprovedChanges;
