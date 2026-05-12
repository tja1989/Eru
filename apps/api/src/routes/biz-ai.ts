import type { FastifyInstance } from 'fastify';
import OpenAI from 'openai';
import type { BizAiCopyResponse } from '@eru/shared';
import { authMiddleware } from '../middleware/auth.js';
import { Errors } from '../utils/errors.js';
import { bizAiCopySchema } from '../utils/validators.js';

// OpenAI client lazily initialised so a missing key only fails the AI
// route, not the entire server boot. The key lives in apps/api/.env as
// OPENAI_API_KEY — see CLAUDE.md "External services" for where to put it.
let openai: OpenAI | null = null;
function getClient(): OpenAI {
  if (openai) return openai;
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    throw Errors.badRequest('OPENAI_API_KEY not configured on the server');
  }
  openai = new OpenAI({ apiKey: key });
  return openai;
}

const SYSTEM_PROMPT = `You are an expert ad copywriter for small businesses in Kerala, India.
Generate concise ad copy for the Eru consumer app, which shows sponsored content in a feed.

Rules:
- Title: 6 words max, attention-grabbing.
- Body: 2-3 sentences, 200 chars max, conversational, mobile-friendly.
- Use clear English. Avoid corporate jargon.
- Match the requested tone.
- If the campaign type is "poll" frame the body as a question.
- If "hiring" mention the role and a clear CTA to apply.
- Do NOT include hashtags, emoji, or quote marks.

Return strict JSON: { "title": "...", "body": "..." }`;

function buildUserPrompt(type: string, description: string, tone: string): string {
  return `Campaign type: ${type.replace('_', ' ')}
Tone: ${tone}
Owner's pitch (raw): ${description}

Generate the title and body now. Return JSON only.`;
}

export async function bizAiRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authMiddleware);

  // POST /biz/ai/copy — body { type, description, tone? }. Returns
  // { title, body } for the Create-Ad wizard. The server-side gate is
  // light: any authenticated user can call it (per-business quota gating
  // is a follow-up if abuse becomes a concern).
  app.post('/biz/ai/copy', async (request): Promise<BizAiCopyResponse> => {
    if (!request.userId) throw Errors.unauthorized('Authentication required');
    const parsed = bizAiCopySchema.safeParse(request.body);
    if (!parsed.success) throw Errors.badRequest(parsed.error.issues[0].message);
    const { type, description, tone } = parsed.data;

    const client = getClient();
    const completion = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      response_format: { type: 'json_object' },
      max_tokens: 250,
      temperature: 0.8,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: buildUserPrompt(type, description, tone ?? 'friendly') },
      ],
    });

    const raw = completion.choices[0]?.message?.content ?? '{}';
    let parsedJson: { title?: unknown; body?: unknown };
    try {
      parsedJson = JSON.parse(raw);
    } catch {
      throw Errors.badRequest('AI returned malformed JSON; retry');
    }

    const title = typeof parsedJson.title === 'string' ? parsedJson.title.trim() : '';
    const body = typeof parsedJson.body === 'string' ? parsedJson.body.trim() : '';
    if (!title || !body) {
      throw Errors.badRequest('AI returned empty title or body; retry');
    }
    return { title, body };
  });
}
