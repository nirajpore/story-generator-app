'use client';

import { useState, useRef, useEffect } from 'react';

export default function StoryDisplay({ story, onBack, onDelete }) {
  const [copied, setCopied] = useState(false);
  const [isReading, setIsReading] = useState(false);
  const [readingTime, setReadingTime] = useState(0);
  const [evaluation, setEvaluation] = useState(null);
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [hint, setHint] = useState(null);
  const [lastSpokeTime, setLastSpokeTime] = useState(Date.now());
  const [allTranscriptWords, setAllTranscriptWords] = useState([]);
  
  const timerRef = useRef(null);
  const recognitionRef = useRef(null);
  const pauseTimerRef = useRef(null);
  const storyWordsRef = useRef([]);
  const allTranscriptWordsRef = useRef([]);
  const readingTimeRef = useRef(0);
  const isReadingRef = useRef(false);
  const pendingEvaluationRef = useRef(false);

  const normalizeWords = (text) =>
    text
      .toLowerCase()
      .replace(/[\u2018\u2019']/g, '')
      .replace(/[.!?,;:\-—–"()[\]{}]/g, ' ')
      .split(/\s+/)
      .filter((word) => word.length > 0);

  const calculateSimilarity = (str1, str2) => {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    if (longer.length === 0) return 1.0;

    const editDistance = getEditDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  };

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

  const getCurrentWordProgress = (spokenWords, storyWords) => {
    if (spokenWords.length === 0 || storyWords.length === 0) return 0;

    let storyIndex = 0;

    for (const spokenWord of spokenWords) {
      let matchedIndex = -1;

      for (let i = storyIndex; i < Math.min(storyIndex + 3, storyWords.length); i++) {
        if (calculateSimilarity(spokenWord, storyWords[i]) >= 0.7) {
          matchedIndex = i;
          break;
        }
      }

      if (matchedIndex !== -1) {
        storyIndex = matchedIndex + 1;
      }
    }

    return storyIndex;
  };

  const getStoryParagraphs = (text) => {
    const normalizedText = text.replace(/\r\n/g, '\n').trim();

    if (!normalizedText) return [];

    if (normalizedText.includes('\n')) {
      return normalizedText
        .split(/\n\s*\n/)
        .map((paragraph) => paragraph.trim())
        .filter(Boolean);
    }

    const sentences = normalizedText.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [normalizedText];
    const paragraphs = [];

    for (let i = 0; i < sentences.length; i += 2) {
      paragraphs.push(sentences.slice(i, i + 2).join(' ').trim());
    }

    return paragraphs.filter(Boolean);
  };

  const finalizeReadingSession = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (pauseTimerRef.current) clearTimeout(pauseTimerRef.current);

    isReadingRef.current = false;
    pendingEvaluationRef.current = false;
    setIsReading(false);
    setHint(null);

    const evaluationResult = evaluateReading(
      allTranscriptWordsRef.current,
      story.content,
      readingTimeRef.current
    );
    setEvaluation(evaluationResult);
  };

  useEffect(() => {
    // Initialize Web Speech API
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      
      recognitionRef.current.onresult = (event) => {
        setLastSpokeTime(Date.now());
        setHint(null);
        
        let finalTranscript = '';
        let interimTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcriptChunk = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcriptChunk + ' ';
          } else {
            interimTranscript += transcriptChunk + ' ';
          }
        }

        let nextFinalWords = allTranscriptWordsRef.current;

        if (finalTranscript) {
          nextFinalWords = [...allTranscriptWordsRef.current, ...normalizeWords(finalTranscript)];
          allTranscriptWordsRef.current = nextFinalWords;
          setAllTranscriptWords(nextFinalWords);
        }

        const liveTranscriptWords = [...nextFinalWords, ...normalizeWords(interimTranscript)];
        setCurrentWordIndex(getCurrentWordProgress(liveTranscriptWords, storyWordsRef.current));
      };

      recognitionRef.current.onend = () => {
        if (pendingEvaluationRef.current) {
          finalizeReadingSession();
        }
      };

      recognitionRef.current.onerror = () => {
        if (pendingEvaluationRef.current) {
          finalizeReadingSession();
        }
      };
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (pauseTimerRef.current) clearTimeout(pauseTimerRef.current);
      if (recognitionRef.current) recognitionRef.current.abort();
    };
  }, []);

  // Monitor for pauses and show hints
  useEffect(() => {
    if (!isReading) return;

    if (pauseTimerRef.current) clearTimeout(pauseTimerRef.current);

    pauseTimerRef.current = setTimeout(() => {
      const timeSinceLast = Date.now() - lastSpokeTime;
      
      if (timeSinceLast >= 2000 && !hint && currentWordIndex < storyWordsRef.current.length) {
        const currentWord = storyWordsRef.current[currentWordIndex];
        if (currentWord) {
          const phonetic = getPhoneticBreakdown(currentWord);
          setHint({ type: 'phonetic', word: currentWord, phonetic });
        }
      }
    }, 2000);

    return () => {
      if (pauseTimerRef.current) clearTimeout(pauseTimerRef.current);
    };
  }, [isReading, lastSpokeTime, currentWordIndex, hint]);

  const getPhoneticBreakdown = (word) => {
    const phonemes = [];
    let i = 0;
    const consonantBlends = ['ch', 'sh', 'th', 'ph', 'qu', 'wh', 'st', 'sp', 'sk', 'sw', 'tr', 'dr', 'br', 'fr', 'gr', 'pr', 'bl', 'cl', 'fl', 'gl', 'pl', 'sl'];
    const endBlends = ['ng', 'nk', 'nd', 'nt', 'st', 'sp', 'sk', 'ck', 'th', 'ch', 'sh', 'tch', 'dge'];

    while (i < word.length) {
      if (i === 0 && i + 1 < word.length) {
        const twoLetter = word.substring(i, i + 2).toLowerCase();
        if (consonantBlends.includes(twoLetter)) {
          phonemes.push(twoLetter);
          i += 2;
          continue;
        }
      }

      if (i === word.length - 2) {
        const twoLetter = word.substring(i).toLowerCase();
        if (endBlends.includes(twoLetter)) {
          phonemes.push(twoLetter);
          i += 2;
          continue;
        }
      }

      phonemes.push(word[i]);
      i++;
    }

    return phonemes.join('-');
  };

  const speakWord = (word) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(word);
      utterance.rate = 0.8;
      utterance.pitch = 1.0;
      speechSynthesis.cancel();
      speechSynthesis.speak(utterance);
    }
  };

  const handleStartReading = () => {
    if (!recognitionRef.current) {
      alert('Speech recognition is not supported in this browser.');
      return;
    }

    setIsReading(true);
    setReadingTime(0);
    setAllTranscriptWords([]);
    setEvaluation(null);
    setCurrentWordIndex(0);
    setHint(null);
    setLastSpokeTime(Date.now());

    isReadingRef.current = true;
    pendingEvaluationRef.current = false;
    readingTimeRef.current = 0;
    allTranscriptWordsRef.current = [];
    storyWordsRef.current = normalizeWords(story.content);
    
    timerRef.current = setInterval(() => {
      setReadingTime((prev) => {
        const nextTime = prev + 1;
        readingTimeRef.current = nextTime;
        return nextTime;
      });
    }, 1000);

    recognitionRef.current.start();
  };

  const handleFinishReading = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (pauseTimerRef.current) clearTimeout(pauseTimerRef.current);

    if (!recognitionRef.current) {
      finalizeReadingSession();
      return;
    }

    pendingEvaluationRef.current = true;
    recognitionRef.current.stop();
  };

  const matchWords = (readWords, storyWords) => {
    let matchedCount = 0;
    const matchedIndices = new Set();

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
    }

    return { matchedCount, totalStoryWords: storyWords.length };
  };

  const evaluateReading = (readWordsArray, storyContent, timeTaken) => {
    let stars = 0;

    const storyWords = normalizeWords(storyContent);
    const { matchedCount, totalStoryWords } = matchWords(readWordsArray, storyWords);
    const accuracy = (matchedCount / totalStoryWords) * 100;
    
    if (accuracy >= 85) stars += 3;
    else if (accuracy >= 70) stars += 2.5;
    else if (accuracy >= 55) stars += 2;
    else if (accuracy >= 40) stars += 1.5;
    else stars += 1;

    const expectedReadingTime = totalStoryWords * 0.6;
    const readingSpeedRatio = timeTaken / expectedReadingTime;
    
    if (readingSpeedRatio >= 0.8 && readingSpeedRatio <= 1.2) stars += 3;
    else if (readingSpeedRatio >= 0.7 && readingSpeedRatio <= 1.4) stars += 2.5;
    else if (readingSpeedRatio >= 0.6 && readingSpeedRatio <= 1.6) stars += 2;
    else stars += 1.5;

    const confidenceRatio = (matchedCount / totalStoryWords);
    if (confidenceRatio >= 0.85) stars += 2;
    else if (confidenceRatio >= 0.70) stars += 1.5;
    else if (confidenceRatio >= 0.50) stars += 1;
    else stars += 0.5;

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

  // Render story with highlighted current word
  const renderStoryWithHighlight = () => {
    let wordCounter = 0;

    return getStoryParagraphs(story.content).map((paragraph, paragraphIndex) => {
      const tokens = paragraph.match(/\S+|\s+/g) || [];

      return (
        <p key={`para-${paragraphIndex}`} style={{ marginBottom: '15px', lineHeight: '1.8' }}>
          {tokens.map((token, tokenIndex) => {
            if (/^\s+$/.test(token)) {
              return <span key={`space-${paragraphIndex}-${tokenIndex}`}>{token}</span>;
            }

            const normalizedToken = normalizeWords(token);

            if (normalizedToken.length === 0) {
              return <span key={`token-${paragraphIndex}-${tokenIndex}`}>{token}</span>;
            }

            const isCurrentWord = wordCounter === currentWordIndex;
            const isRead = wordCounter < currentWordIndex;
            const renderedWord = (
              <span
                key={`word-${wordCounter}`}
                style={{
                  backgroundColor: isCurrentWord ? '#ffd700' : isRead ? '#90EE90' : 'transparent',
                  padding: '2px 4px',
                  borderRadius: '3px',
                  fontWeight: isCurrentWord ? 'bold' : 'normal',
                  transition: 'background-color 0.3s',
                }}
              >
                {token}
              </span>
            );

            wordCounter++;
            return renderedWord;
          })}
        </p>
      );
    });
  };

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
          {isReading ? (
            renderStoryWithHighlight()
          ) : (
            getStoryParagraphs(story.content).map((paragraph, index) => (
              <p key={`story-paragraph-${index}`} style={{ marginBottom: '15px', whiteSpace: 'pre-wrap' }}>
                {paragraph}
              </p>
            ))
          )}
        </div>

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
        )}

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
        )}

        {isReading && (
          <div style={{ background: '#f0f4ff', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#667eea', marginBottom: '10px' }}>
              ⏱️ {formatTime(readingTime)}
            </div>
            <div style={{ fontSize: '14px', color: '#666', marginBottom: '15px' }}>
              <strong>Words heard:</strong> {allTranscriptWords.length} | <strong>Current word:</strong> #{currentWordIndex}
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
                setAllTranscriptWords([]);
                setReadingTime(0);
                setCurrentWordIndex(0);
                setHint(null);
                allTranscriptWordsRef.current = [];
                readingTimeRef.current = 0;
                pendingEvaluationRef.current = false;
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
        )}

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