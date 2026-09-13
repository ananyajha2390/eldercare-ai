import { GoogleGenAI } from '@google/genai';

function getGeminiApiKey(): string | undefined {
  return (
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_GENAI_API_KEY ||
    process.env.GOOGLE_API_KEY
  );
}

// Helpers for respectful Indian name formatting
function extractFirstName(fullName?: string | null): string {
  if (!fullName || typeof fullName !== 'string') return '';
  const trimmed = fullName.trim();
  if (!trimmed) return '';
  const firstWord = trimmed.split(/\s+/)[0];
  return firstWord.replace(/[,.!?]/g, '');
}

function getHonorificName(fullName?: string | null): string {
  const firstName = extractFirstName(fullName);
  if (!firstName) return 'ji';
  if (firstName.toLowerCase().endsWith('ji')) return firstName;
  return `${firstName} ji`;
}

const ELDERCARE_BASE_SYSTEM_INSTRUCTION = `You are ElderCare AI, a warm, patient, and respectful voice companion for elderly users.

ELDERLY CONVERSATION RULES:
- Speak naturally in warm Hindi/Hinglish.
- Keep sentences short, polite, and respectful (1-2 sentences maximum).
- Ask only ONE question at a time so the elderly user is never overwhelmed.
- Avoid difficult technical words or clinical jargon.
- Listen carefully to the user's actual response and continue the conversation contextually.
- Always respond specifically to what the user actually said. Never repeat the exact same question already asked in previous turns.
- Never invent the user's response.
- Never diagnose medical conditions or give dangerous medical instructions.
- For medication concerns, encourage following the prescribed schedule or contacting a healthcare professional.
- If the user sounds distressed or reports an emergency, encourage contacting a trusted family member, caregiver, or healthcare professional.

HEALTH CHECK PROGRESSION:
1. General Wellness: When user says they are doing fine (e.g. 'मैं अच्छा हूँ', 'I am fine'), warmly acknowledge and naturally check on medication adherence ('बहुत अच्छा! क्या आपने आज अपनी दवाई समय पर ले ली?').
2. Medication Check: When user confirms they took medicine (e.g. 'हाँ', 'हाँ, मैंने दवाई ले ली'), warmly praise them ('बहुत बढ़िया। क्या आज आपको कोई कमजोरी या परेशानी महसूस हो रही है?').
3. Discomfort/Weakness: If the user mentions weakness (e.g. 'थोड़ी कमजोरी है'), dizziness, or pain, acknowledge with gentle care, note it down, and ask: ('समझ गया। मैं इसे आपके health check में नोट कर रहा हूँ। क्या आपने आज पर्याप्त पानी पिया है?').
4. Follow-up: When user responds about water or rest, advise them with care, praise hydration or rest, and ask if they'd like their family member notified or if they should check their BP.
5. Vitals & BP: When the user reports BP numbers (e.g. '120/80'), acknowledge the numbers clearly and advise rest.`;

function getEldercareSystemInstruction(userName?: string | null): string {
  const trimmed = (userName || '').trim();
  let userContext = '';
  if (trimmed) {
    const honorific = getHonorificName(trimmed);
    userContext = `\nUSER IDENTITY CONTEXT:\nThe user's name is ${trimmed}. Address the user naturally and respectfully as ${honorific} (e.g. 'Namaste ${honorific}').\nIMPORTANT: Do NOT refer to the user as Sharma ji unless their actual surname is Sharma.`;
  } else {
    userContext = `\nUSER IDENTITY CONTEXT:\nAddress the user respectfully using 'ji' (e.g. 'Namaste ji').\nIMPORTANT: Do NOT invent a name. Do NOT refer to the user as Sharma ji unless their actual surname is Sharma.`;
  }
  return `${ELDERCARE_BASE_SYSTEM_INSTRUCTION}\n${userContext}`;
}

