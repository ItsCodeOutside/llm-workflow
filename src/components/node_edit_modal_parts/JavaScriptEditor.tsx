// src/components/node_edit_modal_parts/JavaScriptEditor.tsx
import React, { useEffect, useRef } from 'react';

// Declare hljs for TypeScript since it's loaded globally from a script tag
declare var hljs: any;

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
  const preRef = useRef<HTMLPreElement>(null);

  useEffect(() => {
    if (preRef.current && typeof hljs !== 'undefined') {
      const codeElement = preRef.current.querySelector('code.language-javascript');
      if (codeElement) {
        if (codeElement.hasAttribute('data-highlighted')) {
          codeElement.removeAttribute('data-highlighted');
        }
        
        codeElement.textContent = value || ''; 
        
        try {
          hljs.highlightElement(codeElement);
        } catch (e) {
          console.error('[JavaScriptEditor] Error during hljs.highlightElement call:', e);
          if (e instanceof Error && e.message.toLowerCase().includes('circular structure')) {
            console.error('[JavaScriptEditor] The "circular structure" error likely occurred inside highlight.js itself, possibly when it tried to log an internal issue after failing to highlight.');
          }
        }
      } else {
        console.warn('[JavaScriptEditor] code.language-javascript element NOT found inside preRef.');
      }
    } else {
      if (!preRef.current) console.warn('[JavaScriptEditor] preRef.current is null.');
      if (typeof hljs === 'undefined') console.warn('[JavaScriptEditor] hljs is undefined. Highlighting will not work.');
    }
  }, [value, isMaximized]); // Re-run if value or maximization changes

  const handleScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
    if (preRef.current && textareaRef.current) {
      preRef.current.scrollTop = e.currentTarget.scrollTop;
      preRef.current.scrollLeft = e.currentTarget.scrollLeft;
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
  };

  return (
    <div className={`js-editor-container mt-1 shadow-sm ${isMaximized ? 'flex-grow min-h-[200px]' : 'min-h-[150px] max-h-96'}`}>
      <pre
        ref={preRef}
        className="js-editor-highlight-layer custom-scroll"
        aria-hidden="true"
      >
        <code className="language-javascript hljs">
          {/* Content updated by useEffect */}
        </code>
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
      />
    </div>
  );
};

export default JavaScriptEditor;