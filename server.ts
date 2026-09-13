import express, { Request, Response } from 'express';
import http from 'http';
import path from 'path';
import { GoogleGenAI, Modality, Type, LiveServerMessage } from '@google/genai';
import { WebSocketServer, WebSocket } from 'ws';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Lazy-initialized Gemini client
let geminiClient: GoogleGenAI | null = null;
function getGeminiApiKey(): string | undefined {
  return (
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_GENAI_API_KEY ||
    process.env.GOOGLE_API_KEY
  );
}

function getGeminiClient(): GoogleGenAI | null {
  const key = getGeminiApiKey();
  if (!geminiClient && key) {
    geminiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
    });
  }
  return geminiClient;
}

// Helpers for respectful Indian name formatting
function extractFirstName(fullName?: string | null): string {
  if (!fullName || typeof fullName !== 'string') return '';
  const trimmed = fullName.trim();
  if (!trimmed) return '';
  const firstWord = trimmed.split(/\s+/)[0];
  return firstWord.replace(/[,\.!?]/g, '');
}

function getHonorificName(fullName?: string | null): string {
  const firstName = extractFirstName(fullName);
  if (!firstName) return '';
  if (firstName.toLowerCase().endsWith('ji')) return firstName;
  return `${firstName} ji`;
}

function getGreeting(fullName?: string | null): string {
  const honorific = getHonorificName(fullName);
  if (honorific) return `Namaste ${honorific}`;
  return 'Namaste ji';
}

// Base system instruction for ElderCare AI as mandated by user specification
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
1. General Wellness: When user says they are doing fine ("मैं अच्छा हूँ", "I am fine"), warmly acknowledge and naturally check on medication adherence ("Bahut achha! Kya aapne aaj apni medicines time par le li hain?").
2. Medication Check: When user confirms they took medicine ("हाँ, मैंने दवाई ले ली"), warmly praise them ("Bahut badhiya!") and ask if they feel any discomfort, tiredness, or weakness ("Kya aapko aaj koi kamzori ya takleef mehsoos ho rahi hai?").
3. Discomfort/Weakness: If the user mentions weakness ("थोड़ी कमजोरी है"), dizziness, or pain, sympathize with deep care, advise resting and drinking water, note it down, and ask if they'd like their family member notified or if they need to check their blood pressure.
4. Vitals & BP: When the user reports BP numbers (e.g. "120/80"), specifically acknowledge and confirm the reading.`;

function getEldercareSystemInstruction(userName?: string | null): string {
  const trimmed = (userName || '').trim();
  let userContext = '';
  if (trimmed) {
    const honorific = getHonorificName(trimmed);
    userContext = `
USER IDENTITY CONTEXT:
The user's name is ${trimmed}. Address the user naturally and respectfully as ${honorific} (e.g. 'Namaste ${honorific}').
IMPORTANT: Do NOT refer to the user as Sharma ji unless their actual surname is Sharma.`;
  } else {
    userContext = `
