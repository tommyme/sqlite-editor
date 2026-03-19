import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';

let SQL: any = null;
let db: SqlJsDatabase | null = null;

/**
 * 初始化 SQLite WASM 引擎
 */
export async function initSQLite() {
  if (!SQL) {
    SQL = await initSqlJs({
      locateFile: (file: string) => `/sql-wasm.wasm`,
    });
  }
  return SQL;
}

/**
 * 打开数据库文件
 */
export async function openDatabase(file: File): Promise<SqlJsDatabase | null> {
  const SQL = await initSQLite();
  const buffer = await file.arrayBuffer();
  db = new SQL.Database(new Uint8Array(buffer));
  return db;
}

/**
 * 获取当前数据库实例
 */
export function getDatabase(): SqlJsDatabase | null {
  return db;
}

/**
 * 关闭数据库
 */
export function closeDatabase() {
  if (db) {
    db.close();
    db = null;
  }
}

/**
 * 获取所有表名
 */
export function getTables(): string[] {
  if (!db) return [];
  
  const result = db.exec(
    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
  );
  
  if (result.length === 0) return [];
  
  return result[0].values.map((row: any[]) => row[0] as string);
}

/**
 * 获取表的行数
 */
export function getTableRowCount(tableName: string): number {
  if (!db) return 0;
  
  try {
    const result = db.exec(`SELECT COUNT(*) as count FROM \`${tableName}\``);
    if (result.length === 0) return 0;
    return result[0].values[0][0] as number;
  } catch (error) {
    console.error(`Failed to get row count for table ${tableName}:`, error);
    return 0;
  }
}

/**
 * 获取表的列信息
 */
export function getTableColumns(tableName: string): Array<{ name: string; type: string }> {
  if (!db) return [];
  
  try {
    const result = db.exec(`PRAGMA table_info(\`${tableName}\`)`);
    if (result.length === 0) return [];
    
    return result[0].values.map((row: any[]) => ({
      name: row[1] as string,
      type: row[2] as string,
    }));
  } catch (error) {
    console.error(`Failed to get columns for table ${tableName}:`, error);
    return [];
  }
}

/**
 * 执行 SELECT 查询并返回结果
 */
export function executeQuery(sql: string): {
  columns: string[];
  values: any[][];
  error?: string;
} {
  if (!db) {
    return { columns: [], values: [], error: 'Database not loaded' };
  }
  
  try {
    const result = db.exec(sql);
    
    if (result.length === 0) {
      return { columns: [], values: [] };
    }
    
    return {
      columns: result[0].columns,
      values: result[0].values,
    };
  } catch (error) {
    return {
      columns: [],
      values: [],
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * 获取表数据（支持分页），同时返回每行的 rowid 用于更新操作
 */
export function getTableData(
  tableName: string,
  limit: number = 1000,
  offset: number = 0
): {
  columns: string[];
  values: any[][];
  rowids: number[];
  total: number;
} {
  if (!db) {
    return { columns: [], values: [], rowids: [], total: 0 };
  }

  try {
    const countResult = db.exec(`SELECT COUNT(*) as count FROM \`${tableName}\``);
    const total = countResult.length > 0 ? (countResult[0].values[0][0] as number) : 0;

    // Select rowid alongside data so we can UPDATE specific rows later
    const dataResult = db.exec(
      `SELECT rowid, * FROM \`${tableName}\` LIMIT ${limit} OFFSET ${offset}`
    );

    if (dataResult.length === 0) {
      return { columns: [], values: [], rowids: [], total };
    }

    // First column is rowid — split it out
    const rowids = dataResult[0].values.map((row: any[]) => row[0] as number);
    const columns = dataResult[0].columns.slice(1);
    const values = dataResult[0].values.map((row: any[]) => row.slice(1));

    return { columns, values, rowids, total };
  } catch (error) {
    console.error(`Failed to get table data for ${tableName}:`, error);
    return { columns: [], values: [], rowids: [], total: 0 };
  }
}

/**
 * 更新单元格值
 */
export function updateCell(
  tableName: string,
  rowid: number,
  columnName: string,
  newValue: string | number | null
): { success: boolean; error?: string } {
  if (!db) return { success: false, error: 'No database loaded' };
  try {
    db.run(
      `UPDATE \`${tableName}\` SET \`${columnName}\` = ? WHERE rowid = ?`,
      [newValue, rowid]
    );
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Update failed',
    };
  }
}

/**
 * 导出数据库为 Uint8Array（用于下载）
 */
export function exportDatabase(): Uint8Array | null {
  if (!db) return null;
  return db.export();
}
