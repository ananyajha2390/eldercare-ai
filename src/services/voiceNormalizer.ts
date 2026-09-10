/**
 * Voice Normalization and Pronunciation Engine for ElderCare AI
 * Converts Hinglish, Roman Hindi, medical terms, and vitals into
 * natural Devanagari and Indian-phonetic representations so browser
 * TTS engines (hi-IN / en-IN) pronounce them with authentic cadence,
 * correct phonetics, and respectful elderly care pauses.
 */

// Common Hindi numbers mapping (1 - 200) for medical readings & vitals
const HINDI_NUMBERS: Record<number, string> = {
  0: 'शून्य',
  1: 'एक',
  2: 'दो',
  3: 'तीन',
  4: 'चार',
  5: 'पाँच',
  6: 'छह',
  7: 'सात',
  8: 'आठ',
  9: 'नौ',
  10: 'दस',
  11: 'ग्यारह',
  12: 'बारह',
  13: 'तेरह',
  14: 'चौदह',
  15: 'पंद्रह',
  16: 'सोलह',
  17: 'सत्रह',
  18: 'अट्ठारह',
  19: 'उन्नीस',
  20: 'बीस',
  21: 'इक्कीस',
  22: 'बाईस',
  23: 'तेईस',
  24: 'चौबीस',
  25: 'पच्चीस',
  26: 'छब्बीस',
  27: 'सत्ताईस',
  28: 'अट्ठाईस',
  29: 'उनतीस',
  30: 'तीस',
  31: 'इकतीस',
  32: 'बत्तीस',
  35: 'पैंतीस',
  40: 'चालीस',
  45: 'पैंतालीस',
  50: 'पचास',
  55: 'पचपन',
  60: 'साठ',
  65: 'पैंसठ',
  70: 'सत्तर',
  72: 'बहत्तर',
  75: 'पचहत्तर',
  78: 'अठहत्तर',
  80: 'अस्सी',
  82: 'बयासी',
  84: 'चौरासी',
  85: 'पचासी',
  88: 'अठासी',
  90: 'नब्बे',
  92: 'बानवे',
  95: 'पंचानवे',
  98: 'अट्ठानवे',
  100: 'एक सौ',
  105: 'एक सौ पाँच',
  110: 'एक सौ दस',
  115: 'एक सौ पंद्रह',
  120: 'एक सौ बीस',
  124: 'एक सौ चौबीस',
  125: 'एक सौ पच्चीस',
  128: 'एक सौ अट्ठाईस',
  130: 'एक सौ तीस',
  135: 'एक सौ पैंतीस',
  140: 'एक सौ चालीस',
  142: 'एक सौ बयालीस',
  145: 'एक सौ पैंतालीस',
  150: 'एक सौ पचास',
  155: 'एक सौ पचपन',
  158: 'एक सौ अट्ठावन',
  160: 'एक सौ साठ',
  165: 'एक सौ पैंसठ',
  170: 'एक सौ सत्तर',
  175: 'एक सौ पचहत्तर',
  180: 'एक सौ अस्सी',
  185: 'एक सौ पचासी',
  190: 'एक सौ नब्बे',
  195: 'एक सौ पंचानवे',
  200: 'दो सौ',
};

// Converts any number into Hindi words for accurate Devanagari TTS pronunciation
export function numberToHindiWords(num: number): string {
  if (HINDI_NUMBERS[num]) {
    return HINDI_NUMBERS[num];
  }

  if (num > 100 && num < 200) {
    const remainder = num - 100;
    const remWord = HINDI_NUMBERS[remainder] || remainder.toString();
    return `एक सौ ${remWord}`;
  }

  if (num >= 200 && num < 300) {
    const remainder = num - 200;
    const remWord = HINDI_NUMBERS[remainder] || remainder.toString();
    return `दो सौ ${remWord}`;
  }

  return num.toString();
}

/**
 * Curated dictionary mapping Roman Hindi words and common elderly care terms
 * to authentic Devanagari script for natural Indian voice synthesis.
 */
