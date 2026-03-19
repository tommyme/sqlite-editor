import { useCallback, useState } from 'react';
import * as sqliteEngine from '@/lib/sqliteEngine';
import { saveRecentFile } from '@/lib/localStorage';

export interface DbTab {
  id: string;
  fileName: string;
  tables: string[];
  currentTable: string | null;
}

export interface DatabaseState {
  tabs: DbTab[];
  activeId: string | null;
  isLoading: boolean;
  error: string | null;
}

export function useDatabase() {
  const [state, setState] = useState<DatabaseState>({
    tabs: [],
    activeId: null,
    isLoading: false,
    error: null,
  });

  // Derived convenience getters
  const activeTab = state.tabs.find(t => t.id === state.activeId) ?? null;
  const isLoaded = state.tabs.length > 0;

  const openDatabase = useCallback(async (file: File, handle?: FileSystemFileHandle) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      const id = await sqliteEngine.openDatabase(file, handle);
      const tables = sqliteEngine.getTables();
      saveRecentFile(file);
      const newTab: DbTab = {
        id,
        fileName: file.name,
        tables,
        currentTable: tables[0] ?? null,
      };
      setState(prev => ({
        ...prev,
        tabs: [...prev.tabs, newTab],
        activeId: id,
        isLoading: false,
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to open database',
      }));
    }
  }, []);

  const closeDatabase = useCallback((id: string) => {
    sqliteEngine.closeDatabase(id);
    setState(prev => {
      const remaining = prev.tabs.filter(t => t.id !== id);
      // After close, sqliteEngine already picked the next active DB
      const newActiveId = sqliteEngine.getActiveDbId();
      return { ...prev, tabs: remaining, activeId: newActiveId };
    });
  }, []);

  const switchDatabase = useCallback((id: string) => {
    sqliteEngine.setActiveDatabase(id);
    setState(prev => ({ ...prev, activeId: id }));
  }, []);

  const selectTable = useCallback((tableName: string) => {
    setState(prev => ({
      ...prev,
      tabs: prev.tabs.map(t =>
        t.id === prev.activeId ? { ...t, currentTable: tableName } : t
      ),
    }));
  }, []);

  const refreshTables = useCallback(() => {
    const tables = sqliteEngine.getTables();
    setState(prev => ({
      ...prev,
      tabs: prev.tabs.map(t => {
        if (t.id !== prev.activeId) return t;
        return {
          ...t,
          tables,
          currentTable: tables.includes(t.currentTable ?? '') ? t.currentTable : (tables[0] ?? null),
        };
      }),
    }));
  }, []);

  return {
    ...state,
    activeTab,
    isLoaded,
    // Convenience aliases used by existing components
    fileName: activeTab?.fileName ?? null,
    tables: activeTab?.tables ?? [],
    currentTable: activeTab?.currentTable ?? null,
    openDatabase,
    closeDatabase,
    switchDatabase,
    selectTable,
    refreshTables,
  };
}
