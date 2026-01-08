import React, { useState } from 'react';
import { useMagento } from '../context/MagentoContext';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Loader2, Save, Percent } from 'lucide-react';
import { toast } from 'sonner';

export const VatSettings = ({ onClose }) => {
  const { storeViews, vatRates, saveVatRates } = useMagento();
  const [localRates, setLocalRates] = useState({ ...vatRates });
  const [saving, setSaving] = useState(false);

  const handleRateChange = (storeId, value) => {
    setLocalRates(prev => ({
      ...prev,
      [storeId]: value
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Convert string values to numbers
      const numericRates = {};
      Object.entries(localRates).forEach(([key, value]) => {
        numericRates[key] = parseFloat(value) || 0;
      });

      const result = await saveVatRates(numericRates);
      if (result.success) {
        toast.success('Aliquote IVA salvate');
        onClose();
      } else {
        toast.error(result.error || 'Errore nel salvataggio');
      }
    } catch (error) {
      toast.error('Errore nel salvataggio');
    } finally {
      setSaving(false);
    }
  };

  // Common VAT rates for quick selection
  const commonRates = [0, 4, 5, 10, 20, 21, 22, 23, 25, 27];

  return (
    <div className="space-y-4 py-4">
      <p className="text-sm text-slate-500 mb-4">
        I prezzi nel file Excel saranno IVA inclusa. Durante l'import, verranno convertiti automaticamente in prezzi netti usando la formula: <br/>
        <code className="bg-slate-100 px-2 py-1 rounded text-xs">Prezzo Netto = Prezzo IVA inclusa / (1 + Aliquota%/100)</code>
      </p>
      
      <div className="space-y-3 max-h-[300px] overflow-y-auto">
        {storeViews.map((store) => (
          <div key={store.id} className="flex items-center gap-4 p-3 bg-slate-50 rounded-lg">
            <div className="flex-1">
              <Label className="text-sm font-medium text-slate-700">
                {store.name}
              </Label>
              <p className="text-xs text-slate-400">{store.code}</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative w-24">
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={localRates[store.id] || ''}
                  onChange={(e) => handleRateChange(store.id, e.target.value)}
                  placeholder="0"
                  className="pr-8 h-9 text-right"
                  data-testid={`vat-rate-${store.id}`}
                />
                <Percent className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="border-t pt-4">
        <p className="text-xs text-slate-400 mb-2">Aliquote comuni:</p>
        <div className="flex flex-wrap gap-1">
          {commonRates.map((rate) => (
            <Button
              key={rate}
              variant="outline"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => {
                const newRates = { ...localRates };
                storeViews.forEach(store => {
                  newRates[store.id] = rate;
                });
                setLocalRates(newRates);
              }}
            >
              {rate}%
            </Button>
          ))}
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-4 border-t">
        <Button variant="outline" onClick={onClose}>
          Annulla
        </Button>
        <Button onClick={handleSave} disabled={saving} className="gap-2">
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Salva
        </Button>
      </div>
    </div>
  );
};

export default VatSettings;
