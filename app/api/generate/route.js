export async function POST(request) {
  try {
    const { characterName, setting, theme } = await request.json();

    // Validate input
    if (!characterName || characterName.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: 'Character name is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get Hugging Face API token from environment
    const hfToken = process.env.HF_API_TOKEN;
    if (!hfToken) {
      console.error('HF_API_TOKEN not configured');
      return new Response(
        JSON.stringify({ 
          story: generatePlaceholderStory(characterName, setting, theme)
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Craft the prompt
    const prompt = `Write a short, magical story (200-300 words) for a 6-year-old child about a character named ${characterName}. 
    ${setting ? `The story takes place in ${setting}.` : ''}
    The theme should be ${theme}. 
    Make it fun, engaging, and appropriate for young children. Include a positive message.`;

    // Call Hugging Face API
    const response = await fetch(
      'https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.2',
      {
        headers: { Authorization: `Bearer ${hfToken}` },
        method: 'POST',
        body: JSON.stringify({
          inputs: prompt,
          parameters: {
            max_length: 500,
            temperature: 0.7,
          },
        }),
      }
    );

    if (!response.ok) {
      console.error('HF API error:', response.status, response.statusText);
      // Return placeholder story if API fails
      return new Response(
        JSON.stringify({
          story: generatePlaceholderStory(characterName, setting, theme),
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const result = await response.json();
    let story;
    
    if (Array.isArray(result)) {
      story = result[0]?.generated_text || generatePlaceholderStory(characterName, setting, theme);
    } else if (result?.generated_text) {
      story = result.generated_text;
    } else {
      story = generatePlaceholderStory(characterName, setting, theme);
    }

    // Clean up the story (remove the prompt from the output)
    if (story.includes(prompt)) {
      story = story.replace(prompt, '').trim();
    }

    return new Response(
      JSON.stringify({ story }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ 
        story: 'Once upon a time, there was an adventure waiting to happen...'
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

function generatePlaceholderStory(characterName, setting, theme) {
  const stories = {
    'adventure': `${characterName} woke up one morning and decided to explore a mysterious forest. With a brave heart and a curious mind, ${characterName} ventured deeper into the woods. Soon, ${characterName} discovered a hidden path leading to an enchanted valley. There, ${characterName} met friendly creatures and learned that helping others was the greatest adventure of all. From that day on, ${characterName} became known as the bravest explorer in all the land.`,
    'fantasy': `In a magical land far away, ${characterName} discovered they had special powers! ${characterName} could make flowers bloom with a touch and bring joy wherever they went. ${characterName} used these powers to help friends and spread happiness throughout the kingdom. Everyone loved ${characterName} and thanked them for all the magic they brought into their lives.`,
    'mystery': `${characterName} found a mysterious box in the attic. Inside was a map to a secret garden! Following the clues, ${characterName} solved puzzles and riddles, finally discovering that the greatest treasure was the friendship made along the way. The secret garden became a special place where ${characterName} and friends would gather.`,
    'friendship': `${characterName} was feeling lonely until they met a new friend who loved the same things. Together, they had wonderful adventures and realized that true friendship makes every day special. They promised to be best friends forever and have fun together every single day.`,
    'magic': `${characterName} found a magical wand that could grant one wish. After thinking carefully, ${characterName} wished for the ability to make other people smile. Soon, ${characterName}'s kindness spread magic throughout the whole world, and everyone around them became happier!`,
  };

  return stories[theme] || stories['adventure'];
}
