"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.projectHasQuestionNodes = exports.sanitizeVariableName = exports.getValidNodes = exports.deepClone = exports.generateId = void 0;
// src/utils.ts
const engineTypes_1 = require("./engineTypes"); // Updated path
const generateId = () => Math.random().toString(36).substr(2, 9);
exports.generateId = generateId;
const deepClone = (obj, path = '$') => {
    if (obj === null || typeof obj !== 'object') {
        return obj;
    }
    if (obj instanceof Date) {
        return new Date(obj.getTime());
    }
    if (obj instanceof HTMLElement || typeof obj === 'function') {
        console.warn(`[deepClone] Attempted to clone a non-serializable type (${Object.prototype.toString.call(obj)}) at path '${path}'. Replacing with placeholder string. Object:`, obj);
        return `[Non-Serializable Data: ${Object.prototype.toString.call(obj)}]`;
    }
    if (typeof window !== 'undefined' && obj === window) {
        console.warn(`[deepClone] Attempted to clone window object at path '${path}'. Replacing with placeholder.`);
        return '[Non-Serializable Data: Window Object]';
    }
    if (typeof document !== 'undefined' && obj === document) {
        console.warn(`[deepClone] Attempted to clone document object at path '${path}'. Replacing with placeholder.`);
        return '[Non-Serializable Data: Document Object]';
    }
    if (Array.isArray(obj)) {
        const arrCopy = [];
        for (let i = 0; i < obj.length; i++) {
            const element = obj[i];
            if (element instanceof HTMLElement || typeof element === 'function' || (typeof window !== 'undefined' && element === window) || (typeof document !== 'undefined' && element === document)) {
                console.warn(`[deepClone] Attempted to clone a non-serializable array element (${Object.prototype.toString.call(element)}) at path '${path}[${i}]'. Replacing with placeholder string. Element:`, element);
                arrCopy[i] = `[Non-Serializable Data: ${Object.prototype.toString.call(element)}]`;
            }
            else {
                arrCopy[i] = (0, exports.deepClone)(element, `${path}[${i}]`);
            }
        }
        return arrCopy;
    }
    if (typeof obj === 'object') {
        const objCopy = {};
        for (const key in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, key)) {
                const value = obj[key];
                if (value instanceof HTMLElement || typeof value === 'function' || (typeof window !== 'undefined' && value === window) || (typeof document !== 'undefined' && value === document)) {
                    console.warn(`[deepClone] Attempted to clone a non-serializable property value (${Object.prototype.toString.call(value)}) at path '${path}.${key}'. Replacing with placeholder string. Value:`, value);
                    objCopy[key] = `[Non-Serializable Data: ${Object.prototype.toString.call(value)}]`;
                }
                else {
                    objCopy[key] = (0, exports.deepClone)(value, `${path}.${key}`);
                }
            }
        }
        return objCopy;
    }
    console.warn(`[deepClone] Unhandled type at path '${path}'. Object:`, obj, `Type: ${Object.prototype.toString.call(obj)}`);
    return `[Uncloneable Data Type: ${Object.prototype.toString.call(obj)}]`;
};
exports.deepClone = deepClone;
const getValidNodes = (nodes) => {
    if (!Array.isArray(nodes)) {
        return [];
    }
    return nodes.filter((n) => {
        if (n === null || n === undefined) {
            return false;
        }
        return true;
    });
};
exports.getValidNodes = getValidNodes;
const sanitizeVariableName = (varName) => {
    if (typeof varName !== 'string')
        return '';
    return varName.replace(/[^a-zA-Z0-9_]/g, '');
};
exports.sanitizeVariableName = sanitizeVariableName;
const projectHasQuestionNodes = (project) => {
    if (!project || !project.nodes) {
        return false;
    }
    const validNodes = (0, exports.getValidNodes)(project.nodes);
    return validNodes.some(node => node.type === engineTypes_1.NodeType.QUESTION);
};
exports.projectHasQuestionNodes = projectHasQuestionNodes;
