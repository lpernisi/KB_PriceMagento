import React, { useState, useRef, useEffect } from 'react';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Check, X, Loader2 } from 'lucide-react';

const formatPrice = (price) => {
  if (price === null || price === undefined || price === '') return null;
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
  }).format(price);
};

export const InlineEdit = ({
  value,
  type = 'text',
  isEditing,
  onEdit,
  onSave,
  onCancel,
  placeholder = '—',
  'data-testid': testId,
}) => {
  const [inputValue, setInputValue] = useState(value ?? '');
  const [saving, setSaving] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  useEffect(() => {
    setInputValue(value ?? '');
  }, [value]);

  const handleSave = async () => {
    setSaving(true);
    let saveValue = inputValue;
    
    if (type === 'price') {
      // Clean and parse price value
      const cleanValue = inputValue.toString().replace(/[€,.\s]/g, '').replace(',', '.');
      saveValue = cleanValue ? parseFloat(cleanValue) : null;
      
      if (saveValue !== null && isNaN(saveValue)) {
        setSaving(false);
        return;
      }
    }
    
    const success = await onSave(saveValue);
    setSaving(false);
    
    if (!success) {
      setInputValue(value ?? '');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      setInputValue(value ?? '');
      onCancel();
    }
  };

  const displayValue = type === 'price' 
    ? formatPrice(value) 
    : value;

  if (isEditing) {
    return (
      <div className="relative flex items-center gap-1" data-testid={testId}>
        <Input
          ref={inputRef}
          type={type === 'price' ? 'number' : 'text'}
          step={type === 'price' ? '0.01' : undefined}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => {
            // Small delay to allow button clicks to register
            setTimeout(() => {
              if (!saving) onCancel();
            }, 150);
          }}
          className="h-8 w-28 px-2 text-right font-mono text-sm border-[#002FA7] ring-1 ring-[#002FA7] rounded-sm focus:outline-none"
          disabled={saving}
        />
        <div className="flex gap-0.5">
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Check className="h-3.5 w-3.5" />
            )}
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 text-slate-400 hover:text-slate-600 hover:bg-slate-100"
            onClick={() => {
              setInputValue(value ?? '');
              onCancel();
            }}
            disabled={saving}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={onEdit}
      className="text-slate-900 cursor-pointer hover:text-[#002FA7] hover:underline decoration-dotted underline-offset-4 font-mono text-sm transition-colors text-right w-full"
      data-testid={testId}
    >
      {displayValue || (
        <span className="text-slate-400 italic font-sans text-xs">{placeholder}</span>
      )}
    </button>
  );
};

export default InlineEdit;
