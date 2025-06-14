// src/services.ts
import { Project, AppSettings, Node, NodeType, Link as VisualLink } from './types'; // Updated path
import { LOCAL_STORAGE_PROJECTS_KEY, LOCAL_STORAGE_SETTINGS_KEY, DEFAULT_APP_SETTINGS } from './constants'; // Updated path
import { generateId } from './utils'; 

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
        position: { x: 650, y: 200 },
      },
      {
        id: ex1_conclusionUnclearId,
        type: NodeType.CONCLUSION,
        name: 'Result: Unclear',
        prompt: "The Oracle's response about the number's range was unclear.",
        position: { x: 650, y: 350 },
      }
    ],
    links: [
      { id: generateId(), sourceId: ex1_startNodeId, targetId: ex1_conditionalNodeId },
      { id: generateId(), sourceId: ex1_conditionalNodeId, targetId: ex1_conclusionLt50Id, condition: 'less than 50' },
      { id: generateId(), sourceId: ex1_conditionalNodeId, targetId: ex1_conclusionGte50Id, condition: 'greater than or equal to 50' },
      { id: generateId(), sourceId: ex1_conditionalNodeId, targetId: ex1_conclusionUnclearId, condition: 'default' },
    ],
    runHistory: [],
    projectVariables: [], 
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
        prompt: "Generate a short story (1-2 paragraphs) about two characters trying to solve a difficult puzzle in an escape room. They are close to figuring it out. Use the project variable {setting_description} to set the scene.",
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
        prompt: '', 
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
          { id: generateId(), condition: 'Default', nextNodeId: ex2_conclusionFallbackNodeId }, 
        ],
      },
      {
        id: ex2_prompt2NodeId,
        type: NodeType.PROMPT,
        name: 'Improve Story',
        prompt: "The story below was deemed 'Not interesting'.\nPrevious Story:\n{story}\n\n---\nRewrite it to be more engaging. You could add a surprising twist, a moment of clever deduction, or deepen the characters' interaction but always be sure to maintain a consistent storyline. Respond ONLY with the story, no explanation.",
        position: { x: 800, y: 600 },
        nextNodeId: ex2_variableNodeId, 
      },
      {
        id: ex2_conclusionNodeId,
        type: NodeType.CONCLUSION,
        name: 'Final Story',
        prompt: "The interesting escape room story:",
        outputFormatTemplate: "Here is the final story using project author '{project_author}':\n\n{story}", 
        position: { x: 1050, y: 100 },
      },
      {
        id: ex2_conclusionFallbackNodeId,
        type: NodeType.CONCLUSION,
        name: 'Story Assessment Unclear',
        prompt: "The story assessment was unclear. Displaying last version: {story}",
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
    projectVariables: [ 
      { id: generateId(), name: 'setting_description', value: 'a dusty, ancient library filled with arcane texts' },
      { id: generateId(), name: 'project_author', value: 'AI Storyteller Example' }
    ],
    createdAt: now,
    updatedAt: now,
  };

  // --- Example Project 3: Parallelism ---
  const ex3_startNodeId = "lzelrwv4l";
  const ex3_parallelNodeId = "vewgibgpn";
  const ex3_varJokeNodeId = "1ok8dr6kq";
  const ex3_promptFunnyNodeId = "fqxjna7gx";
  const ex3_questionNodeId = "e4nnboq2b";
  const ex3_syncNodeId = "9fk64ucxx";
  const ex3_conclusionNodeId = "tsqcktm8o";
  const ex3_varLlmAnalysisNodeId = "wyf074qat";
  const ex3_varUserInputNodeId = "ov2sjuhrb";


  const exampleProject3: Project = {
    id: "g7ytvl6yy", // Using provided ID, assuming uniqueness for example
    name: "Parallelism",
    description: "Example of concurrent execution.",
    author: "App Examples",
    nodes: [
      {
        id: ex3_startNodeId,
        type: NodeType.START,
        name: "Start Here",
        prompt: "OK, Google, please tell me a one-line joke.",
        position: { x: 380, y: 640 },
        nextNodeId: ex3_parallelNodeId
      },
      {
        id: ex3_parallelNodeId,
        type: NodeType.PARALLEL,
        name: "Parallel Split",
        prompt: "Executes multiple downstream paths concurrently.",
        parallelNextNodeIds: [
          ex3_varJokeNodeId,
          ex3_promptFunnyNodeId,
          ex3_questionNodeId
        ],
        position: { x: 640, y: 640 }
      },
      {
        id: ex3_varJokeNodeId,
        type: NodeType.VARIABLE,
        name: "Joke",
        prompt: "",
        position: { x: 920, y: 460 },
        nextNodeId: ex3_syncNodeId
      },
      {
        id: ex3_promptFunnyNodeId,
        type: NodeType.PROMPT,
        name: "Funny?",
        prompt: "Please decide if this joke is funny:\n```\n{PREVIOUS_OUTPUT}\n```",
        position: { x: 920, y: 640 },
        nextNodeId: ex3_varLlmAnalysisNodeId
      },
      {
        id: ex3_questionNodeId,
        type: NodeType.QUESTION,
        name: "Question",
        prompt: "Please provide your input:",
        position: { x: 920, y: 820 },
        nextNodeId: ex3_varUserInputNodeId
      },
      {
        id: ex3_varLlmAnalysisNodeId,
        type: NodeType.VARIABLE,
        name: "llmAnalysis",
        prompt: "",
        position: { x: 1160, y: 640 },
        nextNodeId: ex3_syncNodeId
      },
      {
        id: ex3_varUserInputNodeId,
        type: NodeType.VARIABLE,
        name: "userInput",
        prompt: "",
        position: { x: 1160, y: 820 },
        nextNodeId: ex3_syncNodeId
      },
       {
        id: ex3_syncNodeId,
        type: NodeType.SYNCHRONIZE,
        name: "Synchronize Paths",
        prompt: "Waits for parallel paths to complete before continuing.",
        position: { x: 1440, y: 460 },
        nextNodeId: ex3_conclusionNodeId
      },
      {
        id: ex3_conclusionNodeId,
        type: NodeType.CONCLUSION,
        name: "Finish",
        prompt: "Final Output",
        outputFormatTemplate: "Joke: {Joke}\n\nLLM Analysis:\n{llmAnalysis}\n\nUser input:\n{userInput}",
        position: { x: 1720, y: 460 }
      }
    ],
    links: [
        { id: generateId(), sourceId: ex3_startNodeId, targetId: ex3_parallelNodeId },
        { id: generateId(), sourceId: ex3_parallelNodeId, targetId: ex3_varJokeNodeId },
        { id: generateId(), sourceId: ex3_parallelNodeId, targetId: ex3_promptFunnyNodeId },
        { id: generateId(), sourceId: ex3_parallelNodeId, targetId: ex3_questionNodeId },
        { id: generateId(), sourceId: ex3_varJokeNodeId, targetId: ex3_syncNodeId },
        { id: generateId(), sourceId: ex3_promptFunnyNodeId, targetId: ex3_varLlmAnalysisNodeId },
        { id: generateId(), sourceId: ex3_varLlmAnalysisNodeId, targetId: ex3_syncNodeId },
        { id: generateId(), sourceId: ex3_questionNodeId, targetId: ex3_varUserInputNodeId },
        { id: generateId(), sourceId: ex3_varUserInputNodeId, targetId: ex3_syncNodeId },
        { id: generateId(), sourceId: ex3_syncNodeId, targetId: ex3_conclusionNodeId },
    ],
    runHistory: [],
    projectVariables: [],
    createdAt: now, // Using "now" for consistency, original value "2025-06-14T15:36:33.118Z" ignored
    updatedAt: now, // Using "now" for consistency, original value "2025-06-14T15:40:52.112Z" ignored
  };

  return [exampleProject1, exampleProject2, exampleProject3];
};


