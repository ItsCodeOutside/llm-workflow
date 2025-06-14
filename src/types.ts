
// src/types.ts
import type { Node, Project, AppSettings, ProjectRun, ProjectVariable, ConclusionOutputModalData } from './engineTypes';
import { NodeType, Link } from './engineTypes'; // Explicit import for use in this file
export * from './engineTypes'; // Re-export all engine types

// UI-Specific Prop Types
export interface NodeModalProps {
  node: Node | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedNode: Node) => void;
  allNodes: Node[];
  isMaximized?: boolean;
  onToggleMaximize?: () => void;
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
  onAddNode: (type: NodeType) => void; // NodeType comes from engineTypes (now explicitly imported)
  onOpenProjectSettingsModal: () => void;
  onOpenRunHistoryModal: () => void;
  projectRunHistoryCount: number;
  onCloseProject: () => void;
  isWorkflowRunning: boolean;
  onOpenHelpModal: () => void;
}

export interface CanvasAreaProps {
  nodes: Node[];
  visualLinks: Link[]; // Link comes from engineTypes (now explicitly imported)
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
  onDeleteNodeRequest: (nodeId: string, e: React.MouseEvent | React.TouchEvent) => void;
}

export interface QuestionInputModalProps {
  isOpen: boolean;
  questionText: string;
  onSubmit: (answer: string) => void;
  onEndRun: () => void;
}

export interface ConclusionOutputModalProps {
  data: ConclusionOutputModalData | null; // ConclusionOutputModalData comes from engineTypes
  isOpen: boolean;
  onClose: () => void;
}