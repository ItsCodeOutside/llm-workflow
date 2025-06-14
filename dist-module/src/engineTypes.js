"use strict";
// src/engineTypes.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.LLMProvider = exports.NodeType = void 0;
var NodeType;
(function (NodeType) {
    NodeType["START"] = "START";
    NodeType["PROMPT"] = "PROMPT";
    NodeType["CONDITIONAL"] = "CONDITIONAL";
    NodeType["CONCLUSION"] = "CONCLUSION";
    NodeType["VARIABLE"] = "VARIABLE";
    NodeType["QUESTION"] = "QUESTION";
    NodeType["JAVASCRIPT"] = "JAVASCRIPT";
    NodeType["PARALLEL"] = "PARALLEL";
    NodeType["SYNCHRONIZE"] = "SYNCHRONIZE";
})(NodeType || (exports.NodeType = NodeType = {}));
var LLMProvider;
(function (LLMProvider) {
    LLMProvider["CHATGPT"] = "chatgpt";
    LLMProvider["OLLAMA"] = "ollama";
})(LLMProvider || (exports.LLMProvider = LLMProvider = {}));
