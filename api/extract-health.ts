import { GoogleGenAI } from '@google/genai';

function getGeminiApiKey(): string | undefined {
  return (
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_GENAI_API_KEY ||
    process.env.GOOGLE_API_KEY
  );
}

export default async function handler(req: any, res: any) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
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

  const { transcript } = body;
  if (!transcript || typeof transcript !== 'string') {
    return res.status(400).json({ error: 'Missing transcript string' });
  }

  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    console.warn('[API /api/extract-health] No Gemini API key found, returning empty');
    return res.status(200).json({
      blood_sugar: null,
      blood_sugar_unit: null,
      systolic_bp: null,
      diastolic_bp: null,
      blood_pressure: null,
      mood: null,
      medication_status: null,
      symptoms: [],
      check_in_completed: true,
      source: 'no_key',
    });
  }

  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
  });

  const prompt = `You are an expert clinical health extraction assistant for ElderCare AI.
Analyze the following conversational voice call transcript between ElderCare AI and an elderly senior (often speaking Hindi, Hinglish, or English).

Your job is to extract ONLY the health information and vitals that were ACTUALLY mentioned or clearly stated by the senior.

STRICT CLINICAL EXTRACTION RULES:
1. Only extract values that were actually mentioned or clearly stated.
2. Never invent health readings.
3. If a value was NOT mentioned, keep it null rather than making one up.
4. If Blood Pressure was mentioned (e.g. "BP 130/80", "130 by 80", "130 aur 80"), extract systolic_bp (130), diastolic_bp (80), and blood_pressure ("130/80").
5. If Blood Sugar / Glucose was mentioned (e.g. "sugar 145 aaya tha", "glucose 145", "145 mg/dl"), extract blood_sugar as a number (145) and blood_sugar_unit ("mg/dL").
6. If mood was stated (e.g. "mood low hai", "mood thoda kharab hai", "theek hoon", "khush hoon", "tired"), extract mood as a simple descriptive lowercase string (e.g. "low", "good", "tired", "normal").
7. If medication was confirmed taken (e.g. "dawai le li", "medicine kha li"), set medication_status to "taken". If missed or forgotten, set to "missed". Otherwise null.
8. If the conversation took place, set check_in_completed to true.

Conversation transcript:
"""
${transcript}
"""

Return strictly a valid JSON object matching this schema:
{
  "blood_sugar": number | null,
  "blood_sugar_unit": "mg/dL" | null,
  "systolic_bp": number | null,
  "diastolic_bp": number | null,
  "blood_pressure": string | null,
  "mood": string | null,
  "medication_status": "taken" | "missed" | null,
  "medication_name": string | null,
  "hydration": string | null,
  "symptoms": string[],
  "summary": string,
  "check_in_completed": boolean
}`;

  const candidateModels = [
    'gemini-3.1-flash-lite',
    'gemini-3.6-flash',
    'gemini-3.5-flash',
    'gemini-3.8-flash',
    'gemini-flash-latest',
  ];

  for (const model of candidateModels) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          temperature: 0.1,
        },
      });

      if (response && response.text) {
        const cleaned = response.text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
        const parsed = JSON.parse(cleaned);
        return res.status(200).json(parsed);
      }
    } catch (e: any) {
      console.warn(`[API /api/extract-health] Model ${model} failed:`, e.message);
    }
  }

  return res.status(500).json({ error: 'All Gemini models failed extraction' });
}
