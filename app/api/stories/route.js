export async function GET(request) {
  try {
    // This endpoint can be used to fetch stories from database in the future
    // For now, stories are stored in localStorage on the client side
    return new Response(
      JSON.stringify({ message: 'Stories are stored in browser localStorage' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: 'Failed to fetch stories' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
