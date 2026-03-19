import { useEffect, useRef, useState } from 'react';
import {
  EditorView,
  lineNumbers,
  highlightActiveLineGutter,
  highlightSpecialChars,
  drawSelection,
  dropCursor,
  rectangularSelection,
  crosshairCursor,
  highlightActiveLine,
  keymap,
} from '@codemirror/view';
import { EditorState } from '@codemirror/state';
import {
  foldGutter,
  indentOnInput,
  syntaxHighlighting,
  defaultHighlightStyle,
  bracketMatching,
} from '@codemirror/language';
import {
  history,
  defaultKeymap,
  historyKeymap,
  indentWithTab,
} from '@codemirror/commands';
import { highlightSelectionMatches, searchKeymap } from '@codemirror/search';
import {
  closeBrackets,
  autocompletion,
  closeBracketsKeymap,
  completionKeymap,
} from '@codemirror/autocomplete';
import { sql } from '@codemirror/lang-sql';
import { Play, RotateCcw, History, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  getQueryHistory, removeQueryHistory, clearQueryHistory, QueryHistoryItem,
} from '@/lib/localStorage';
import { format } from 'date-fns';

const basicSetup = [
  lineNumbers(),
  highlightActiveLineGutter(),
  highlightSpecialChars(),
  history(),
  foldGutter(),
  drawSelection(),
  dropCursor(),
  EditorState.allowMultipleSelections.of(true),
  indentOnInput(),
  syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
  bracketMatching(),
  closeBrackets(),
  autocompletion(),
  rectangularSelection(),
  crosshairCursor(),
  highlightActiveLine(),
  highlightSelectionMatches(),
  keymap.of([
    ...closeBracketsKeymap,
    ...defaultKeymap,
    ...searchKeymap,
    indentWithTab,
    ...historyKeymap,
    ...completionKeymap,
  ]),
];

interface SqlEditorProps {
  initialValue?: string;
  onChange?: (value: string) => void;
  onExecute: (query: string) => void;
  isExecuting: boolean;
}

export function SqlEditor({ initialValue = 'SELECT * FROM ', onChange, onExecute, isExecuting }: SqlEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<EditorView | null>(null);
  const queryRef = useRef<string>(initialValue);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyItems, setHistoryItems] = useState<QueryHistoryItem[]>([]);

  useEffect(() => {
    if (!containerRef.current || editorRef.current) return;

    const state = EditorState.create({
      doc: initialValue,
      extensions: [basicSetup, sql()],
    });

    const view = new EditorView({
      state,
      parent: containerRef.current,
      dispatch: (tr: any) => {
        view.update([tr]);
        const value = view.state.doc.toString();
        queryRef.current = value;
        onChange?.(value);
      },
    });

    editorRef.current = view;
    return () => { view.destroy(); editorRef.current = null; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleExecute = () => {
    onExecute(queryRef.current);
  };

  const handleClear = () => {
    if (editorRef.current) {
      editorRef.current.dispatch({
        changes: { from: 0, to: editorRef.current.state.doc.length, insert: '' },
      });
    }
  };

  const loadHistoryItem = (item: QueryHistoryItem) => {
    if (!editorRef.current) return;
    editorRef.current.dispatch({
      changes: { from: 0, to: editorRef.current.state.doc.length, insert: item.query },
    });
    setHistoryOpen(false);
  };

  const handleDeleteItem = (e: React.MouseEvent, query: string) => {
    e.stopPropagation();
    removeQueryHistory(query);
    setHistoryItems(prev => prev.filter(h => h.query !== query));
  };

  const handleClearAll = () => {
    clearQueryHistory();
    setHistoryItems([]);
  };

  const handleHistoryOpen = (open: boolean) => {
    if (open) setHistoryItems(getQueryHistory());
    setHistoryOpen(open);
  };

  return (
    <div className="h-full flex flex-col gap-3 p-4">
      <div className="flex items-center gap-2">
        <Button size="sm" onClick={handleExecute} disabled={isExecuting} className="gap-2">
          <Play className="w-4 h-4" />
          Execute (Cmd+Enter)
        </Button>
        <Button variant="outline" size="sm" onClick={handleClear} className="gap-2">
          <RotateCcw className="w-4 h-4" />
          Clear
        </Button>

        <Popover open={historyOpen} onOpenChange={handleHistoryOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2 ml-auto">
              <History className="w-4 h-4" />
              History
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[480px] p-0" align="end">
            <div className="flex items-center justify-between px-3 py-2 border-b border-border">
              <span className="text-sm font-medium">Query History</span>
              {historyItems.length > 0 && (
                <button
                  onClick={handleClearAll}
                  className="flex items-center gap-1 text-xs text-destructive hover:text-destructive/80 transition-colors"
                >
                  <Trash2 className="w-3 h-3" />
                  Clear all
                </button>
              )}
            </div>
            {historyItems.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No history yet</p>
            ) : (
              <div className="max-h-80 overflow-y-auto divide-y divide-border">
                {historyItems.map((item, i) => (
                  <div
                    key={i}
                    className="group flex items-start gap-2 px-3 py-2 hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => loadHistoryItem(item)}
                  >
                    <div className="flex-1 min-w-0">
                      <pre className="text-xs font-mono truncate whitespace-nowrap text-foreground">
                        {item.query}
                      </pre>
                      {item.savedAt > 0 && (
                        <span className="text-[10px] text-muted-foreground">
                          {format(new Date(item.savedAt), 'MM-dd HH:mm')}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={e => handleDeleteItem(e, item.query)}
                      className="opacity-0 group-hover:opacity-100 shrink-0 p-0.5 text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </PopoverContent>
        </Popover>

        {isExecuting && (
          <span className="text-xs text-muted-foreground">Executing...</span>
        )}
      </div>

      <div
        ref={containerRef}
        className="flex-1 border border-border rounded-md overflow-hidden bg-background"
        style={{ fontSize: '14px', fontFamily: "'JetBrains Mono', 'Fira Code', monospace" }}
      />
    </div>
  );
}
