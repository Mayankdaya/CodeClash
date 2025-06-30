'use client';

import Editor, { type OnChange } from '@monaco-editor/react';
import { Loader2 } from 'lucide-react';

interface CodeEditorProps {
  value: string;
  onChange: OnChange;
  disabled?: boolean;
}

export function CodeEditor({ value, onChange, disabled }: CodeEditorProps) {
  return (
    <div className="relative w-full h-full">
      <Editor
        height="100%"
        width="100%"
        language="javascript"
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
        }}
        loading={<Loader2 className="h-8 w-8 animate-spin" />}
      />
    </div>
  );
}
