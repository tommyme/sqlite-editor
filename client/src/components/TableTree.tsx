import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChevronDown, Table2, Search } from 'lucide-react';
import { useState, useMemo } from 'react';
import * as sqliteEngine from '@/lib/sqliteEngine';

interface TableTreeProps {
  tables: string[];
  currentTable: string | null;
  onSelectTable: (tableName: string) => void;
}

/**
 * Engineering Workspace 表导航树
 * 显示数据库中所有表的列表，支持搜索和选择
 */
export function TableTree({
  tables,
  currentTable,
  onSelectTable,
}: TableTreeProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedTables, setExpandedTables] = useState<Set<string>>(new Set());

  // 过滤表列表
  const filteredTables = useMemo(() => {
    if (!searchQuery) return tables;
    return tables.filter(table =>
      table.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [tables, searchQuery]);

  const toggleTableExpand = (tableName: string) => {
    const newExpanded = new Set(expandedTables);
    if (newExpanded.has(tableName)) {
      newExpanded.delete(tableName);
    } else {
      newExpanded.add(tableName);
    }
    setExpandedTables(newExpanded);
  };

  return (
    <div className="sidebar h-full flex flex-col">
      {/* 搜索框 */}
      <div className="p-3 border-b border-border">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search tables..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-8 h-8 text-sm"
          />
        </div>
      </div>

      {/* 表列表 */}
      <ScrollArea className="flex-1">
        <div className="p-2">
          {filteredTables.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-muted-foreground">
                {tables.length === 0 ? 'No tables' : 'No matching tables'}
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {filteredTables.map(table => {
                const isSelected = currentTable === table;
                const rowCount = sqliteEngine.getTableRowCount(table);
                const isExpanded = expandedTables.has(table);

                return (
                  <div key={table}>
                    <Button
                      variant={isSelected ? 'secondary' : 'ghost'}
                      size="sm"
                      className="w-full justify-start gap-2 text-sm font-medium h-8"
                      onClick={() => {
                        onSelectTable(table);
                        toggleTableExpand(table);
                      }}
                    >
                      <ChevronDown
                        className={`w-4 h-4 transition-transform ${
                          isExpanded ? '' : '-rotate-90'
                        }`}
                      />
                      <Table2 className="w-4 h-4 flex-shrink-0" />
                      <span className="truncate flex-1 text-left">{table}</span>
                      <span className="text-xs text-muted-foreground flex-shrink-0">
                        {rowCount}
                      </span>
                    </Button>

                    {/* 列信息（展开时显示） */}
                    {isExpanded && isSelected && (
                      <div className="ml-6 mt-1 space-y-1 text-xs">
                        {sqliteEngine.getTableColumns(table).map(col => (
                          <div
                            key={col.name}
                            className="py-1 px-2 text-muted-foreground hover:text-foreground transition-colors"
                            title={`${col.name}: ${col.type}`}
                          >
                            <span className="font-mono">{col.name}</span>
                            <span className="text-xs text-muted-foreground ml-2">
                              {col.type}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
