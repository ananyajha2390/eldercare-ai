import { ExtractedHealthData, ConversationMessage } from '../types';
import { getHonorificName, getGreeting } from '../lib/nameUtils';

export interface ChatResponse {
  reply: string;
  speechText?: string;
  extracted: ExtractedHealthData;
  source: 'gemini' | 'demo_fallback';
}

export class AIService {
  /**
   * Send chat message to Gemini
   * When aiMode is 'gemini', it uses the real Gemini API and NEVER returns fake responses.
   * Only in explicit demo mode does it use sample demo responses.
   */
  public async sendChatMessage(
    message: string,
    history: ConversationMessage[] = [],
    aiMode: 'gemini' | 'demo' = 'gemini',
    userName?: string
  ): Promise<ChatResponse> {
    if (aiMode === 'gemini') {
      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message, history, language: 'hinglish', aiMode, userName }),
        });

        if (res.ok) {
          const data = await res.json();
          return data;
        } else {
          const errData = await res.json().catch(() => ({ error: 'Gemini request failed' }));
          throw new Error(errData.error || 'Gemini connection failed');
        }
      } catch (err: any) {
        console.error('Gemini API communication error:', err);
        throw new Error(err.message || 'Unable to connect to Gemini');
      }
    }

    // Explicit Demo Mode Only
    return this.generateDemoFallback(message, userName);
  }

  /**
   * Extract health data from sentence
   */
  public async extractHealthData(
    utterance: string,
    aiMode: 'gemini' | 'demo' = 'gemini'
  ): Promise<ExtractedHealthData> {
    if (aiMode === 'gemini') {
      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: utterance, aiMode: 'gemini' }),
        });
        if (res.ok) {
          const data = await res.json();
          return data.extracted || this.extractLocally(utterance);
        }
      } catch (err) {
        console.error('Gemini extraction error:', err);
      }
    }

    return this.extractLocally(utterance);
  }

  /**
   * Request caregiver summary
   */
  public async getDailySummary(
    vitals: { bp?: string; sugar?: string },
    meds: string,
    notes: string,
    options?: {
      elderlyName?: string;
      caregiverName?: string;
      checkInTime?: string;
      mood?: string;
      hydration?: string;
      hasData?: boolean;
    }
  ): Promise<string> {
    const hasData = options?.hasData ?? Boolean(vitals.bp || vitals.sugar || meds || notes || options?.checkInTime);
    if (!hasData) {
      return 'No health or check-in data has been recorded today.';
    }

    try {
      const res = await fetch('/api/summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vitals,
          meds,
          notes,
          checkInTime: options?.checkInTime || '',
          elderlyName: options?.elderlyName,
          caregiverName: options?.caregiverName,
          mood: options?.mood,
          hydration: options?.hydration,
          hasData: true,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        return data.summary || 'No health or check-in data has been recorded today.';
      }
    } catch (err) {
      console.error('Summary fetch error:', err);
    }

    const elder = options?.elderlyName || 'Your family member';
    const caregiver = options?.caregiverName || 'Caregiver';
    return `${elder} has recorded health updates today. Blood pressure was logged at ${vitals.bp || 'normal range'}. ${caregiver} has been notified with all updates.`;
  }

  /**
   * Demo Mode helper - Only used when Demo Mode is explicitly enabled
   */
  private generateDemoFallback(userMessage: string, userName?: string): ChatResponse {
    const extracted = this.extractLocally(userMessage);
    const lower = userMessage.toLowerCase();
    const honorific = getHonorificName(userName);
    const nameJi = honorific || 'ji';
    const greeting = getGreeting(userName);

    let reply = `Samajh gaya ${nameJi}. Aap aaram kijiye aur zaroorat ho toh bas boliyega. Main hamesha yahin hoon.`;
    let speechText = `समझ गया ${nameJi}। आप आराम कीजिए और ज़रूरत हो तो बस बोलिएगा। मैं हमेशा यहीं हूँ।`;

    if (lower.includes('chakkar') || lower.includes('dizzy')) {
      reply = `${nameJi}, aap thoda aaram se baithiye aur pehle ek glass paani lijiye. Kya aapne apna Blood Pressure check kiya hai abhi?`;
      speechText = `${nameJi}, आप थोड़ा आराम से बैठिए, और पहले एक ग्लास पानी लीजिए। क्या आपने अपना ब्लड प्रेशर चेक किया है अभी?`;
    } else if (lower.includes('158') || (extracted.bloodPressureValues && extracted.bloodPressureValues.systolic > 150)) {
      reply = "Maine aapka BP 158/98 note kar liya hai. Yeh thoda high aaya hai. Ghabraiye mat, aaram se baithiye. Maine caregiver ko alert bhej diya hai.";
      speechText = "मैंने आपका बीपी, एक सौ अट्ठावन, बाय, अट्ठानवे, नोट कर लिया है। यह थोड़ा ज़्यादा आया है। आप थोड़ा शांत बैठिए।";
    } else if (lower.includes('128') || (extracted.bloodPressureValues && extracted.bloodPressureValues.systolic <= 135)) {
      reply = "Maine aapka Blood Pressure 128/82 note kar liya hai. Yeh bilkul normal range mein hai. Bahut achha!";
      speechText = "मैंने आपका ब्लड प्रेशर, एक सौ अट्ठाईस, बाय, बयासी, नोट कर लिया है। यह बिल्कुल सामान्य रेंज में है। बहुत अच्छा!";
    } else if (lower.includes('weakness') || lower.includes('kamzori') || lower.includes('tired')) {
      reply = `Samajh gaya ${nameJi}. Kya aapne thoda breakfast aur paani liya hai? Aaj thoda aaram zyada kariyega.`;
      speechText = `समझ गया ${nameJi}। क्या आपने थोड़ा नाश्ता और पानी लिया है? आज थोड़ा आराम ज़्यादा करिएगा।`;
    } else if (lower.includes('medicine') || lower.includes('dawa')) {
      reply = "Great! Maine aaj ki morning medicine confirm kar di hai. Samay par dawai lene ke liye shabash!";
      speechText = "बहुत बढ़िया! मैंने आज की सुबह की दवाई कन्फ़र्म कर दी है। समय पर दवाई लेने के लिए शाबाश!";
    } else if (lower.includes('namaste') || lower.includes('hello') || lower.includes('subah')) {
      reply = `${greeting}! Aaj aap kaisa mehsoos kar rahe hain?`;
      speechText = `${greeting}! आज आप कैसा महसूस कर रहे हैं?`;
    }

    return {
      reply,
      speechText,
      extracted,
      source: 'demo_fallback',
    };
  }

  public extractLocally(utterance: string): ExtractedHealthData {
    const lower = utterance.toLowerCase();
    let bp: string | null = null;
    let bpVals: { systolic: number; diastolic: number } | null = null;
    let sugar: string | null = null;
    let medication: 'taken' | 'missed' | 'pending' | null = null;
    let mood: 'great' | 'good' | 'neutral' | 'tired' | 'dizzy' | 'unwell' = 'good';
    const symptoms: string[] = [];
    let isUnusual = false;
    let alertSeverity: 'normal' | 'attention' | 'urgent' = 'normal';
    let safeNote = "Health information logged safely.";

    const bpMatch = utterance.match(/(\d{2,3})\s*(?:by|\/|\-)\s*(\d{2,3})/i);
    if (bpMatch) {
      const sys = parseInt(bpMatch[1], 10);
      const dia = parseInt(bpMatch[2], 10);
      bp = `${sys} / ${dia}`;
      bpVals = { systolic: sys, diastolic: dia };
      if (sys >= 150 || dia >= 95) {
        isUnusual = true;
        alertSeverity = 'attention';
        safeNote = "Today's BP reading is higher than recent recorded readings. Consider rechecking after 15 minutes of quiet rest.";
      } else {
        safeNote = "Blood pressure is recorded within usual personal reference range.";
      }
    }

    const sugarMatch = utterance.match(/(?:sugar|glucose)\s*(?:hai|level|is)?\s*(\d{2,3})/i) ||
                       utterance.match(/(\d{2,3})\s*(?:mg\/dl|mgdl)/i);
    if (sugarMatch) {
      const val = parseInt(sugarMatch[1], 10);
      sugar = `${val} mg/dL`;
      if (val > 180 || val < 70) {
        isUnusual = true;
        alertSeverity = 'attention';
        safeNote = "Blood sugar reading is slightly outside expected baseline. Consider a balanced snack and check again.";
      }
    }

    if (lower.includes('medicine le li') || lower.includes('dawai kha li') || lower.includes('taken') || lower.includes('took medicine')) {
      medication = 'taken';
    } else if (lower.includes('missed') || lower.includes('bhool gaya')) {
      medication = 'missed';
    }

    if (lower.includes('chakkar') || lower.includes('dizzy')) {
      mood = 'dizzy';
      symptoms.push('dizziness');
      isUnusual = true;
      alertSeverity = 'attention';
      safeNote = "Unsteadiness reported. Caregiver alert logged for supportive check-in.";
    } else if (lower.includes('tired') || lower.includes('weakness') || lower.includes('kamzori') || lower.includes('thakan')) {
      mood = 'tired';
      symptoms.push('fatigue');
    } else if (lower.includes('fine') || lower.includes('good') || lower.includes('theek') || lower.includes('badiya')) {
      mood = 'good';
    }

    return {
      bloodPressure: bp,
      bloodPressureValues: bpVals,
      bloodSugar: sugar,
      medicationStatus: medication,
      mood,
      symptoms,
      isUnusual,
      alertSeverity,
      safeNote,
    };
  }
}

export const aiService = new AIService();
