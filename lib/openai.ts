import OpenAI from 'openai';

export const TRANSCRIBE_MODEL = process.env.OPENAI_TRANSCRIBE_MODEL || 'whisper-1';
export const COACH_MODEL = process.env.OPENAI_COACH_MODEL || 'gpt-4o-mini';

let client: OpenAI | null = null;

/**
 * Lazily construct the OpenAI client.
 *
 * The SDK throws if no API key is present, so we defer construction until an
 * AI route is actually called. This keeps the build green and the zero-backend
 * /train trainer fully usable without an OPENAI_API_KEY.
 */
export function getOpenAI(): OpenAI {
  if (!client) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is not configured');
    }
    client = new OpenAI({ apiKey });
  }
  return client;
}
