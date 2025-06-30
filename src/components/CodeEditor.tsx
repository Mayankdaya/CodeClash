
'use client';

import Editor, { type OnChange } from '@monaco-editor/react';
import { Loader2 } from 'lucide-react';

interface CodeEditorProps {
  value: string;
  onChange: OnChange;
  disabled?: boolean;
  language: string;
}

export function CodeEditor({ value, onChange, disabled, language }: CodeEditorProps) {
  return (
    <div className="relative w-full h-full bg-[#1e1e1e] rounded-md border border-input overflow-hidden">
      <Editor
        key={language}
        height="100%"
        width="100%"
        language={language}
        theme="vs-dark"
        value={value}
        onChange={onChange}
        options={{
          minimap: { enabled: false },
          fontSize: 14,
          wordWrap: 'on',
          scrollBeyondLastLine: false,
          readOnly: disabled,
          automaticLayout: true,
          padding: { top: 16 },
        }}
        loading={<Loader2 className="h-8 w-8 animate-spin" />}
      />
    </div>
  );
}
