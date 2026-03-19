import { useCallback, useEffect, useState } from 'react';
import * as sqliteEngine from '@/lib/sqliteEngine';
import { saveRecentFile } from '@/lib/localStorage';

export interface DatabaseState {
  isLoaded: boolean;
  fileName: string | null;
  tables: string[];
  currentTable: string | null;
  error: string | null;
  isLoading: boolean;
}

export function useDatabase() {
  const [state, setState] = useState<DatabaseState>({
    isLoaded: false,
    fileName: null,
    tables: [],
    currentTable: null,
    error: null,
    isLoading: false,
  });

  /**
   * 打开数据库文件
   */
  const openDatabase = useCallback(async (file: File) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      await sqliteEngine.openDatabase(file);
      const tables = sqliteEngine.getTables();
      
      saveRecentFile(file);
      
      setState(prev => ({
        ...prev,
        isLoaded: true,
        fileName: file.name,
        tables,
        currentTable: tables.length > 0 ? tables[0] : null,
        isLoading: false,
      }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to open database';
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));
    }
  }, []);

  /**
   * 关闭数据库
   */
  const closeDatabase = useCallback(() => {
    sqliteEngine.closeDatabase();
    setState({
      isLoaded: false,
      fileName: null,
      tables: [],
      currentTable: null,
      error: null,
      isLoading: false,
    });
  }, []);

  /**
   * 切换当前表
   */
  const selectTable = useCallback((tableName: string) => {
    setState(prev => ({
      ...prev,
      currentTable: tableName,
    }));
  }, []);

  /**
   * 刷新表列表
   */
  const refreshTables = useCallback(() => {
    if (state.isLoaded) {
      const tables = sqliteEngine.getTables();
      setState(prev => ({
        ...prev,
        tables,
        currentTable: tables.includes(prev.currentTable || '') 
          ? prev.currentTable 
          : (tables.length > 0 ? tables[0] : null),
      }));
    }
  }, [state.isLoaded]);

  return {
    ...state,
    openDatabase,
    closeDatabase,
    selectTable,
    refreshTables,
  };
}
