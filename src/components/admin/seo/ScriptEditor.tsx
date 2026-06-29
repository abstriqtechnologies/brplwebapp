"use client";

import CodeMirror from "@uiw/react-codemirror";
import { html } from "@codemirror/lang-html";
import { useMemo } from "react";

type Props = {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    minHeight?: string;
};

/**
 * Dark-themed CodeMirror HTML code editor.
 */
export function ScriptEditor({ value, onChange, placeholder, minHeight = "180px" }: Props) {
    const extensions = useMemo(() => [html()], []);

    return (
        <div className="rounded-lg overflow-hidden border border-slate-700/50">
            <CodeMirror
                value={value}
                extensions={extensions}
                placeholder={placeholder}
                height={minHeight}
                theme="dark"
                basicSetup={{
                    lineNumbers: true,
                    foldGutter: false,
                    autocompletion: false,
                    highlightActiveLine: true,
                    highlightActiveLineGutter: false,
                }}
                onChange={(val: string) => onChange(val)}
            />
        </div>
    );
}