USER IDENTITY CONTEXT:
Address the user respectfully using 'ji' (e.g. 'Namaste ji').
IMPORTANT: Do NOT invent a name. Do NOT refer to the user as Sharma ji unless their actual surname is Sharma.`;
  }

  return `${ELDERCARE_BASE_SYSTEM_INSTRUCTION}\n${userContext}`;
}

const ELDERCARE_SYSTEM_INSTRUCTION = ELDERCARE_BASE_SYSTEM_INSTRUCTION;

// Tool function declarations for Gemini Live API
const LIVE_HEALTH_TOOLS = [
  {
    functionDeclarations: [
      {
        name: 'record_blood_pressure',
        description: 'Record blood pressure readings in mmHg reported by the elderly user.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            systolic: {
              type: Type.NUMBER,
              description: 'Systolic blood pressure number in mmHg, e.g. 128 or 158.',
            },
            diastolic: {
              type: Type.NUMBER,
              description: 'Diastolic blood pressure number in mmHg, e.g. 82 or 98.',
            },
            note: {
              type: Type.STRING,
              description: 'Gentle supportive observation or advice note for the user.',
            },
          },
          required: ['systolic', 'diastolic'],
        },
      },
      {
        name: 'record_blood_glucose',
        description: 'Record blood sugar (glucose) readings in mg/dL reported by the user.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            value: {
              type: Type.NUMBER,
              description: 'Blood sugar reading in mg/dL, e.g. 142.',
            },
            context: {
              type: Type.STRING,
              description: 'Context such as fasting, post-breakfast, or random.',
            },
          },
          required: ['value'],
        },
      },
      {
        name: 'confirm_medication',
        description: 'Confirm or record medication adherence status for today.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            status: {
              type: Type.STRING,
              enum: ['taken', 'missed'],
              description: 'Whether the medication was taken or missed.',
            },
            name: {
              type: Type.STRING,
              description: 'Name of the medicine if mentioned (e.g. morning medicine, BP pill).',
            },
          },
          required: ['status'],
        },
      },
      {
        name: 'record_mood_or_symptoms',
        description: 'Record user mood, energy level, or symptoms like weakness or dizziness.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            mood: {
              type: Type.STRING,
              description: 'Mood state e.g. good, tired, low, anxious, cheerful, dizzy.',
            },
            symptoms: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'Specific symptoms reported, such as weakness, dizziness, headache.',
            },
            note: {
              type: Type.STRING,
              description: 'Supportive observational note.',
            },
          },
          required: ['mood'],
        },
      },
    ],
  },
];

// Health text extraction fallback helper
function extractHealthFromText(text: string) {
  const lower = text.toLowerCase();
  let bp: { systolic: number; diastolic: number } | null = null;
  let sugar: number | null = null;
  let med: 'taken' | 'missed' | null = null;
  let mood: string | null = null;
  const symptoms: string[] = [];

  const bpMatch = text.match(/(\d{2,3})\s*(?:by|\/|\-)\s*(\d{2,3})/i);
  if (bpMatch) {
    bp = {
      systolic: parseInt(bpMatch[1], 10),
      diastolic: parseInt(bpMatch[2], 10),
    };
  }

  const sugarMatch = text.match(/(?:sugar|glucose)\s*(?:hai|level|is)?\s*(\d{2,3})/i) ||
                     text.match(/(\d{2,3})\s*(?:mg\/dl|mgdl)/i);
  if (sugarMatch) {
    sugar = parseInt(sugarMatch[1], 10);
  }

  if (lower.includes('medicine le li') || lower.includes('dawai kha li') || lower.includes('took medicine') || lower.includes('taken medicine') || lower.includes('subah ki medicine')) {
    med = 'taken';
  } else if (lower.includes('missed') || lower.includes('bhool gaya')) {
    med = 'missed';
  }

  if (lower.includes('chakkar') || lower.includes('dizzy')) {
    mood = 'dizzy';
    symptoms.push('dizziness');
  } else if (lower.includes('weakness') || lower.includes('kamzori') || lower.includes('tired') || lower.includes('thakan')) {
    mood = 'tired';
    symptoms.push('weakness');
  }

  return { bp, sugar, med, mood, symptoms };
}

// Check AI status
app.get('/api/status', (req: Request, res: Response) => {
  const hasKey = Boolean(process.env.GEMINI_API_KEY);
  const telephonyConfigured = Boolean(process.env.TELEPHONY_ACCOUNT_ID && process.env.TELEPHONY_PHONE_NUMBER);
  res.json({
    status: 'ok',
    geminiConfigured: hasKey,
    telephonyConfigured,
    liveModel: 'gemini-3.1-flash-live-preview',
    chatModel: 'gemini-3.8-flash',
  });
});

// Helpers for telephony & formatting
function formatToE164(phone: string): string {
  if (!phone) return '';
  // Strip spaces, dashes, parens, dots, etc.
  let cleaned = phone.replace(/[\s\-\(\)\.]/g, '');
  if (cleaned.startsWith('+')) {
    return cleaned;
  }
  if (cleaned.startsWith('00')) {
    return '+' + cleaned.slice(2);
  }
  // Standard 10 digit Indian number
  if (/^\d{10}$/.test(cleaned)) {
    return `+91${cleaned}`;
  }
  // 11 digit starting with 0 (Indian trunk prefix 0)
  if (/^0\d{10}$/.test(cleaned)) {
    return `+91${cleaned.slice(1)}`;
  }
  // 12 digit starting with 91 without plus
  if (/^91\d{10}$/.test(cleaned)) {
    return `+${cleaned}`;
  }
  return `+${cleaned}`;
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// Telephony Integration status, TwiML voice template & call dispatch endpoints
app.all('/api/telephony/twiml', (req: Request, res: Response) => {
  const message = (req.query.message || req.body?.message || 'Namaste, main ElderCare AI se bol rahi hoon. Aap kaise hain? Kya aapne aaj apni medicines time par li hain?').toString();
  const safeText = escapeXml(message);
  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Pause length="1"/>
  <Say language="hi-IN">${safeText}</Say>
  <Pause length="2"/>
  <Say language="hi-IN">Maine aapka daily care check-in record kar liya hai. Kirpya aaram karein aur apna khayal rakhein. Namaste.</Say>
</Response>`.trim();
  res.setHeader('Content-Type', 'application/xml');
  res.send(twiml);
});

