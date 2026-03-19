import { Button } from '@/components/ui/button';
import { FolderOpen, Download, X } from 'lucide-react';

interface ToolbarProps {
  fileName: string | null;
  isLoaded: boolean;
  onOpenClick: () => void;
  onClose: () => void;
  onExport: () => void;
}

export function Toolbar({
  fileName,
  isLoaded,
  onOpenClick,
  onClose,
  onExport,
}: ToolbarProps) {
  return (
    <div className="toolbar h-14 flex items-center justify-between px-4 gap-4">
      {/* 左侧：文件操作 */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onOpenClick}
          className="gap-2"
        >
          <FolderOpen className="w-4 h-4" />
          <span className="hidden sm:inline">Open Database</span>
        </Button>

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
