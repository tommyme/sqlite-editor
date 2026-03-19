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

/**
 * 保存查询历史
 */
export function saveQueryHistory(query: string) {
  try {
    const key = 'sqlite-editor:queryHistory';
    const history = JSON.parse(localStorage.getItem(key) || '[]') as string[];
    
    // 去重
    const filtered = history.filter(q => q !== query);
    
    // 新查询放在最前面
    filtered.unshift(query);
    
    // 限制数量
    const limited = filtered.slice(0, 50);
    
    localStorage.setItem(key, JSON.stringify(limited));
  } catch (error) {
    console.error('Failed to save query history:', error);
  }
}

/**
 * 获取查询历史
 */
export function getQueryHistory(): string[] {
  try {
    const key = 'sqlite-editor:queryHistory';
    return JSON.parse(localStorage.getItem(key) || '[]');
  } catch (error) {
    console.error('Failed to get query history:', error);
    return [];
  }
}

/**
 * 清除查询历史
 */
export function clearQueryHistory() {
  try {
    localStorage.removeItem('sqlite-editor:queryHistory');
  } catch (error) {
    console.error('Failed to clear query history:', error);
  }
}
