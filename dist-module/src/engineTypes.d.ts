export declare enum NodeType {
    START = "START",
    PROMPT = "PROMPT",
    CONDITIONAL = "CONDITIONAL",
    CONCLUSION = "CONCLUSION",
    VARIABLE = "VARIABLE",
    QUESTION = "QUESTION",
    JAVASCRIPT = "JAVASCRIPT",
    PARALLEL = "PARALLEL",
    SYNCHRONIZE = "SYNCHRONIZE"
}
export interface ConditionalBranch {
    id: string;
    condition: string;
    nextNodeId: string | null;
}
export interface Node {
    id: string;
    type: NodeType;
    name: string;
    prompt: string;
    code?: string;
    outputFormatTemplate?: string;
    position: {
        x: number;
        y: number;
    };
    nextNodeId?: string | null;
    branches?: ConditionalBranch[];
    parallelNextNodeIds?: string[];
    lastRunOutput?: string;
    isRunning?: boolean;
    hasError?: boolean;
}
export interface Link {
    id: string;
    sourceId: string;
    targetId: string;
    condition?: string;
}
export interface RunStep {
    nodeId: string;
    nodeName: string;
    promptSent: string;
    responseReceived: string;
    error?: string;
    timestamp: string;
    tokensUsed?: number;
    pathId?: string;
}
export interface ProjectRun {
    id: string;
    timestamp: string;
    status: 'completed' | 'failed' | 'running' | 'stopped';
    steps: RunStep[];
    finalOutput?: string;
    error?: string;
    totalTokensUsed?: number;
    durationMs?: number;
}
export declare enum LLMProvider {
    CHATGPT = "chatgpt",
    OLLAMA = "ollama"
}
export interface AppSettings {
    llmProvider: LLMProvider;
    temperature: number;
    topK: number;
    topP: number;
    chatGptModel: string;
    chatGptApiKey: string;
    ollamaBaseUrl: string;
    ollamaModel: string;
    ollamaKeepAlive: string;
}
export interface ProjectVariable {
    id: string;
    name: string;
    value: string;
}
export interface LLMUsageMetadata {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    totalTokenCount?: number;
}
export interface LLMExecutePromptResponse {
    text: string;
    usageMetadata?: LLMUsageMetadata;
}
export interface NodeExecutionLog {
    nodeId: string;
    nodeName: string;
    startTime: string;
    endTime?: string;
    status: 'running' | 'completed' | 'failed' | 'skipped' | 'variable_set' | 'awaiting_input' | 'javascript_executed' | 'parallel_executed' | 'synchronize_awaiting' | 'synchronize_resumed';
    output?: string;
    error?: string;
    tokensUsed?: number;
    pathId?: string;
}
export interface Project {
    id: string;
    name: string;
    description: string;
    author: string;
    nodes: Node[];
    links: Link[];
    runHistory: ProjectRun[];
    createdAt: string;
    updatedAt: string;
    projectVariables?: ProjectVariable[];
}
export interface ConclusionOutputModalData {
    title: string;
    content: string;
}
export interface NextStepInfo {
    nodeId: string;
    input: string;
    nodeVariables: Map<string, string>;
    pathId: string;
}
export interface WorkflowExecutionCallbacks {
    onLogEntry: (logEntry: Partial<NodeExecutionLog> & {
        nodeId: string;
        nodeName: string;
        pathId?: string;
    }) => void;
    onNodeStatusUpdate: (nodeId: string, updates: {
        isRunning?: boolean;
        hasError?: boolean;
        lastRunOutput?: string;
    }) => void;
    onConclusion: (data: ConclusionOutputModalData) => void;
    onRequestUserInput: (questionText: string, nodeId: string) => Promise<string>;
    onTokenUpdate: (tokensUsedThisStep: number) => void;
    getActiveExecutionCount: () => number;
    incrementActiveExecutionCount: () => void;
    decrementActiveExecutionCount: () => void;
    getParallelPathCounter: () => number;
    incrementParallelPathCounter: (count: number) => void;
    decrementParallelPathCounter: () => void;
    isStopRequested: () => boolean;
}
export interface ExecuteWorkflowResult {
    status: ProjectRun['status'];
    finalOutput?: string;
    error?: string;
    steps: RunStep[];
    totalTokensUsed: number;
    updatedNodes: Node[];
}
