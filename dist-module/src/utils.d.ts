import { type Node, type Project } from './engineTypes';
export declare const generateId: () => string;
export declare const deepClone: <T>(obj: T, path?: string) => T;
export declare const getValidNodes: (nodes: (Node | null | undefined)[] | undefined) => Node[];
export declare const sanitizeVariableName: (varName: string) => string;
export declare const projectHasQuestionNodes: (project: Project) => boolean;
