

export enum NodeType {
  START = 'START',
  PROMPT = 'PROMPT',
  CONDITIONAL = 'CONDITIONAL',
  CONCLUSION = 'CONCLUSION',
  VARIABLE = 'VARIABLE', // Added Variable Node Type
  QUESTION = 'QUESTION', // Added Question Node Type
}

export interface Node {
  id: string;
  type: NodeType;
  name: string; // User-defined name for the node. For Variable nodes, this is the variable name.
  prompt: string; // The LLM prompt, or display title for Conclusion node, or question for Question node.
  outputFormatTemplate?: string; // For Conclusion nodes: template for formatting {PREVIOUS_OUTPUT}
  position: { x: number; y: number };
  nextNodeId?: string | null; // Used by START, PROMPT, VARIABLE, QUESTION. Not by CONCLUSION.
  branches?: Array<{ condition: string; nextNodeId: string | null; id: string }>; // Only for CONDITIONAL
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
  promptSent: string; // For Variable node, could be "Storing input as 'variableName'". For Question node, the question asked.
  responseReceived: string; // For Variable node, could be the value stored. For Question node, the user's answer.
  error?: string;
  timestamp: string;
  tokensUsed?: number;
}

export interface ProjectRun {
  id:string;
  timestamp: string;
  status: 'completed' | 'failed' | 'running' | 'stopped';
  steps: RunStep[];
  finalOutput?: string;
  error?: string;
  totalTokensUsed?: number;
  durationMs?: number;
}

export enum LLMProvider {
  CHATGPT = 'chatgpt',
  OLLAMA = 'ollama',
  // GEMINI = 'gemini', // Removed Gemini
}

export interface AppSettings {
  llmProvider: LLMProvider;

  // Common LLM parameters
  temperature: number;
  topK: number; // Retained for Ollama
  topP: number;

  // ChatGPT specific
  chatGptModel: string;
  chatGptApiKey: string;

  // Ollama specific
  ollamaBaseUrl: string;
  ollamaModel: string;
  ollamaKeepAlive: string;

  // Gemini specific (Removed)
  // geminiModel: string;
}

export interface NodeModalProps {
  node: Node | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedNode: Node) => void;
  allNodes: Node[];
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

// For LLM API response - specifically token usage
export interface LLMUsageMetadata {
  promptTokenCount?: number;
  candidatesTokenCount?: number; // For OpenAI, this would be completion_tokens
  totalTokenCount?: number;
}

export interface LLMExecutePromptResponse {
  text: string;
  usageMetadata?: LLMUsageMetadata;
}

// For the new Execution Status Panel
export interface NodeExecutionLog {
  nodeId: string;
  nodeName: string;
  startTime: string; // ISO string
  endTime?: string; // ISO string, set when completed or failed
  status: 'running' | 'completed' | 'failed' | 'skipped' | 'variable_set' | 'awaiting_input'; // Added variable_set and awaiting_input
  output?: string;
  error?: string;
  tokensUsed?: number;
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
  projectVariables?: ProjectVariable[]; // Added project-wide variables
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
  errorMessage?: string | null; // Added errorMessage prop
}

export interface ZoomControlsProps {
  scale: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
  minScale?: number;
  maxScale?: number;
}

// Props for new Sidebar component
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

// Props for new CanvasArea component
export interface CanvasAreaProps {
  nodes: Node[];
  visualLinks: Link[];
  getLineToRectangleIntersectionPoint: (
    p1: { x: number; y: number },
    p2: { x: number; y: number },
    rect: { x: number; y: number; width: number; height: number }
  ) => { x: number; y: number };
  scale: number;
  translate: { x: number; y: number };
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
  // onNodeTouchStart implicitly handled via ProjectEditorPage's ExtendedCanvasAreaProps
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
