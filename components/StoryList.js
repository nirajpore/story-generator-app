'use client';

export default function StoryList({ stories, onSelect, onDelete }) {
  if (stories.length === 0) {
    return (
      <div className="card" style={{ background: 'rgba(255, 255, 255, 0.95)', textAlign: 'center' }}>
        <h2 style={{ color: '#667eea' }}>📚 Your Stories</h2>
        <p style={{ color: '#999', fontSize: '16px' }}>No stories yet. Create your first one! ✨</p>
      </div>
    );
  }

  return (
    <div>
      <div className="card" style={{ background: 'rgba(255, 255, 255, 0.95)' }}>
        <h2 style={{ color: '#667eea' }}>📚 Your Stories ({stories.length})</h2>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {stories.map((story) => (
          <div
            key={story.id}
            className="story-card"
            onClick={() => onSelect(story)}
            style={{ cursor: 'pointer' }}
          >
            <h3>{story.title}</h3>
            <p>{story.content.substring(0, 100)}...</p>
            <small style={{ color: '#999' }}>
              {new Date(story.createdAt).toLocaleDateString()}
            </small>
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (confirm('Delete this story?')) {
                  onDelete(story.id);
                }
              }}
              style={{
                marginTop: '10px',
                background: '#f5576c',
                padding: '6px 12px',
                fontSize: '12px',
              }}
            >
              Delete
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
