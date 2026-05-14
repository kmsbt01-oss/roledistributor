import type { VercelRequest, VercelResponse } from '@vercel/node';
import OpenAI from 'openai';

// This is required to let Vercel know that this function can run on the Edge/Serverless platform
// We are using the standard Node.js runtime for simplicity and compatibility with standard libraries.
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Handle CORS for local dev if necessary
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { messages } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Invalid messages format' });
    }

    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ error: 'Missing OpenAI API Key in environment variables' });
    }

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: messages,
      temperature: 0.7,
      max_tokens: 1000,
    });

    const responseMessage = completion.choices[0]?.message;
    if (!responseMessage) {
      throw new Error('No response from OpenAI');
    }

    return res.status(200).json({ message: responseMessage });
  } catch (error: any) {
    console.error('Error in /api/chat:', error);
    return res.status(500).json({
      error: 'An error occurred while processing your request.',
      details: error.message,
    });
  }
}