export const LocalStorageService = {
  getProjects: (): Project[] => {
    const data = localStorage.getItem(LOCAL_STORAGE_PROJECTS_KEY);
    if (data) {
      try {
        const projectsFromStorage = JSON.parse(data) as Project[];
        if (Array.isArray(projectsFromStorage)) {
          const sanitizedProjects = projectsFromStorage.map(project => {
            if (project && project.nodes && Array.isArray(project.nodes)) {
              project.nodes = project.nodes.filter((node): node is Node => node !== null && node !== undefined);
            }
            if (project && !Array.isArray(project.projectVariables)) {
              project.projectVariables = [];
            }
            return project;
          }).filter((project): project is Project => project !== null && project !== undefined); 
          return sanitizedProjects;
        }
      } catch (e) {
        console.error("[LocalStorageService] Error parsing projects from localStorage", e);
      }
    }
    const examples = createExampleProjects();
    LocalStorageService.saveProjects(examples); 
    return examples;
  },
  saveProjects: (projects: Project[]): void => {
    try {
      const projectString = JSON.stringify(projects);
      localStorage.setItem(LOCAL_STORAGE_PROJECTS_KEY, projectString);
    } catch (e) {
      console.error(
        "[LocalStorageService] saveProjects error: Could not stringify projects. This may be due to circular references or non-serializable data in the project state. Error message:",
        e instanceof Error ? e.message : String(e)
      );
      if (e instanceof Error && e.stack) {
        console.error("[LocalStorageService] saveProjects error stack:", e.stack);
      }
      if (e instanceof TypeError && (e.message.toLowerCase().includes('circular structure') || e.message.toLowerCase().includes('cyclic object value'))) {
          console.error("[LocalStorageService] CIRCULAR STRUCTURE ERROR detected during saveProjects. The 'projects' object likely contains HTMLElement or other non-serializable data with circular references.");
      }
    }
  },
  getAppSettings: (): AppSettings => {
    const data = localStorage.getItem(LOCAL_STORAGE_SETTINGS_KEY);
    const loadedSettings = data ? JSON.parse(data) : DEFAULT_APP_SETTINGS;
    return { ...DEFAULT_APP_SETTINGS, ...loadedSettings };
  },
  saveAppSettings: (settings: AppSettings): void => {
    localStorage.setItem(LOCAL_STORAGE_SETTINGS_KEY, JSON.stringify(settings));
  },
};