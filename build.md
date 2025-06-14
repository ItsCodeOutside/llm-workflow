
# Building and Running the Project Locally

This project is designed as a client-side application and can be run directly in a web browser from your local file system or using a simple local HTTP server.

[Back to Main README](./readme.md)

## Prerequisites

*   A modern web browser (e.g., Chrome, Firefox, Edge, Safari).
*   (Optional but Recommended) A simple local HTTP server. Python's built-in server or Node.js `http-server` are good options.
*   An OpenAI API Key (if you plan to use the ChatGPT provider). See [readme.md](./readme.md#security-vulnerabilities--considerations) for important security notes regarding API key handling.

## Setup and Running

1.  **Download Files**:
    *   Ensure you have all the project files (`index.html`, `index.tsx`, `App.tsx`, `types.ts`, `constants.ts`, `llmService.ts`, and all files within the `src/` directory) in a single directory structure as provided.

2.  **Build the Project**:
    * Change to the project's main directory and run `npm install` followed by `npm run build`
    * (Optional) You can also try building the module for the workflow execution engine by switching to `/src` and running `npm run build:module`

2.  **Use a Simple HTTP Server (Recommended)**
    *   This method runs the project under _localhost_ which can introduce a number of CORS issues.

    *   **Using Python's HTTP Server**:
        *   Open your terminal or command prompt.
        *   Navigate to the build output folder, `/dist/`
        *   If you have Python 3, run: `python -m http.server`
            * **NOTE:** the command may be `python3 -m http.server` (note the '3').
        *   The server will usually start on `http://localhost:8000`. Open this URL in your browser.

4.  **Configure API Key (for ChatGPT)**:
    *   Once the application is open in your browser:
    *   Click the "Settings" button in the header.
    *   In the "Application Settings" modal:
        *   Select "ChatGPT (OpenAI)" as the LLM Provider.
        *   Enter your OpenAI API Key in the "ChatGPT API Key" field.
        *   Choose your desired ChatGPT model.
    *   Click "Save App Settings". The API key is stored in your browser's `localStorage`. **Remember the security implications of this for any use beyond local personal testing.**
    *   If using Ollama, configure its settings accordingly.

5.  **Start Using the Application**:
    *   You can now create new projects or explore the example projects.

## Building for Production

This project currently does not have a separate "build" step (like transpilation with Babel or bundling with Webpack/Rollup) because it relies on ES modules and CDNs specified in the `index.html` via `importmap`.

If you were to add features requiring a build step (e.g., TypeScript compilation to older JavaScript versions, CSS pre-processing, complex bundling), you would typically use tools like:

*   `tsc` (TypeScript Compiler)
*   Webpack, Rollup, or Parcel for bundling
*   Babel for JavaScript transpilation

For the current setup, "building" simply means ensuring all necessary files are present and served correctly.

[Back to Main README](./readme.md)
