import { useCallback, useEffect, useState } from 'react';
import * as sqliteEngine from '@/lib/sqliteEngine';

export interface TableData {
  columns: string[];
  columnTypes: Record<string, string>;
  values: any[][];
  rowids: number[];
  total: number;
  isLoading: boolean;
  error: string | null;
}

const PAGE_SIZE = 1000;

/**
 * 对 TEXT 类型（或无类型）的列，通过抽样非空值推断其实际语义类型。
 * 只要前 30 个非空值都符合同一种模式，就将该列标记为对应类型。
 */
function inferColumnTypes(
  columns: string[],
  values: any[][],
  declared: Record<string, string>
): Record<string, string> {
  const result = { ...declared };
  const SAMPLE = 30;

  columns.forEach((col, colIdx) => {
    const base = (result[col] || '').toUpperCase();
    // 只对 TEXT 或未声明类型的列做推断
    if (base && base !== 'TEXT') return;

    const sample = values
      .map(r => r[colIdx])
      .filter(v => v !== null && v !== undefined && String(v).trim() !== '')
      .slice(0, SAMPLE)
      .map(v => String(v));

    if (sample.length === 0) return;

    if (sample.every(v => /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}/.test(v))) {
      result[col] = 'DATETIME';
    } else if (sample.every(v => /^\d{4}-\d{2}-\d{2}$/.test(v))) {
      result[col] = 'DATE';
    } else if (sample.every(v => /^\d{2}:\d{2}(:\d{2})?$/.test(v))) {
      result[col] = 'TIME';
    }
  });

  return result;
}

export function useVirtualTable(tableName: string | null) {
  const [data, setData] = useState<TableData>({
    columns: [],
    columnTypes: {},
    values: [],
    rowids: [],
    total: 0,
    isLoading: false,
    error: null,
  });

  const loadTableData = useCallback(
    async (offset: number = 0) => {
      if (!tableName) {
        setData({
          columns: [],
          columnTypes: {},
          values: [],
          rowids: [],
          total: 0,
          isLoading: false,
          error: null,
        });
        return;
      }

      setData(prev => ({ ...prev, isLoading: true, error: null }));

      try {
        const result = sqliteEngine.getTableData(tableName, PAGE_SIZE, offset);
        const colInfos = sqliteEngine.getTableColumns(tableName);
        const declared: Record<string, string> = {};
        colInfos.forEach(c => { declared[c.name] = c.type; });
        const columnTypes = inferColumnTypes(result.columns, result.values, declared);

        setData({
          columns: result.columns,
          columnTypes,
          values: result.values,
          rowids: result.rowids,
          total: result.total,
          isLoading: false,
          error: null,
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to load table data';
        setData(prev => ({ ...prev, isLoading: false, error: errorMessage }));
      }
    },
    [tableName]
  );

  useEffect(() => {
    loadTableData(0);
  }, [tableName, loadTableData]);

  const updateCell = useCallback(
    (rowIndex: number, columnName: string, newValue: string | number | null) => {
      if (!tableName) return { success: false, error: 'No table selected' };
      const rowid = data.rowids[rowIndex];
      if (rowid === undefined) return { success: false, error: 'Row not found' };

      const result = sqliteEngine.updateCell(tableName, rowid, columnName, newValue);
      if (result.success) {
        // Update local state immediately (optimistic)
        setData(prev => {
          const colIndex = prev.columns.indexOf(columnName);
          if (colIndex === -1) return prev;
          const newValues = prev.values.map((row, i) => {
            if (i !== rowIndex) return row;
            const newRow = [...row];
            newRow[colIndex] = newValue;
            return newRow;
          });
          return { ...prev, values: newValues };
        });
      }
      return result;
    },
    [tableName, data.rowids, data.columns]
  );

  const getTableInfo = useCallback(() => {
    if (!tableName) return null;
    const rowCount = sqliteEngine.getTableRowCount(tableName);
    const columns = sqliteEngine.getTableColumns(tableName);
    return { name: tableName, rowCount, columns };
  }, [tableName]);

  return {
    ...data,
    loadTableData,
    updateCell,
    getTableInfo,
    pageSize: PAGE_SIZE,
  };
}
