export default function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const apiKey =
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_GENAI_API_KEY ||
    process.env.GOOGLE_API_KEY;

  return res.status(200).json({
    status: 'ok',
    service: 'ElderCare AI',
    timestamp: new Date().toISOString(),
    geminiConfigured: Boolean(apiKey),
    platform: 'vercel-serverless',
  });
}
