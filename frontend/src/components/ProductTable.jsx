import React, { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';
import { InlineEdit } from './InlineEdit';
import { DatePicker } from './DatePicker';
import { Badge } from './ui/badge';
import { ExternalLink, ImageOff } from 'lucide-react';

const formatPrice = (price) => {
  if (price === null || price === undefined) return '—';
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
  }).format(price);
};

const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
};

const getPriceStatus = (specialPrice, fromDate, toDate) => {
  if (!specialPrice) return null;
  
  const now = new Date();
  const from = fromDate ? new Date(fromDate) : null;
  const to = toDate ? new Date(toDate) : null;
  
  if (from && now < from) {
    return { label: 'Programmato', variant: 'scheduled' };
  }
  if (to && now > to) {
    return { label: 'Scaduto', variant: 'expired' };
  }
  return { label: 'Attivo', variant: 'active' };
};

const StatusBadge = ({ status }) => {
  if (!status) return null;
  
  const variants = {
    active: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    scheduled: 'bg-blue-100 text-blue-700 border-blue-200',
    expired: 'bg-slate-100 text-slate-500 border-slate-200',
  };
  
  return (
    <Badge 
      variant="outline" 
      className={`text-[10px] font-semibold ${variants[status.variant]}`}
    >
      {status.label}
    </Badge>
  );
};

export const ProductTable = ({ products, onPriceUpdate, storeId }) => {
  const [editingCell, setEditingCell] = useState(null);

  const handleSave = async (sku, field, value) => {
    const priceData = { [field]: value };
    const success = await onPriceUpdate(sku, priceData);
    if (success) {
      setEditingCell(null);
    }
    return success;
  };

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="bg-slate-100/50 hover:bg-slate-100/50">
            <TableHead className="w-[60px] text-[10px] uppercase tracking-widest font-bold text-slate-500">
              Img
            </TableHead>
            <TableHead className="text-[10px] uppercase tracking-widest font-bold text-slate-500">
              SKU
            </TableHead>
            <TableHead className="text-[10px] uppercase tracking-widest font-bold text-slate-500 min-w-[200px]">
              Nome Prodotto
            </TableHead>
            <TableHead className="text-[10px] uppercase tracking-widest font-bold text-slate-500 text-right">
              Prezzo Base
            </TableHead>
            <TableHead className="text-[10px] uppercase tracking-widest font-bold text-slate-500 text-right">
              Prezzo Scontato
            </TableHead>
            <TableHead className="text-[10px] uppercase tracking-widest font-bold text-slate-500">
              Data Inizio
            </TableHead>
            <TableHead className="text-[10px] uppercase tracking-widest font-bold text-slate-500">
              Data Fine
            </TableHead>
            <TableHead className="text-[10px] uppercase tracking-widest font-bold text-slate-500 w-[80px]">
              Stato
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {products.map((product, index) => {
            const priceInfo = product.prices?.[0] || {};
            const status = getPriceStatus(
              priceInfo.special_price,
              priceInfo.special_price_from,
              priceInfo.special_price_to
            );
            
            return (
              <TableRow 
                key={product.sku} 
                className={`border-b border-slate-100 hover:bg-blue-50/30 transition-colors h-14 group ${
                  index % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'
                }`}
                data-testid={`product-row-${product.sku}`}
              >
                {/* Image */}
                <TableCell className="px-4">
                  {product.image_url ? (
                    <a 
                      href={product.image_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="block w-10 h-10 rounded overflow-hidden border border-slate-200 hover:border-blue-400 transition-colors"
                    >
                      <img 
                        src={product.image_url} 
                        alt={product.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.nextSibling.style.display = 'flex';
                        }}
                      />
                      <div className="hidden w-full h-full items-center justify-center bg-slate-100">
                        <ImageOff className="h-4 w-4 text-slate-400" />
                      </div>
                    </a>
                  ) : (
                    <div className="w-10 h-10 rounded border border-slate-200 flex items-center justify-center bg-slate-100">
                      <ImageOff className="h-4 w-4 text-slate-400" />
                    </div>
                  )}
                </TableCell>

                {/* SKU */}
                <TableCell className="px-4 font-mono text-xs tracking-wide text-slate-700">
                  {product.sku}
                </TableCell>

                {/* Name */}
                <TableCell className="px-4 text-sm text-slate-900 font-medium">
                  <div className="flex items-center gap-2">
                    <span className="truncate max-w-[200px]" title={product.name}>
                      {product.name}
                    </span>
                    {product.url && (
                      <a 
                        href={product.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <ExternalLink className="h-3 w-3 text-slate-400 hover:text-blue-500" />
                      </a>
                    )}
                  </div>
                </TableCell>

                {/* Base Price */}
                <TableCell className="px-4 text-right">
                  <InlineEdit
                    value={priceInfo.base_price}
                    type="price"
                    isEditing={editingCell === `${product.sku}-base_price`}
                    onEdit={() => setEditingCell(`${product.sku}-base_price`)}
                    onSave={(value) => handleSave(product.sku, 'base_price', value)}
                    onCancel={() => setEditingCell(null)}
                    data-testid={`base-price-${product.sku}`}
                  />
                </TableCell>

                {/* Special Price */}
                <TableCell className="px-4 text-right">
                  <InlineEdit
                    value={priceInfo.special_price}
                    type="price"
                    isEditing={editingCell === `${product.sku}-special_price`}
                    onEdit={() => setEditingCell(`${product.sku}-special_price`)}
                    onSave={(value) => handleSave(product.sku, 'special_price', value)}
                    onCancel={() => setEditingCell(null)}
                    placeholder="Aggiungi sconto"
                    data-testid={`special-price-${product.sku}`}
                  />
                </TableCell>

                {/* Special Price From */}
                <TableCell className="px-4">
                  <DatePicker
                    value={priceInfo.special_price_from}
                    onChange={(date) => handleSave(product.sku, 'special_price_from', date)}
                    placeholder="Data inizio"
                    data-testid={`date-from-${product.sku}`}
                  />
                </TableCell>

                {/* Special Price To */}
                <TableCell className="px-4">
                  <DatePicker
                    value={priceInfo.special_price_to}
                    onChange={(date) => handleSave(product.sku, 'special_price_to', date)}
                    placeholder="Data fine"
                    data-testid={`date-to-${product.sku}`}
                  />
                </TableCell>

                {/* Status */}
                <TableCell className="px-4">
                  <StatusBadge status={status} />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};

export default ProductTable;
