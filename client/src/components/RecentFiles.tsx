import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Clock, Trash2 } from 'lucide-react';
import { RecentFile, getRecentFiles, removeRecentFile, clearRecentFiles } from '@/lib/localStorage';
import { useState, useEffect } from 'react';

interface RecentFilesProps {
  onSelectFile: (fileName: string) => void;
}

/**
 * 最近文件列表组件
 * 显示最近打开的数据库文件
 */
export function RecentFiles({ onSelectFile }: RecentFilesProps) {
  const [files, setFiles] = useState<RecentFile[]>([]);

  useEffect(() => {
    setFiles(getRecentFiles());
  }, []);

  const handleRemoveFile = (fileName: string) => {
    removeRecentFile(fileName);
    setFiles(getRecentFiles());
  };

  const handleClearAll = () => {
    if (confirm('Clear all recent files?')) {
      clearRecentFiles();
      setFiles([]);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (timestamp: number): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  if (files.length === 0) {
    return (
      <div className="p-4 text-center">
        <Clock className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-50" />
        <p className="text-sm text-muted-foreground">No recent files</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {files.map(file => (
            <div
              key={file.name}
              className="flex items-center justify-between p-2 rounded-md hover:bg-muted group transition-colors"
            >
              <button
                onClick={() => onSelectFile(file.name)}
                className="flex-1 text-left min-w-0"
              >
                <div className="text-sm font-medium truncate">{file.name}</div>
                <div className="text-xs text-muted-foreground">
                  {formatFileSize(file.size)} • {formatDate(file.lastOpened)}
                </div>
              </button>

              <button
                onClick={() => handleRemoveFile(file.name)}
                className="ml-2 p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-destructive/10 text-destructive transition-all"
                title="Remove from history"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </ScrollArea>

      {files.length > 0 && (
        <div className="border-t border-border p-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearAll}
            className="w-full text-xs text-muted-foreground"
          >
            Clear history
          </Button>
        </div>
      )}
    </div>
  );
}
