import { type Project, type AppSettings, type WorkflowExecutionCallbacks, type ExecuteWorkflowResult } from './types';
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
export declare function runWorkflowEngine(project: Project, appSettings: AppSettings, callbacks: WorkflowExecutionCallbacks): Promise<ExecuteWorkflowResult>;
export { Project, AppSettings, WorkflowExecutionCallbacks, ExecuteWorkflowResult, NodeType, Node, Link, ProjectRun, RunStep, LLMProvider, NodeExecutionLog, ConclusionOutputModalData, NextStepInfo } from './types';
