
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App'; // Ensured relative path
import './src/site.css';
// Import a highlight.js theme CSS file
import 'highlight.js/styles/github-dark.css';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);