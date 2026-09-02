'use client';

import { useState } from 'react';

export default function StoryGenerator({ onGenerate, loading }) {
  const [formData, setFormData] = useState({
    characterName: '',
    setting: '',
    theme: 'adventure',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.characterName.trim()) {
      alert('Please enter a character name!');
      return;
    }
    onGenerate(formData);
  };

  return (
    <div className="card" style={{ background: 'rgba(255, 255, 255, 0.95)' }}>
      <h2 style={{ color: '#667eea' }}>Create a New Story</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="characterName">Character Name</label>
          <input
            type="text"
            id="characterName"
            name="characterName"
            value={formData.characterName}
            onChange={handleChange}
            placeholder="e.g., Luna, Max, Sophia"
            disabled={loading}
          />
        </div>

        <div className="form-group">
          <label htmlFor="setting">Setting (optional)</label>
          <input
            type="text"
            id="setting"
            name="setting"
            value={formData.setting}
            onChange={handleChange}
            placeholder="e.g., Enchanted Forest, Castle, Space"
            disabled={loading}
          />
        </div>

        <div className="form-group">
          <label htmlFor="theme">Story Theme</label>
          <select
            id="theme"
            name="theme"
            value={formData.theme}
            onChange={handleChange}
            disabled={loading}
          >
            <option value="adventure">Adventure</option>
            <option value="fantasy">Fantasy</option>
            <option value="mystery">Mystery</option>
            <option value="friendship">Friendship</option>
            <option value="magic">Magic</option>
          </select>
        </div>

        <button type="submit" disabled={loading}>
          {loading ? 'Generating...' : 'Generate Story'}
        </button>
      </form>
    </div>
  );
}