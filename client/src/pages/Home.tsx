import { useState, useCallback } from 'react';
import { PanelGroup, Panel, PanelResizeHandle } from 'react-resizable-panels';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { X, Database } from 'lucide-react';
import { Toolbar } from '@/components/Toolbar';
import { TableTree } from '@/components/TableTree';
import { DataTable } from '@/components/DataTable';
import { SqlEditor } from '@/components/SqlEditor';
import { ResultPanel } from '@/components/ResultPanel';
import { CommandPalette } from '@/components/CommandPalette';
import { useDatabase } from '@/hooks/useDatabase';
import { useVirtualTable } from '@/hooks/useVirtualTable';
import { useSqlQuery } from '@/hooks/useSqlQuery';
import * as sqliteEngine from '@/lib/sqliteEngine';

const TAB_TRIGGER = "rounded-none h-10 px-4 text-sm font-medium bg-transparent border-0 border-b-2 border-transparent -mb-px shadow-none transition-colors text-muted-foreground data-[state=active]:text-foreground data-[state=active]:border-primary data-[state=active]:bg-transparent";

export default function Home() {
  const database = useDatabase();
  const tableData = useVirtualTable(database.currentTable, database.activeId);
  const sqlQuery = useSqlQuery();
  const [resultExpanded, setResultExpanded] = useState(true);
  const [commandOpen, setCommandOpen] = useState(false);

  const handleFileOpen = useCallback(async (file: File, handle?: FileSystemFileHandle) => {
    await database.openDatabase(file, handle);
    toast.success(`Opened: ${file.name}`);
  }, [database]);

  const handleClose = useCallback((id: string) => {
    const tab = database.tabs.find(t => t.id === id);
    database.closeDatabase(id);
    toast.success(`Closed: ${tab?.fileName ?? 'database'}`);
  }, [database]);

  const handleExport = useCallback(async () => {
    // If the DB was opened via File System Access API, write back to the original file
    const saveResult = await sqliteEngine.saveDatabase();
    if (saveResult.canAutoSave) {
      if (saveResult.success) {
        toast.success('Saved to original file');
      } else {
        toast.error(`Save failed: ${saveResult.error}`);
      }
      return;
    }
    // Fallback: download as a new file (Firefox/Safari or fallback input)
    const data = sqliteEngine.exportDatabase();
    if (!data) { toast.error('Failed to export database'); return; }
    const blob = new Blob([data], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = database.fileName || 'database.sqlite';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Database downloaded');
  }, [database.fileName]);

  const handleExecuteQuery = useCallback(async (query: string) => {
    const result = await sqlQuery.executeQuery(query);
    if (result) setResultExpanded(true);
  }, [sqlQuery]);

  return (
    <div className="h-screen flex flex-col bg-background">
      <CommandPalette
        open={commandOpen}
        onOpenChange={setCommandOpen}
        tables={database.tables}
        onSelectTable={database.selectTable}
        onExport={handleExport}
        onRefresh={database.refreshTables}
      />

      <Toolbar
        fileName={database.fileName}
        isLoaded={database.isLoaded}
        onFileOpen={handleFileOpen}
        onClose={() => database.activeId && handleClose(database.activeId)}
        onExport={handleExport}
      />

      {/* Database tabs — visible when ≥1 DB is open */}
      {database.tabs.length > 0 && (
        <div className="flex items-end border-b border-border bg-muted/40 px-2 overflow-x-auto flex-shrink-0">
          {database.tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => database.switchDatabase(tab.id)}
              className={[
                'group relative flex items-center gap-1.5 h-9 px-3 pr-7 text-xs font-medium',
                'border-b-2 -mb-px transition-colors whitespace-nowrap select-none',
                tab.id === database.activeId
                  ? 'border-primary text-foreground bg-background'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted',
              ].join(' ')}
            >
              <Database className="w-3 h-3 shrink-0" />
              <span className="max-w-[140px] truncate">{tab.fileName}</span>
              {/* Close button */}
              <span
                role="button"
                onClick={e => { e.stopPropagation(); handleClose(tab.id); }}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-muted-foreground/20 transition-opacity"
              >
                <X className="w-3 h-3" />
              </span>
            </button>
          ))}
        </div>
      )}

      {database.isLoaded ? (
        <PanelGroup direction="horizontal" className="flex-1 min-h-0">
          <Panel defaultSize={20} minSize={15} maxSize={40}>
            <TableTree
              tables={database.tables}
              currentTable={database.currentTable}
              onSelectTable={database.selectTable}
            />
          </Panel>

          <PanelResizeHandle className="w-1 bg-border hover:bg-primary/50 transition-colors" />

          <Panel defaultSize={60} minSize={40}>
            <Tabs defaultValue="data" className="h-full flex flex-col">
              <TabsList className="h-auto rounded-none border-b border-border bg-transparent p-0 w-full justify-start gap-0 flex-shrink-0">
                <TabsTrigger value="data" className={TAB_TRIGGER}>Data</TabsTrigger>
                <TabsTrigger value="sql" className={TAB_TRIGGER}>SQL</TabsTrigger>
              </TabsList>

              <TabsContent value="data" className="flex-1 overflow-hidden p-4">
                <DataTable
                  columns={tableData.columns}
                  columnTypes={tableData.columnTypes}
                  values={tableData.values}
                  rowids={tableData.rowids}
                  total={tableData.total}
                  isLoading={tableData.isLoading}
                  error={tableData.error}
                  tableName={database.currentTable}
                  onCellUpdate={tableData.updateCell}
                />
              </TabsContent>

              <TabsContent value="sql" className="flex-1 overflow-hidden">
                <SqlEditor onExecute={handleExecuteQuery} isExecuting={sqlQuery.isExecuting} />
              </TabsContent>
            </Tabs>
          </Panel>

          <PanelResizeHandle className="w-1 bg-border hover:bg-primary/50 transition-colors" />

          <Panel defaultSize={20} minSize={0} collapsible>
            <ResultPanel
              columns={sqlQuery.result?.columns || []}
              values={sqlQuery.result?.values || []}
              error={sqlQuery.error}
              executionTime={sqlQuery.result?.executionTime}
              rowCount={sqlQuery.result?.rowCount}
              isExpanded={resultExpanded}
              onToggleExpand={setResultExpanded}
            />
          </Panel>
        </PanelGroup>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-lg font-semibold mb-2">SQLite Editor</h2>
            <p className="text-sm text-muted-foreground mb-6">Open a SQLite database file to get started</p>
            <button
              onClick={() => (document.querySelector('input[type="file"]') as HTMLInputElement)?.click()}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              Open Database
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
