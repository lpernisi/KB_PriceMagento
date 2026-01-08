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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { 
  Loader2, 
  CheckCircle, 
  XCircle, 
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Clock
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

export const PendingChanges = () => {
  const { getPendingChanges, approveChanges, rejectChanges, selectedStore } = useMagento();
  
  const [changes, setChanges] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 50, totalCount: 0 });
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [processing, setProcessing] = useState(false);

  const fetchChanges = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getPendingChanges(
        pagination.page, 
        pagination.pageSize, 
        selectedStore?.code
      );
      setChanges(result.items || []);
      setPagination(prev => ({ ...prev, totalCount: result.totalCount || 0 }));
    } catch (error) {
      toast.error('Errore nel caricamento');
    } finally {
      setLoading(false);
    }
  }, [getPendingChanges, pagination.page, pagination.pageSize, selectedStore]);

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

  const handleApprove = async () => {
    if (selectedIds.length === 0) {
      toast.warning('Seleziona almeno una modifica');
      return;
    }
    
    setProcessing(true);
    try {
      const result = await approveChanges(selectedIds, '');
      if (result.success) {
        toast.success(`${selectedIds.length} modifiche approvate`);
        setSelectedIds([]);
        fetchChanges();
      } else {
        toast.error(result.message || 'Errore durante l\'approvazione');
      }
    } catch (error) {
      toast.error('Errore durante l\'approvazione');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (selectedIds.length === 0) {
      toast.warning('Seleziona almeno una modifica');
      return;
    }
    
    if (!rejectReason.trim()) {
      toast.warning('Inserisci un motivo per il rifiuto');
      return;
    }
    
    setProcessing(true);
    try {
      const result = await rejectChanges(selectedIds, rejectReason);
      if (result.success) {
        toast.success(`${selectedIds.length} modifiche rifiutate`);
        setSelectedIds([]);
        setRejectReason('');
        setShowRejectDialog(false);
        fetchChanges();
      } else {
        toast.error(result.message || 'Errore durante il rifiuto');
      }
    } catch (error) {
      toast.error('Errore durante il rifiuto');
    } finally {
      setProcessing(false);
    }
  };

  const totalPages = Math.ceil(pagination.totalCount / pagination.pageSize);

  return (
    <div className="space-y-4">
      {/* Actions Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Clock className="h-5 w-5 text-amber-500" />
            Modifiche in Attesa
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
            variant="outline"
            size="sm"
            onClick={() => setShowRejectDialog(true)}
            disabled={selectedIds.length === 0 || processing}
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <XCircle className="h-4 w-4 mr-2" />
            Rifiuta
          </Button>
          
          <Button
            size="sm"
            onClick={handleApprove}
            disabled={selectedIds.length === 0 || processing}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            {processing ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <CheckCircle className="h-4 w-4 mr-2" />
            )}
            Approva
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-[#002FA7]" />
          </div>
        ) : changes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <CheckCircle className="h-12 w-12 mb-4" />
            <p className="text-lg font-medium">Nessuna modifica in attesa</p>
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
                <TableHead className="text-xs uppercase">Creato da</TableHead>
                <TableHead className="text-xs uppercase">Data</TableHead>
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
                  <TableCell className="text-sm">{change.createdBy}</TableCell>
                  <TableCell className="text-xs text-slate-500">
                    {formatDate(change.createdAt)}
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

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rifiuta Modifiche</DialogTitle>
            <DialogDescription>
              Inserisci il motivo del rifiuto per {selectedIds.length} modifiche selezionate.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Motivo del rifiuto..."
              rows={3}
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
                Annulla
              </Button>
              <Button
                variant="destructive"
                onClick={handleReject}
                disabled={processing || !rejectReason.trim()}
              >
                {processing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                Conferma Rifiuto
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PendingChanges;
