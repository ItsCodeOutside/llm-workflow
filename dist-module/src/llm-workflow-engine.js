"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LLMProvider = exports.NodeType = void 0;
exports.runWorkflowEngine = runWorkflowEngine;
// src/llm-workflow-engine.ts
const engineTypes_1 = require("./engineTypes"); // Changed from './types'
Object.defineProperty(exports, "NodeType", { enumerable: true, get: function () { return engineTypes_1.NodeType; } });
Object.defineProperty(exports, "LLMProvider", { enumerable: true, get: function () { return engineTypes_1.LLMProvider; } });
const workflowExecutorService_1 = require("./utils/workflowExecutorService");
/**
 * Executes an LLM workflow project.
 * This is the primary entry point for using the workflow engine as a Node.js module.
 *
 * @param project The workflow project definition.
 * @param appSettings Configuration for LLM providers and execution parameters.
 * @param callbacks An object containing callback functions to handle events during workflow execution
 *                  (e.g., logging, requesting user input, handling conclusions).
 * @returns A promise that resolves with the result of the workflow execution.
 */
async function runWorkflowEngine(project, appSettings, callbacks) {
    return (0, workflowExecutorService_1.executeWorkflow)(project, appSettings, callbacks);
}
