import { useCallback, useRef, useState } from 'react';
import * as sqliteEngine from '@/lib/sqliteEngine';
import { saveQueryHistory } from '@/lib/localStorage';

export interface QueryResult {
  columns: string[];
  values: any[][];
  rowids: number[];
  tableName: string | null;
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
  const lastSqlRef = useRef<string>('');

  const executeQuery = useCallback(async (sql: string): Promise<QueryResult | null> => {
    if (!sql.trim()) {
      setState({ isExecuting: false, result: null, error: 'Query cannot be empty' });
      return null;
    }

    lastSqlRef.current = sql;
    setState(prev => ({ ...prev, isExecuting: true, error: null }));

    try {
      const startTime = performance.now();
      const result = sqliteEngine.executeQuery(sql);
      const endTime = performance.now();

      const queryResult: QueryResult = {
        columns: result.columns,
        values: result.values,
        rowids: result.rowids,
        tableName: result.tableName,
        error: result.error,
        executionTime: endTime - startTime,
        rowCount: result.values.length,
      };

      saveQueryHistory(sql);

      setState({ isExecuting: false, result: queryResult, error: result.error || null });
      return queryResult;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setState({ isExecuting: false, result: null, error: errorMessage });
      return null;
    }
  }, []);

  const reExecute = useCallback(() => {
    if (lastSqlRef.current) executeQuery(lastSqlRef.current);
  }, [executeQuery]);

  const clearResult = useCallback(() => {
    setState({ isExecuting: false, result: null, error: null });
  }, []);

  return { ...state, executeQuery, reExecute, clearResult };
}
