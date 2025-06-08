
// src/components/HelpModal.tsx
import React from 'react';
import Modal from './Modal';
import type { HelpModalProps } from '../../types';

const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Help & Instructions" widthClass="sm:max-w-2xl">
      <div className="space-y-4 text-slate-300 max-h-[70vh] overflow-y-auto custom-scroll pr-2">
        <section>
          <h4 className="text-lg font-semibold text-sky-400 mb-2">Getting Started</h4>
          <p>This application allows you to create interactive workflows for Large Language Models (LLMs) like OpenAI's ChatGPT or local models via Ollama.</p>
          <ol className="list-decimal list-inside space-y-1 mt-1">
            <li>Create a new project or open an existing one.</li>
            <li>In "Project Settings", you can define **Project-Wide Variables** (e.g., API keys, default persona names) that can be used in any node. Variable names must use only letters, numbers, and underscores (e.g., `api_key`, `default_style_guide`). Spaces are not allowed.</li>
            <li>Add nodes (Start, Prompt, Conditional, Variable, Question, Conclusion) to the canvas.</li>
            <li>Name your nodes. For Prompt nodes, write LLM prompts. For Variable nodes, give them a concise, valid name (e.g., `customer_query`) using only letters, numbers, and underscores. For Question nodes, write the question to ask the user. For Conclusion nodes, set a display title.</li>
            <li>Link nodes together to define the workflow data flow. Use the "Next Node" dropdown in the node editor.</li>
            <li>Use Conditional nodes to create branches based on LLM output.</li>
            <li>Use Variable nodes to store outputs for use in later prompts. These can override project-wide variables if names conflict.</li>
            <li>Use Question nodes to pause the workflow and ask the user for input.</li>
            <li>Use Conclusion nodes to display the final output of a workflow path.</li>
            <li>Configure your LLM provider and API Key (if applicable) in "App Settings". For ChatGPT, you'll need to enter your OpenAI API key.</li>
            <li>Run your project and review the results!</li>
          </ol>
        </section>
        <hr className="border-slate-700"/>
        <section>
          <h4 className="text-lg font-semibold text-sky-400 mb-2">Node Types</h4>
          <ul className="space-y-1">
            <li><strong>Start Node:</strong> The entry point of your workflow. It has one output. Its prompt is sent to the LLM.</li>
            <li><strong>Prompt Node:</strong> Sends a prompt to the LLM. Can take input from a previous node using <code className="bg-slate-700 px-1 rounded text-sky-300">{'{PREVIOUS_OUTPUT}'}</code> and from Variable nodes or Project-Wide Variables using <code className="bg-slate-700 px-1 rounded text-sky-300">{'{variable_name}'}</code>. Has one output.</li>
            <li><strong>Conditional Node:</strong> Evaluates the output from the previous node against defined conditions to decide the next step. Its prompt is sent to the LLM (can use variables).</li>
            <li><strong>Variable Node:</strong> Captures the output from the previous node and stores it under its name. This name (e.g., `my_var`) must consist of only letters, numbers, and underscores (no spaces). It can then be used as a placeholder <code className="bg-slate-700 px-1 rounded text-sky-300">{'{my_var}'}</code> in subsequent Start, Prompt, Conditional or Question nodes. It does not execute an LLM prompt itself. Has one output. If a Variable Node has the same name as a Project-Wide Variable, the Variable Node's value will be used.</li>
            <li><strong>Question Node:</strong> Pauses the workflow and displays a modal asking the user for input. The "prompt" field of this node is the question shown to the user. The user's typed answer becomes the output of this node. It has one output. Placeholders like <code className="bg-slate-700 px-1 rounded text-sky-300">{'{PREVIOUS_OUTPUT}'}</code> or <code className="bg-slate-700 px-1 rounded text-sky-300">{'{variable_name}'}</code> can be used in the question text for context.</li>
            <li><strong>Conclusion Node:</strong> Displays the output received from the previous node. It does not execute an LLM prompt and cannot be linked to a next node. Its "prompt" field in the editor is used as a display title. Its "Output Formatting" field can also use placeholders like <code className="bg-slate-700 px-1 rounded text-sky-300">{'{PREVIOUS_OUTPUT}'}</code> or <code className="bg-slate-700 px-1 rounded text-sky-300">{'{variable_name}'}</code>.</li>
          </ul>
        </section>
        <hr className="border-slate-700"/>
        <section>
          <h4 className="text-lg font-semibold text-sky-400 mb-2">Using Placeholders in Prompts/Questions/Templates</h4>
          <p>In Start, Prompt, Conditional Node prompts, Question Node questions, and Conclusion Node output templates, you can use placeholders:</p>
          <ul className="list-disc list-inside space-y-1 mt-1">
            <li><code className="bg-slate-700 px-1 rounded text-sky-300">{'{PREVIOUS_OUTPUT}'}</code>: Replaced with the text generated or input by the node directly feeding into the current node.</li>
            <li>
                <code className="bg-slate-700 px-1 rounded text-sky-300">{'{variable_name}'}</code>: 
                Refers to a **Project-Wide Variable** (defined in Project Settings) or a **Variable Node**. 
                Variable names must consist of only letters, numbers, and underscores (e.g., `user_id`, `product_description_v2`).
                If a Variable Node has the same name as a Project-Wide Variable, the Variable Node's value takes precedence.
            </li>
            <li>
              <strong>System Variables</strong>: These are automatically available:
              <ul className="list-circle list-inside ml-4 space-y-0.5 mt-0.5">
                <li><code className="bg-slate-700 px-1 rounded text-sky-300">{'{CurrentDateTime}'}</code>: The current date and time in a locale-specific format.</li>
                <li><code className="bg-slate-700 px-1 rounded text-sky-300">{'{DayOfWeek}'}</code>: The full name of the current day of the week (e.g., "Monday").</li>
                <li><code className="bg-slate-700 px-1 rounded text-sky-300">{'{LLMProvider}'}</code>: The currently selected LLM provider (e.g., "chatgpt", "ollama").</li>
                <li><code className="bg-slate-700 px-1 rounded text-sky-300">{'{LLMModel}'}</code>: The model selected for the current LLM provider (e.g., "gpt-3.5-turbo", "llama3").</li>
              </ul>
            </li>
          </ul>
          <p className="mt-1">
            <strong>Replacement Order & Precedence:</strong> Placeholders are resolved in the following order of precedence (later ones override earlier ones if names conflict):
            System Variables &rarr; Project-Wide Variables &rarr; Node-Specific Variables. Finally, <code className="bg-slate-700 px-1 rounded text-sky-300">{'{PREVIOUS_OUTPUT}'}</code> is replaced.
          </p>
        </section>
        <hr className="border-slate-700"/>
        <section>
          <h4 className="text-lg font-semibold text-sky-400 mb-2">Conditional Node Branching</h4>
          <p>Conditional nodes direct the workflow based on the LLM's response to their prompt. The LLM response is checked against branch conditions.</p>
          <p className="font-medium mt-2">Condition Matching Rules (applied to LLM output for the Conditional node):</p>
          <ul className="list-disc list-inside space-y-1 mt-1">
            <li><strong>Exact Match (Case-Insensitive):</strong> Condition <code className="bg-slate-700 px-1 rounded text-sky-300">Approved</code> matches "Approved", "approved".</li>
            <li><strong>Contains (Case-Insensitive):</strong> Condition <code className="bg-slate-700 px-1 rounded text-sky-300">contains 'keyword'</code> matches if LLM output includes "keyword".</li>
            <li><strong>Starts With (Case-Insensitive):</strong> Condition <code className="bg-slate-700 px-1 rounded text-sky-300">starts with 'prefix'</code> matches if LLM output begins with "prefix".</li>
            <li><strong>Default Branch:</strong> Condition <code className="bg-slate-700 px-1 rounded text-sky-300">default</code> (or empty) matches if no prior conditions met. Best as the last branch.</li>
          </ul>
        </section>
         <hr className="border-slate-700"/>
        <section>
            <h4 className="text-lg font-semibold text-sky-400 mb-2">Execution Panel</h4>
            <p>The panel at the bottom shows real-time information during a workflow run:</p>
            <ul className="list-disc list-inside space-y-1 mt-1">
                <li>Currently executing node or if awaiting user input.</li>
                <li>A log of each node: start time, end time, status (running, completed, failed, skipped, variable_set, awaiting_input), output (or value set for Variable nodes, user's answer for Question nodes), and tokens used.</li>
                <li>After the run: total duration and total tokens for the entire workflow.</li>
            </ul>
            <p>This panel can be collapsed or expanded using the button on its header.</p>
        </section>
        <hr className="border-slate-700"/>
        <section>
          <h4 className="text-lg font-semibold text-sky-400 mb-2">API Keys & Security</h4>
          <p>
            When using ChatGPT as the LLM provider, you must enter your OpenAI API key in the "App Settings".
            This key is stored in your browser's local storage.
          </p>
          <p className="font-semibold text-yellow-400 mt-1">
            Important: Storing API keys in browser local storage is convenient for local development but is insecure for production or shared environments.
            If this application were deployed, a backend proxy should handle API key management to protect your key.
          </p>
        </section>
      </div>
    </Modal>
  );
};

export default HelpModal;
