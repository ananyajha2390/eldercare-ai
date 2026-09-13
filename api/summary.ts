import { GoogleGenAI } from '@google/genai';

function getGeminiApiKey(): string | undefined {
  return (
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_GENAI_API_KEY ||
    process.env.GOOGLE_API_KEY
  );
}

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch {}
  }
  body = body || {};

  const { vitals, meds, checkInTime, notes, elderlyName, caregiverName, mood, hydration, hasData } = body;

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
    return res.status(200).json({
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

    return res.status(200).json({
      summary: parts.join(' '),
      source: 'fallback',
    });
  }

  try {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
    });
    const prompt = `You are a clinical care assistant for ElderCare AI summarizing daily health updates for ${caregiver} regarding ${elder}.
Create a warm, factual, professional 2-3 sentence daily caregiver summary based on:
- Check-in Time: ${checkInTime || 'None'}
- Medication Adherence: ${meds || 'None'}
- Blood Pressure: ${vitals?.bp || 'Not recorded'}
- Blood Sugar: ${vitals?.sugar || 'Not recorded'}
- Reported Mood: ${mood || 'Not reported'}
- Hydration: ${hydration || 'Not reported'}
- Health Notes / Voice Observations: ${notes || 'None'}

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
      } catch (e) {}
    }

    return res.status(200).json({
      summary: summaryText || 'No health or check-in data has been recorded today.',
      source: summaryText ? 'gemini' : 'fallback',
    });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Failed to generate summary' });
  }
}
