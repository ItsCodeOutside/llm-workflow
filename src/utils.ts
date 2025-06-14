// src/utils.ts
import { type Node, NodeType, type Project } from './engineTypes'; // Updated path

export const generateId = (): string => Math.random().toString(36).substr(2, 9);

export const deepClone = <T,>(obj: T, path: string = '$'): T => {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (obj instanceof Date) {
    return new Date(obj.getTime()) as any;
  }

  if (obj instanceof HTMLElement || typeof obj === 'function') {
    console.warn(`[deepClone] Attempted to clone a non-serializable type (${Object.prototype.toString.call(obj)}) at path '${path}'. Replacing with placeholder string. Object:`, obj);
    return `[Non-Serializable Data: ${Object.prototype.toString.call(obj)}]` as any;
  }

  if (typeof window !== 'undefined' && (obj as unknown) === window) {
    console.warn(`[deepClone] Attempted to clone window object at path '${path}'. Replacing with placeholder.`);
    return '[Non-Serializable Data: Window Object]' as any;
  }
  if (typeof document !== 'undefined' && (obj as unknown) === document) {
    console.warn(`[deepClone] Attempted to clone document object at path '${path}'. Replacing with placeholder.`);
    return '[Non-Serializable Data: Document Object]' as any;
  }


  if (Array.isArray(obj)) {
    const arrCopy: any[] = [];
    for (let i = 0; i < obj.length; i++) {
      const element = obj[i];
      if (element instanceof HTMLElement || typeof element === 'function' || (typeof window !== 'undefined' && element === window) || (typeof document !== 'undefined' && element === document)) {
        console.warn(`[deepClone] Attempted to clone a non-serializable array element (${Object.prototype.toString.call(element)}) at path '${path}[${i}]'. Replacing with placeholder string. Element:`, element);
        arrCopy[i] = `[Non-Serializable Data: ${Object.prototype.toString.call(element)}]`;
      } else {
        arrCopy[i] = deepClone(element, `${path}[${i}]`);
      }
    }
    return arrCopy as any;
  }

  if (typeof obj === 'object') {
    const objCopy: { [key: string]: any } = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        const value = (obj as any)[key];
        if (value instanceof HTMLElement || typeof value === 'function' || (typeof window !== 'undefined' && value === window) || (typeof document !== 'undefined' && value === document)) {
           console.warn(`[deepClone] Attempted to clone a non-serializable property value (${Object.prototype.toString.call(value)}) at path '${path}.${key}'. Replacing with placeholder string. Value:`, value);
          objCopy[key] = `[Non-Serializable Data: ${Object.prototype.toString.call(value)}]`;
        } else {
          objCopy[key] = deepClone(value, `${path}.${key}`);
        }
      }
    }
    return objCopy as any;
  }

  console.warn(`[deepClone] Unhandled type at path '${path}'. Object:`, obj, `Type: ${Object.prototype.toString.call(obj)}`);
  return `[Uncloneable Data Type: ${Object.prototype.toString.call(obj)}]` as any;
};


export const getValidNodes = (nodes: (Node | null | undefined)[] | undefined): Node[] => {
  if (!Array.isArray(nodes)) {
    return [];
  }
  return nodes.filter((n): n is Node => {
    if (n === null || n === undefined) {
      return false;
    }
    return true;
  });
};

export const sanitizeVariableName = (varName: string): string => {
  if (typeof varName !== 'string') return '';
  return varName.replace(/[^a-zA-Z0-9_]/g, '');
};

export const projectHasQuestionNodes = (project: Project): boolean => {
  if (!project || !project.nodes) {
    return false;
  }
  const validNodes = getValidNodes(project.nodes);
  return validNodes.some(node => node.type === NodeType.QUESTION);
};