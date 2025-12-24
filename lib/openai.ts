import OpenAI from 'openai';

export const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const TRANSCRIBE_MODEL = process.env.OPENAI_TRANSCRIBE_MODEL || 'whisper-1';
export const COACH_MODEL = process.env.OPENAI_COACH_MODEL || 'gpt-4o-mini';
