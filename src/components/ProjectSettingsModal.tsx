
// src/components/ProjectSettingsModal.tsx
import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import type { ProjectSettingsModalProps, Project } from '../../types';

const ProjectSettingsModal: React.FC<ProjectSettingsModalProps> = ({ project, isOpen, onClose, onSave }) => {
  // Local state for editing
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [author, setAuthor] = useState('');

  useEffect(() => {
    // When the modal opens or the project prop changes, initialize local state
    if (project && isOpen) {
      setName(project.name);
      setDescription(project.description);
      setAuthor(project.author);
    }
    // If not open, reset (optional, but good practice if fields shouldn't persist across openings implicitly)
    // if (!isOpen) {
    //   setName('');
    //   setDescription('');
    //   setAuthor('');
    // }
  }, [project, isOpen]);

  const handleSave = () => {
    // Only when "Save Settings" is clicked, call onSave with the local state values
    onSave({ name, description, author });
    // onClose(); // Parent usually calls close
  };

  if (!isOpen || !project) return null; // Don't render if not open or no project

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Project Settings">
      <div className="space-y-4 text-slate-300">
        <div>
          <label htmlFor="projectName" className="block text-sm font-medium">Project Name</label>
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
        <button onClick={handleSave} className="w-full rounded-md bg-green-600 px-4 py-2 font-medium text-white hover:bg-green-700">Save Settings</button>
      </div>
    </Modal>
  );
};

export default ProjectSettingsModal;
