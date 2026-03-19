import { useVirtualizer } from '@tanstack/react-virtual';
import { useRef, useMemo, useState, useCallback, useEffect } from 'react';
import { format, parse, isValid } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { toast } from 'sonner';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type CellType = 'text' | 'number' | 'date' | 'time' | 'datetime';

interface EditingCell {
  rowIndex: number;
  colIndex: number;
  value: string;
}

interface DataTableProps {
  columns: string[];
  columnTypes: Record<string, string>;
  values: any[][];
  rowids: number[];
  total: number;
  isLoading: boolean;
  error: string | null;
  tableName: string | null;
  onCellUpdate: (rowIndex: number, colName: string, value: string | number | null) => { success: boolean; error?: string };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// Column type is pre-inferred at load time (see useVirtualTable.inferColumnTypes),
// so this function only maps the already-resolved type string to an editor kind.
function detectCellType(columnType: string): CellType {
  const t = (columnType || '').toUpperCase();
  if (t.includes('DATETIME') || t.includes('TIMESTAMP')) return 'datetime';
  if (t === 'DATE') return 'date';
  if (t.includes('TIME')) return 'time';
  if (['INT', 'REAL', 'NUMERIC', 'FLOAT', 'DOUBLE', 'NUMBER'].some(k => t.includes(k))) return 'number';
  return 'text';
}

function parseDateValue(raw: string): Date | undefined {
  if (!raw) return undefined;
  const d = parse(raw, 'yyyy-MM-dd', new Date());
  return isValid(d) ? d : undefined;
}

function parseDatetimeValue(raw: string): { date: Date | undefined; time: string } {
  if (!raw) return { date: undefined, time: '' };
  const m = raw.match(/^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2}(:\d{2})?)?/);
  if (!m) return { date: undefined, time: '' };
  const d = parse(m[1], 'yyyy-MM-dd', new Date());
  return { date: isValid(d) ? d : undefined, time: m[2] || '' };
}

// ---------------------------------------------------------------------------
// Cell editors
// ---------------------------------------------------------------------------

function TextCellEditor({
  value, cellType, onCommit, onCancel,
}: { value: string; cellType: 'text' | 'number'; onCommit: (v: string) => void; onCancel: () => void }) {
  const [val, setVal] = useState(value);
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { ref.current?.focus(); ref.current?.select(); }, []);

  return (
    <input
      ref={ref}
      type={cellType === 'number' ? 'number' : 'text'}
      value={val}
      onChange={e => setVal(e.target.value)}
      onBlur={() => onCommit(val)}
      onKeyDown={e => {
        if (e.key === 'Enter') { e.preventDefault(); onCommit(val); }
        if (e.key === 'Escape') { e.preventDefault(); onCancel(); }
      }}
      className="absolute inset-0 w-full h-full px-2 bg-background text-foreground text-sm outline-none ring-2 ring-primary ring-inset z-20"
      style={{ fontFamily: "'JetBrains Mono', 'Fira Code', monospace" }}
    />
  );
}

