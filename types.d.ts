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
    branches?: Array<{
        condition: string;
        nextNodeId: string | null;
        id: string;
    }>;
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
export interface NodeModalProps {
    node: Node | null;
    isOpen: boolean;
    onClose: () => void;
    onSave: (updatedNode: Node) => void;
    allNodes: Node[];
    isMaximized?: boolean;
    onToggleMaximize?: () => void;
}
export interface ProjectVariable {
    id: string;
    name: string;
    value: string;
}
export interface ProjectSettingsModalProps {
    project: Project | null;
    isOpen: boolean;
    onClose: () => void;
    onSave: (updatedSettings: Pick<Project, 'name' | 'description' | 'author' | 'projectVariables'>) => void;
}
export interface AppSettingsModalProps {
    settings: AppSettings;
    isOpen: boolean;
    onClose: () => void;
    onSave: (updatedSettings: AppSettings) => void;
}
export interface RunHistoryModalProps {
    runHistory: ProjectRun[];
    isOpen: boolean;
    onClose: () => void;
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
export interface HelpModalProps {
    isOpen: boolean;
    onClose: () => void;
}
export interface ExportProjectModalProps {
    isOpen: boolean;
    onClose: () => void;
    projectJson: string;
    projectName: string;
}
export interface ImportProjectModalProps {
    isOpen: boolean;
    onClose: () => void;
    onImport: (jsonString: string) => void;
    errorMessage?: string | null;
}
export interface ZoomControlsProps {
    scale: number;
    onZoomIn: () => void;
    onZoomOut: () => void;
    onReset: () => void;
    minScale?: number;
    maxScale?: number;
}
export interface SidebarProps {
    isSidebarOpen: boolean;
    toggleSidebar: () => void;
    onAddNode: (type: NodeType) => void;
    onOpenProjectSettingsModal: () => void;
    onOpenRunHistoryModal: () => void;
    projectRunHistoryCount: number;
    onCloseProject: () => void;
    isWorkflowRunning: boolean;
    onOpenHelpModal: () => void;
}
export interface CanvasAreaProps {
    nodes: Node[];
    visualLinks: Link[];
    getLineToRectangleIntersectionPoint: (p1: {
        x: number;
        y: number;
    }, p2: {
        x: number;
        y: number;
    }, rect: {
        x: number;
        y: number;
        width: number;
        height: number;
    }) => {
        x: number;
        y: number;
    };
    scale: number;
    translate: {
        x: number;
        y: number;
    };
    editorAreaRef: React.RefObject<HTMLDivElement>;
    canvasContentRef: React.RefObject<HTMLDivElement>;
    onNodeMouseDown: (nodeId: string, e: React.MouseEvent) => void;
    onWheel: (e: React.WheelEvent) => void;
    onCanvasMouseDown: (e: React.MouseEvent) => void;
    zoomControls: {
        scale: number;
        onZoomIn: () => void;
        onZoomOut: () => void;
        onReset: () => void;
        minScale: number;
        maxScale: number;
    };
    onDeleteNodeRequest: (nodeId: string, e: React.MouseEvent | React.TouchEvent) => void;
}
export interface QuestionInputModalProps {
    isOpen: boolean;
    questionText: string;
    onSubmit: (answer: string) => void;
    onEndRun: () => void;
}
export interface ConclusionOutputModalData {
    title: string;
    content: string;
}
export interface ConclusionOutputModalProps {
    data: ConclusionOutputModalData | null;
    isOpen: boolean;
    onClose: () => void;
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
