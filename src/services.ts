
// src/services.ts
import { Project, AppSettings, Node, NodeType, Link as VisualLink } from '../types';
import { LOCAL_STORAGE_PROJECTS_KEY, LOCAL_STORAGE_SETTINGS_KEY, DEFAULT_APP_SETTINGS } from '../constants';
import { generateId } from './utils'; // Assuming generateId is in utils

const createExampleProjects = (): Project[] => {
  const now = new Date().toISOString();

  // --- Example Project 1: Number Range Game ---
  const ex1_startNodeId = generateId();
  const ex1_conditionalNodeId = generateId();
  const ex1_conclusionLt50Id = generateId();
  const ex1_conclusionGte50Id = generateId();
  const ex1_conclusionUnclearId = generateId();

  const exampleProject1: Project = {
    id: generateId(),
    name: 'Number Range Game',
    description: 'An LLM picks a number between 1-100. A conditional node then directs to a conclusion based on whether the number is less than 50 or not.',
    author: 'App Examples',
    nodes: [
      {
        id: ex1_startNodeId,
        type: NodeType.START,
        name: 'Number Oracle',
        prompt: "Pick a number between 1 and 100 (inclusive) and reply with ONLY the number.",
        position: { x: 50, y: 150 },
        nextNodeId: ex1_conditionalNodeId,
      },
      {
        id: ex1_conditionalNodeId,
        type: NodeType.CONDITIONAL,
        name: 'Check Range',
        prompt: "If '{PREVIOUS_OUTPUT}' is less than 50 you must reply with \"less than 50\" but if it is greater than 50 or equal to 50 then you must reply \"greater than or equal to 50\". If it is not a number or something is confusing, reply only with the word \"default\"", // This prompt is mostly for internal reference for Conditional nodes
        position: { x: 300, y: 150 },
        branches: [
          { id: generateId(), condition: 'less than 50', nextNodeId: ex1_conclusionLt50Id },
          { id: generateId(), condition: 'greater than or equal to 50', nextNodeId: ex1_conclusionGte50Id },
          { id: generateId(), condition: 'default', nextNodeId: ex1_conclusionUnclearId },
        ],
      },
      {
        id: ex1_conclusionLt50Id,
        type: NodeType.CONCLUSION,
        name: 'Result: < 50',
        prompt: "The Oracle's number was less than 50.",
        position: { x: 650, y: 50 },
      },
      {
        id: ex1_conclusionGte50Id,
        type: NodeType.CONCLUSION,
        name: 'Result: >= 50',
        prompt: "The Oracle's number was 50 or greater.",
        position: { x: 650, y: 250 },
      },
      {
        id: ex1_conclusionUnclearId,
        type: NodeType.CONCLUSION,
        name: 'Result: Unclear',
        prompt: "The Oracle's response about the number's range was unclear.",
        position: { x: 650, y: 400 },
      }
    ],
    links: [
      { id: generateId(), sourceId: ex1_startNodeId, targetId: ex1_conditionalNodeId },
      { id: generateId(), sourceId: ex1_conditionalNodeId, targetId: ex1_conclusionLt50Id, condition: 'less than 50' },
      { id: generateId(), sourceId: ex1_conditionalNodeId, targetId: ex1_conclusionGte50Id, condition: 'greater than or equal to 50' },
      { id: generateId(), sourceId: ex1_conditionalNodeId, targetId: ex1_conclusionUnclearId, condition: 'default' },
    ],
    runHistory: [],
    createdAt: now,
    updatedAt: now,
  };

  // --- Example Project 2: Escape Room Story Generator ---
  const ex2_startNodeId = generateId();
  const ex2_prompt1NodeId = generateId();
  const ex2_conditionalNodeId = generateId();
  const ex2_prompt2NodeId = generateId();
  const ex2_variableNodeId = generateId();
  const ex2_conclusionNodeId = generateId();
  const ex2_conclusionFallbackNodeId = generateId();

  const exampleProject2: Project = {
    id: generateId(),
    name: 'Escape Room Story Generator',
    description: 'An LLM generates a story, then assesses if it\'s interesting. If not, it tries to improve it in a loop.',
    author: 'App Examples',
    nodes: [
      {
        id: ex2_startNodeId,
        type: NodeType.START,
        name: 'Story Seed',
        prompt: "Generate a short story (1-2 paragraphs) about two characters trying to solve a difficult puzzle in an escape room. They are close to figuring it out.",
        position: { x: 50, y: 200 },
        nextNodeId: ex2_prompt1NodeId,
      },
      {
        id: ex2_prompt1NodeId,
        type: NodeType.PROMPT,
        name: 'Add School Detail',
        prompt: "Take the following story:\n{PREVIOUS_OUTPUT}\n\n---\nNow, lengthen it by adding a short conversation where the two characters realize they went to the same high school. Make this realization a brief, natural part of their interaction while solving the puzzle. Reply ONLY with the story, no explanation.",
        position: { x: 300, y: 200 },
        nextNodeId: ex2_variableNodeId,
      },
      {
        id: ex2_variableNodeId,
        type: NodeType.VARIABLE,
        name: 'story',
        prompt: '', // Variable nodes use 'name' for placeholder, 'prompt' can be description
        position: { x: 550, y: 200},
        nextNodeId: ex2_conditionalNodeId,
      },
      {
        id: ex2_conditionalNodeId,
        type: NodeType.CONDITIONAL,
        name: 'Story Quality Check',
        prompt: "Carefully review the following story. Is it interesting and engaging for a reader?\n\nThe story:\n{story}\n\n---\nIf the story is interesting, respond only with \"Interesting\" but if it is not, then respond only with \"Not interesting\" However, if something has gone wrong and a determination cannot be made, then respond with \"Default\"",
        position: { x: 800, y: 200 },
        branches: [
          { id: generateId(), condition: 'Interesting', nextNodeId: ex2_conclusionNodeId },
          { id: generateId(), condition: 'Not interesting', nextNodeId: ex2_prompt2NodeId },
          { id: generateId(), condition: 'Default', nextNodeId: ex2_conclusionFallbackNodeId }, // Fallback if LLM output is unexpected
        ],
      },
      {
        id: ex2_prompt2NodeId,
        type: NodeType.PROMPT,
        name: 'Improve Story',
        prompt: "The story below was deemed 'Not interesting'.\nPrevious Story:\n{story}\n\n---\nRewrite it to be more engaging. You could add a surprising twist, a moment of clever deduction, or deepen the characters' interaction but always be sure to maintain a consistent storyline. Respond ONLY with the story, no explanation.",
        position: { x: 800, y: 600 },
        nextNodeId: ex2_variableNodeId, // Loop back via variable
      },
      {
        id: ex2_conclusionNodeId,
        type: NodeType.CONCLUSION,
        name: 'Final Story',
        prompt: "The interesting escape room story:",
        position: { x: 1050, y: 100 },
      },
      {
        id: ex2_conclusionFallbackNodeId,
        type: NodeType.CONCLUSION,
        name: 'Story Assessment Unclear',
        prompt: "The story assessment was unclear. Displaying last version:",
        position: { x: 1050, y: 300 },
      }
    ],
    links: [
        { id: generateId(), sourceId: ex2_startNodeId, targetId: ex2_prompt1NodeId },
        { id: generateId(), sourceId: ex2_prompt1NodeId, targetId: ex2_variableNodeId },
        { id: generateId(), sourceId: ex2_variableNodeId, targetId: ex2_conditionalNodeId },
        { id: generateId(), sourceId: ex2_conditionalNodeId, targetId: ex2_conclusionNodeId, condition: 'Interesting' },
        { id: generateId(), sourceId: ex2_conditionalNodeId, targetId: ex2_prompt2NodeId, condition: 'Not interesting' },
        { id: generateId(), sourceId: ex2_conditionalNodeId, targetId: ex2_conclusionFallbackNodeId, condition: 'default' },
        { id: generateId(), sourceId: ex2_prompt2NodeId, targetId: ex2_variableNodeId },
    ],
    runHistory: [],
    createdAt: now,
    updatedAt: now,
  };

  return [exampleProject1, exampleProject2];
};


