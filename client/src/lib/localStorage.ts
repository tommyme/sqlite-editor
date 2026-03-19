/**
 * 最近打开的文件信息
 */
export interface RecentFile {
  name: string;
  size: number;
  lastOpened: number; // timestamp
}

const RECENT_FILES_KEY = 'sqlite-editor:recentFiles';
const MAX_RECENT_FILES = 10;

/**
 * 获取最近打开的文件列表
 */
export function getRecentFiles(): RecentFile[] {
  try {
    const data = localStorage.getItem(RECENT_FILES_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Failed to get recent files:', error);
    return [];
  }
}

/**
 * 保存最近打开的文件
 */
export function saveRecentFile(file: File) {
  try {
    const recent = getRecentFiles();
    
    const newFile: RecentFile = {
      name: file.name,
      size: file.size,
      lastOpened: Date.now(),
    };
    
    // 去重 - 移除同名文件
    const filtered = recent.filter(f => f.name !== file.name);
    
    // 将新文件放在最前面
    filtered.unshift(newFile);
    
    // 限制数量
    const limited = filtered.slice(0, MAX_RECENT_FILES);
    
    localStorage.setItem(RECENT_FILES_KEY, JSON.stringify(limited));
  } catch (error) {
    console.error('Failed to save recent file:', error);
  }
}

/**
 * 清除所有最近打开的文件记录
 */
export function clearRecentFiles() {
  try {
    localStorage.removeItem(RECENT_FILES_KEY);
  } catch (error) {
    console.error('Failed to clear recent files:', error);
  }
}

/**
 * 删除特定的最近文件记录
 */
export function removeRecentFile(fileName: string) {
  try {
    const recent = getRecentFiles();
    const filtered = recent.filter(f => f.name !== fileName);
    localStorage.setItem(RECENT_FILES_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error('Failed to remove recent file:', error);
  }
}

export interface QueryHistoryItem {
  query: string;
  savedAt: number;
}

const QUERY_HISTORY_KEY = 'sqlite-editor:queryHistory';
const LAST_SQL_KEY = 'sqlite-editor:lastSql';

export function saveQueryHistory(query: string) {
  try {
    const history = getQueryHistory();
    const filtered = history.filter(h => h.query !== query);
    filtered.unshift({ query, savedAt: Date.now() });
    localStorage.setItem(QUERY_HISTORY_KEY, JSON.stringify(filtered.slice(0, 50)));
  } catch (error) {
    console.error('Failed to save query history:', error);
  }
}

export function getQueryHistory(): QueryHistoryItem[] {
  try {
    const raw = localStorage.getItem(QUERY_HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    // Migrate from old string[] format
    if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === 'string') {
      return parsed.map((q: string) => ({ query: q, savedAt: 0 }));
    }
    return parsed as QueryHistoryItem[];
  } catch {
    return [];
  }
}

export function removeQueryHistory(query: string) {
  try {
    const filtered = getQueryHistory().filter(h => h.query !== query);
    localStorage.setItem(QUERY_HISTORY_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error('Failed to remove query history:', error);
  }
}

export function clearQueryHistory() {
  try {
    localStorage.removeItem(QUERY_HISTORY_KEY);
  } catch (error) {
    console.error('Failed to clear query history:', error);
  }
}

export function saveLastSqlContent(sql: string) {
  try {
    localStorage.setItem(LAST_SQL_KEY, sql);
  } catch {}
}

export function getLastSqlContent(): string {
  return localStorage.getItem(LAST_SQL_KEY) ?? 'SELECT * FROM ';
}
