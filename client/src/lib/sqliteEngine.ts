import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';
import { nanoid } from 'nanoid';

// ---------------------------------------------------------------------------
// Engine state — supports multiple open databases
// ---------------------------------------------------------------------------

let SQL: any = null;

interface DbEntry {
  db: SqlJsDatabase;
  fileName: string;
  fileHandle?: FileSystemFileHandle;
}

const databases = new Map<string, DbEntry>();
let activeDbId: string | null = null;

function getActiveDb(): SqlJsDatabase | null {
  if (!activeDbId) return null;
  return databases.get(activeDbId)?.db ?? null;
}

// ---------------------------------------------------------------------------
// Init
// ---------------------------------------------------------------------------

export async function initSQLite() {
  if (!SQL) {
    SQL = await initSqlJs({ locateFile: () => `/sql-wasm.wasm` });
  }
  return SQL;
}

// ---------------------------------------------------------------------------
// Multi-DB management
// ---------------------------------------------------------------------------

/** Opens a file and returns the new DB id. Automatically sets it as active. */
export async function openDatabase(file: File, fileHandle?: FileSystemFileHandle): Promise<string> {
  const sql = await initSQLite();
  const buffer = await file.arrayBuffer();
  const db = new sql.Database(new Uint8Array(buffer));
  const id = nanoid(8);
  databases.set(id, { db, fileName: file.name, fileHandle });
  activeDbId = id;
  return id;
}

/**
 * Saves the current in-memory DB back to the original file via File System Access API.
 * Returns canAutoSave=false if no file handle is available (fallback input or Firefox/Safari).
 */
export async function saveDatabase(
  id?: string
): Promise<{ success: boolean; canAutoSave: boolean; error?: string }> {
  const targetId = id ?? activeDbId;
  if (!targetId) return { success: false, canAutoSave: false, error: 'No database' };
  const entry = databases.get(targetId);
  if (!entry) return { success: false, canAutoSave: false, error: 'DB not found' };
  if (!entry.fileHandle) return { success: false, canAutoSave: false };
  try {
    const data = entry.db.export();
    const writable = await entry.fileHandle.createWritable();
    await writable.write(data);
    await writable.close();
    return { success: true, canAutoSave: true };
  } catch (err) {
    return {
      success: false,
      canAutoSave: true,
      error: err instanceof Error ? err.message : 'Write failed',
    };
  }
}

export function setActiveDatabase(id: string): void {
  if (databases.has(id)) activeDbId = id;
}

export function closeDatabase(id?: string): void {
  const targetId = id ?? activeDbId;
  if (!targetId) return;
  databases.get(targetId)?.db.close();
  databases.delete(targetId);
  if (activeDbId === targetId) {
    const remaining = [...databases.keys()];
    activeDbId = remaining.length > 0 ? remaining[remaining.length - 1] : null;
  }
}

export function getOpenDatabases(): Array<{ id: string; fileName: string }> {
  return [...databases.entries()].map(([id, { fileName }]) => ({ id, fileName }));
}

export function getActiveDbId(): string | null {
  return activeDbId;
}

// ---------------------------------------------------------------------------
// Query helpers (all use the currently active DB)
// ---------------------------------------------------------------------------

export function getTables(): string[] {
  const db = getActiveDb();
  if (!db) return [];
  const result = db.exec(
    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
  );
  if (result.length === 0) return [];
  return result[0].values.map((row: any[]) => row[0] as string);
}

export function getTableRowCount(tableName: string): number {
  const db = getActiveDb();
  if (!db) return 0;
  try {
    const result = db.exec(`SELECT COUNT(*) FROM \`${tableName}\``);
    return result.length > 0 ? (result[0].values[0][0] as number) : 0;
  } catch {
    return 0;
  }
}

export function getTableColumns(tableName: string): Array<{ name: string; type: string }> {
  const db = getActiveDb();
  if (!db) return [];
  try {
    const result = db.exec(`PRAGMA table_info(\`${tableName}\`)`);
    if (result.length === 0) return [];
    return result[0].values.map((row: any[]) => ({ name: row[1] as string, type: row[2] as string }));
  } catch {
    return [];
  }
}

export function executeQuery(sql: string): { columns: string[]; values: any[][]; error?: string } {
  const db = getActiveDb();
  if (!db) return { columns: [], values: [], error: 'Database not loaded' };
  try {
    const result = db.exec(sql);
    if (result.length === 0) return { columns: [], values: [] };
    return { columns: result[0].columns, values: result[0].values };
  } catch (error) {
    return { columns: [], values: [], error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export function getTableData(
  tableName: string,
  limit: number = 1000,
  offset: number = 0
): { columns: string[]; values: any[][]; rowids: number[]; total: number } {
  const db = getActiveDb();
  if (!db) return { columns: [], values: [], rowids: [], total: 0 };
  try {
    const countResult = db.exec(`SELECT COUNT(*) FROM \`${tableName}\``);
    const total = countResult.length > 0 ? (countResult[0].values[0][0] as number) : 0;

    const dataResult = db.exec(
      `SELECT rowid, * FROM \`${tableName}\` LIMIT ${limit} OFFSET ${offset}`
    );
    if (dataResult.length === 0) return { columns: [], values: [], rowids: [], total };

    const rowids = dataResult[0].values.map((row: any[]) => row[0] as number);
    const columns = dataResult[0].columns.slice(1);
    const values = dataResult[0].values.map((row: any[]) => row.slice(1));
    return { columns, values, rowids, total };
  } catch {
    return { columns: [], values: [], rowids: [], total: 0 };
  }
}

export function updateCell(
  tableName: string,
  rowid: number,
  columnName: string,
  newValue: string | number | null
): { success: boolean; error?: string } {
  const db = getActiveDb();
  if (!db) return { success: false, error: 'No database loaded' };
  try {
    db.run(
      `UPDATE \`${tableName}\` SET \`${columnName}\` = ? WHERE rowid = ?`,
      [newValue, rowid]
    );
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Update failed' };
  }
}

export function exportDatabase(): Uint8Array | null {
  return getActiveDb()?.export() ?? null;
}
