import { useVirtualizer } from '@tanstack/react-virtual';
import { useRef, useMemo, useState } from 'react';

interface DataTableProps {
  columns: string[];
  values: any[][];
  total: number;
  isLoading: boolean;
  error: string | null;
}

/**
 * Engineering Workspace 数据表格
 * 使用虚拟滚动支持大数据量显示
 */
export function DataTable({
  columns,
  values,
  total,
  isLoading,
  error,
}: DataTableProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});

  // 固定行高
  const ROW_HEIGHT = 32;
  const HEADER_HEIGHT = 36;
  const ROW_NUM_WIDTH = 48;

  // 虚拟滚动 — scroll element is the unified outer container
  const rowVirtualizer = useVirtualizer({
    count: values.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 10,
  });

  // 计算列宽
  const calculatedColumnWidths = useMemo(() => {
    const widths: Record<string, number> = {};
    const minWidth = 80;
    const maxWidth = 300;

    columns.forEach(col => {
      if (columnWidths[col]) {
        widths[col] = columnWidths[col];
      } else {
        const estimatedWidth = Math.max(col.length * 8 + 16, minWidth);
        widths[col] = Math.min(estimatedWidth, maxWidth);
      }
    });

    return widths;
  }, [columns, columnWidths]);

  const handleColumnResize = (colIndex: number, newWidth: number) => {
    setColumnWidths(prev => ({
      ...prev,
      [columns[colIndex]]: newWidth,
    }));
  };

  // Total content width — used so the sticky header and rows stay aligned
  const totalContentWidth =
    ROW_NUM_WIDTH +
    columns.reduce((sum, col) => sum + (calculatedColumnWidths[col] ?? 80), 0);

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
        <p className="text-sm text-muted-foreground">
          {isLoading ? 'Loading...' : 'No data to display'}
        </p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col border border-border rounded-md overflow-hidden">
      {/*
        Single scroll container: handles BOTH horizontal and vertical scrolling.
        The header is sticky inside it so it stays visible on vertical scroll
        while moving with the content on horizontal scroll — no separate scrollbar
        between header and rows.
      */}
      <div ref={parentRef} className="flex-1 overflow-auto min-h-0">
        {/* Sticky header */}
        <div
          className="sticky top-0 z-10 bg-muted border-b border-border flex flex-shrink-0"
          style={{ height: HEADER_HEIGHT, minWidth: totalContentWidth }}
        >
          {/* 行号列 */}
          <div
            className="text-xs font-medium bg-muted border-r border-border flex-shrink-0 flex items-center justify-center"
            style={{ width: ROW_NUM_WIDTH, minWidth: ROW_NUM_WIDTH }}
          >
            <span className="text-xs font-medium text-muted-foreground">#</span>
          </div>

          {/* 数据列 */}
          {columns.map((col, colIndex) => (
            <div
              key={col}
              className="text-xs font-medium px-2 bg-muted border-r border-border flex-shrink-0 relative group flex items-center"
              style={{ width: calculatedColumnWidths[col] }}
            >
              <span className="truncate text-xs font-medium">{col}</span>

              {/* 列宽调整手柄 */}
              <div
                className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50 opacity-0 group-hover:opacity-100 transition-opacity"
                onMouseDown={e => {
                  e.preventDefault();
                  const startX = e.clientX;
                  const startWidth = calculatedColumnWidths[col];

                  const handleMouseMove = (moveEvent: MouseEvent) => {
                    const delta = moveEvent.clientX - startX;
                    const newWidth = Math.max(60, startWidth + delta);
                    handleColumnResize(colIndex, newWidth);
                  };

                  const handleMouseUp = () => {
                    document.removeEventListener('mousemove', handleMouseMove);
                    document.removeEventListener('mouseup', handleMouseUp);
                  };

                  document.addEventListener('mousemove', handleMouseMove);
                  document.addEventListener('mouseup', handleMouseUp);
                }}
              />
            </div>
          ))}
        </div>

        {/* 虚拟滚动数据区 */}
        <div
          style={{
            height: rowVirtualizer.getTotalSize(),
            minWidth: totalContentWidth,
            position: 'relative',
          }}
        >
          {rowVirtualizer.getVirtualItems().map(virtualRow => {
            const rowIndex = virtualRow.index;
            const row = values[rowIndex];

            return (
              <div
                key={rowIndex}
                className="flex absolute top-0 left-0 border-b border-border hover:bg-muted/50 transition-colors"
                style={{
                  height: ROW_HEIGHT,
                  width: totalContentWidth,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                {/* 行号 */}
                <div
                  className="text-sm px-2 border-r border-border flex-shrink-0 flex items-center justify-center bg-muted/30"
                  style={{ width: ROW_NUM_WIDTH, minWidth: ROW_NUM_WIDTH }}
                >
                  <span className="text-xs text-muted-foreground">
                    {rowIndex + 1}
                  </span>
                </div>

                {/* 数据列 */}
                {columns.map((col, colIndex) => {
                  const value = row[colIndex];
                  const displayValue = value === null ? 'NULL' : String(value);

                  return (
                    <div
                      key={colIndex}
                      className="text-sm px-2 border-r border-border flex-shrink-0 flex items-center"
                      style={{
                        fontFamily:
                          "'JetBrains Mono', 'Fira Code', 'Consolas', monospace",
                        width: calculatedColumnWidths[col],
                      }}
                      title={displayValue}
                    >
                      <span className="truncate text-sm">{displayValue}</span>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {/* 底部统计 */}
      <div className="bg-muted border-t border-border px-4 py-2 text-xs text-muted-foreground flex-shrink-0">
        <span>
          Showing {values.length} of {total} rows
          {isLoading && ' (Loading...)'}
        </span>
      </div>
    </div>
  );
}
