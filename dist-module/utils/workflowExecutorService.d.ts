import { type Node, type Project, type AppSettings, type RunStep, WorkflowExecutionCallbacks, type ProjectRun } from '../../types';
interface ProcessNodeInExecutorParams {
    node: Node;
    previousOutput: string;
    settings: AppSettings;
    nodeVariables: Map<string, string>;
    projectVariablesMap: Map<string, string>;
    systemVariablesMap: Map<string, string>;
    callbacks: WorkflowExecutionCallbacks;
    pathId: string;
    projectNodes: Node[];
    onPathCounterManagedByNode: () => void;
}
export declare const processNodeInExecutor: ({ node, previousOutput, settings, nodeVariables, projectVariablesMap, systemVariablesMap, callbacks, pathId, projectNodes, onPathCounterManagedByNode, }: ProcessNodeInExecutorParams) => Promise<{
    output: string;
    tokensUsed: number;
    promptSent: string;
}>;
export interface ExecuteWorkflowResult {
    status: ProjectRun['status'];
    finalOutput?: string;
    error?: string;
    steps: RunStep[];
    totalTokensUsed: number;
    updatedNodes: Node[];
}
export declare const executeWorkflow: (project: Project, appSettings: AppSettings, callbacks: WorkflowExecutionCallbacks) => Promise<ExecuteWorkflowResult>;
export {};