const HINGLISH_TO_DEVANAGARI_MAP: Record<string, string> = {
  // Greetings & Addresses
  namaste: 'नमस्ते',
  pranam: 'प्रणाम',
  sharma: 'शर्मा',
  ji: 'जी',
  rahul: 'राहुल',
  beta: 'बेटा',
  sir: 'सर',
  madam: 'मैडम',
  subah: 'सुबह',
  shaam: 'शाम',
  dopahar: 'दोपहर',
  raat: 'रात',
  din: 'दिन',
  good: 'गुड',
  morning: 'मॉर्निंग',
  afternoon: 'आफ़्टरनून',
  evening: 'इवनिंग',
  night: 'नाइट',

  // Pronouns & Respectful Forms
  aap: 'आप',
  aapka: 'आपका',
  aapki: 'आपकी',
  aapke: 'आपके',
  aapne: 'आपने',
  mera: 'मेरा',
  meri: 'मेरी',
  mere: 'मेरे',
  mujhe: 'मुझे',
  mujhko: 'मुझको',
  hum: 'हम',
  humara: 'हमारा',
  main: 'मैं',
  maine: 'मैंने',
  yeh: 'यह',
  woh: 'वह',
  inka: 'इनका',
  unka: 'उनका',
  unki: 'उनकी',
  unke: 'उनके',
  sab: 'सब',
  sabka: 'सबका',

  // Questions
  kya: 'क्या',
  kaise: 'कैसे',
  kaisi: 'कैसी',
  kaisa: 'कैसा',
  kab: 'कब',
  kahan: 'कहाँ',
  kyun: 'क्यों',
  kitna: 'कितना',
  kitni: 'कितनी',
  kitne: 'कितने',
  kaun: 'कौन',

  // Verbs & Auxiliaries
  hai: 'है',
  hain: 'हैं',
  hoon: 'हूँ',
  ho: 'हो',
  tha: 'था',
  thi: 'थी',
  the: 'थे',
  hoga: 'होगा',
  hogi: 'होगी',
  honge: 'होंगे',
  gaya: 'गया',
  gayi: 'गई',
  gaye: 'गए',
  gayein: 'गए',
  liya: 'लिया',
  li: 'ली',
  liye: 'लिए',
  diya: 'दिया',
  di: 'दी',
  diye: 'दिए',
  kiya: 'किया',
  ki: 'की',
  kiye: 'किए',
  kijiye: 'कीजिए',
  baithiye: 'बैठिए',
  lijiye: 'लीजिए',
  dijiye: 'दीजिए',
  boliye: 'बोलिए',
  suniyega: 'सुनिएगा',
  kariyega: 'करिएगा',
  aaiye: 'आइए',
  jaaiye: 'जाइए',
  kar: 'कर',
  karo: 'करो',
  raha: 'रहा',
  rahe: 'रहे',
  rahi: 'रही',
  chal: 'चल',
  aaya: 'आया',
  aayi: 'आई',
  aaye: 'आए',
  lag: 'लग',
  lagta: 'लगता',
  lagti: 'लगती',
  bol: 'बोल',
  bolo: 'बोलो',
  bheja: 'भेजा',
  bhej: 'भेज',

  // Health, Care, Food & Vitals
  tabiyat: 'तबीयत',
  dawai: 'दवाई',
  dawa: 'दवा',
  medicine: 'दवाई',
  medicines: 'दवाइयाँ',
  goli: 'गोली',
  tablet: 'गोली',
  breakfast: 'नाश्ता',
  lunch: 'दोपहर का खाना',
  dinner: 'रात का खाना',
  khana: 'खाना',
  paani: 'पानी',
  water: 'पानी',
  gunguna: 'गुनगुना',
  chakkar: 'चक्कर',
  kamzori: 'कमज़ोरी',
  thakan: 'थकान',
  dard: 'दर्द',
  aaram: 'आराम',
  shaant: 'शांत',
  theek: 'ठीक',
  achha: 'अच्छा',
  achhi: 'अच्छी',
  achhe: 'अच्छे',
  badiya: 'बढ़िया',
  bilkul: 'बिल्कुल',
  shukriya: 'शुक्रिया',
  dhanyawad: 'धन्यवाद',
  samajh: 'समझ',
  ghabraiye: 'घबराइए',
  mat: 'मत',
  zaroorat: 'ज़रूरत',
  hamesha: 'हमेशा',
  yahin: 'यहीं',
  pehle: 'पहले',
  baad: 'बाद',
  dobara: 'दोबारा',
  glass: 'ग्लास',
  ek: 'एक',
  do: 'दो',
  teen: 'तीन',
  chaar: 'चार',
  paanch: 'पाँच',
  das: 'दस',
  bhi: 'भी',
  aur: 'और',
  par: 'पर',
  mein: 'में',
  se: 'से',
  ko: 'को',
  ka: 'का',
  ke: 'के',
  toh: 'तो',
  nahi: 'नहीं',
  na: 'ना',
  ha: 'हाँ',
  haan: 'हाँ',
  thoda: 'थोड़ा',
  thodi: 'थोड़ी',
  zyada: 'ज़्यादा',
  kam: 'कम',
  bahut: 'बहुत',
  aaj: 'आज',
  kal: 'कल',
  ab: 'अब',
  abhi: 'अभी',
  yaad: 'याद',
  samay: 'समय',
  time: 'टाइम',
  mehsoos: 'महसूस',
  baat: 'बात',

  // Medical loanwords commonly used in Indian elderly care
  bp: 'बीपी',
  sugar: 'शुगर',
  glucose: 'ग्लूकोज',
  blood: 'ब्लड',
  pressure: 'प्रेशर',
  report: 'रिपोर्ट',
  alert: 'अलर्ट',
  doctor: 'डॉक्टर',
  schedule: 'शेड्यूल',
  routine: 'रूटीन',
  normal: 'सामान्य',
  high: 'ज़्यादा',
  low: 'कम',
  stable: 'स्थिर',
  caregiver: 'केयरगिवर',
  check: 'चेक',
  note: 'नोट',
  confirm: 'कन्फ़र्म',
  update: 'अपडेट',
  reading: 'रीडिंग',
  safe: 'सुरक्षित',
  alertness: 'अलर्ट',
  family: 'परिवार',
  pulse: 'पल्स',
  heart: 'हार्ट',
  rate: 'रेट',
  walk: 'वॉक',
  exercise: 'कसरत',
  minute: 'मिनट',
  minutes: 'मिनट',
  hour: 'घंटा',
  hours: 'घंटे',
};

