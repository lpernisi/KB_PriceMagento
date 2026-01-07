import React, { useState } from 'react';
import { Calendar } from './ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Button } from './ui/button';
import { Calendar as CalendarIcon, X } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';

export const DatePicker = ({ 
  value, 
  onChange, 
  placeholder = 'Seleziona data',
  'data-testid': testId 
}) => {
  const [open, setOpen] = useState(false);
  
  const parseDate = (dateStr) => {
    if (!dateStr) return undefined;
    try {
      // Handle different date formats
      if (dateStr.includes('T')) {
        return parseISO(dateStr);
      }
      return new Date(dateStr);
    } catch {
      return undefined;
    }
  };

  const formatDateStr = (date) => {
    if (!date) return null;
    // Format for Magento: YYYY-MM-DD
    return format(date, 'yyyy-MM-dd');
  };

  const displayDate = parseDate(value);

  const handleSelect = (date) => {
    onChange(formatDateStr(date));
    setOpen(false);
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange(null);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          className={`h-8 px-2 text-xs font-normal justify-start gap-1.5 hover:bg-slate-100 ${
            !value ? 'text-slate-400' : 'text-slate-700'
          }`}
          data-testid={testId}
        >
          <CalendarIcon className="h-3.5 w-3.5" />
          {displayDate ? (
            <span className="font-mono">
              {format(displayDate, 'dd/MM/yyyy', { locale: it })}
            </span>
          ) : (
            <span className="italic">{placeholder}</span>
          )}
          {value && (
            <X 
              className="h-3 w-3 ml-1 text-slate-400 hover:text-slate-600" 
              onClick={handleClear}
            />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 shadow-[0_4px_20px_rgba(0,0,0,0.08)]" align="start">
        <Calendar
          mode="single"
          selected={displayDate}
          onSelect={handleSelect}
          locale={it}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
};

export default DatePicker;
