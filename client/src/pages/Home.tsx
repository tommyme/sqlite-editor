import { useState, useCallback } from 'react';
import { PanelGroup, Panel, PanelResizeHandle } from 'react-resizable-panels';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
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

/**
 * Engineering Workspace - SQLite Editor
 * 主页面，整合所有组件
 */
export default function Home() {
  const database = useDatabase();
  const tableData = useVirtualTable(database.currentTable);
  const sqlQuery = useSqlQuery();
  const [resultExpanded, setResultExpanded] = useState(true);
  const [commandOpen, setCommandOpen] = useState(false);

  /**
   * 处理文件打开
   */
  const handleFileOpen = useCallback(
    async (file: File) => {
      await database.openDatabase(file);
      toast.success(`Database opened: ${file.name}`);
    },
    [database]
  );

  /**
   * 处理数据库关闭
   */
  const handleClose = useCallback(() => {
    database.closeDatabase();
    toast.success('Database closed');
  }, [database]);

  /**
   * 处理数据库导出
   */
  const handleExport = useCallback(() => {
    const data = sqliteEngine.exportDatabase();
    if (!data) {
      toast.error('Failed to export database');
      return;
    }

    const blob = new Blob([data], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = database.fileName || 'database.sqlite';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success('Database exported');
  }, [database.fileName]);

  /**
   * 处理 SQL 查询执行
   */
  const handleExecuteQuery = useCallback(
    async (query: string) => {
      const result = await sqlQuery.executeQuery(query);
      if (result) {
        setResultExpanded(true);
      }
    },
    [sqlQuery]
  );

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* 命令面板 */}
      <CommandPalette
        open={commandOpen}
        onOpenChange={setCommandOpen}
        tables={database.tables}
        onSelectTable={database.selectTable}
        onExport={handleExport}
        onRefresh={database.refreshTables}
      />

      {/* 工具栏 */}
      <Toolbar
        fileName={database.fileName}
        isLoaded={database.isLoaded}
        onFileOpen={handleFileOpen}
        onClose={handleClose}
        onExport={handleExport}
      />



      {/* 主工作区 */}
      {database.isLoaded ? (
        <PanelGroup direction="horizontal" className="flex-1">
          {/* 左侧：表导航树 */}
          <Panel defaultSize={20} minSize={15} maxSize={40}>
            <TableTree
              tables={database.tables}
              currentTable={database.currentTable}
              onSelectTable={database.selectTable}
            />
          </Panel>

          <PanelResizeHandle className="w-1 bg-border hover:bg-primary/50 transition-colors" />

          {/* 中间：数据表格/SQL 编辑器 */}
          <Panel defaultSize={60} minSize={40}>
            <Tabs defaultValue="data" className="h-full flex flex-col">
              <TabsList className="w-full justify-start rounded-none border-b border-border bg-background px-4">
                <TabsTrigger value="data">Data</TabsTrigger>
                <TabsTrigger value="sql">SQL</TabsTrigger>
              </TabsList>

              <TabsContent value="data" className="flex-1 overflow-hidden p-4">
                <DataTable
                  columns={tableData.columns}
                  values={tableData.values}
                  total={tableData.total}
                  isLoading={tableData.isLoading}
                  error={tableData.error}
                />
              </TabsContent>

              <TabsContent value="sql" className="flex-1 overflow-hidden">
                <SqlEditor
                  onExecute={handleExecuteQuery}
                  isExecuting={sqlQuery.isExecuting}
                />
              </TabsContent>
            </Tabs>
          </Panel>

          <PanelResizeHandle className="w-1 bg-border hover:bg-primary/50 transition-colors" />

          {/* 右侧/底部：查询结果面板 */}
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
        /* 空状态 */
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-lg font-semibold mb-2">SQLite Editor</h2>
            <p className="text-sm text-muted-foreground mb-6">
              Open a SQLite database file to get started
            </p>
            <button
              onClick={() => {
                const input = document.querySelector('input[type="file"]') as HTMLInputElement;
                input?.click();
              }}
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
