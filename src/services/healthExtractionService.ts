/**
 * ElderCare AI - Structured Health Extraction Service
 *
 * Extracts structured clinical vitals, medication adherence, and mood from
 * elderly natural voice transcripts (Hindi, Hinglish, English).
 *
 * Adheres strictly to the clinical safety rule:
 * - Only save values that were actually mentioned or clearly stated.
 * - Never invent health readings.
 * - If a value is not mentioned, keep it null rather than making one up.
 */

export interface StructuredHealthExtraction {
  blood_sugar: number | null;
  blood_sugar_unit: 'mg/dL' | string | null;
  systolic_bp: number | null;
  diastolic_bp: number | null;
  blood_pressure: string | null; // e.g. "130/80" or "130 / 80"
  mood: string | null; // e.g. "low", "good", "tired", "normal", "dizzy"
  medication_status: 'taken' | 'missed' | 'pending' | null;
  medication_name?: string | null;
  hydration?: string | null;
  symptoms: string[];
  is_unusual?: boolean;
  summary?: string;
  check_in_completed: boolean;
}

/**
 * Normalizes input transcript to a plain string for analysis
 */
export function formatTranscriptToText(
  transcript: string | { role?: string; speaker?: string; text: string }[]
): string {
  if (typeof transcript === 'string') return transcript;
  if (!Array.isArray(transcript)) return '';
  return transcript
    .map((item) => {
      const speaker = item.speaker || item.role || 'user';
      return `${speaker}: ${item.text}`;
    })
    .join('\n');
}

/**
 * Deterministic local parser for Hindi, Hinglish, and English voice speech.
 * Guarantees immediate zero-latency extraction and offline/fallback resilience.
 */
export function extractLocallyStructured(
  transcript: string | { role?: string; speaker?: string; text: string }[]
): StructuredHealthExtraction {
  const fullText = formatTranscriptToText(transcript);
  const lower = fullText.toLowerCase();

  let systolic_bp: number | null = null;
  let diastolic_bp: number | null = null;
  let blood_pressure: string | null = null;
  let blood_sugar: number | null = null;
  let blood_sugar_unit: 'mg/dL' | null = null;
  let mood: string | null = null;
  let medication_status: 'taken' | 'missed' | 'pending' | null = null;
  let medication_name: string | null = null;
  let hydration: string | null = null;
  const symptoms: string[] = [];

  // 1. Blood Pressure Extraction
  // Matches "BP 130/80", "130 by 80", "BP 130 80", "130/80 mmhg", "130 aur 80"
  const bpMatch =
    fullText.match(/(?:bp|blood\s*pressure|b\.p\.)\s*(?:tha|hai|is|was|recorded|aaya)?\s*[:=]?\s*(\d{2,3})\s*(?:\/|by|\-|aur|\s+)\s*(\d{2,3})/i) ||
    fullText.match(/(\d{2,3})\s*(?:\/|by)\s*(\d{2,3})/i);

  if (bpMatch) {
    const sys = parseInt(bpMatch[1], 10);
    const dia = parseInt(bpMatch[2], 10);
    // Sanity check valid physiological range (sys 70-250, dia 40-150)
    if (sys >= 70 && sys <= 250 && dia >= 40 && dia <= 150) {
      systolic_bp = sys;
      diastolic_bp = dia;
      blood_pressure = `${sys}/${dia}`;
    }
  }

  // 2. Blood Sugar Extraction
  // Matches "sugar 145 aaya tha", "sugar 145", "glucose 145", "145 mg/dl", "sugar level 145"
  const sugarMatch =
    fullText.match(/(?:sugar|glucose|sugar\s*level|fasting\s*sugar)\s*(?:bhi|level|tha|hai|is|was|aaya|aayi)?\s*[:=]?\s*(\d{2,3})/i) ||
    fullText.match(/(\d{2,3})\s*(?:mg\/dl|mgdl)/i);

  if (sugarMatch) {
    const val = parseInt(sugarMatch[1], 10);
    // Sanity check valid glucose range (40-500 mg/dL)
    if (val >= 40 && val <= 500) {
      blood_sugar = val;
      blood_sugar_unit = 'mg/dL';
    }
  }

  // 3. Mood Extraction
  // Look specifically for "mood low hai", "mood thoda low", "mood achha hai", "theek", etc.
  const explicitMoodMatch = fullText.match(/mood\s*(?:bhi)?\s*(?:thoda|kafi|bohot|bahut)?\s*(low|kharab|theek|achha|accha|good|fine|badhiya|down|sad|happy|great)/i);
  if (explicitMoodMatch) {
    const raw = explicitMoodMatch[1].toLowerCase();
    if (raw === 'low' || raw === 'down' || raw === 'kharab' || raw === 'sad') {
      mood = 'low';
    } else if (raw === 'achha' || raw === 'accha' || raw === 'good' || raw === 'badhiya' || raw === 'happy' || raw === 'great') {
      mood = 'good';
    } else if (raw === 'theek' || raw === 'fine') {
      mood = 'normal';
    } else {
      mood = raw;
    }
  } else if (/chakkar|dizzy|giddiness/i.test(lower)) {
    mood = 'dizzy';
    symptoms.push('dizziness');
  } else if (/weakness|kamzori|kamzor|tired|thakan|thakaan|fatigue/i.test(lower)) {
    mood = 'tired';
    symptoms.push('weakness');
  } else if (/theek hoon|sab theek|fine|good|badhiya|khush/i.test(lower)) {
    mood = 'good';
  } else if (/low hai|udaas|sad|ghabrahat|anxiety/i.test(lower)) {
    mood = 'low';
  }

  // 4. Medication Status
  if (
    /dawai\s*le\s*li|medicine\s*le\s*li|goli\s*kha\s*li|medicine\s*kha\s*li|tablet\s*le\s*li|took\s*medicine|taken\s*medicine|dawai\s*kha\s*chuka/i.test(
      lower
    ) ||
    (/(?:medicine|dawai|tablet|pill)\s*.*(?:haan|yes|le li|taken|done)/i.test(lower))
  ) {
    medication_status = 'taken';
  } else if (
    /bhool\s*gaya|nahi\s*li|nahi\s*khaayi|missed|forgot|haven't\s*taken|pending/i.test(
      lower
    )
  ) {
    medication_status = 'missed';
  }

  // 5. Hydration check
  if (/paani\s*pi\s*liya|sufficient\s*water|hydrated|water\s*intake/i.test(lower)) {
    hydration = 'Good';
  } else if (/paani\s*kam\s*piya|dehydrated/i.test(lower)) {
    hydration = 'Low';
  }

  // Check if meaningful conversation check-in completed
  const check_in_completed = fullText.trim().length > 10;
  const is_unusual = Boolean(
    (systolic_bp && systolic_bp >= 150) ||
    (diastolic_bp && diastolic_bp >= 95) ||
    (blood_sugar && (blood_sugar >= 200 || blood_sugar <= 70))
  );

  return {
    blood_sugar,
    blood_sugar_unit,
    systolic_bp,
    diastolic_bp,
    blood_pressure,
    mood,
    medication_status,
    medication_name,
    hydration,
    symptoms,
    is_unusual,
    check_in_completed,
  };
}

