"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NextStepInfo = exports.ConclusionOutputModalData = exports.NodeExecutionLog = exports.LLMProvider = exports.RunStep = exports.ProjectRun = exports.Link = exports.Node = exports.NodeType = exports.ExecuteWorkflowResult = exports.WorkflowExecutionCallbacks = exports.AppSettings = exports.Project = void 0;
exports.runWorkflowEngine = runWorkflowEngine;
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
    // Potentially add any Node.js specific setup or validation here if needed in the future.
    return (0, workflowExecutorService_1.executeWorkflow)(project, appSettings, callbacks);
}
// Re-export types that might be useful for consumers of the Node.js module
var types_1 = require("./types");
Object.defineProperty(exports, "Project", { enumerable: true, get: function () { return types_1.Project; } });
Object.defineProperty(exports, "AppSettings", { enumerable: true, get: function () { return types_1.AppSettings; } });
Object.defineProperty(exports, "WorkflowExecutionCallbacks", { enumerable: true, get: function () { return types_1.WorkflowExecutionCallbacks; } });
Object.defineProperty(exports, "ExecuteWorkflowResult", { enumerable: true, get: function () { return types_1.ExecuteWorkflowResult; } });
Object.defineProperty(exports, "NodeType", { enumerable: true, get: function () { return types_1.NodeType; } });
Object.defineProperty(exports, "Node", { enumerable: true, get: function () { return types_1.Node; } });
Object.defineProperty(exports, "Link", { enumerable: true, get: function () { return types_1.Link; } });
Object.defineProperty(exports, "ProjectRun", { enumerable: true, get: function () { return types_1.ProjectRun; } });
Object.defineProperty(exports, "RunStep", { enumerable: true, get: function () { return types_1.RunStep; } });
Object.defineProperty(exports, "LLMProvider", { enumerable: true, get: function () { return types_1.LLMProvider; } });
Object.defineProperty(exports, "NodeExecutionLog", { enumerable: true, get: function () { return types_1.NodeExecutionLog; } });
Object.defineProperty(exports, "ConclusionOutputModalData", { enumerable: true, get: function () { return types_1.ConclusionOutputModalData; } });
Object.defineProperty(exports, "NextStepInfo", { enumerable: true, get: function () { return types_1.NextStepInfo; } });