export default async function handler(req: any, res: any) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed. Use POST.' });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      return res.status(400).json({ error: 'Invalid JSON body' });
    }
  }
  body = body || {};

  const { message, history, userName } = body;

  if (!message || typeof message !== 'string' || !message.trim()) {
    return res.status(400).json({ error: 'Missing required field: message' });
  }

  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    console.error('[API /api/chat] Error: Gemini API key is missing from environment variables');
    return res.status(500).json({
      error: 'Gemini API key is not configured in Vercel environment variables. Please set GEMINI_API_KEY in your Vercel Project Settings.',
    });
  }

  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
  });

  const activeName = (userName || '').trim();
  const honorific = getHonorificName(activeName);

  const formattedHistory = Array.isArray(history) && history.length > 0
    ? history.map((h: any) => `${h.role === 'user' ? 'User' : 'ElderCare'}: ${h.text}`).join('\n')
    : '(No previous turns in this conversation)';

  const prompt = `${getEldercareSystemInstruction(activeName)}

CONVERSATION CONTEXT & INSTRUCTIONS:
- You are speaking directly to the elderly user in a continuous voice call.
- Always respond dynamically based on what the user actually said in the current turn and previous turns.
- Keep the response concise, caring, and conversational (1-2 sentences max).
- Ask only one question at a time.
- Speak naturally in warm Hindi/Hinglish.
- NEVER invent user words or pretend they said something they did not.

Recent conversation history:
${formattedHistory}

User says: "${message}"

Return your response strictly in JSON format with fields:
{
  "reply": "Warm Hinglish/Hindi text response to the user",
  "speechText": "Spoken text in natural phonetic Devanagari or Hinglish for voice synthesis",
  "extracted": {
    "bloodPressure": string or null,
    "bloodSugar": string or null,
    "medicationStatus": "taken" | "missed" | null,
    "mood": string or null,
    "symptoms": string[],
    "isUnusual": boolean,
    "alertSeverity": "normal" | "attention" | "urgent",
    "safeNote": string
  }
}`;

  const candidateModels = [
    'gemini-3.1-flash-lite',
    'gemini-3.6-flash',
    'gemini-3.5-flash',
    'gemini-3.8-flash',
    'gemini-3.5-flash-lite',
    'gemini-flash-latest',
  ];

  let lastError: any = null;
  let rawText = '';
  const startTime = Date.now();

  for (const modelName of candidateModels) {
    try {
      console.log(`[API /api/chat] Attempting model: ${modelName}`);
      const response = await ai.models.generateContent({
        model: modelName,
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
        },
      });
      if (response && response.text) {
        rawText = response.text;
        console.log(`[API /api/chat] Model ${modelName} completed in ${Date.now() - startTime}ms`);
        break;
      }
    } catch (e: any) {
      lastError = e;
      console.warn(`[API /api/chat] Model ${modelName} warning:`, e?.message || e);
    }
  }

  if (!rawText) {
    for (const fallbackModel of ['gemini-3.1-flash-lite', 'gemini-3.6-flash', 'gemini-3.5-flash']) {
      try {
        console.log(`[API /api/chat] Attempting text fallback with ${fallbackModel}...`);
        const response = await ai.models.generateContent({
          model: fallbackModel,
          contents: prompt,
        });
        if (response && response.text) {
          rawText = response.text;
          break;
        }
      } catch (e: any) {
        lastError = e;
      }
    }
  }

  if (!rawText) {
    console.error('[API /api/chat] All candidate models failed:', lastError);
    return res.status(500).json({
      error: `Gemini API error: ${lastError?.message || 'No response from Gemini API'}`,
      details: String(lastError),
    });
  }

  let parsed: any = {};
  try {
    const cleaned = rawText.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
    parsed = JSON.parse(cleaned);
  } catch {
    const replyMatch = rawText.match(/"reply"\s*:\s*"((?:[^"\\]|\\.)*)"/);
    if (replyMatch) {
      parsed = { reply: replyMatch[1].replace(/\\"/g, '"'), speechText: replyMatch[1].replace(/\\"/g, '"') };
    } else {
      parsed = { reply: rawText, speechText: rawText };
    }
  }

  let reply = (parsed.reply || rawText || '').trim();
  if (reply.startsWith('{') && reply.endsWith('}')) {
    try {
      const inner = JSON.parse(reply);
      if (inner.reply) reply = inner.reply;
    } catch {}
  }
  if (!reply) {
    reply = `Namaste ${honorific}, main aapki baat samajh raha hoon. Kripya batayein, aap kaisa mehsoos kar rahe hain?`;
  }
  const speechText = (parsed.speechText || reply).trim();

  return res.status(200).json({
    reply,
    speechText,
    extracted: parsed.extracted || {},
    source: 'gemini',
  });
}
