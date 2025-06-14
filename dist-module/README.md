# LLM Workflow Engine (Node.js Module)

This module provides the core execution engine for LLM Interactive Workflows. It allows you to programmatically run workflow projects defined by the LLM Interactive Workflow Builder.

## Installation

```bash
# Assuming you have the 'dist-module' directory:
npm install /path/to/dist-module 
# or copy it into your project's node_modules or a local lib folder.
```

## Usage

```javascript
import { runWorkflowEngine } from 'llm-workflow-engine'; // Adjust path if installed locally

// 1. Define your Project (as created by the UI or manually)
const project = {
  id: "proj_1",
  name: "My Workflow",
  description: "A sample workflow",
  author: "Me",
  nodes: [
    { id: "start_node", type: "START", name: "Start", prompt: "Tell me a joke.", position: { x: 50, y: 50 }, nextNodeId: "conclusion_node" },
    { id: "conclusion_node", type: "CONCLUSION", name: "End", prompt: "The Joke Was:", outputFormatTemplate: "{PREVIOUS_OUTPUT}", position: { x: 250, y: 50 } }
  ],
  links: [{id: "link_1", sourceId: "start_node", targetId: "conclusion_node"}],
  runHistory: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  projectVariables: []
};

// 2. Define AppSettings (API keys, model choices, etc.)
const appSettings = {
  llmProvider: 'ollama', // or 'chatgpt'
  temperature: 0.7,
  topK: 40,
  topP: 0.95,
  chatGptModel: 'gpt-3.5-turbo', // if using chatgpt
  chatGptApiKey: 'YOUR_OPENAI_API_KEY', // if using chatgpt
  ollamaBaseUrl: 'http://localhost:11434', // if using ollama
  ollamaModel: 'llama2', // if using ollama
  ollamaKeepAlive: '5m'
};

// 3. Define Callbacks
const callbacks = {
  onLogEntry: (logEntry) => {
    console.log(`[Workflow Log - ${logEntry.pathId || 'main'}] ${logEntry.nodeName} (${logEntry.nodeId}): ${logEntry.status}`, logEntry.output || logEntry.error || '');
  },
  onNodeStatusUpdate: (nodeId, updates) => {
    // console.log(`[Workflow Update] Node ${nodeId} status:`, updates);
  },
  onConclusion: (data) => {
    console.log(`[Workflow Conclusion] Title: ${data.title}, Content: ${data.content}`);
  },
  onRequestUserInput: async (questionText, nodeId) => {
    // Implement how your Node.js application will provide input
    // For example, read from stdin or a predefined source.
    // This is a placeholder:
    console.warn(`Node ${nodeId} requests input for: "${questionText}". Auto-replying "Node.js Input".`);
    return "Node.js Input";
  },
  onTokenUpdate: (tokensUsedThisStep) => {
    // console.log(`[Workflow Tokens] Step used: ${tokensUsedThisStep}`);
  },
  // Concurrency & Parallelism Callbacks
  getActiveExecutionCount: () => { /* return a counter for active parallel paths if needed */ return 0; },
  incrementActiveExecutionCount: () => { /* increment counter */ },
  decrementActiveExecutionCount: () => { /* decrement counter */ },
  getParallelPathCounter: () => { /* return a path-specific counter for sync logic */ return 0; },
  incrementParallelPathCounter: (count) => { /* increment path counter */ },
  decrementParallelPathCounter: () => { /* decrement path counter */ },
  isStopRequested: () => false, // Implement logic to allow stopping the workflow
};

// 4. Run the workflow
async function main() {
  try {
    const result = await runWorkflowEngine(project, appSettings, callbacks);
    console.log(\`Workflow finished with status: \${result.status}\`);
    if (result.finalOutput) {
      console.log("Final Output:", result.finalOutput);
    }
    if (result.error) {
      console.error("Workflow Error:", result.error);
    }
    // console.log("Total tokens used:", result.totalTokensUsed);
    // console.log("Execution Steps:", result.steps);
  } catch (error) {
    console.error("Error running workflow engine:", error);
  }
}

main();
```

## Callbacks

The `callbacks` object is crucial for interacting with the workflow execution:

*   `onLogEntry`: Receives detailed logs for each step.
*   `onNodeStatusUpdate`: Provides updates on node states (running, error, output).
*   `onConclusion`: Called when a `CONCLUSION` node is reached, with its final display data.
*   `onRequestUserInput`: **Essential if your workflows use `QUESTION` nodes.** This async function must return a `Promise<string>` resolving to the user's answer.
*   `onTokenUpdate`: Reports tokens used by LLM calls in each step.
*   `getActiveExecutionCount`, `incrementActiveExecutionCount`, `decrementActiveExecutionCount`: Manage a counter for concurrently active execution paths, primarily used by the engine for `SYNCHRONIZE` nodes.
*   `getParallelPathCounter`, `incrementParallelPathCounter`, `decrementParallelPathCounter`: Manage a global counter for branches created by `PARALLEL` nodes and consumed by `SYNCHRONIZE` and `CONCLUSION` nodes.
*   `isStopRequested`: A function that should return `true` if the workflow execution should be halted.

This engine provides the flexibility to integrate LLM workflows into various Node.js applications.
