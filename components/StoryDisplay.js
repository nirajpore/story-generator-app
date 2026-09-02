'use client';

import { useState } from 'react';

export default function StoryDisplay({ story, onBack, onDelete }) {
  const [copied, setCopied] = useState(false);

  const handleShare = () => {
    const storyUrl = `${window.location.origin}?storyId=${story.id}`;
    navigator.clipboard.writeText(storyUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this story?')) {
      onDelete();
    }
  };

  const formattedDate = new Date(story.createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div>
      <button onClick={onBack} style={{ marginBottom: '20px' }}>Back to Stories</button>
      
      <div className="story-container">
        <h2>{story.title}</h2>
        
        <div className="story-content">
          {story.content}
        </div>

        <div className="story-meta">
          <p>Date: {formattedDate}</p>
          {story.characterName && <p>Character: {story.characterName}</p>}
          {story.setting && <p>Setting: {story.setting}</p>}
          <p>Theme: {story.theme}</p>
        </div>

        <div style={{ marginTop: '30px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button onClick={handleShare} style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
            {copied ? 'Link Copied!' : 'Share Story'}
          </button>
          <button onClick={handleDelete} style={{ background: 'linear-gradient(135deg, #f5576c 0%, #f093fb 100%)' }}>
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}