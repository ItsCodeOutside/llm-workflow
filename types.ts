
export enum NodeType {
  START = 'START',
  PROMPT = 'PROMPT',
  CONDITIONAL = 'CONDITIONAL',
  CONCLUSION = 'CONCLUSION',
  VARIABLE = 'VARIABLE', // Added Variable Node Type
}

export interface Node {
  id: string;
  type: NodeType;
  name: string; // User-defined name for the node. For Variable nodes, this is the variable name.
  prompt: string; // The LLM prompt, or display title for Conclusion node. Not directly used by Variable node for LLM call.
  position: { x: number; y: number };
  nextNodeId?: string | null; // Used by START, PROMPT, VARIABLE. Not by CONCLUSION.
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
  promptSent: string; // For Variable node, could be "Storing input as 'variableName'"
  responseReceived: string; // For Variable node, could be the value stored
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

export interface AppSettings {
  apiKey?: string; 
  geminiModel: string;
  temperature: number;
  topK: number;
  topP: number;
}

export interface NodeModalProps {
  node: Node | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedNode: Node) => void;
  allNodes: Node[];
}

export interface ProjectSettingsModalProps {
  project: Project | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedSettings: Pick<Project, 'name' | 'description' | 'author'>) => void;
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

// For Gemini API response - specifically token usage
export interface GeminiUsageMetadata {
  promptTokenCount?: number;
  candidatesTokenCount?: number;
  totalTokenCount?: number;
}

export interface GeminiExecutePromptResponse {
  text: string;
  usageMetadata?: GeminiUsageMetadata;
}

// For the new Execution Status Panel
export interface NodeExecutionLog {
  nodeId: string;
  nodeName: string;
  startTime: string; // ISO string
  endTime?: string; // ISO string, set when completed or failed
  status: 'running' | 'completed' | 'failed' | 'skipped' | 'variable_set'; // Added variable_set
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
}

export interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}