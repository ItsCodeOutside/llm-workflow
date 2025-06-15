// src/components/node_edit_modal_parts/JavaScriptEditor.tsx
import React, { useEffect, useRef, useMemo, useState } from 'react';
import hljs from 'highlight.js/lib/core';
import javascript from 'highlight.js/lib/languages/javascript';
import 'highlight.js/styles/github.css';
import './JavaScriptEditor.local.css';

hljs.registerLanguage('javascript', javascript);

interface JavaScriptEditorProps {
  value: string;
  onChange: (newCode: string) => void;
  isMaximized: boolean;
  placeholder?: string;
  textareaId?: string;
}

const JavaScriptEditor: React.FC<JavaScriptEditorProps> = ({
  value,
  onChange,
  isMaximized,
  placeholder,
  textareaId = "code"
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const highlightRef = useRef<HTMLPreElement>(null);
  const [codeMinWidth, setCodeMinWidth] = useState<string>('100%');

  // Memoize highlighted code for performance, and append a dummy span for scroll area
  const highlightedCodeWithDummy = useMemo(() => {
    // Add a dummy span to force scroll area
    const dummy = `<span style="visibility:hidden;white-space:pre;display:block;width:100%;min-height:1em;font:inherit;pointer-events:none;">${(value || ' ').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</span>`;
    return hljs.highlight(value || '', { language: 'javascript' }).value + dummy;
  }, [value]);

  useEffect(() => {
    if (textareaRef.current) {
      setCodeMinWidth(textareaRef.current.scrollWidth + 'px');
    }
  }, [value]);

  const handleScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
    if (highlightRef.current && textareaRef.current) {
      highlightRef.current.scrollTop = e.currentTarget.scrollTop;
      highlightRef.current.scrollLeft = e.currentTarget.scrollLeft;
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
  };

  // Shared editor style for both layers
  const sharedEditorStyle: React.CSSProperties = {
    fontFamily: `'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, Courier, monospace`,
    fontSize: '0.875rem', // text-sm
    lineHeight: '1.25rem', // leading-tight
    padding: '0.5rem', // p-2
    boxSizing: 'border-box',
    whiteSpace: 'pre',
    wordWrap: 'normal',
    tabSize: 2,
    width: '100%',
    height: '100%',
  };

  return (
    <div
      className={`js-editor-container mt-1 shadow-sm ${isMaximized ? 'flex-grow min-h-[200px]' : 'min-h-[150px] max-h-96'}`}
      style={{ position: 'relative', width: '100%', height: '100%' }}
    >
      <pre
        ref={highlightRef}
        className="js-editor-highlight-layer custom-scroll hide-scrollbar"
        aria-hidden="true"
        style={{
          ...sharedEditorStyle,
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: '100%',
          height: '100%',
          margin: 0,
          background: 'transparent',
          color: '#e2e8f0',
          overflow: 'auto', // allow scrolling for sync
          pointerEvents: 'none',
          zIndex: 1,
        }}
      >
        <code
          className="language-javascript hljs"
          style={{
            padding: 0,
            background: 'none',
            color: 'inherit',
            display: 'block',
            width: '100%',
            minWidth: codeMinWidth,
            maxWidth: 'none',
            boxSizing: 'border-box',
            whiteSpace: 'pre',
            overflow: 'hidden',
            position: 'relative',
          }}
          dangerouslySetInnerHTML={{ __html: highlightedCodeWithDummy }}
        />
      </pre>
      <textarea
        ref={textareaRef}
        name={textareaId}
        id={textareaId}
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        className="js-editor-input-layer custom-scroll"
        spellCheck="false"
        onScroll={handleScroll}
        style={{
          ...sharedEditorStyle,
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: '100%',
          height: '100%',
          background: 'transparent',
          color: 'transparent',
          caretColor: '#f1f5f9',
          border: 'none',
          outline: 'none',
          resize: 'none',
          zIndex: 2,
          overflow: 'auto',
          whiteSpace: 'pre',
        }}
      />
    </div>
  );
};

export default JavaScriptEditor;