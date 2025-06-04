
# Building and Running the Project Locally

This project is designed as a client-side application and can be run directly in a web browser from your local file system or using a simple local HTTP server.

[Back to Main README](./readme.md)

## Prerequisites

*   A modern web browser (e.g., Chrome, Firefox, Edge, Safari).
*   (Optional but Recommended) A simple local HTTP server. Python's built-in server or Node.js `http-server` are good options.
*   A Gemini API Key (see [readme.md](./readme.md#security-vulnerabilities--considerations) for important security notes).

## Setup and Running

1.  **Download Files**:
    *   Ensure you have all the project files (`index.html`, `index.tsx`, `App.tsx`, `types.ts`, `constants.ts`, `geminiService.ts`, and all files within the `src/` directory) in a single directory structure as provided.

2.  **Option A: Using a Simple HTTP Server (Recommended)**
    *   This method avoids potential CORS issues or restrictions that some browsers might impose when loading modules directly from the `file:///` protocol.

    *   **Using Python's HTTP Server**:
        *   Open your terminal or command prompt.
        *   Navigate to the root directory where `index.html` is located.
        *   If you have Python 3, run: `python -m http.server`
        *   If you have Python 2, run: `python -m SimpleHTTPServer`
        *   The server will usually start on `http://localhost:8000`. Open this URL in your browser.

    *   **Using Node.js `http-server`**:
        *   If you don't have `http-server` installed, install it globally: `npm install -g http-server`
        *   Open your terminal or command prompt.
        *   Navigate to the root directory where `index.html` is located.
        *   Run: `http-server`
        *   The server will typically start on `http://localhost:8080` (or another port if 8080 is busy). Open the provided URL in your browser.

3.  **Option B: Opening `index.html` Directly (May have limitations)**
    *   Navigate to the project directory in your file explorer.
    *   Double-click the `index.html` file, or right-click and choose "Open with" your preferred web browser.
    *   **Note**: Due to browser security policies regarding ES modules loaded via `file:///` protocol, this method might not work reliably in all browsers or might have limitations (e.g., issues with service workers if they were to be added). Using a local HTTP server is generally more robust for development.

4.  **Configure API Key**:
    *   Once the application is open in your browser:
    *   Click the "Settings" button in the header.
    *   In the "Application Settings" modal, enter your Gemini API Key.
    *   Click "Save App Settings". The API key is stored in your browser's `localStorage`. **Remember the security implications of this for any use beyond local personal testing.**

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
