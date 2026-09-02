'use client';

import { useState, useRef, useEffect } from 'react';

export default function StoryDisplay({ story, onBack, onDelete }) {
  const [copied, setCopied] = useState(false);
  const [isReading, setIsReading] = useState(false);
  const [readingTime, setReadingTime] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [evaluation, setEvaluation] = useState(null);
  const [transcript, setTranscript] = useState('');
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
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

  const evaluateReading = (transcript, storyContent, timeTaken) => {
    let stars = 0;
    const storyWords = storyContent.toLowerCase().split(/\s+/).filter(w => w.length > 0);
    const readWords = transcript.toLowerCase().split(/\s+/).filter(w => w.length > 0);
    
    // Accuracy scoring (3 stars)
    const matchedWords = readWords.filter(word => 
      storyWords.some(storyWord => storyWord.includes(word) || word.includes(storyWord))
    ).length;
    const accuracy = (matchedWords / storyWords.length) * 100;
    
    if (accuracy >= 90) stars += 3;
    else if (accuracy >= 75) stars += 2.5;
    else if (accuracy >= 60) stars += 2;
    else if (accuracy >= 45) stars += 1.5;
    else stars += 1;

    // Fluency scoring (3 stars) - based on reading speed
    const expectedReadingTime = storyWords.length * 0.5; // ~120 words per minute
    const readingSpeed = Math.abs(timeTaken - expectedReadingTime);
    
    if (readingSpeed < expectedReadingTime * 0.3) stars += 3;
    else if (readingSpeed < expectedReadingTime * 0.5) stars += 2.5;
    else if (readingSpeed < expectedReadingTime * 0.7) stars += 2;
    else stars += 1.5;

    // Confidence scoring (2 stars) - based on transcript length
    const confidenceRatio = (readWords.length / storyWords.length);
    if (confidenceRatio >= 0.8) stars += 2;
    else if (confidenceRatio >= 0.6) stars += 1.5;
    else stars += 1;

    // Comprehension bonus (2 stars) - simplified
    if (readWords.length > storyWords.length * 0.7) stars += 1.5;
    else stars += 1;

    return {
      stars: Math.min(10, Math.round(stars * 2) / 2),
      accuracy: Math.round(accuracy),
      wordsRead: readWords.length,
      timeTaken: timeTaken,
      feedback: generateFeedback(accuracy, timeTaken, expectedReadingTime),
    };
  };

  const generateFeedback = (accuracy, timeTaken, expectedTime) => {
    let feedback = [];
    
    if (accuracy >= 90) {
      feedback.push('⭐ Excellent accuracy! Great job!');
    } else if (accuracy >= 75) {
      feedback.push('👍 Good accuracy. Keep practicing!');
    } else {
      feedback.push('💪 Keep practicing - you\'ll improve!');
    }

    if (Math.abs(timeTaken - expectedTime) < expectedTime * 0.3) {
      feedback.push('⚡ Great reading pace!');
    } else if (timeTaken > expectedTime * 1.5) {
      feedback.push('📖 Take your time - focus on understanding.');
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
              <strong>Transcript:</strong> {transcript || 'Listening...'}
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
              <p><strong>📊 Results:</strong></p>
              <p>✓ Accuracy: {evaluation.accuracy}%</p>
              <p>✓ Words Read: {evaluation.wordsRead}</p>
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