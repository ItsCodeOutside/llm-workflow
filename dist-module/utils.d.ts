import { type Node, type Project } from '../types';
export declare const generateId: () => string;
export declare const deepClone: <T>(obj: T, path?: string) => T;
export declare const getValidNodes: (nodes: (Node | null | undefined)[] | undefined) => Node[];
/**
 * Sanitizes a variable name to include only alphanumeric characters and underscores.
 * Any other character will be removed.
 * @param varName The variable name to sanitize.
 * @returns The sanitized variable name.
 */
export declare const sanitizeVariableName: (varName: string) => string;
/**
 * Checks if a project contains any nodes of type QUESTION.
 * @param project The project to check.
 * @returns True if the project contains question nodes, false otherwise.
 */
export declare const projectHasQuestionNodes: (project: Project) => boolean;
