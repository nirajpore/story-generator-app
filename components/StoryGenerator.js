'use client';

import { useState } from 'react';

export default function StoryGenerator({ onGenerate, loading }) {
  const [formData, setFormData] = useState({
    characterName: '',
    setting: '',
    rwLevel: 'blue',
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
          <label htmlFor="rwLevel">RWI Reading Level</label>
          <select
            id="rwLevel"
            name="rwLevel"
            value={formData.rwLevel}
            onChange={handleChange}
            disabled={loading}
          >
            <option value="purple">Purple (Easiest)</option>
            <option value="pink">Pink</option>
            <option value="orange">Orange</option>
            <option value="yellow">Yellow</option>
            <option value="blue">Blue</option>
            <option value="grey">Grey (Most Advanced)</option>
          </select>
        </div>

        <button type="submit" disabled={loading}>
          {loading ? 'Generating...' : 'Generate Story'}
        </button>
      </form>
    </div>
  );
}