/**
 * Detects whether the text is Hindi, Hinglish, or English.
 */
export function detectLanguage(text: string): 'hindi' | 'hinglish' | 'english' {
  if (!text || !text.trim()) return 'hinglish';

  // Check for Devanagari unicode range \u0900-\u097F
  const devanagariMatches = text.match(/[\u0900-\u097F]/g);
  if (devanagariMatches && devanagariMatches.length > text.length * 0.3) {
    return 'hindi';
  }

  const lower = text.toLowerCase();
  const words = lower.replace(/[^\w\s]/g, '').split(/\s+/);

  let hinglishCount = 0;
  for (const word of words) {
    if (HINGLISH_TO_DEVANAGARI_MAP[word]) {
      hinglishCount++;
    }
  }

  const ratio = words.length > 0 ? hinglishCount / words.length : 0;
  if (ratio >= 0.25 || hinglishCount >= 2) {
    return 'hinglish';
  }

  return 'english';
}

/**
 * Normalizes Blood Pressure expressions like:
 * "BP 128/82", "BP 128 by 82", "158 / 98", "120-80"
 * into natural Devanagari or clean Indian English spoken forms with rhythmic pauses.
 */
export function normalizeBloodPressure(text: string, forHindi: boolean): string {
  return text.replace(
    /\b(?:BP|Blood\s+Pressure|बीपी)?\s*(\d{2,3})\s*(?:\/|\s+by\s+|\-)\s*(\d{2,3})\b/gi,
    (match, sysStr, diaStr) => {
      const sys = parseInt(sysStr, 10);
      const dia = parseInt(diaStr, 10);

      if (forHindi) {
        const sysWord = numberToHindiWords(sys);
        const diaWord = numberToHindiWords(dia);
        return `बीपी, ${sysWord}, बाय, ${diaWord}`;
      } else {
        return `B P, ${sys} by ${dia}`;
      }
    }
  );
}

/**
 * Normalizes Blood Sugar expressions like:
 * "sugar 142", "glucose 130", "142 mg/dL", "142 mgdl"
 */
export function normalizeBloodSugar(text: string, forHindi: boolean): string {
  return text.replace(
    /\b(?:sugar|glucose|शुगर)?\s*(?:level|is|hai)?\s*(\d{2,3})\s*(?:mg\/dl|mgdl)?\b/gi,
    (match, valStr) => {
      const val = parseInt(valStr, 10);
      if (val < 50 || val > 400) return match; // not a typical sugar range

      if (forHindi) {
        const valWord = numberToHindiWords(val);
        return `शुगर ${valWord} मिलीग्राम`;
      } else {
        return `Sugar ${val} milligrams`;
      }
    }
  );
}

/**
 * Normalizes medical abbreviations and units
 */
export function normalizeMedicalUnits(text: string, forHindi: boolean): string {
  if (forHindi) {
    return text
      .replace(/\bmg\/dL\b/gi, 'मिलीग्राम')
      .replace(/\bmgdl\b/gi, 'मिलीग्राम')
      .replace(/\bmmHg\b/gi, 'एमएमएचजी')
      .replace(/\bBP\b/g, 'बीपी')
      .replace(/\bbp\b/g, 'बीपी')
      .replace(/\bDr\.\s*/gi, 'डॉक्टर ')
      .replace(/\bDoc\b/gi, 'डॉक्टर')
      .replace(/\bECG\b/g, 'ईसीजी')
      .replace(/\bSpO2\b/gi, 'ऑक्सीजन लेवल')
      .replace(/\bO2\b/gi, 'ऑक्सीजन')
      .replace(/\btab\b/gi, 'गोली')
      .replace(/\btablet\b/gi, 'गोली');
  } else {
    return text
      .replace(/\bmg\/dL\b/gi, 'milligrams per deciliter')
      .replace(/\bmmHg\b/gi, 'millimeter of mercury')
      .replace(/\bBP\b/g, 'B P')
      .replace(/\bbp\b/g, 'B P')
      .replace(/\bDr\.\s*/gi, 'Doctor ');
  }
}

