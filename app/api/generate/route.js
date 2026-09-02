export async function POST(request) {
  try {
    const { characterName, setting, rwLevel } = await request.json();

    // Validate input
    if (!characterName || characterName.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: 'Character name is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get Gemini API key from environment
    const geminiToken = process.env.GEMINI_API_KEY;
    
    if (!geminiToken) {
      console.warn('GEMINI_API_KEY not configured, using placeholder story');
      return new Response(
        JSON.stringify({ 
          story: generatePlaceholderStory(characterName, setting, rwLevel),
          rwLevel: rwLevel
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Create RWI level-appropriate prompt
    const prompt = createRWIPrompt(characterName, setting, rwLevel);

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000);

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${geminiToken}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                parts: [{ text: prompt }],
              },
            ],
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 300,
            },
          }),
          signal: controller.signal,
        }
      );

      clearTimeout(timeout);

      if (!response.ok) {
        console.error('Gemini API error:', response.status, response.statusText);
        return new Response(
          JSON.stringify({
            story: generatePlaceholderStory(characterName, setting, rwLevel),
            rwLevel: rwLevel,
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }

      const result = await response.json();
      let story = result?.candidates?.[0]?.content?.parts?.[0]?.text || 
                  generatePlaceholderStory(characterName, setting, rwLevel);

      return new Response(
        JSON.stringify({ story, rwLevel }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    } catch (fetchError) {
      console.error('Fetch error:', fetchError.message);
      return new Response(
        JSON.stringify({
          story: generatePlaceholderStory(characterName, setting, rwLevel),
          rwLevel: rwLevel,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ 
        story: 'Once upon a time, there was an adventure waiting to happen...'
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

function createRWIPrompt(characterName, setting, rwLevel) {
  const levelGuides = {
    'purple': 'Use ONLY simple CVC words (cat, dog, sit, run). Very short sentences. No complex phonemes.',
    'pink': 'Use simple CVC words and basic high-frequency words. Short, simple sentences.',
    'orange': 'Include some digraphs (sh, ch, th). Slightly longer sentences.',
    'yellow': 'Consolidate phase 3-4 phonemes. Mix of simple and slightly more complex words.',
    'blue': 'Include phase 4-5 phonemes. Longer sentences with more variety. Good for year 1 readers.',
    'grey': 'Use phase 5 phonemes. More complex sentences and varied vocabulary.',
  };

  return `Write a short story (150-250 words) for a 5-6 year old child learning to read.

Main character: ${characterName}
${setting ? `Setting: ${setting}` : 'Setting: A happy, safe place'}
Reading level: RWI ${rwLevel.charAt(0).toUpperCase() + rwLevel.slice(1)}

Instructions:
${levelGuides[rwLevel]}
- Make it fun, engaging, and appropriate for young children
- Include a positive, simple message
- Use clear, easy-to-read language
- Short paragraphs
- Include simple actions and emotions the child can understand

Write the story now:`;
}

function generatePlaceholderStory(characterName, setting, rwLevel) {
  const stories = {
    'purple': `${characterName} sat. A cat sat. The cat ran. ${characterName} ran. The cat sat in a box. ${characterName} sat with the cat. They sat. The end.`,
    'pink': `${characterName} was happy. A cat sat on a mat. The cat was red. ${characterName} sat by the cat. The cat and ${characterName} sat on the mat. They were very happy. The end.`,
    'orange': `${characterName} was playing with a big red ball. The ball went into the bush. A shy cat came out. The cat wanted to play too. ${characterName} and the cat played with the ball. They had fun together. The end.`,
    'yellow': `${characterName} found a small box under the tree. Inside was something shiny and gold. It was a magic coin! ${characterName} made a wish. Soon, a beautiful garden grew where the tree stood. ${characterName} and all the friends came to see the amazing garden. Everyone was so happy and smiling. The end.`,
    'blue': `${characterName} woke up early in the morning and decided to explore the woods behind the house. Walking along the winding path, ${characterName} found a sparkling stream and discovered colorful fish swimming in the water. Following the stream deeper into the forest, ${characterName} discovered a hidden clearing filled with wildflowers. A wise old owl sat in the tallest tree, watching over the magical place. ${characterName} realized that the greatest treasures aren't found in gold or jewels, but in the beauty of nature and adventures with good friends. From that day on, ${characterName} visited the magical clearing every week and became its protector. The end.`,
    'grey': `${characterName} stumbled upon an ancient lighthouse standing alone on the rocky cliff. The weathered stone structure seemed to tell stories of countless adventures and mysterious journeys through its walls. Inside, ${characterName} discovered a magnificent spiral staircase leading upward into darkness. Climbing carefully, ${characterName} reached the lamp room at the top and was astonished by the breathtaking panoramic view of the endless ocean, distant mountains, and sailing ships below. An old journal resting on a dusty shelf revealed incredible tales of shipwrecked sailors rescued by the lighthouse beam. ${characterName} understood the importance of this beacon and resolved to maintain its light, becoming the guardian of hope for lost travelers. The end.`,
  };

  return stories[rwLevel] || stories['blue'];
}