function DateCellEditor({
  value, onCommit, onCancel,
}: { value: string; onCommit: (v: string) => void; onCancel: () => void }) {
  const [open, setOpen] = useState(true);
  const selected = parseDateValue(value);

  const handleSelect = (d: Date | undefined) => {
    if (!d) return;
    onCommit(format(d, 'yyyy-MM-dd'));
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={o => { if (!o) { setOpen(false); onCancel(); } }}>
      <PopoverTrigger asChild>
        <div className="absolute inset-0 ring-2 ring-primary ring-inset z-20 flex items-center px-2 text-sm cursor-pointer bg-background"
          style={{ fontFamily: "'JetBrains Mono', monospace" }}>
          {value || <span className="text-muted-foreground">Pick a date…</span>}
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar mode="single" selected={selected} onSelect={handleSelect} initialFocus />
        <div className="flex justify-end gap-2 px-3 pb-3">
          <button className="text-xs text-muted-foreground hover:text-foreground" onClick={() => { onCommit(''); setOpen(false); }}>Clear (NULL)</button>
          <button className="text-xs text-muted-foreground hover:text-foreground" onClick={() => { setOpen(false); onCancel(); }}>Cancel</button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function TimeCellEditor({
  value, onCommit, onCancel,
}: { value: string; onCommit: (v: string) => void; onCancel: () => void }) {
  const [open, setOpen] = useState(true);
  const [time, setTime] = useState(value);

  return (
    <Popover open={open} onOpenChange={o => { if (!o) { setOpen(false); onCancel(); } }}>
      <PopoverTrigger asChild>
        <div className="absolute inset-0 ring-2 ring-primary ring-inset z-20 flex items-center px-2 text-sm cursor-pointer bg-background"
          style={{ fontFamily: "'JetBrains Mono', monospace" }}>
          {value || <span className="text-muted-foreground">Pick a time…</span>}
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-3 flex flex-col gap-3" align="start">
        <p className="text-xs font-medium text-muted-foreground">Time</p>
        <input
          type="time"
          step="1"
          value={time}
          onChange={e => setTime(e.target.value)}
          className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          autoFocus
        />
        <div className="flex justify-end gap-2">
          <button className="text-xs text-muted-foreground hover:text-foreground" onClick={() => { setOpen(false); onCancel(); }}>Cancel</button>
          <button className="text-xs font-medium text-primary hover:text-primary/80" onClick={() => { onCommit(time); setOpen(false); }}>Apply</button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function DatetimeCellEditor({
  value, onCommit, onCancel,
}: { value: string; onCommit: (v: string) => void; onCancel: () => void }) {
  const [open, setOpen] = useState(true);
  const { date: initialDate, time: initialTime } = parseDatetimeValue(value);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(initialDate);
  const [time, setTime] = useState(initialTime || '00:00:00');

  const handleApply = () => {
    if (!selectedDate) { onCancel(); setOpen(false); return; }
    onCommit(`${format(selectedDate, 'yyyy-MM-dd')} ${time}`);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={o => { if (!o) { setOpen(false); onCancel(); } }}>
      <PopoverTrigger asChild>
        <div className="absolute inset-0 ring-2 ring-primary ring-inset z-20 flex items-center px-2 text-sm cursor-pointer bg-background"
          style={{ fontFamily: "'JetBrains Mono', monospace" }}>
          {value || <span className="text-muted-foreground">Pick date & time…</span>}
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar mode="single" selected={selectedDate} onSelect={setSelectedDate} initialFocus />
        <div className="flex flex-col gap-2 px-3 pb-3">
          <p className="text-xs font-medium text-muted-foreground">Time</p>
          <input
            type="time"
            step="1"
            value={time}
            onChange={e => setTime(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <div className="flex justify-end gap-2 pt-1">
            <button className="text-xs text-muted-foreground hover:text-foreground" onClick={() => { setOpen(false); onCancel(); }}>Cancel</button>
            <button className="text-xs font-medium text-primary hover:text-primary/80" onClick={handleApply}>Apply</button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function DataTable({
  columns, columnTypes, values, rowids, total, isLoading, error, tableName, onCellUpdate,
}: DataTableProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});
  const [editingCell, setEditingCell] = useState<EditingCell | null>(null);

  const ROW_HEIGHT = 32;
  const HEADER_HEIGHT = 36;
  const ROW_NUM_WIDTH = 48;

  const rowVirtualizer = useVirtualizer({
    count: values.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 10,
  });

  const calculatedColumnWidths = useMemo(() => {
    const widths: Record<string, number> = {};
    const minWidth = 80;
    const maxWidth = 300;
    columns.forEach(col => {
      widths[col] = columnWidths[col] ?? Math.min(Math.max(col.length * 8 + 16, minWidth), maxWidth);
    });
    return widths;
  }, [columns, columnWidths]);

  const totalContentWidth = ROW_NUM_WIDTH + columns.reduce((s, c) => s + (calculatedColumnWidths[c] ?? 80), 0);

  const handleColumnResize = (colIndex: number, newWidth: number) => {
    setColumnWidths(prev => ({ ...prev, [columns[colIndex]]: newWidth }));
  };

  const startEdit = useCallback((rowIndex: number, colIndex: number, currentValue: any) => {
    if (!tableName) return;
    setEditingCell({ rowIndex, colIndex, value: currentValue === null ? '' : String(currentValue) });
  }, [tableName]);

  const cancelEdit = useCallback(() => setEditingCell(null), []);

  const commitEdit = useCallback((newRawValue: string) => {
    if (!editingCell || !tableName) return;
    const { rowIndex, colIndex } = editingCell;
    const colName = columns[colIndex];
    const finalValue = newRawValue === '' ? null : newRawValue;
    const result = onCellUpdate(rowIndex, colName, finalValue);
    if (result.success) {
      toast.success('Cell updated');
    } else {
      toast.error(`Update failed: ${result.error}`);
    }
    setEditingCell(null);
  }, [editingCell, tableName, columns, onCellUpdate]);

  // Escape key to cancel from anywhere
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') cancelEdit(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [cancelEdit]);

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-sm text-destructive font-medium">Error</p>
          <p className="text-xs text-muted-foreground mt-1">{error}</p>
        </div>
      </div>
    );
  }

  if (columns.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-sm text-muted-foreground">{isLoading ? 'Loading...' : 'No data to display'}</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col border border-border rounded-md overflow-hidden">
      <div ref={parentRef} className="flex-1 overflow-auto min-h-0">
        {/* Sticky header */}
        <div
          className="sticky top-0 z-10 bg-muted border-b border-border flex flex-shrink-0"
          style={{ height: HEADER_HEIGHT, minWidth: totalContentWidth }}
        >
          <div className="flex-shrink-0 flex items-center justify-center border-r border-border text-xs font-medium text-muted-foreground"
            style={{ width: ROW_NUM_WIDTH }}>
            #
          </div>
          {columns.map((col, colIndex) => (
            <div key={col}
              className="relative group flex-shrink-0 flex items-center px-2 border-r border-border text-xs font-medium"
              style={{ width: calculatedColumnWidths[col] }}>
              <span className="truncate">{col}</span>
              {columnTypes[col] && (
                <span className="ml-1 text-[10px] text-muted-foreground/60 shrink-0">
                  {columnTypes[col].toLowerCase()}
                </span>
              )}
              {/* Resize handle */}
              <div className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50 opacity-0 group-hover:opacity-100 transition-opacity"
                onMouseDown={e => {
                  e.preventDefault();
                  const startX = e.clientX;
                  const startW = calculatedColumnWidths[col];
                  const onMove = (me: MouseEvent) => handleColumnResize(colIndex, Math.max(60, startW + me.clientX - startX));
                  const onUp = () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); };
                  document.addEventListener('mousemove', onMove);
                  document.addEventListener('mouseup', onUp);
                }} />
            </div>
          ))}
        </div>

        {/* Virtual rows */}
        <div style={{ height: rowVirtualizer.getTotalSize(), minWidth: totalContentWidth, position: 'relative' }}>
          {rowVirtualizer.getVirtualItems().map(virtualRow => {
            const rowIndex = virtualRow.index;
            const row = values[rowIndex];
            return (
              <div key={rowIndex}
                className="flex absolute top-0 left-0 border-b border-border hover:bg-muted/30 transition-colors"
                style={{ height: ROW_HEIGHT, width: totalContentWidth, transform: `translateY(${virtualRow.start}px)` }}>
                {/* Row number */}
                <div className="flex-shrink-0 flex items-center justify-center border-r border-border bg-muted/20 text-xs text-muted-foreground"
                  style={{ width: ROW_NUM_WIDTH }}>
                  {rowIndex + 1}
                </div>
                {/* Data cells */}
                {columns.map((col, colIndex) => {
                  const value = row[colIndex];
                  const displayValue = value === null ? 'NULL' : String(value);
                  const isEditing = editingCell?.rowIndex === rowIndex && editingCell?.colIndex === colIndex;
                  const cellType = detectCellType(columnTypes[col] || '');
                  const isNull = value === null;

                  return (
                    <div key={colIndex}
                      className="relative flex-shrink-0 flex items-center border-r border-border select-none"
                      style={{ width: calculatedColumnWidths[col], fontFamily: "'JetBrains Mono', 'Fira Code', monospace" }}
                      onDoubleClick={() => tableName && startEdit(rowIndex, colIndex, value)}>
                      {isEditing ? (
                        cellType === 'text' || cellType === 'number' ? (
                          <TextCellEditor value={editingCell!.value} cellType={cellType} onCommit={commitEdit} onCancel={cancelEdit} />
                        ) : cellType === 'date' ? (
                          <DateCellEditor value={editingCell!.value} onCommit={commitEdit} onCancel={cancelEdit} />
                        ) : cellType === 'time' ? (
                          <TimeCellEditor value={editingCell!.value} onCommit={commitEdit} onCancel={cancelEdit} />
                        ) : (
                          <DatetimeCellEditor value={editingCell!.value} onCommit={commitEdit} onCancel={cancelEdit} />
                        )
                      ) : (
                        <span className={`truncate text-sm px-2 ${isNull ? 'text-muted-foreground/50 italic' : ''} ${tableName ? 'cursor-default' : ''}`}
                          title={tableName ? `Double-click to edit` : displayValue}>
                          {displayValue}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer */}
      <div className="bg-muted border-t border-border px-4 py-1.5 text-xs text-muted-foreground flex items-center gap-2 flex-shrink-0">
        <span>Showing {values.length.toLocaleString()} of {total.toLocaleString()} rows</span>
        {isLoading && <span className="text-primary">Loading…</span>}
        {tableName && <span className="ml-auto text-muted-foreground/60">Double-click a cell to edit</span>}
      </div>
    </div>
  );
}
