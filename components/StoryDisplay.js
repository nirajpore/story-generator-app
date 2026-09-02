'use client';

import { useState, useRef, useEffect } from 'react';

export default function StoryDisplay({ story, onBack, onDelete }) {
  const [copied, setCopied] = useState(false);
  const [isReading, setIsReading] = useState(false);
  const [readingTime, setReadingTime] = useState(0);
  const [evaluation, setEvaluation] = useState(null);
  const [transcript, setTranscript] = useState('');
  const timerRef = useRef(null);
  const recognitionRef = useRef(null);

  useEffect(() => {
    // Initialize Web Speech API
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.onresult = (event) => {
        let interimTranscript = '';
        let finalTranscript = transcript;
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript + ' ';
          } else {
            interimTranscript += transcript;
          }
        }
        setTranscript(finalTranscript + interimTranscript);
      };
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (recognitionRef.current) recognitionRef.current.abort();
    };
  }, []);

  const handleStartReading = () => {
    setIsReading(true);
    setReadingTime(0);
    setTranscript('');
    setEvaluation(null);
    
    // Start timer
    timerRef.current = setInterval(() => {
      setReadingTime((prev) => prev + 1);
    }, 1000);

    // Start speech recognition
    if (recognitionRef.current) {
      recognitionRef.current.start();
    }
  };

  const handleFinishReading = async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (recognitionRef.current) recognitionRef.current.stop();
    
    setIsReading(false);

    // Evaluate the reading
    const evaluation_result = evaluateReading(transcript, story.content, readingTime);
    setEvaluation(evaluation_result);
  };

  // Helper function to calculate string similarity
  const calculateSimilarity = (str1, str2) => {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    if (longer.length === 0) return 1.0;
    
    const editDistance = getEditDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  };

  // Levenshtein distance algorithm
  const getEditDistance = (s1, s2) => {
    const costs = [];
    for (let i = 0; i <= s1.length; i++) {
      let lastValue = i;
      for (let j = 0; j <= s2.length; j++) {
        if (i === 0) {
          costs[j] = j;
        } else if (j > 0) {
          let newValue = costs[j - 1];
          if (s1.charAt(i - 1) !== s2.charAt(j - 1)) {
            newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
          }
          costs[j - 1] = lastValue;
          lastValue = newValue;
        }
      }
      if (i > 0) costs[s2.length] = lastValue;
    }
    return costs[s2.length];
  };

  // Improved word matching with similarity threshold
  const matchWords = (readWords, storyWords) => {
    let matchedCount = 0;
    const matchedIndices = new Set();

    for (const readWord of readWords) {
      for (let i = 0; i < storyWords.length; i++) {
        if (!matchedIndices.has(i)) {
          const similarity = calculateSimilarity(readWord, storyWords[i]);
          // Accept matches with 70% or higher similarity (more forgiving)
          if (similarity >= 0.7) {
            matchedCount++;
            matchedIndices.add(i);
            break;
          }
        }
      }
    }

    return { matchedCount, totalStoryWords: storyWords.length };
  };

  const evaluateReading = (transcript, storyContent, timeTaken) => {
    let stars = 0;
    
    // Clean and split text
    const cleanText = (text) => 
      text.toLowerCase()
        .replace(/[.!?,;:\-—–]/g, '') // Remove punctuation
        .split(/\s+/)
        .filter(w => w.length > 0);

    const storyWords = cleanText(storyContent);
    const readWords = cleanText(transcript);

    // Better word matching
    const { matchedCount, totalStoryWords } = matchWords(readWords, storyWords);
    const accuracy = (matchedCount / totalStoryWords) * 100;
    
    // Accuracy scoring (3 stars) - more forgiving
    if (accuracy >= 85) stars += 3;
    else if (accuracy >= 70) stars += 2.5;
    else if (accuracy >= 55) stars += 2;
    else if (accuracy >= 40) stars += 1.5;
    else stars += 1;

    // Fluency scoring (3 stars) - based on reading speed
    // Expected: ~100 words per minute for year 1 readers (0.6 sec per word)
    const expectedReadingTime = totalStoryWords * 0.6;
    const readingSpeedRatio = timeTaken / expectedReadingTime;
    
    if (readingSpeedRatio >= 0.8 && readingSpeedRatio <= 1.2) stars += 3; // Just right
    else if (readingSpeedRatio >= 0.7 && readingSpeedRatio <= 1.4) stars += 2.5;
    else if (readingSpeedRatio >= 0.6 && readingSpeedRatio <= 1.6) stars += 2;
    else stars += 1.5;

    // Confidence/Completeness scoring (2 stars) - based on words read
    const confidenceRatio = (matchedCount / totalStoryWords);
    if (confidenceRatio >= 0.85) stars += 2;
    else if (confidenceRatio >= 0.70) stars += 1.5;
    else if (confidenceRatio >= 0.50) stars += 1;
    else stars += 0.5;

    // Comprehension bonus (2 stars) - simplified but encouraging
    if (matchedCount > totalStoryWords * 0.5) stars += 1.5;
    else stars += 1;

    return {
      stars: Math.min(10, Math.round(stars * 2) / 2),
      accuracy: Math.round(accuracy),
      wordsRead: matchedCount,
      totalWords: totalStoryWords,
      percentageRead: Math.round((matchedCount / totalStoryWords) * 100),
      timeTaken: timeTaken,
      feedback: generateFeedback(accuracy, matchedCount, totalStoryWords, timeTaken, expectedReadingTime),
    };
  };

  const generateFeedback = (accuracy, wordsRead, totalWords, timeTaken, expectedTime) => {
    let feedback = [];
    
    if (accuracy >= 85) {
      feedback.push('⭐ Excellent accuracy! Fantastic job!');
    } else if (accuracy >= 70) {
      feedback.push('👍 Good accuracy! Well done!');
    } else if (accuracy >= 55) {
      feedback.push('🌟 Nice effort! You got most of it!');
    } else {
      feedback.push('💪 Great try! Keep practicing!');
    }

    if (wordsRead >= totalWords * 0.8) {
      feedback.push('🎉 You read almost all the words!');
    } else if (wordsRead >= totalWords * 0.6) {
      feedback.push('📚 You read a good chunk of the story!');
    }

    const readingSpeedRatio = timeTaken / expectedTime;
    if (readingSpeedRatio >= 0.8 && readingSpeedRatio <= 1.2) {
      feedback.push('⚡ Perfect reading pace!');
    } else if (timeTaken > expectedTime * 1.5) {
      feedback.push('📖 Take your time - focus on understanding each word!');
    } else if (timeTaken < expectedTime * 0.7) {
      feedback.push('🚀 Nice speed - make sure you understood it all!');
    }

    return feedback.join(' ');
  };

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

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formattedDate = new Date(story.createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div>
      <button onClick={onBack} style={{ marginBottom: '20px' }}>← Back to Stories</button>
      
      <div className="story-container">
        <h2>{story.title}</h2>
        
        <div className="story-meta" style={{ marginBottom: '20px', paddingBottom: '15px', borderBottom: '1px solid #eee' }}>
          <p><strong>Level:</strong> <span style={{ color: '#667eea', textTransform: 'capitalize' }}>{story.rwLevel || 'blue'}</span></p>
          <p><strong>Date:</strong> {formattedDate}</p>
          {story.characterName && <p><strong>Character:</strong> {story.characterName}</p>}
          {story.setting && <p><strong>Setting:</strong> {story.setting}</p>}
        </div>

        <div className="story-content" style={{ marginBottom: '30px', lineHeight: '1.8', fontSize: '18px' }}>
          {story.content}
        </div>

        {!isReading && !evaluation && (
          <button 
            onClick={handleStartReading}
            style={{ 
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              padding: '12px 30px',
              fontSize: '16px',
              marginBottom: '20px'
            }}
          >
            🎤 Start Reading Practice
          </button>
        )}

        {isReading && (
          <div style={{ background: '#f0f4ff', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#667eea', marginBottom: '10px' }}>
              ⏱️ {formatTime(readingTime)}
            </div>
            <div style={{ fontSize: '14px', color: '#666', marginBottom: '15px' }}>
              <strong>What I heard:</strong> <em>{transcript || 'Listening...'}</em>
            </div>
            <button
              onClick={handleFinishReading}
              style={{
                background: 'linear-gradient(135deg, #f5576c 0%, #f093fb 100%)',
                padding: '12px 30px',
                fontSize: '16px',
              }}
            >
              ✓ Finish Reading
            </button>
          </div>
        )}

        {evaluation && (
          <div style={{ background: '#f0fff4', padding: '20px', borderRadius: '8px', marginBottom: '20px', border: '2px solid #48bb78' }}>
            <div style={{ fontSize: '32px', marginBottom: '10px' }}>
              {'⭐'.repeat(Math.floor(evaluation.stars))} {evaluation.stars % 1 !== 0 ? '✨' : ''}
            </div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#48bb78', marginBottom: '15px' }}>
              {evaluation.stars} / 10 Stars
            </div>
            <div style={{ background: 'white', padding: '15px', borderRadius: '6px', marginBottom: '15px' }}>
              <p><strong>📊 Reading Results:</strong></p>
              <p>✓ Accuracy: {evaluation.accuracy}%</p>
              <p>✓ Words Read Correctly: {evaluation.wordsRead} out of {evaluation.totalWords}</p>
              <p>✓ Coverage: {evaluation.percentageRead}% of the story</p>
              <p>✓ Time Taken: {formatTime(evaluation.timeTaken)}</p>
              <p style={{ fontSize: '16px', marginTop: '10px', color: '#666' }}>{evaluation.feedback}</p>
            </div>
            <button
              onClick={() => {
                setEvaluation(null);
                setTranscript('');
                setReadingTime(0);
              }}
              style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                padding: '10px 20px',
                marginRight: '10px',
              }}
            >
              Try Again
            </button>
          </div>
        )}

        {!isReading && (
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '20px' }}>
            <button onClick={handleShare} style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
              {copied ? 'Link Copied!' : 'Share Story'}
            </button>
            <button onClick={handleDelete} style={{ background: 'linear-gradient(135deg, #f5576c 0%, #f093fb 100%)' }}>
              Delete
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
