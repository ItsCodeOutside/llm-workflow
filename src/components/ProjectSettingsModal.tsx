// src/components/ProjectSettingsModal.tsx
import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import type { ProjectSettingsModalProps, Project, ProjectVariable } from '../../types';
import { generateId, sanitizeVariableName } from '../utils'; // Import sanitizeVariableName

const ProjectSettingsModal: React.FC<ProjectSettingsModalProps> = ({ project, isOpen, onClose, onSave }) => {
  // Local state for editing
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [author, setAuthor] = useState('');
  const [projectVariables, setProjectVariables] = useState<ProjectVariable[]>([]);
  const [isSaveDisabled, setIsSaveDisabled] = useState(false);

  useEffect(() => {
    if (project && isOpen) {
      setName(project.name);
      setDescription(project.description);
      setAuthor(project.author);
      // Sanitize existing project variable names on load
      setProjectVariables(
        project.projectVariables 
        ? [...project.projectVariables.map(v => ({...v, name: sanitizeVariableName(v.name)}))] 
        : []
      );
    }
  }, [project, isOpen]);

  useEffect(() => {
    // Validate to enable/disable save button
    let disabled = !name.trim(); // Project name is required
    projectVariables.forEach(pv => {
      // Each variable must have a name that is valid after sanitization and not empty.
      if (!pv.name.trim() || pv.name !== sanitizeVariableName(pv.name)) {
        disabled = true;
      }
    });
    setIsSaveDisabled(disabled);
  }, [name, projectVariables]);


  const handleVariableChange = (index: number, field: 'name' | 'value', value: string) => {
    setProjectVariables(prev => {
      const updated = [...prev];
      if (field === 'name') {
        updated[index] = { ...updated[index], [field]: sanitizeVariableName(value) };
      } else {
        updated[index] = { ...updated[index], [field]: value };
      }
      return updated;
    });
  };

  const handleAddVariable = () => {
    setProjectVariables(prev => [...prev, { id: generateId(), name: '', value: '' }]);
  };

  const handleDeleteVariable = (id: string) => {
    setProjectVariables(prev => prev.filter(pv => pv.id !== id));
  };

  const handleSave = () => {
    if (isSaveDisabled) return;

    // Ensure all variables are sanitized and valid before saving
    const sanitizedProjectVariables = projectVariables.map(pv => ({
      ...pv,
      name: sanitizeVariableName(pv.name),
    })).filter(pv => pv.name.trim() !== ''); // Remove any that became empty after sanitization

    onSave({ 
      name, 
      description, 
      author, 
      projectVariables: sanitizedProjectVariables 
    });
  };

  if (!isOpen || !project) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Project Settings" widthClass="sm:max-w-xl">
      <div className="space-y-6 text-slate-300">
        {/* Basic Project Info */}
        <section>
          <h4 className="text-md font-semibold text-sky-400 mb-2">Basic Information</h4>
          <div className="space-y-3">
            <div>
              <label htmlFor="projectName" className="block text-sm font-medium">Project Name *</label>
              <input type="text" id="projectName" value={name} onChange={(e) => setName(e.target.value)} className="mt-1 block w-full rounded-md border-slate-600 bg-slate-700 p-2 shadow-sm focus:border-sky-500 focus:ring-sky-500 sm:text-sm" />
            </div>
            <div>
              <label htmlFor="projectDescription" className="block text-sm font-medium">Description</label>
              <textarea id="projectDescription" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="mt-1 block w-full rounded-md border-slate-600 bg-slate-700 p-2 shadow-sm focus:border-sky-500 focus:ring-sky-500 sm:text-sm custom-scroll" />
            </div>
            <div>
              <label htmlFor="projectAuthor" className="block text-sm font-medium">Author</label>
              <input type="text" id="projectAuthor" value={author} onChange={(e) => setAuthor(e.target.value)} className="mt-1 block w-full rounded-md border-slate-600 bg-slate-700 p-2 shadow-sm focus:border-sky-500 focus:ring-sky-500 sm:text-sm" />
            </div>
          </div>
        </section>

        <hr className="border-slate-700"/>

        {/* Project-Wide Variables */}
        <section>
          <h4 className="text-md font-semibold text-sky-400 mb-2">Project-Wide Variables</h4>
          <p className="text-xs text-slate-400 mb-1">Define variables accessible throughout your project (e.g., <code className="bg-slate-700 p-0.5 rounded text-xs">{'{my_project_var}'}</code>).</p>
          <p className="text-xs text-slate-400 mb-3">Use only letters, numbers, and underscores for names. Node-specific variables will override these if names conflict.</p>
          <div className="space-y-3 max-h-60 overflow-y-auto custom-scroll pr-2">
            {projectVariables.map((pv, index) => (
              <div key={pv.id} className="flex items-center space-x-2 p-2 bg-slate-700 rounded-md">
                <div className="flex-1">
                  <label htmlFor={`varName-${pv.id}`} className="sr-only">Variable Name</label>
                  <input
                    type="text"
                    id={`varName-${pv.id}`}
                    placeholder="Variable Name (e.g., api_version)"
                    value={pv.name}
                    onChange={(e) => handleVariableChange(index, 'name', e.target.value)}
                    className="block w-full rounded-md border-slate-600 bg-slate-650 p-2 shadow-sm focus:border-sky-500 focus:ring-sky-500 sm:text-sm placeholder-slate-400"
                  />
                  { (pv.name !== sanitizeVariableName(pv.name) || !pv.name.trim()) && isOpen && /* Show error only when modal is open and name is invalid */
                    <p className="text-xs text-red-400 mt-1">Name must be alphanumeric (plus underscore) and cannot be empty.</p>
                  }
                </div>
                <div className="flex-1">
                  <label htmlFor={`varValue-${pv.id}`} className="sr-only">Variable Value</label>
                  <input
                    type="text"
                    id={`varValue-${pv.id}`}
                    placeholder="Variable Value"
                    value={pv.value}
                    onChange={(e) => handleVariableChange(index, 'value', e.target.value)}
                    className="block w-full rounded-md border-slate-600 bg-slate-650 p-2 shadow-sm focus:border-sky-500 focus:ring-sky-500 sm:text-sm placeholder-slate-400"
                  />
                </div>
                <button 
                  onClick={() => handleDeleteVariable(pv.id)} 
                  className="p-2 text-red-500 hover:text-red-400 rounded-md hover:bg-slate-600"
                  aria-label="Delete variable"
                >
                  <i className="fas fa-trash"></i>
                </button>
              </div>
            ))}
          </div>
          <button 
            onClick={handleAddVariable} 
            className="mt-3 rounded-md bg-sky-600 px-3 py-1.5 text-sm text-white hover:bg-sky-700 flex items-center"
          >
            <i className="fas fa-plus mr-2"></i>Add Variable
          </button>
        </section>
        
        <button 
          onClick={handleSave} 
          disabled={isSaveDisabled}
          className={`w-full rounded-md px-4 py-2 font-medium text-white ${isSaveDisabled ? 'bg-slate-500 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'}`}
        >
          {isSaveDisabled ? 'Cannot Save (Check Fields)' : 'Save Settings'}
        </button>
      </div>
    </Modal>
  );
};

export default ProjectSettingsModal;