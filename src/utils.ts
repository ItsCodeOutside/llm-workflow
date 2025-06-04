// src/utils.ts
import { type Node } from '../types'; // Ensure Node type is imported

export const generateId = (): string => Math.random().toString(36).substr(2, 9);

export const deepClone = <T,>(obj: T): T => JSON.parse(JSON.stringify(obj));

// Helper function to filter out null/undefined nodes and ensure basic validity
export const getValidNodes = (nodes: (Node | null | undefined)[] | undefined): Node[] => {
  if (!Array.isArray(nodes)) {
    return [];
  }
  return nodes.filter((n): n is Node => {
    if (n === null || n === undefined) {
      // console.warn("getValidNodes: Filtering out null or undefined node object.");
      return false;
    }
    // Add more checks if necessary, e.g., for essential properties like id and type
    // if (typeof n.id !== 'string' || typeof n.type !== 'string') {
    //   console.warn("getValidNodes: Filtering out node with missing id or type.", n);
    //   return false;
    // }
    return true;
  });
};