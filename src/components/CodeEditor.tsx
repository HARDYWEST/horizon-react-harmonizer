import { Editor } from '@monaco-editor/react';
import { useEffect } from 'react';

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  language: 'javascript' | 'typescript';
  placeholder?: string;
  readOnly?: boolean;
  height?: string;
}

export const CodeEditor = ({ 
  value, 
  onChange, 
  language, 
  placeholder = '', 
  readOnly = false,
  height = '400px'
}: CodeEditorProps) => {
  const handleEditorChange = (value: string | undefined) => {
    onChange(value || '');
  };

  const editorOptions = {
    minimap: { enabled: false },
    scrollBeyondLastLine: false,
    fontSize: 14,
    lineNumbers: 'on' as const,
    roundedSelection: false,
    readOnly,
    cursorStyle: 'line' as const,
    automaticLayout: true,
    wordWrap: 'on' as const,
    theme: 'vs-dark',
    bracketPairColorization: { enabled: true },
    suggest: {
      showKeywords: true,
      showSnippets: true,
    },
    quickSuggestions: {
      other: true,
      comments: false,
      strings: false,
    },
  };

  useEffect(() => {
    // Configure Monaco editor for better TypeScript support
    import('monaco-editor').then((monaco) => {
      monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
        target: monaco.languages.typescript.ScriptTarget.ES2020,
        allowNonTsExtensions: true,
        moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
        module: monaco.languages.typescript.ModuleKind.CommonJS,
        noEmit: true,
        esModuleInterop: true,
        jsx: monaco.languages.typescript.JsxEmit.React,
        reactNamespace: 'React',
        allowJs: true,
        typeRoots: ['node_modules/@types'],
      });

      monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
        noSemanticValidation: false,
        noSyntaxValidation: false,
      });
    }).catch(() => {
      // Silently handle import errors for development
    });
  }, []);

  return (
    <div className="rounded-lg overflow-hidden border border-code-border shadow-code">
      <Editor
        height={height}
        language={language}
        value={value}
        onChange={handleEditorChange}
        options={editorOptions}
        theme="vs-dark"
        beforeMount={(monaco) => {
          monaco.editor.defineTheme('horizon-dark', {
            base: 'vs-dark',
            inherit: true,
            rules: [
              { token: 'comment', foreground: '6C7A89', fontStyle: 'italic' },
              { token: 'keyword', foreground: 'C792EA' },
              { token: 'string', foreground: 'C3E88D' },
              { token: 'number', foreground: 'F78C6C' },
              { token: 'type', foreground: '82AAFF' },
              { token: 'function', foreground: 'FFD700' },
            ],
            colors: {
              'editor.background': '#1e293b',
              'editor.foreground': '#cbd5e1',
              'editorLineNumber.foreground': '#64748b',
              'editor.selectionBackground': '#374151',
              'editor.lineHighlightBackground': '#334155',
            },
          });
          monaco.editor.setTheme('horizon-dark');
        }}
      />
    </div>
  );
};