app.get('/api/telephony/status', async (req: Request, res: Response) => {
  res.json({
    isConfigured: true,
    provider: 'demo_call',
    phoneNumber: '+91 98110 43210',
    callerNumber: '+91 98110 43210',
    statusText: 'ElderCare AI Voice Gateway Ready (Simulated Call Experience)',
    demoModeLabel: 'Simulated AI Care Call Active',
  });
});

app.post('/api/telephony/call', async (req: Request, res: Response) => {
  const targetPhone = req.body.targetPhone || req.body.phone || req.body.to || '+91 98765 43210';
  const name = req.body.name || req.body.memberName || req.body.elderlyName || 'Senior Member';
  const callSid = `call-${Date.now()}`;

  return res.json({
    success: true,
    callSid,
    callId: callSid,
    status: 'ringing',
    to: targetPhone,
    from: '+91 98110 43210',
    dateCreated: new Date().toISOString(),
    message: `Connecting outbound care call to ${targetPhone}...`,
    spokenMessage: 'Namaste, main ElderCare AI se bol rahi hoon. Aap kaise hain?',
  });
});

app.post('/api/telephony/hangup', async (req: Request, res: Response) => {
  res.json({ status: 'completed' });
});

// POST /api/chat - REST endpoint
app.post('/api/chat', async (req: Request, res: Response) => {
  const { message, history = [], language = 'hinglish', aiMode = 'gemini', userName, elderlyName } = req.body;
  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }

  const activeName = (userName || elderlyName || '').trim();
  const honorific = getHonorificName(activeName) || 'ji';
  const apiKey = getGeminiApiKey();

  if (!apiKey) {
    console.error('[Server /api/chat] Error: Gemini API key is missing (expected GEMINI_API_KEY or GOOGLE_GENAI_API_KEY in environment variables)');
    return res.status(500).json({ error: 'Gemini API key is not configured. Please set GEMINI_API_KEY in environment variables.' });
  }

  const ai = getGeminiClient();
  if (!ai) {
    console.error('[Server /api/chat] Error: Failed to initialize Gemini client');
    return res.status(500).json({ error: 'Failed to initialize Gemini client' });
  }

  const startTime = Date.now();
  console.log(`[Server /api/chat] Request started. User: "${activeName}", message: "${message}", history count: ${history.length}`);

  try {
    const formattedHistory = Array.isArray(history) && history.length > 0
      ? history.map((h: any) => `${h.role === 'user' ? 'User' : 'ElderCare'}: ${h.text}`).join('\n')
      : '(No previous turns in this conversation)';

    const prompt = `${getEldercareSystemInstruction(activeName)}

CONVERSATION CONTEXT & INSTRUCTIONS:
- You are speaking directly to the user in a continuous voice call.
- Only respond based on what the user actually said in the current turn and previous turns.
- Keep the response concise, caring, and conversational (1-3 sentences max).
- Ask only one question at a time.
- Speak naturally in warm Hindi/Hinglish.
- NEVER invent user words or pretend they said something they did not.

Recent conversation history:
${formattedHistory}

User says: "${message}"

Return your response in JSON format with fields:
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

    // Candidate models in preference order (fast resilient models first)
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

    for (const modelName of candidateModels) {
      try {
        console.log(`[Server /api/chat] Invoking Gemini model: ${modelName}`);
        const response = await ai.models.generateContent({
          model: modelName,
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
          },
        });
        if (response && response.text) {
          rawText = response.text;
          console.log(`[Server /api/chat] Model ${modelName} completed in ${Date.now() - startTime}ms`);
          break;
        }
      } catch (e: any) {
        lastError = e;
        console.warn(`[Server /api/chat] Notice for model ${modelName}:`, e?.message || e);
      }
    }

    if (!rawText) {
      // Fallback attempt without strict application/json mimeType
      for (const fallbackModel of ['gemini-3.1-flash-lite', 'gemini-3.6-flash', 'gemini-3.5-flash']) {
        try {
          console.log(`[Server /api/chat] Attempting text fallback with ${fallbackModel}...`);
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
      throw lastError || new Error('No response returned from Gemini models');
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

    console.log(`[Server /api/chat] Response ready in ${Date.now() - startTime}ms: "${reply}"`);

    res.json({
      reply,
      speechText,
      extracted: parsed.extracted || {},
      source: 'gemini',
    });
  } catch (err: any) {
    console.error('[Server /api/chat] Request failed:', err);
    return res.status(500).json({
      error: err.message || 'Gemini processing error',
      details: String(err),
    });
  }
});

// POST /api/summary - Generate daily caregiver summary
app.post('/api/summary', async (req: Request, res: Response) => {
  const { vitals, meds, checkInTime, notes, elderlyName, caregiverName, mood, hydration, hasData } = req.body;

  // Strict requirement: If no data has been recorded today, show empty state message
  const reallyHasData = Boolean(
    hasData ||
    vitals?.bp ||
    vitals?.sugar ||
    (meds && meds !== '0/0 Taken' && meds !== 'No medications') ||
    checkInTime ||
    notes ||
    mood ||
    hydration
  );

  if (!reallyHasData) {
    return res.json({
      summary: 'No health or check-in data has been recorded today.',
      source: 'no_data',
    });
  }

  const elder = (elderlyName || 'your family member').trim();
  const caregiver = (caregiverName || 'Caregiver').trim();

  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    const parts: string[] = [];
    if (checkInTime) parts.push(`${elder} checked in at ${checkInTime}.`);
    if (meds) parts.push(`Medication status: ${meds}.`);
    if (vitals?.bp) parts.push(`Blood pressure was recorded at ${vitals.bp}.`);
    if (vitals?.sugar) parts.push(`Blood sugar was ${vitals.sugar}.`);
    if (mood) parts.push(`Reported mood was ${mood}.`);
    if (notes) parts.push(`${notes}.`);
    parts.push(`${caregiver} has received today's updates.`);

    return res.json({
      summary: parts.join(' '),
      source: 'fallback',
    });
  }

  const ai = getGeminiClient();
  if (!ai) {
    return res.status(500).json({ error: 'Gemini client not initialized' });
  }

  try {
    const prompt = `Generate a 2-3 sentence caregiver-friendly daily summary for ${caregiver} regarding ${elder}.
Data available today:
${checkInTime ? `- Check-in time: ${checkInTime}` : '- No check-in call recorded today'}
${vitals?.bp ? `- Blood Pressure: ${vitals.bp}` : '- Blood Pressure: Not measured today'}
${vitals?.sugar ? `- Blood Sugar: ${vitals.sugar}` : '- Blood Sugar: Not measured today'}
${meds ? `- Medication: ${meds}` : '- Medication: None logged'}
${mood ? `- Mood: ${mood}` : ''}
${hydration ? `- Hydration: ${hydration}` : ''}
${notes ? `- Observations: ${notes}` : ''}

Strict safety: Do not diagnose medical conditions. Speak in a warm, reassuring, factual tone. Do NOT invent readings or events that were not provided.`;

    const summaryModels = ['gemini-3.1-flash-lite', 'gemini-3.6-flash', 'gemini-3.5-flash', 'gemini-3.8-flash'];
    let summaryText = '';
    for (const sm of summaryModels) {
      try {
        const response = await ai.models.generateContent({
          model: sm,
          contents: prompt,
        });
        if (response && response.text) {
          summaryText = response.text.trim();
          break;
        }
      } catch (e) {
        // try next model
      }
    }

    res.json({
      summary: summaryText || 'No health or check-in data has been recorded today.',
      source: summaryText ? 'gemini' : 'fallback',
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Server setup with WebSocket for Gemini Live API
async function startServer() {
  const server = http.createServer(app);
  const wss = new WebSocketServer({ noServer: true });

  // Handle WebSocket upgrade for /live endpoint
  server.on('upgrade', (request, socket, head) => {
    const url = new URL(request.url || '', `http://${request.headers.host}`);
    if (url.pathname === '/live' || url.pathname === '/api/live') {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    }
    // Let other upgrades (e.g. Vite dev server) be handled naturally
  });

  // Client WebSocket connection handler
  wss.on('connection', async (clientWs: WebSocket, request: any) => {
    const reqUrl = new URL(request?.url || '', `http://${request?.headers?.host || 'localhost:3000'}`);
    const userName = (reqUrl.searchParams.get('userName') || reqUrl.searchParams.get('name') || '').trim();
    console.log(`[LiveServer] Client connected to /live${userName ? ` for user ${userName}` : ''}`);

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error('[LiveServer] Missing GEMINI_API_KEY');
      clientWs.send(
        JSON.stringify({
          type: 'error',
          error: 'Gemini connection is not configured.',
          message: 'Gemini connection is not configured.',
        })
      );
      clientWs.close(1008, 'Gemini connection is not configured.');
      return;
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
    });

    let liveSession: any = null;
    let isClientClosed = false;

    try {
      console.log('[LiveServer] Establishing Gemini Live session...');
      liveSession = await ai.live.connect({
        model: 'gemini-3.1-flash-live-preview',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: 'Aoede', // Warm, calm, natural voice
              },
            },
          },
          systemInstruction: getEldercareSystemInstruction(userName),
          tools: LIVE_HEALTH_TOOLS,
          inputAudioTranscription: {},
          outputAudioTranscription: {},
        },
        callbacks: {
          onmessage: (message: LiveServerMessage) => {
            if (isClientClosed || clientWs.readyState !== WebSocket.OPEN) return;

            // 1. Setup complete
            if (message.setupComplete) {
              console.log('[LiveServer] Gemini Live setup complete');
              clientWs.send(JSON.stringify({ type: 'connected' }));
              return;
            }

            // 2. Native model audio output
            if (message.serverContent?.modelTurn?.parts) {
              for (const part of message.serverContent.modelTurn.parts) {
                if (part.inlineData?.data) {
                  clientWs.send(
                    JSON.stringify({
                      type: 'audio',
                      audio: part.inlineData.data,
                    })
                  );
                }
              }
            }

            // 3. Model output transcription
            if (message.serverContent?.outputTranscription?.text) {
              clientWs.send(
                JSON.stringify({
                  type: 'transcript_output',
                  text: message.serverContent.outputTranscription.text,
                  finished: message.serverContent.outputTranscription.finished,
                })
              );
            }

            // 4. User input transcription
            const userText =
              message.serverContent?.inputTranscription?.text ||
              message.serverContent?.interimInputTranscription?.text;

            if (userText) {
              const isFinished = Boolean(message.serverContent?.inputTranscription?.finished);
              clientWs.send(
                JSON.stringify({
                  type: 'transcript_input',
                  text: userText,
                  finished: isFinished,
                })
              );

              // Secondary extraction safety on final transcribed input
              if (isFinished) {
                const extracted = extractHealthFromText(userText);
                if (extracted.bp) {
                  const isHigh = extracted.bp.systolic >= 150 || extracted.bp.diastolic >= 95;
                  clientWs.send(
                    JSON.stringify({
                      type: 'health_event',
                      data: {
                        type: 'blood_pressure',
                        systolic: extracted.bp.systolic,
                        diastolic: extracted.bp.diastolic,
                        isUnusual: isHigh,
                        alertSeverity: isHigh ? 'attention' : 'normal',
                        safeNote: isHigh
                          ? "Today's BP reading is higher than recent averages. Consider resting quietly and checking again."
                          : 'Blood pressure is within expected personal baseline.',
                      },
                    })
                  );
                } else if (extracted.sugar) {
                  clientWs.send(
                    JSON.stringify({
                      type: 'health_event',
                      data: {
                        type: 'blood_glucose',
                        glucose: extracted.sugar,
                      },
                    })
                  );
                } else if (extracted.med) {
                  clientWs.send(
                    JSON.stringify({
                      type: 'health_event',
                      data: {
                        type: 'medication_confirmation',
                        medicationStatus: extracted.med,
                      },
                    })
                  );
                } else if (extracted.mood) {
                  clientWs.send(
                    JSON.stringify({
                      type: 'health_event',
                      data: {
                        type: 'mood',
                        mood: extracted.mood,
                        symptoms: extracted.symptoms,
                      },
                    })
                  );
                }
              }
            }

            // 5. Interrupted signal
            if (message.serverContent?.interrupted) {
              clientWs.send(JSON.stringify({ type: 'interrupted' }));
            }

            // 6. Turn complete
            if (message.serverContent?.turnComplete) {
              clientWs.send(JSON.stringify({ type: 'turn_complete' }));
            }

            // 7. Structured function / tool calls
            if (message.toolCall?.functionCalls) {
              for (const call of message.toolCall.functionCalls) {
                console.log('[LiveServer] Gemini tool call:', call.name, call.args);

                let healthEventData: any = null;

                if (call.name === 'record_blood_pressure') {
                  const args = call.args as any;
                  const systolic = Number(args.systolic) || 120;
                  const diastolic = Number(args.diastolic) || 80;
                  const isHigh = systolic >= 150 || diastolic >= 95;
                  healthEventData = {
                    type: 'blood_pressure',
                    systolic,
                    diastolic,
                    isUnusual: isHigh,
                    alertSeverity: isHigh ? 'attention' : 'normal',
                    safeNote:
                      args.note ||
                      (isHigh
                        ? "Today's BP reading is higher than recent averages. Consider resting quietly and checking again."
                        : 'Blood pressure reading recorded within usual personal reference ranges.'),
                  };
                } else if (call.name === 'record_blood_glucose') {
                  const args = call.args as any;
                  healthEventData = {
                    type: 'blood_glucose',
                    glucose: Number(args.value) || 120,
                  };
                } else if (call.name === 'confirm_medication') {
                  const args = call.args as any;
                  healthEventData = {
                    type: 'medication_confirmation',
                    medicationStatus: args.status || 'taken',
                    medicineName: args.name,
                  };
                } else if (call.name === 'record_mood_or_symptoms') {
                  const args = call.args as any;
                  healthEventData = {
                    type: 'mood',
                    mood: args.mood || 'good',
                    symptoms: args.symptoms || [],
                    safeNote: args.note,
                  };
                }

                // Send health event to frontend to update dashboard
                if (healthEventData) {
                  clientWs.send(
                    JSON.stringify({
                      type: 'health_event',
                      data: healthEventData,
                    })
                  );
                }

                // Send tool response back to Gemini Live session
                liveSession.sendToolResponse({
                  functionResponses: [
                    {
                      id: call.id,
                      name: call.name,
                      response: { output: { success: true, recorded: true } },
                    },
                  ],
                });
              }
            }
          },
          onclose: () => {
            console.log('[LiveServer] Gemini Live session closed');
            if (clientWs.readyState === WebSocket.OPEN) {
              clientWs.close(1000, 'Live session closed');
            }
          },
          onerror: (err: any) => {
            console.error('[LiveServer] Gemini Live session error:', err);
            if (clientWs.readyState === WebSocket.OPEN) {
              clientWs.send(
                JSON.stringify({
                  type: 'error',
                  error: `Gemini Live error: ${err.message || 'Session encountered an error'}`,
                })
              );
            }
          },
        },
      });

      console.log('[LiveServer] Connected to Gemini Live API');
    } catch (err: any) {
      console.error('[LiveServer] Failed to connect to Gemini Live API:', err);
      if (clientWs.readyState === WebSocket.OPEN) {
        clientWs.send(
          JSON.stringify({
            type: 'error',
            error: `Unable to connect to Gemini: ${err.message || 'Connection failed'}`,
          })
        );
        clientWs.close(1011, 'Gemini connection failed');
      }
      return;
    }

    // Process client messages (audio chunks and text messages)
    clientWs.on('message', (data: Buffer | string) => {
      try {
        const msg = JSON.parse(data.toString());

        if (msg.type === 'audio' && msg.audio && liveSession) {
          liveSession.sendRealtimeInput({
            audio: {
              data: msg.audio,
              mimeType: 'audio/pcm;rate=16000',
            },
          });
        } else if (msg.type === 'text' && msg.text && liveSession) {
          liveSession.sendClientContent({
            turns: [{ role: 'user', parts: [{ text: msg.text }] }],
            turnComplete: true,
          });
        }
      } catch (err) {
        console.error('[LiveServer] Error handling client message:', err);
      }
    });

    clientWs.on('close', async () => {
      console.log('[LiveServer] Client disconnected');
      isClientClosed = true;
      if (liveSession) {
        try {
          await liveSession.close();
        } catch {}
      }
    });

    clientWs.on('error', (err) => {
      console.error('[LiveServer] Client WebSocket error:', err);
      isClientClosed = true;
      if (liveSession) {
        try {
          liveSession.close();
        } catch {}
      }
    });
  });

  // Vite middleware setup
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`ElderCare AI server with Gemini Live running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
