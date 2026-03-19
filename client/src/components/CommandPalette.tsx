import { useEffect, useState } from 'react';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Database, Download, RotateCcw, Settings } from 'lucide-react';

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tables: string[];
  onSelectTable: (tableName: string) => void;
  onExport?: () => void;
  onRefresh?: () => void;
}

/**
 * 命令面板组件
 * 提供快速搜索表、执行常用操作等功能
 */
export function CommandPalette({
  open,
  onOpenChange,
  tables,
  onSelectTable,
  onExport,
  onRefresh,
}: CommandPaletteProps) {
  const [search, setSearch] = useState('');

  // 监听 Cmd+K 快捷键
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        onOpenChange(!open);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, [open, onOpenChange]);

  const handleSelectTable = (tableName: string) => {
    onSelectTable(tableName);
    onOpenChange(false);
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder="Search tables, commands..."
        value={search}
        onValueChange={setSearch}
      />

      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        {/* 表搜索 */}
        {tables.length > 0 && (
          <CommandGroup heading="Tables">
            {tables
              .filter(table =>
                table.toLowerCase().includes(search.toLowerCase())
              )
              .map(table => (
                <CommandItem
                  key={table}
                  onSelect={() => handleSelectTable(table)}
                  className="cursor-pointer"
                >
                  <Database className="mr-2 h-4 w-4" />
                  <span>{table}</span>
                </CommandItem>
              ))}
          </CommandGroup>
        )}

        {/* 常用命令 */}
        <CommandGroup heading="Commands">
          {onExport && (
            <CommandItem
              onSelect={() => {
                onExport();
                onOpenChange(false);
              }}
              className="cursor-pointer"
            >
              <Download className="mr-2 h-4 w-4" />
              <span>Export Database</span>
            </CommandItem>
          )}

          {onRefresh && (
            <CommandItem
              onSelect={() => {
                onRefresh();
                onOpenChange(false);
              }}
              className="cursor-pointer"
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              <span>Refresh Tables</span>
            </CommandItem>
          )}
        </CommandGroup>
      </CommandList>

      <div className="border-t border-border px-2 py-2 text-xs text-muted-foreground">
        <span>Press </span>
        <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border border-border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
          <span className="text-xs">⌘</span>K
        </kbd>
        <span> to close</span>
      </div>
    </CommandDialog>
  );
}