/**
 * Converts Roman Hinglish phrases into authentic Devanagari text
 * so that Indian TTS engines (hi-IN) pronounce every syllable with
 * genuine Indian phonetics and melody instead of robotic English mispronunciations.
 */
export function convertHinglishToDevanagari(text: string): string {
  // First normalize vitals & numbers
  let processed = normalizeBloodPressure(text, true);
  processed = normalizeBloodSugar(processed, true);
  processed = normalizeMedicalUnits(processed, true);

  // Split text into tokens preserving punctuation and spaces
  const tokens = processed.split(/(\s+|[.,!?;:()"])/);

  const convertedTokens = tokens.map((token) => {
    if (!token || /^\s+$/.test(token) || /^[.,!?;:()"]+$/.test(token)) {
      return token;
    }

    // If token already has Devanagari characters, keep it as is
    if (/[\u0900-\u097F]/.test(token)) {
      return token;
    }

    // Check if token is a pure number
    if (/^\d+$/.test(token)) {
      const num = parseInt(token, 10);
      return numberToHindiWords(num);
    }

    const lower = token.toLowerCase();
    if (HINGLISH_TO_DEVANAGARI_MAP[lower]) {
      return HINGLISH_TO_DEVANAGARI_MAP[lower];
    }

    // Common elderly care suffix handles: e.g. "sharmaji" -> "शर्मा जी"
    if (lower.endsWith('ji') && lower.length > 2) {
      const stem = lower.slice(0, -2);
      if (HINGLISH_TO_DEVANAGARI_MAP[stem]) {
        return `${HINGLISH_TO_DEVANAGARI_MAP[stem]} जी`;
      }
    }

    return token;
  });

  // Re-join and add gentle pauses after honorifics and clauses for elderly comfort
  let result = convertedTokens.join('');
  result = result
    .replace(/शर्मा\s*जी([^\s,])/g, 'शर्मा जी, $1')
    .replace(/नमस्ते([^\s,])/g, 'नमस्ते, $1')
    .replace(/\s+/g, ' ')
    .trim();

  return result;
}

/**
 * Master speech preparation pipeline:
 * Prepares raw text into optimal pronunciation string based on target voice and language.
 */
export function prepareTextForSpeech(
  rawText: string,
  targetVoiceLang: string = 'hi-IN',
  userLanguagePreference: 'auto' | 'hinglish' | 'hindi' | 'english' = 'auto'
): {
  speechText: string;
  detectedLang: 'hindi' | 'hinglish' | 'english';
  usedDevanagari: boolean;
} {
  if (!rawText || !rawText.trim()) {
    return { speechText: '', detectedLang: 'english', usedDevanagari: false };
  }

  // Strip Markdown markers (*, _, #, `, [])
  let clean = rawText.replace(/[*_#`~[\]]/g, '').trim();

  const detected = detectLanguage(clean);

  const shouldTreatAsHindi =
    userLanguagePreference === 'hindi' ||
    userLanguagePreference === 'hinglish' ||
    (userLanguagePreference === 'auto' && (detected === 'hindi' || detected === 'hinglish')) ||
    targetVoiceLang.startsWith('hi');

  if (shouldTreatAsHindi && targetVoiceLang.startsWith('hi')) {
    // If targeted for hi-IN voice, convert Roman Hindi to Devanagari
    const devanagariText = convertHinglishToDevanagari(clean);
    return {
      speechText: devanagariText,
      detectedLang: detected,
      usedDevanagari: true,
    };
  }

  // For en-IN or fallback voices
  let englishNormalized = normalizeBloodPressure(clean, false);
  englishNormalized = normalizeBloodSugar(englishNormalized, false);
  englishNormalized = normalizeMedicalUnits(englishNormalized, false);

  // Add calming pauses after honorifics ending with 'ji' and Namaste
  englishNormalized = englishNormalized
    .replace(/\b([A-Za-z]+)\s+ji\b/gi, '$1 ji,')
    .replace(/\bNamaste\b/gi, 'Namaste,')
    .replace(/,\s*,/g, ',')
    .trim();

  return {
    speechText: englishNormalized,
    detectedLang: detected,
    usedDevanagari: false,
  };
}
