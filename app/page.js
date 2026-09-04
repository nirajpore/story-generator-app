'use client';

import { useState, useEffect, useRef } from 'react';
import StoryGenerator from '@/components/StoryGenerator';
import StoryDisplay from '@/components/StoryDisplay';
import StoryList from '@/components/StoryList';

export default function Home() {
  const [stories, setStories] = useState([]);
  const [selectedStory, setSelectedStory] = useState(null);
  const [loading, setLoading] = useState(false);
  const hasLoadedStoriesRef = useRef(false);

  useEffect(() => {
    const saved = localStorage.getItem('stories');
    if (saved) {
      try {
        setStories(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse saved stories:', e);
      }
    }

    hasLoadedStoriesRef.current = true;
  }, []);

  useEffect(() => {
    if (!hasLoadedStoriesRef.current) return;
    localStorage.setItem('stories', JSON.stringify(stories));
  }, [stories]);

  const handleGenerateStory = async (storyData) => {
    setLoading(true);
    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(storyData),
      });

      if (!response.ok) {
        throw new Error('Failed to generate story');
      }

      const data = await response.json();
      const newStory = {
        id: Date.now(),
        title: storyData.characterName ? `${storyData.characterName}'s Adventure` : 'Untitled Story',
        content: data.story,
        ...storyData,
        createdAt: new Date().toISOString(),
      };

      setStories((prevStories) => [newStory, ...prevStories]);
      setSelectedStory(newStory);
    } catch (error) {
      alert('Error generating story: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteStory = (id) => {
    setStories((prevStories) => prevStories.filter((story) => story.id !== id));
    if (selectedStory?.id === id) {
      setSelectedStory(null);
    }
  };

  return (
    <div>
      <header style={{ textAlign: 'center', marginBottom: '30px' }}>
        <h1>Story Generator</h1>
        <p style={{ color: '#fff', fontSize: '18px' }}>Create magical stories for your loved ones!</p>
      </header>

      {selectedStory ? (
        <StoryDisplay
          story={selectedStory}
          onBack={() => setSelectedStory(null)}
          onDelete={() => {
            handleDeleteStory(selectedStory.id);
            setSelectedStory(null);
          }}
        />
      ) : (
        <div className="grid" style={{ marginBottom: '30px', gridTemplateColumns: '1fr 1fr' }}>
          <div>
            <StoryGenerator onGenerate={handleGenerateStory} loading={loading} />
          </div>
          <div>
            <StoryList stories={stories} onSelect={setSelectedStory} onDelete={handleDeleteStory} />
          </div>
        </div>
      )}
    </div>
  );
}
