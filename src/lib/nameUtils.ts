/**
 * Utility functions for respectful user name extraction, honorific formatting,
 * and conversational greetings in ElderCare AI.
 */

/**
 * Extracts first name from a full name string.
 * Example: "Aradhya Varshney" -> "Aradhya"
 */
export function extractFirstName(fullName?: string | null): string {
  if (!fullName || typeof fullName !== 'string') return '';
  const trimmed = fullName.trim();
  if (!trimmed) return '';
  // Split on whitespace to get first name
  const firstWord = trimmed.split(/\s+/)[0];
  // Remove trailing punctuation if any
  return firstWord.replace(/[,\.!?]/g, '');
}

/**
 * Returns a respectful Indian honorific address:
 * - "Aradhya Varshney" -> "Aradhya ji"
 * - "Aradhya" -> "Aradhya ji"
 * - "Aradhya ji" -> "Aradhya ji" (prevents duplicate "ji")
 * - null / undefined / "" -> ""
 */
export function getHonorificName(fullName?: string | null): string {
  const firstName = extractFirstName(fullName);
  if (!firstName) return '';

  // If first name already ends with "ji" (case-insensitive)
  if (firstName.toLowerCase().endsWith('ji')) {
    return firstName;
  }
  return `${firstName} ji`;
}

/**
 * Returns dynamic greeting:
 * - If user's name is "Aradhya Varshney": "Namaste Aradhya ji"
 * - If user's name is "Aradhya": "Namaste Aradhya ji"
 * - If user's full name is not available: "Namaste ji"
 */
export function getGreeting(fullName?: string | null): string {
  const honorific = getHonorificName(fullName);
  if (honorific) {
    return `Namaste ${honorific}`;
  }
  return 'Namaste ji';
}

/**
 * Returns system instruction context for Gemini AI and Voice Assistant:
 * - If user's name is "Aradhya Varshney":
 *   "The user's name is Aradhya Varshney. Address the user naturally as Aradhya ji. Never address the user as Sharma ji."
 * - If name is not available:
 *   "Address the user respectfully using 'ji' (e.g. 'Namaste ji'). Never address the user as Sharma ji."
 */
export function getAiIdentityPrompt(fullName?: string | null): string {
  const trimmed = (fullName || '').trim();
  if (trimmed) {
    const honorific = getHonorificName(trimmed);
    return `The user's name is ${trimmed}. Address the user naturally as ${honorific}. Never address the user as Sharma ji unless their actual surname is Sharma.`;
  }
  return "Address the user respectfully using 'ji' (e.g. 'Namaste ji'). Never address the user as Sharma ji unless their actual surname is Sharma.";
}
