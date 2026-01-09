import React, { useState, useEffect, useCallback } from 'react';
import { useMagento } from '../context/MagentoContext';
import { Button } from './ui/button';
import { Input } from './ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';
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
  DialogFooter,
} from './ui/dialog';
import { Badge } from './ui/badge';
import { 
  Loader2, 
  CheckCircle, 
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Clock,
  Edit2,
  Save,
  X,
  Filter
} from 'lucide-react';
import { toast } from 'sonner';

const formatPrice = (price) => {
  if (price === null || price === undefined) return '—';
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
  }).format(price);
};

export const PendingChanges = () => {
  const { 
    selectedStore, 
    getPendingRows, 
    updateRow, 
    approveBatch,
    getLookup 
  } = useMagento();
  
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 50, totalCount: 0 });
  const [editingRow, setEditingRow] = useState(null);
  const [editData, setEditData] = useState({});
  const [saving, setSaving] = useState(false);
  const [approving, setApproving] = useState(false);
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [selectedBatchId, setSelectedBatchId] = useState(null);
  
  // Lookup per filtri
  const [lookup, setLookup] = useState({ categorie: [], linee: [], marche: [] });
  const [filters, setFilters] = useState({ categoria: '', linea: '', marca: '' });

  // Carica lookup quando cambia lo store
  useEffect(() => {
    const loadLookup = async () => {
      if (selectedStore?.code) {
        const result = await getLookup(selectedStore.code);
        if (!result.error) {
          setLookup({
            categorie: result.categorie || [],
            linee: result.linee || [],
            marche: result.marche || []
          });
        }
      }
    };
    loadLookup();
  }, [selectedStore, getLookup]);

  const fetchRows = useCallback(async () => {
    if (!selectedStore?.code) return;
    
    setLoading(true);
    try {
      const result = await getPendingRows(
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
  }, [getPendingRows, selectedStore, pagination.page, pagination.pageSize]);

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

  const handleEditRow = (row) => {
    setEditingRow(row.rowId);
    setEditData({
      newPrice: row.newPrice || '',
      newSpecialPrice: row.newSpecialPrice || '',
    });
  };

  const handleCancelEdit = () => {
    setEditingRow(null);
    setEditData({});
  };

  const handleSaveRow = async (rowId) => {
    setSaving(true);
    try {
      const result = await updateRow(rowId, editData);
      
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success('Riga aggiornata');
        setEditingRow(null);
        setEditData({});
        fetchRows();
      }
    } catch (error) {
      toast.error('Errore nel salvataggio');
    } finally {
      setSaving(false);
    }
  };

  const handleApproveBatch = async () => {
    if (!selectedBatchId) return;
    
    setApproving(true);
    try {
      const result = await approveBatch(selectedBatchId);
      
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(`Batch #${selectedBatchId} approvato`);
        setShowApproveDialog(false);
        setSelectedBatchId(null);
        fetchRows();
      }
    } catch (error) {
      toast.error('Errore nell\'approvazione');
    } finally {
      setApproving(false);
    }
  };

  const openApproveDialog = (batchId) => {
    setSelectedBatchId(batchId);
    setShowApproveDialog(true);
  };

  const totalPages = Math.ceil(pagination.totalCount / pagination.pageSize);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Clock className="h-5 w-5 text-amber-500" />
            Righe in Attesa di Approvazione
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

      {/* Filtri usando lookup */}
      <div className="flex gap-3 p-4 bg-slate-50 rounded-lg">
        <Filter className="h-5 w-5 text-slate-400 mt-2" />
        
        <Select value={filters.categoria} onValueChange={(v) => setFilters(f => ({ ...f, categoria: v }))}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Categoria" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Tutte</SelectItem>
            {lookup.categorie.map(cat => (
              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filters.linea} onValueChange={(v) => setFilters(f => ({ ...f, linea: v }))}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Linea" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Tutte</SelectItem>
            {lookup.linee.map(lin => (
              <SelectItem key={lin} value={lin}>{lin}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filters.marca} onValueChange={(v) => setFilters(f => ({ ...f, marca: v }))}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Marca" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Tutte</SelectItem>
            {lookup.marche.map(mar => (
              <SelectItem key={mar} value={mar}>{mar}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Contenuto */}
      <div className="space-y-6">
        {loading ? (
          <div className="flex items-center justify-center py-20 bg-white rounded-lg border">
            <Loader2 className="h-8 w-8 animate-spin text-[#002FA7]" />
          </div>
        ) : Object.keys(batchGroups).length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-lg border text-slate-400">
            <CheckCircle className="h-12 w-12 mb-4" />
            <p className="text-lg font-medium">Nessuna modifica in attesa</p>
          </div>
        ) : (
          Object.entries(batchGroups).map(([batchId, batchRows]) => (
            <div key={batchId} className="bg-white rounded-lg border shadow-sm overflow-hidden">
              {/* Batch Header */}
              <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b">
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="font-mono">
                    Batch #{batchId}
                  </Badge>
                  <span className="text-sm text-slate-500">
                    {batchRows.length} righe
                  </span>
                </div>
                <Button
                  size="sm"
                  onClick={() => openApproveDialog(batchId)}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Approva Batch
                </Button>
              </div>

              {/* Batch Rows Table */}
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/50">
                    <TableHead className="text-xs uppercase">SKU</TableHead>
                    <TableHead className="text-xs uppercase">Store</TableHead>
                    <TableHead className="text-xs uppercase text-right">Prezzo Attuale</TableHead>
                    <TableHead className="text-xs uppercase text-right">Nuovo Prezzo</TableHead>
                    <TableHead className="text-xs uppercase">Stato</TableHead>
                    <TableHead className="text-xs uppercase">Errore</TableHead>
                    <TableHead className="text-xs uppercase w-24">Azioni</TableHead>
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
                      <TableCell className="text-right">
                        {editingRow === row.rowId ? (
                          <Input
                            type="number"
                            step="0.01"
                            value={editData.newPrice}
                            onChange={(e) => setEditData(d => ({ ...d, newPrice: e.target.value }))}
                            className="w-28 h-8 text-right font-mono"
                          />
                        ) : (
                          <span className="font-mono text-sm font-medium">
                            {formatPrice(row.newPrice)}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={row.stato === 'Draft' ? 'secondary' : 'outline'}
                          className="text-xs"
                        >
                          {row.stato}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-red-500 max-w-[150px] truncate">
                        {row.errore || '—'}
                      </TableCell>
                      <TableCell>
                        {editingRow === row.rowId ? (
                          <div className="flex gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7"
                              onClick={() => handleSaveRow(row.rowId)}
                              disabled={saving}
                            >
                              {saving ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Save className="h-4 w-4 text-emerald-600" />
                              )}
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7"
                              onClick={handleCancelEdit}
                            >
                              <X className="h-4 w-4 text-slate-400" />
                            </Button>
                          </div>
                        ) : (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            onClick={() => handleEditRow(row)}
                          >
                            <Edit2 className="h-4 w-4 text-slate-400" />
                          </Button>
                        )}
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

      {/* Dialog conferma approvazione BATCH */}
      <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Conferma Approvazione Batch</DialogTitle>
            <DialogDescription>
              Stai per approvare il Batch #{selectedBatchId}.
              <br /><br />
              Questa azione approverà TUTTE le righe del batch.
              Dopo l'approvazione le righe non saranno più modificabili.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApproveDialog(false)}>
              Annulla
            </Button>
            <Button
              onClick={handleApproveBatch}
              disabled={approving}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {approving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle className="h-4 w-4 mr-2" />
              )}
              Conferma Approvazione
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PendingChanges;