/**
 * Primary structured health extractor.
 * Tries server-side Gemini structured extraction endpoint, with guaranteed fallback
 * to the deterministic local parser.
 */
export async function extractStructuredHealth(
  transcript: string | { role?: string; speaker?: string; text: string }[]
): Promise<StructuredHealthExtraction> {
  const formattedTranscript = formatTranscriptToText(transcript);
  console.log('[HealthExtraction] Starting extraction for transcript:\n', formattedTranscript);

  // Local extraction result (always available as baseline / fallback)
  const localResult = extractLocallyStructured(transcript);

  try {
    const response = await fetch('/api/extract-health', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transcript: formattedTranscript }),
    });

    if (response.ok) {
      const data = await response.json();
      console.log('[HealthExtraction] Gemini extraction API response:', data);

      if (data && typeof data === 'object') {
        const result: StructuredHealthExtraction = {
          blood_sugar: typeof data.blood_sugar === 'number' ? data.blood_sugar : localResult.blood_sugar,
          blood_sugar_unit: data.blood_sugar_unit || (localResult.blood_sugar ? 'mg/dL' : null),
          systolic_bp: typeof data.systolic_bp === 'number' ? data.systolic_bp : localResult.systolic_bp,
          diastolic_bp: typeof data.diastolic_bp === 'number' ? data.diastolic_bp : localResult.diastolic_bp,
          blood_pressure:
            data.blood_pressure ||
            (data.systolic_bp && data.diastolic_bp ? `${data.systolic_bp}/${data.diastolic_bp}` : localResult.blood_pressure),
          mood: data.mood || localResult.mood,
          medication_status: data.medication_status || localResult.medication_status,
          medication_name: data.medication_name || localResult.medication_name,
          hydration: data.hydration || localResult.hydration,
          symptoms: Array.isArray(data.symptoms) && data.symptoms.length > 0 ? data.symptoms : localResult.symptoms,
          is_unusual: typeof data.is_unusual === 'boolean' ? data.is_unusual : localResult.is_unusual,
          summary: data.summary || localResult.summary,
          check_in_completed: data.check_in_completed !== undefined ? Boolean(data.check_in_completed) : localResult.check_in_completed,
        };

        console.log('[HealthExtraction] Final merged extraction result:', result);
        return result;
      }
    } else {
      console.warn('[HealthExtraction] /api/extract-health returned status:', response.status, 'using local extractor');
    }
  } catch (err) {
    console.warn('[HealthExtraction] Network or API extraction error, using local extractor:', err);
  }

  console.log('[HealthExtraction] Local extraction result:', localResult);
  return localResult;
}
