'use client';

import { useState, useRef, useEffect } from 'react';

export default function StoryDisplay({ story, onBack, onDelete }) {
  const [copied, setCopied] = useState(false);
  const [isReading, setIsReading] = useState(false);
  const [readingTime, setReadingTime] = useState(0);
  const [evaluation, setEvaluation] = useState(null);
  const [transcript, setTranscript] = useState('');
  const [hint, setHint] = useState(null);
  const [lastSpokeTime, setLastSpokeTime] = useState(Date.now());
  
  const timerRef = useRef(null);
  const recognitionRef = useRef(null);
  const pauseTimerRef = useRef(null);
  const storyWordsRef = useRef([]);\n
  useEffect(() => {
    // Initialize Web Speech API
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      
      recognitionRef.current.onresult = (event) => {
        setLastSpokeTime(Date.now());
        setHint(null);\n        
        let interimTranscript = '';
        let finalTranscript = '';\n        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript_chunk = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript_chunk + ' ';
          } else {
            interimTranscript += transcript_chunk;
          }
        }\n        
        setTranscript((prev) => prev + finalTranscript + interimTranscript);
      };
    }\n
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (pauseTimerRef.current) clearTimeout(pauseTimerRef.current);
      if (recognitionRef.current) recognitionRef.current.abort();
    };
  }, []);\n
  // Monitor for pauses and show hints
  useEffect(() => {
    if (!isReading) return;\n
    if (pauseTimerRef.current) clearTimeout(pauseTimerRef.current);\n
    pauseTimerRef.current = setTimeout(() => {
      const timeSinceLast = Date.now() - lastSpokeTime;\n      
      if (timeSinceLast >= 2000 && !hint && transcript.trim()) {
        // Show phonetic hint after 2 seconds of silence
        const words = transcript.toLowerCase().split(/\\s+/).filter(w => w.length > 0);
        if (words.length > 0) {
          const lastWord = words[words.length - 1];
          const phonetic = getPhoneticBreakdown(lastWord);
          setHint({ type: 'phonetic', word: lastWord, phonetic });
        }
      }
    }, 2000);\n
    return () => {
      if (pauseTimerRef.current) clearTimeout(pauseTimerRef.current);
    };
  }, [isReading, lastSpokeTime, transcript, hint]);\n
  const getPhoneticBreakdown = (word) => {
    const phonemes = [];
    let i = 0;
    const consonantBlends = ['ch', 'sh', 'th', 'ph', 'qu', 'wh', 'st', 'sp', 'sk', 'sw', 'tr', 'dr', 'br', 'fr', 'gr', 'pr', 'bl', 'cl', 'fl', 'gl', 'pl', 'sl'];
    const endBlends = ['ng', 'nk', 'nd', 'nt', 'st', 'sp', 'sk', 'ck', 'th', 'ch', 'sh', 'tch', 'dge'];\n
    while (i < word.length) {
      if (i === 0 && i + 1 < word.length) {
        const twoLetter = word.substring(i, i + 2).toLowerCase();
        if (consonantBlends.includes(twoLetter)) {
          phonemes.push(twoLetter);
          i += 2;
          continue;
        }
      }\n
      if (i === word.length - 2) {
        const twoLetter = word.substring(i).toLowerCase();
        if (endBlends.includes(twoLetter)) {
          phonemes.push(twoLetter);
          i += 2;
          continue;
        }
      }\n
      phonemes.push(word[i]);
      i++;
    }\n
    return phonemes.join('-');
  };\n
  const speakWord = (word) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(word);
      utterance.rate = 0.8;
      utterance.pitch = 1.0;
      speechSynthesis.cancel();
      speechSynthesis.speak(utterance);
    }
  };\n
  const handleStartReading = () => {
    setIsReading(true);
    setReadingTime(0);
    setTranscript('');
    setEvaluation(null);
    setHint(null);
    setLastSpokeTime(Date.now());\n    
    const cleanText = (text) => 
      text.toLowerCase()
        .replace(/[.!?,;:\\-—–]/g, '')
        .split(/\\s+/)
        .filter(w => w.length > 0);
    storyWordsRef.current = cleanText(story.content);\n    
    timerRef.current = setInterval(() => {
      setReadingTime((prev) => prev + 1);
    }, 1000);\n
    if (recognitionRef.current) {
      recognitionRef.current.start();
    }
  };\n
  const handleFinishReading = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (pauseTimerRef.current) clearTimeout(pauseTimerRef.current);
    if (recognitionRef.current) recognitionRef.current.stop();\n    
    setIsReading(false);
    const evaluation_result = evaluateReading(transcript, story.content, readingTime);
    setEvaluation(evaluation_result);
  };\n
  const calculateSimilarity = (str1, str2) => {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    if (longer.length === 0) return 1.0;\n    
    const editDistance = getEditDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  };\n
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
  };\n
  const matchWords = (readWords, storyWords) => {
    let matchedCount = 0;
    const matchedIndices = new Set();\n
    for (const readWord of readWords) {
      for (let i = 0; i < storyWords.length; i++) {
        if (!matchedIndices.has(i)) {
          const similarity = calculateSimilarity(readWord, storyWords[i]);
          if (similarity >= 0.7) {
            matchedCount++;
            matchedIndices.add(i);
            break;
          }
        }
      }
    }\n
    return { matchedCount, totalStoryWords: storyWords.length };
  };\n
  const evaluateReading = (transcript, storyContent, timeTaken) => {
    let stars = 0;\n    
    const cleanText = (text) => 
      text.toLowerCase()
        .replace(/[.!?,;:\\-—–]/g, '')
        .split(/\\s+/)
        .filter(w => w.length > 0);\n
    const storyWords = cleanText(storyContent);
    const readWords = cleanText(transcript);\n
    const { matchedCount, totalStoryWords } = matchWords(readWords, storyWords);
    const accuracy = (matchedCount / totalStoryWords) * 100;\n    
    if (accuracy >= 85) stars += 3;
    else if (accuracy >= 70) stars += 2.5;
    else if (accuracy >= 55) stars += 2;
    else if (accuracy >= 40) stars += 1.5;
    else stars += 1;\n
    const expectedReadingTime = totalStoryWords * 0.6;
    const readingSpeedRatio = timeTaken / expectedReadingTime;\n    
    if (readingSpeedRatio >= 0.8 && readingSpeedRatio <= 1.2) stars += 3;
    else if (readingSpeedRatio >= 0.7 && readingSpeedRatio <= 1.4) stars += 2.5;
    else if (readingSpeedRatio >= 0.6 && readingSpeedRatio <= 1.6) stars += 2;
    else stars += 1.5;\n
    const confidenceRatio = (matchedCount / totalStoryWords);
    if (confidenceRatio >= 0.85) stars += 2;
    else if (confidenceRatio >= 0.70) stars += 1.5;
    else if (confidenceRatio >= 0.50) stars += 1;
    else stars += 0.5;\n
    if (matchedCount > totalStoryWords * 0.5) stars += 1.5;
    else stars += 1;\n
    return {
      stars: Math.min(10, Math.round(stars * 2) / 2),
      accuracy: Math.round(accuracy),
      wordsRead: matchedCount,
      totalWords: totalStoryWords,
      percentageRead: Math.round((matchedCount / totalStoryWords) * 100),
      timeTaken: timeTaken,
      feedback: generateFeedback(accuracy, matchedCount, totalStoryWords, timeTaken, expectedReadingTime),
    };
  };\n
  const generateFeedback = (accuracy, wordsRead, totalWords, timeTaken, expectedTime) => {
    let feedback = [];\n    
    if (accuracy >= 85) {
      feedback.push('⭐ Excellent accuracy! Fantastic job!');
    } else if (accuracy >= 70) {
      feedback.push('👍 Good accuracy! Well done!');
    } else if (accuracy >= 55) {
      feedback.push('🌟 Nice effort! You got most of it!');
    } else {
      feedback.push('💪 Great try! Keep practicing!');
    }\n
    if (wordsRead >= totalWords * 0.8) {
      feedback.push('🎉 You read almost all the words!');
    } else if (wordsRead >= totalWords * 0.6) {
      feedback.push('📚 You read a good chunk of the story!');
    }\n
    const readingSpeedRatio = timeTaken / expectedTime;
    if (readingSpeedRatio >= 0.8 && readingSpeedRatio <= 1.2) {
      feedback.push('⚡ Perfect reading pace!');
    } else if (timeTaken > expectedTime * 1.5) {
      feedback.push('📖 Take your time - focus on understanding each word!');
    } else if (timeTaken < expectedTime * 0.7) {
      feedback.push('🚀 Nice speed - make sure you understood it all!');
    }\n
    return feedback.join(' ');
  };\n
  const handleShare = () => {
    const storyUrl = `${window.location.origin}?storyId=${story.id}`;
    navigator.clipboard.writeText(storyUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };\n
  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this story?')) {
      onDelete();
    }
  };\n
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };\n
  const formattedDate = new Date(story.createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });\n
  return (
    <div>
      <button onClick={onBack} style={{ marginBottom: '20px' }}>← Back to Stories</button>\n      
      <div className="story-container">
        <h2>{story.title}</h2>\n        
        <div className="story-meta" style={{ marginBottom: '20px', paddingBottom: '15px', borderBottom: '1px solid #eee' }}>
          <p><strong>Level:</strong> <span style={{ color: '#667eea', textTransform: 'capitalize' }}>{story.rwLevel || 'blue'}</span></p>
          <p><strong>Date:</strong> {formattedDate}</p>
          {story.characterName && <p><strong>Character:</strong> {story.characterName}</p>}
          {story.setting && <p><strong>Setting:</strong> {story.setting}</p>}
        </div>\n
        <div className="story-content" style={{ marginBottom: '30px', lineHeight: '1.8', fontSize: '18px', whiteSpace: 'pre-wrap' }}>
          {story.content}
        </div>\n
        {/* Hint System */}
        {isReading && hint && (
          <div style={{ 
            background: '#fff3cd', 
            padding: '15px', 
            borderRadius: '8px', 
            marginBottom: '20px',
            border: '2px solid #ffc107'
          }}>
            {hint.type === 'phonetic' && (
              <>
                <p style={{ margin: '0 0 10px 0', fontSize: '16px', fontWeight: 'bold' }}>🔤 Sound it out:</p>
                <p style={{ margin: '0 0 10px 0', fontSize: '20px', color: '#ff6b6b', fontWeight: 'bold', fontFamily: 'monospace' }}>
                  {hint.phonetic}
                </p>
                <button
                  onClick={() => speakWord(hint.word)}
                  style={{
                    background: '#ffc107',
                    padding: '8px 15px',
                    borderRadius: '5px',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    color: '#000',
                  }}
                >
                  🔊 Hear it
                </button>
              </>
            )}
          </div>
        )}\n
        {!isReading && !evaluation && (
          <button 
            onClick={handleStartReading}
            style={{ 
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              padding: '12px 30px',
              fontSize: '16px',
              marginBottom: '20px',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
            }}
          >
            🎤 Start Reading Practice
          </button>
        )}\n
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
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer',
              }}
            >
              ✓ Finish Reading
            </button>
          </div>
        )}\n
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
                setHint(null);
              }}
              style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                padding: '10px 20px',
                marginRight: '10px',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer',
              }}
            >
              Try Again
            </button>
          </div>
        )}\n
        {!isReading && (
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '20px' }}>
            <button 
              onClick={handleShare} 
              style={{ 
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                padding: '10px 20px',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer',
              }}
            >
              {copied ? '✓ Link Copied!' : '📤 Share Story'}
            </button>
            <button 
              onClick={handleDelete} 
              style={{ 
                background: 'linear-gradient(135deg, #f5576c 0%, #f093fb 100%)',
                color: 'white',
                padding: '10px 20px',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer',
              }}
            >
              🗑️ Delete
            </button>
          </div>
        )}
      </div>
    </div>
  );
}