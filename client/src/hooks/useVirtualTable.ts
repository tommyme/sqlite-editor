import { useCallback, useEffect, useState } from 'react';
import * as sqliteEngine from '@/lib/sqliteEngine';

export interface TableData {
  columns: string[];
  values: any[][];
  total: number;
  isLoading: boolean;
  error: string | null;
}

const PAGE_SIZE = 1000;

export function useVirtualTable(tableName: string | null) {
  const [data, setData] = useState<TableData>({
    columns: [],
    values: [],
    total: 0,
    isLoading: false,
    error: null,
  });

  /**
   * 加载表数据
   */
  const loadTableData = useCallback(
    async (offset: number = 0) => {
      if (!tableName) {
        setData({
          columns: [],
          values: [],
          total: 0,
          isLoading: false,
          error: null,
        });
        return;
      }

      setData(prev => ({ ...prev, isLoading: true, error: null }));

      try {
        const result = sqliteEngine.getTableData(tableName, PAGE_SIZE, offset);
        setData({
          columns: result.columns,
          values: result.values,
          total: result.total,
          isLoading: false,
          error: null,
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to load table data';
        setData(prev => ({
          ...prev,
          isLoading: false,
          error: errorMessage,
        }));
      }
    },
    [tableName]
  );

  /**
   * 当表名改变时重新加载
   */
  useEffect(() => {
    loadTableData(0);
  }, [tableName, loadTableData]);

  /**
   * 获取表信息（行数、列信息等）
   */
  const getTableInfo = useCallback(() => {
    if (!tableName) return null;

    const rowCount = sqliteEngine.getTableRowCount(tableName);
    const columns = sqliteEngine.getTableColumns(tableName);

    return {
      name: tableName,
      rowCount,
      columns,
    };
  }, [tableName]);

  return {
    ...data,
    loadTableData,
    getTableInfo,
    pageSize: PAGE_SIZE,
  };
}
