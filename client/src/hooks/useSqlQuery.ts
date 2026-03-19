import { useCallback, useState } from 'react';
import * as sqliteEngine from '@/lib/sqliteEngine';
import { saveQueryHistory } from '@/lib/localStorage';

export interface QueryResult {
  columns: string[];
  values: any[][];
  error?: string;
  executionTime?: number;
  rowCount?: number;
}

export interface QueryState {
  isExecuting: boolean;
  result: QueryResult | null;
  error: string | null;
}

export function useSqlQuery() {
  const [state, setState] = useState<QueryState>({
    isExecuting: false,
    result: null,
    error: null,
  });

  /**
   * 执行 SQL 查询
   */
  const executeQuery = useCallback(async (sql: string): Promise<QueryResult | null> => {
    if (!sql.trim()) {
      setState({
        isExecuting: false,
        result: null,
        error: 'Query cannot be empty',
      });
      return null;
    }

    setState(prev => ({
      ...prev,
      isExecuting: true,
      error: null,
    }));

    try {
      const startTime = performance.now();
      const result = sqliteEngine.executeQuery(sql);
      const endTime = performance.now();

      const queryResult: QueryResult = {
        columns: result.columns,
        values: result.values,
        error: result.error,
        executionTime: endTime - startTime,
        rowCount: result.values.length,
      };

      // 保存查询历史
      saveQueryHistory(sql);

      setState({
        isExecuting: false,
        result: queryResult,
        error: result.error || null,
      });

      return queryResult;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setState({
        isExecuting: false,
        result: null,
        error: errorMessage,
      });
      return null;
    }
  }, []);

  /**
   * 清除结果
   */
  const clearResult = useCallback(() => {
    setState({
      isExecuting: false,
      result: null,
      error: null,
    });
  }, []);

  return {
    ...state,
    executeQuery,
    clearResult,
  };
}
