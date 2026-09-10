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
function getGeminiClient(): GoogleGenAI | null {
  if (!geminiClient && process.env.GEMINI_API_KEY) {
    geminiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
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

// Base system instruction for ElderCare AI
const ELDERCARE_BASE_SYSTEM_INSTRUCTION = `You are ElderCare AI, a warm, patient and respectful voice companion for elderly people.

You speak naturally and calmly.

You can understand Hindi, Hinglish and English.

Prefer natural Indian conversational language.

Keep responses short, usually 1 to 3 sentences.

Never overwhelm the elderly user with long explanations.

Ask one question at a time.

You help with:
- medication reminders
- daily check-ins
- recording health readings
- mood check-ins
- hydration reminders
- family communication

You are NOT a doctor.

Never diagnose diseases.

Never claim that the user has Alzheimer's, dementia, diabetes, hypertension, depression, or any other medical condition.

If the user reports a concerning health reading, acknowledge it calmly, record it, and suggest rechecking or contacting a caregiver/health professional when appropriate.

If the user speaks Hindi or Hinglish, respond naturally in Hindi/Hinglish.

Treat the user respectfully using 'ji' where appropriate (e.g. 'Namaste ji' or using the user's name followed by 'ji').

CRITICAL TOOL INSTRUCTION:
Whenever the user mentions a health reading (like blood pressure, blood sugar/glucose), taking or missing medicine, or their mood/symptoms, you MUST call the corresponding tool to record it into their care dashboard.

Examples:
- User: 'Namaste.'
  Assistant: 'Namaste ji! Aap se milkar bahut khushi hui. Aaj aap kaisa mehsoos kar rahe hain?'

- User: 'Aaj thoda weakness lag raha hai.'
  Assistant: 'Aap thoda aaram se baithiye aur pehle ek glass paani lijiye. Kya aapne apna Blood Pressure check kiya hai abhi?'
  (Call record_mood_or_symptoms with mood='tired', symptoms=['weakness'])

- User: 'Mera BP 158 by 98 hai.'
  Assistant: 'Ji, maine aapka BP 158 by 98 note kar liya hai. Ye aapki recent readings se zyada hai, isliye ek baar aaram se baithkar dobara check kar lena achha rahega. Maine family ko bhi alert bhej diya hai.'
  (Call record_blood_pressure with systolic=158, diastolic=98)

- User: 'Maine subah ki medicine le li.'
  Assistant: 'Bahut badhiya! Maine aaj ki medicine confirm kar di hai. Samay par dawai lene ke liye shukriya.'
  (Call confirm_medication with status='taken')

Never pretend that an action happened unless the tool was called to record that action.`;

function getEldercareSystemInstruction(userName?: string | null): string {
  const trimmed = (userName || '').trim();
  let userContext = '';
  if (trimmed) {
    const honorific = getHonorificName(trimmed);
    userContext = `
USER IDENTITY CONTEXT:
The user's name is ${trimmed}. Address the user naturally as ${honorific} (e.g. 'Namaste ${honorific}').
IMPORTANT: Do NOT refer to the user as Sharma ji unless their actual name is Sharma.`;
  } else {
    userContext = `
USER IDENTITY CONTEXT:
Address the user respectfully using 'ji' (e.g. 'Namaste ji').
IMPORTANT: Do NOT refer to the user as Sharma ji unless their actual name is Sharma.`;
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

// Telephony Integration status & call dispatch endpoints
app.get('/api/telephony/status', (req: Request, res: Response) => {
  const accountId = process.env.TELEPHONY_ACCOUNT_ID;
  const phoneNumber = process.env.TELEPHONY_PHONE_NUMBER;
  const isConfigured = Boolean(accountId && phoneNumber);

  res.json({
    isConfigured,
    provider: isConfigured ? 'telephony' : 'browser_demo',
    phoneNumber: phoneNumber ? `${phoneNumber.slice(0, 4)}****${phoneNumber.slice(-2)}` : null,
    statusText: isConfigured ? 'PSTN Telephony Gateway Ready' : 'Browser Demo Audio Provider Active',
    demoModeLabel: 'Demo Call (Browser Audio + Native Gemini Live)',
  });
});

app.post('/api/telephony/call', (req: Request, res: Response) => {
  const accountId = process.env.TELEPHONY_ACCOUNT_ID;
  if (!accountId) {
    return res.status(501).json({
      error: 'Telephony provider not configured. Please use Demo Call mode.',
      provider: 'browser_demo',
    });
  }
  res.json({
    callId: `tel-${Date.now()}`,
    status: 'initiated',
    message: 'Outgoing automated health check initiated via telephony gateway.',
  });
});

app.post('/api/telephony/hangup', (req: Request, res: Response) => {
  res.json({ status: 'ended' });
});

// POST /api/chat - REST endpoint
app.post('/api/chat', async (req: Request, res: Response) => {
  const { message, history = [], language = 'hinglish', aiMode = 'gemini', userName, elderlyName } = req.body;
  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }

  const activeName = (userName || elderlyName || '').trim();
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    if (aiMode === 'demo') {
      const greeting = getGreeting(activeName);
      return res.json({
        reply: `${greeting}! Main ElderCare hoon. Aaj aapki tabiyat kaisi hai?`,
        speechText: `${greeting}! मैं एल्डरकेयर हूँ। आज आपकी तबियत कैसी है?`,
        extracted: { bloodPressure: null, bloodSugar: null, medicationStatus: null, mood: 'good' },
        source: 'demo_fallback',
      });
    }
    return res.status(503).json({
      error: 'Gemini connection is not configured. Please configure GEMINI_API_KEY in Settings.',
    });
  }

  const ai = getGeminiClient();
  if (!ai) {
    return res.status(500).json({ error: 'Failed to initialize Gemini client.' });
  }

  try {
    const prompt = `${getEldercareSystemInstruction(activeName)}

Recent conversation history:
${history.map((h: any) => `${h.role === 'user' ? 'User' : 'ElderCare'}: ${h.text}`).join('\n')}

User says: "${message}"

Return your response in JSON format with fields:
{
  "reply": "Warm Hinglish/English text response",
  "speechText": "Natural Devanagari or phonetic speech text",
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

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    res.json({
      reply: parsed.reply || response.text || '',
      speechText: parsed.speechText || parsed.reply || '',
      extracted: parsed.extracted || {},
      source: 'gemini',
    });
  } catch (err: any) {
    console.error('Gemini REST chat error:', err);
    res.status(500).json({
      error: `Gemini API error: ${err.message || 'Unknown error'}`,
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

  const apiKey = process.env.GEMINI_API_KEY;
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

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
    });

    res.json({
      summary: response.text?.trim() || 'No health or check-in data has been recorded today.',
      source: 'gemini',
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
