// src/components/HelpModal.tsx
import React from 'react';
import Modal from './Modal';
import type { HelpModalProps } from '../types'; // Updated path

const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Help & Instructions" widthClass="sm:max-w-2xl">
      <div className="space-y-4 text-slate-300 max-h-[70vh] overflow-y-auto custom-scroll pr-2">
        <section>
          <h4 className="text-lg font-semibold text-sky-400 mb-2">Getting Started</h4>
          <p>This application allows you to create interactive workflows for Large Language Models (LLMs) like OpenAI's ChatGPT or local models via Ollama.</p>
          <ol className="list-decimal list-inside space-y-1 mt-1">
            <li>Create a new project or open an existing one.</li>
            <li>In "Project Settings", you can define **Project-Wide Variables**.</li>
            <li>Add nodes (Start, Prompt, Conditional, Variable, Question, JavaScript, Parallel, Synchronize, Conclusion) to the canvas.</li>
            <li>Configure nodes, link them, and set up your LLM provider in "App Settings".</li>
            <li>Run your project and review results!</li>
          </ol>
        </section>
        <hr className="border-slate-700"/>
        <section>
          <h4 className="text-lg font-semibold text-sky-400 mb-2">Node Types</h4>
          <ul className="space-y-1.5">
            <li><strong>Start Node:</strong> Entry point. Its prompt is sent to the LLM.</li>
            <li><strong>Prompt Node:</strong> Sends a prompt to LLM. Uses <code className="bg-slate-700 px-1 rounded text-sky-300">{'{PREVIOUS_OUTPUT}'}</code> and <code className="bg-slate-700 px-1 rounded text-sky-300">{'{variable_name}'}</code>.</li>
            <li><strong>Conditional Node:</strong> Directs flow based on LLM output to its prompt.</li>
            <li><strong>Variable Node:</strong> Stores input as <code className="bg-slate-700 px-1 rounded text-sky-300">{'{variable_name}'}</code> for later use.</li>
            <li><strong>Question Node:</strong> Asks user for input, which becomes its output.</li>
            <li>
              <strong>JavaScript Node:</strong> Executes custom JavaScript code.
              <ul className="list-disc list-inside ml-4 mt-0.5 space-y-0.5 text-sm">
                <li>Provide JavaScript code in the node's "Code" field. This code is the body of an <code className="bg-slate-700 px-0.5 rounded text-sky-300">async</code> function.</li>
                <li>The function signature is effectively: <code className="bg-slate-700 px-0.5 rounded text-sky-300">async function(previousOutput, nodeVariables, projectVariables)</code>.</li>
                <li><code className="bg-slate-700 px-0.5 rounded text-sky-300">previousOutput</code>: (string) The output from the preceding node.</li>
                <li><code className="bg-slate-700 px-0.5 rounded text-sky-300">nodeVariables</code>: (object) Key-value pairs from `Variable` nodes (e.g., `nodeVariables.myVar`).</li>
                <li><code className="bg-slate-700 px-0.5 rounded text-sky-300">projectVariables</code>: (object) Key-value pairs from Project Settings (e.g., `projectVariables.apiKey`).</li>
                <li>Your code must <code className="bg-slate-700 px-0.5 rounded text-sky-300">return</code> a value. This value will be converted to a string and become the output of this node.</li>
                <li>Example: <code className="bg-slate-700 px-0.5 rounded text-sky-300">{"return `Processed: ${previousOutput} - User: ${projectVariables.user_name || 'N/A'}`;"}</code></li>
                 <li>The "Prompt" field for this node type is optional and can be used as a description.</li>
              </ul>
            </li>
            <li>
              <strong>Parallel Node:</strong> Splits the workflow into multiple concurrent paths.
              <ul className="list-disc list-inside ml-4 mt-0.5 space-y-0.5 text-sm">
                <li>Select up to 4 "Next Nodes" in its settings.</li>
                <li>The input to the Parallel node is passed as input to each of these selected "Next Nodes."</li>
                <li>When executed, it increments a global "parallel path counter" by the number of its branches.</li>
                <li>Each selected "Next Node" starts a new execution path that runs concurrently.</li>
                <li>The "Prompt" field for this node type is optional and can be used as a description.</li>
              </ul>
            </li>
            <li>
              <strong>Synchronize Node:</strong> Waits for all globally active parallel branches to complete.
              <ul className="list-disc list-inside ml-4 mt-0.5 space-y-0.5 text-sm">
                <li>When a path reaches a Synchronize node, it decrements the global "parallel path counter".</li>
                <li>The path then pauses, waiting for this global counter to become zero.</li>
                <li>Once the counter is zero (indicating all branches initiated by Parallel nodes, and not yet concluded or synchronized, have finished), this path resumes.</li>
                <li>Upon resuming, it outputs the fixed string "continue". Outputs from the arriving branches are logged but not merged into this output.</li>
                <li>The "Prompt" field for this node type is optional and can be used as a description.</li>
              </ul>
            </li>
            <li>
              <strong>Conclusion Node:</strong> Displays final output and signals the end of a path.
              <ul className="list-disc list-inside ml-4 mt-0.5 space-y-0.5 text-sm">
                <li>When reached, it decrements the global "parallel path counter".</li>
                <li>It then displays its configured output.</li>
              </ul>
            </li>
          </ul>
        </section>
        <hr className="border-slate-700"/>
        <section>
          <h4 className="text-lg font-semibold text-sky-400 mb-2">Using Placeholders & Variables</h4>
           <p>In Start, Prompt, Conditional Node prompts, Question Node questions, and Conclusion Node output templates, you can use placeholders. JavaScript nodes access these differently (see above).</p>
          <ul className="list-disc list-inside space-y-1 mt-1">
            <li><code className="bg-slate-700 px-1 rounded text-sky-300">{'{PREVIOUS_OUTPUT}'}</code>: Output from the direct predecessor.</li>
            <li><code className="bg-slate-700 px-1 rounded text-sky-300">{'{variable_name}'}</code>: Value from a Project-Wide Variable or a Variable Node.</li>
            <li>
              <strong>System Variables</strong> (e.g., <code className="bg-slate-700 px-1 rounded text-sky-300">{'{CurrentDateTime}'}</code>, <code className="bg-slate-700 px-1 rounded text-sky-300">{'{LLMModel}'}</code>) are also available.
            </li>
          </ul>
        </section>
        <hr className="border-slate-700"/>
        <section>
          <h4 className="text-lg font-semibold text-sky-400 mb-2">Conditional Node Branching</h4>
          <p>Uses LLM output to choose path. Conditions: Exact match, <code className="bg-slate-700 px-1 rounded text-sky-300">contains 'keyword'</code>, <code className="bg-slate-700 px-1 rounded text-sky-300">starts with 'prefix'</code>, or <code className="bg-slate-700 px-1 rounded text-sky-300">default</code>.</p>
        </section>
         <hr className="border-slate-700"/>
        <section>
            <h4 className="text-lg font-semibold text-sky-400 mb-2">Execution Panel</h4>
            <p>Shows real-time run information: current node, logs (status, output, tokens), total duration, and tokens used. For parallel executions, logs may interleave.</p>
        </section>
        <hr className="border-slate-700"/>
        <section>
          <h4 className="text-lg font-semibold text-sky-400 mb-2">API Keys & Security</h4>
          <p>
            ChatGPT API keys are stored in browser local storage (insecure for production).
            JavaScript Node code is executed client-side; be cautious with untrusted code/projects.
          </p>
        </section>
        <hr className="border-slate-700"/>
        <section>
          <details>
            <summary className="text-lg font-semibold text-sky-400 mb-2 cursor-pointer hover:text-sky-300">Licenses</summary>
            <div className="space-y-3 mt-1 pl-2 text-sm">
              <p>This project utilizes the following open-source libraries and resources:</p>
              <ul className="list-disc list-inside space-y-1.5">
                <li>
                  <strong>React & React DOM:</strong> 
                  <a href="https://react.dev/" target="_blank" rel="noopener noreferrer" className="ml-1 text-sky-400 hover:text-sky-300 underline">Homepage</a> - 
                  Licensed under the <a href="/licenses/MIT.txt" target="_blank" rel="noopener noreferrer" className="text-sky-400 hover:text-sky-300 underline">MIT License</a>.
                </li>
                <li>
                  <strong>React Router DOM:</strong> 
                  <a href="https://reactrouter.com/" target="_blank" rel="noopener noreferrer" className="ml-1 text-sky-400 hover:text-sky-300 underline">Homepage</a> - 
                  Licensed under the <a href="/licenses/MIT.txt" target="_blank" rel="noopener noreferrer" className="text-sky-400 hover:text-sky-300 underline">MIT License</a>.
                </li>
                <li>
                  <strong>Tailwind CSS:</strong> 
                  <a href="https://tailwindcss.com/" target="_blank" rel="noopener noreferrer" className="ml-1 text-sky-400 hover:text-sky-300 underline">Homepage</a> - 
                  Licensed under the <a href="/licenses/MIT.txt" target="_blank" rel="noopener noreferrer" className="text-sky-400 hover:text-sky-300 underline">MIT License</a>.
                </li>
                <li>
                  <strong>Font Awesome:</strong> 
                  <a href="https://fontawesome.com/" target="_blank" rel="noopener noreferrer" className="ml-1 text-sky-400 hover:text-sky-300 underline">Homepage</a> - 
                  See <a href="https://fontawesome.com/license/free" target="_blank" rel="noopener noreferrer" className="text-sky-400 hover:text-sky-300 underline">Font Awesome Free License</a>.
                </li>
                <li>
                  <strong>Highlight.js:</strong> 
                  <a href="https://highlightjs.org/" target="_blank" rel="noopener noreferrer" className="ml-1 text-sky-400 hover:text-sky-300 underline">Homepage</a> - 
                  Licensed under the <a href="/licenses/BSD-3-Clause.txt" target="_blank" rel="noopener noreferrer" className="text-sky-400 hover:text-sky-300 underline">BSD 3-Clause License</a>.
                </li>
                 <li>
                  <strong>@google/genai (Google Gemini API SDK):</strong> 
                  <a href="https://github.com/google/generative-ai-js" target="_blank" rel="noopener noreferrer" className="ml-1 text-sky-400 hover:text-sky-300 underline">Repository</a> - 
                  Licensed under the <a href="/licenses/Apache-2.0.txt" target="_blank" rel="noopener noreferrer" className="text-sky-400 hover:text-sky-300 underline">Apache 2.0 License</a>.
                </li>
              </ul>
              <p className="text-xs mt-3">
                Full license texts are available via the links above. Copies of MIT, BSD 3-Clause, and Apache 2.0 licenses are also included in the application's <code className="bg-slate-700 px-1 rounded text-sky-300">/licenses</code> directory.
              </p>
            </div>
          </details>
        </section>
      </div>
    </Modal>
  );
};

export default HelpModal;
