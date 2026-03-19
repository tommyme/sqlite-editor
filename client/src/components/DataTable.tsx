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

  // 虚拟滚动
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
        // 根据列名长度估算初始宽度
        const estimatedWidth = Math.max(
          col.length * 8 + 16,
          minWidth
        );
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
      {/* 表头 */}
      <div
        className="bg-muted border-b border-border flex-shrink-0"
        style={{ height: HEADER_HEIGHT }}
      >
        <div className="flex h-full">
          {/* 行号列 */}
          <div
            className="text-xs font-medium px-2 py-2 bg-muted border-r border-b border-border w-12 flex-shrink-0 flex items-center justify-center"
            style={{ minWidth: 48 }}
          >
            <span className="text-xs font-medium text-muted-foreground">#</span>
          </div>

          {/* 数据列 */}
          <div className="flex flex-1 overflow-x-auto">
            {columns.map((col, colIndex) => (
              <div
                key={col}
                className="text-xs font-medium px-2 py-2 bg-muted border-r border-b border-border flex-shrink-0 relative group"
                style={{ width: calculatedColumnWidths[col] }}
              >
                <div className="px-2 py-2 truncate text-xs font-medium">
                  {col}
                </div>

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
        </div>
      </div>

      {/* 数据行（虚拟滚动） */}
      <div
        ref={parentRef}
        className="flex-1 overflow-y-auto overflow-x-hidden"
      >
        <div
          style={{
            height: `${rowVirtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          {rowVirtualizer.getVirtualItems().map(virtualRow => {
            const rowIndex = virtualRow.index;
            const row = values[rowIndex];

            return (
              <div
                key={rowIndex}
                className="flex absolute top-0 left-0 w-full border-b border-border hover:bg-muted/50 transition-colors"
                style={{
                  height: ROW_HEIGHT,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                {/* 行号 */}
                <div
                  className="text-sm px-2 py-1 border-r border-border w-12 flex-shrink-0 flex items-center justify-center bg-muted/30"
                  style={{ minWidth: 48 }}
                >
                  <span className="text-xs text-muted-foreground">
                    {rowIndex + 1}
                  </span>
                </div>

                {/* 数据列 */}
                <div className="flex flex-1">
                  {columns.map((col, colIndex) => {
                    const value = row[colIndex];
                    const displayValue = value === null ? 'NULL' : String(value);

                    return (
                      <div
                        key={colIndex}
                        className="text-sm px-2 py-1 border-r border-border flex-shrink-0 flex items-center"
                        style={{
                          fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace",
                          width: calculatedColumnWidths[col],
                        }}
                        title={displayValue}
                      >
                        <span className="truncate text-sm">{displayValue}</span>
                      </div>
                    );
                  })}
                </div>
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
