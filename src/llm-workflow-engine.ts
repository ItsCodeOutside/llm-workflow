// src/llm-workflow-engine.ts
import { 
    type Project, 
    type AppSettings, 
    type WorkflowExecutionCallbacks,
    type ExecuteWorkflowResult,
    NodeType, // Added for re-export
    type Node, // Added for re-export
    type Link, // Added for re-export
    type ProjectRun, // Added for re-export
    type RunStep, // Added for re-export
    LLMProvider, // Added for re-export
    type NodeExecutionLog, // Added for re-export
    type ConclusionOutputModalData, // Added for re-export
    type NextStepInfo // Added for re-export
} from './engineTypes'; // Changed from './types'
import { executeWorkflow } from './utils/workflowExecutorService';

/**
 * Executes an LLM workflow project.
 * This is the primary entry point for using the workflow engine as a Node.js module.
 *
 * @param project The workflow project definition.
 * @param appSettings Configuration for LLM providers and execution parameters.
 * @param callbacks An object containing callback functions to handle events during workflow execution
 *                  (e.g., logging, requesting user input, handling conclusions).
 * @returns A promise that resolves with the result of the workflow execution.
 */
export async function runWorkflowEngine(
  project: Project,
  appSettings: AppSettings,
  callbacks: WorkflowExecutionCallbacks
): Promise<ExecuteWorkflowResult> {
  return executeWorkflow(project, appSettings, callbacks);
}

// Re-export types that might be useful for consumers of the Node.js module
export {
    Project,
    AppSettings,
    WorkflowExecutionCallbacks,
    ExecuteWorkflowResult,
    NodeType,
    Node,
    Link,
    ProjectRun,
    RunStep,
    LLMProvider,
    NodeExecutionLog,
    ConclusionOutputModalData,
    NextStepInfo
}; // Removed redundant import from './types'
