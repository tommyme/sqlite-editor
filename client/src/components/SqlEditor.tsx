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
import {
  EditorState,
} from '@codemirror/state';
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
import { Button } from '@/components/ui/button';
import { Play, RotateCcw } from 'lucide-react';

// Replaces @codemirror/basic-setup (deprecated) using already-installed packages,
// preventing duplicate @codemirror/state instances that caused instanceof errors.
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
  onExecute: (query: string) => void;
  isExecuting: boolean;
}

/**
 * Engineering Workspace SQL 编辑器
 * 使用 CodeMirror 6 提供语法高亮和基础自动补全
 */
export function SqlEditor({ onExecute, isExecuting }: SqlEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<EditorView | null>(null);
  const [query, setQuery] = useState('SELECT * FROM ');

  // 初始化编辑器
  useEffect(() => {
    if (!containerRef.current || editorRef.current) return;

    const state = EditorState.create({
      doc: query,
      extensions: [basicSetup, sql()],
    });

    const view = new EditorView({
      state,
      parent: containerRef.current,
      dispatch: (tr: any) => {
        view.update([tr]);
        setQuery(view.state.doc.toString());
      },
    });

    editorRef.current = view;

    return () => {
      view.destroy();
      editorRef.current = null;
    };
  }, []);

  const handleExecute = () => {
    const currentQuery = editorRef.current?.state.doc.toString() || query;
    onExecute(currentQuery);
  };

  const handleClear = () => {
    if (editorRef.current) {
      editorRef.current.dispatch({
        changes: {
          from: 0,
          to: editorRef.current.state.doc.length,
          insert: '',
        },
      });
      setQuery('');
    }
  };

  return (
    <div className="h-full flex flex-col gap-3 p-4">
      {/* 编辑器工具栏 */}
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          onClick={handleExecute}
          disabled={isExecuting || !query.trim()}
          className="gap-2"
        >
          <Play className="w-4 h-4" />
          Execute (Cmd+Enter)
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={handleClear}
          className="gap-2"
        >
          <RotateCcw className="w-4 h-4" />
          Clear
        </Button>

        {isExecuting && (
          <span className="text-xs text-muted-foreground ml-auto">
            Executing...
          </span>
        )}
      </div>

      {/* CodeMirror 编辑器 */}
      <div
        ref={containerRef}
        className="flex-1 border border-border rounded-md overflow-hidden bg-background"
        style={{
          fontSize: '14px',
          fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
        }}
      />
    </div>
  );
}
