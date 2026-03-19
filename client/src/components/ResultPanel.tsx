import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { DataTable } from './DataTable';

interface ResultPanelProps {
  columns: string[];
  values: any[][];
  rowids?: number[];
  tableName?: string | null;
  error: string | null;
  executionTime?: number;
  rowCount?: number;
  isExpanded?: boolean;
  onToggleExpand?: (expanded: boolean) => void;
  onCellUpdate?: (rowIndex: number, colName: string, value: string | number | null) => Promise<{ success: boolean; error?: string }>;
  onRowDelete?: (rowIndices: number[]) => Promise<any>;
  onRefresh?: () => void;
}

export function ResultPanel({
  columns, values, rowids = [], tableName, error, executionTime, rowCount,
  isExpanded: controlledExpanded, onToggleExpand, onCellUpdate, onRowDelete, onRefresh,
}: ResultPanelProps) {
  const [internalExpanded, setInternalExpanded] = useState(true);
  const isExpanded = controlledExpanded !== undefined ? controlledExpanded : internalExpanded;

  const handleToggle = () => {
    if (onToggleExpand) onToggleExpand(!isExpanded);
    else setInternalExpanded(!isExpanded);
  };

  if (!columns.length && !error) return null;

  return (
    <div className="result-panel h-full flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border flex-shrink-0">
        <button
          onClick={handleToggle}
          className="flex items-center gap-2 text-sm font-medium hover:text-foreground transition-colors text-muted-foreground"
        >
          <ChevronDown className={`w-4 h-4 transition-transform ${isExpanded ? '' : '-rotate-90'}`} />
          Query Results
          {tableName && <span className="text-xs font-normal text-muted-foreground/70">· {tableName}</span>}
        </button>
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          {error ? (
            <span className="text-destructive">Error</span>
          ) : (
            <>
              {rowCount !== undefined && <span>{rowCount} rows</span>}
              {executionTime !== undefined && <span>{executionTime.toFixed(2)}ms</span>}
            </>
          )}
        </div>
      </div>

      {isExpanded && (
        <div className="flex-1 overflow-hidden p-4">
          {error ? (
            <div className="text-sm text-destructive">
              <p className="font-medium mb-2">Error</p>
              <p className="text-xs font-mono bg-destructive/10 p-2 rounded">{error}</p>
            </div>
          ) : columns.length > 0 ? (
            <DataTable
              columns={columns}
              values={values}
              rowids={rowids}
              tableName={tableName}
              total={values.length}
              isLoading={false}
              error={null}
              onCellUpdate={onCellUpdate}
              onRowDelete={onRowDelete}
              onRefresh={onRefresh}
            />
          ) : (
            <p className="text-sm text-muted-foreground">No results</p>
          )}
        </div>
      )}
    </div>
  );
}