export const LocalStorageService = {
  getProjects: (): Project[] => {
    const data = localStorage.getItem(LOCAL_STORAGE_PROJECTS_KEY);
    if (data) {
      try {
        const projectsFromStorage = JSON.parse(data) as Project[];
        // Basic validation: check if it's an array
        if (Array.isArray(projectsFromStorage)) {
          // Sanitize each project to ensure its nodes array doesn't contain null/undefined
          const sanitizedProjects = projectsFromStorage.map(project => {
            if (project && project.nodes && Array.isArray(project.nodes)) {
              // Filter out any null or undefined nodes
              project.nodes = project.nodes.filter((node): node is Node => node !== null && node !== undefined);
            }
            return project;
          }).filter((project): project is Project => project !== null && project !== undefined); // Filter out null projects
          return sanitizedProjects;
        }
      } catch (e) {
        console.error("Error parsing projects from localStorage", e);
        // Fall through to return example projects if parsing fails
      }
    }
    // If no data, data is invalid, or parsing failed, return example projects
    const examples = createExampleProjects();
    LocalStorageService.saveProjects(examples); // Save examples for next time
    return examples;
  },
  saveProjects: (projects: Project[]): void => {
    localStorage.setItem(LOCAL_STORAGE_PROJECTS_KEY, JSON.stringify(projects));
  },
  getAppSettings: (): AppSettings => {
    const data = localStorage.getItem(LOCAL_STORAGE_SETTINGS_KEY);
    const loadedSettings = data ? JSON.parse(data) : DEFAULT_APP_SETTINGS;
    // Ensure all default keys are present even if stored settings are older
    return { ...DEFAULT_APP_SETTINGS, ...loadedSettings };
  },
  saveAppSettings: (settings: AppSettings): void => {
    localStorage.setItem(LOCAL_STORAGE_SETTINGS_KEY, JSON.stringify(settings));
  },
};
