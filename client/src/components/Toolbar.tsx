import { Button } from '@/components/ui/button';
import { FolderOpen, Download, X } from 'lucide-react';
import { useRef } from 'react';

interface ToolbarProps {
  fileName: string | null;
  isLoaded: boolean;
  onFileOpen: (file: File) => void;
  onClose: () => void;
  onExport: () => void;
}

/**
 * Engineering Workspace 工具栏
 * 提供文件操作、导出等功能
 */
export function Toolbar({
  fileName,
  isLoaded,
  onFileOpen,
  onClose,
  onExport,
}: ToolbarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileOpen(file);
      // 重置 input 以便再次选择同一文件
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleOpenClick = async () => {
    // Use File System Access API when available (Chrome/Edge on macOS).
    // The legacy hidden-input + .click() approach triggers a native file dialog
    // that loses mouse interaction on macOS — showOpenFilePicker() avoids this.
    if ('showOpenFilePicker' in window) {
      try {
        const [fileHandle] = await (window as any).showOpenFilePicker({
          types: [
            {
              description: 'SQLite Databases',
              accept: {
                'application/x-sqlite3': ['.sqlite', '.db', '.sqlite3'],
              },
            },
          ],
          multiple: false,
        });
        const file = await fileHandle.getFile();
        onFileOpen(file);
      } catch (err) {
        // AbortError means user dismissed the dialog — ignore it
        if ((err as Error).name !== 'AbortError') {
          console.error('Failed to open file:', err);
        }
      }
      return;
    }

    // Fallback for browsers without File System Access API (Firefox, Safari)
    fileInputRef.current?.click();
  };

  return (
    <div className="toolbar h-14 flex items-center justify-between px-4 gap-4">
      {/* 左侧：文件操作 */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleOpenClick}
          className="gap-2"
        >
          <FolderOpen className="w-4 h-4" />
          <span className="hidden sm:inline">Open Database</span>
        </Button>

        {/* Fallback input for browsers without File System Access API */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".sqlite,.db,.sqlite3"
          onChange={handleFileSelect}
          className="hidden"
          aria-hidden="true"
        />

        {isLoaded && fileName && (
          <>
            <div className="h-6 w-px bg-border" />
            <span className="text-sm text-muted-foreground truncate max-w-xs">
              {fileName}
            </span>
          </>
        )}
      </div>

      {/* 右侧：操作按钮 */}
      <div className="flex items-center gap-2">
        {isLoaded && (
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={onExport}
              className="gap-2"
              title="Export database"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Export</span>
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="gap-2 text-destructive hover:text-destructive"
              title="Close database"
            >
              <X className="w-4 h-4" />
              <span className="hidden sm:inline">Close</span>
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
