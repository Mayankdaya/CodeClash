
'use client';

import Editor, { type OnChange } from '@monaco-editor/react';
import { Loader2 } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface CodeEditorProps {
  value: string;
  onChange: OnChange;
  disabled?: boolean;
  language: string;
  onLanguageChange: (language: string) => void;
}

export function CodeEditor({ value, onChange, disabled, language, onLanguageChange }: CodeEditorProps) {
  const languages = ["javascript", "typescript", "python", "java", "cpp"];

  return (
    <div className="relative w-full h-full flex flex-col bg-[#1e1e1e] rounded-md border border-input">
       <div className="flex-shrink-0 p-2 flex items-center justify-end border-b border-zinc-700">
          <Select value={language} onValueChange={onLanguageChange} disabled={disabled}>
            <SelectTrigger className="w-[180px] h-8">
              <SelectValue placeholder="Select Language" />
            </SelectTrigger>
            <SelectContent>
              {languages.map((lang) => (
                 <SelectItem key={lang} value={lang} className='capitalize'>
                   {lang.charAt(0).toUpperCase() + lang.slice(1)}
                 </SelectItem>
              ))}
            </SelectContent>
          </Select>
       </div>
      <div className="relative w-full h-full flex-grow">
        <Editor
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
    </div>
  );
}
