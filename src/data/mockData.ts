import {
  ElderlyProfile,
  Medication,
  HealthReading,
  SmartAlert,
  FamilyMember,
  ConversationInsight,
  ConversationMessage,
  CallScheduleItem,
  CallHistoryItem
} from '../types';

export const initialProfile: ElderlyProfile = {
  id: 'elder-01',
  name: 'Sunita Sharma',
  honorific: 'Sharma ji',
  age: 74,
  location: 'Vasant Kunj, New Delhi',
  preferredLanguage: 'hinglish',
  primaryCaregiver: 'Rahul Sharma (Son)',
  emergencyContact: '+91 98110 43210',
};

export const initialMedications: Medication[] = [
  {
    id: 'med-1',
    name: 'Blood Pressure Tablet (Telmisartan 40mg)',
    dosage: '1 Tablet after light breakfast',
    time: '08:00 AM',
    instruction: 'Take with half glass warm water',
    status: 'taken',
    takenAt: '08:15 AM',
    category: 'cardio',
  },
  {
    id: 'med-2',
    name: 'Diabetes Medicine (Metformin 500mg)',
    dosage: '1 Tablet after lunch',
    time: '01:00 PM',
    instruction: 'Take after meal',
    status: 'pending',
    category: 'diabetes',
  },
  {
    id: 'med-3',
    name: 'Evening Supplement (Calcium + Vitamin D3)',
    dosage: '1 Tablet after dinner',
    time: '08:00 PM',
    instruction: 'Before bed',
    status: 'upcoming',
    category: 'supplement',
  },
];

export const initialFamilyMembers: FamilyMember[] = [
  {
    id: 'fam-1',
    name: 'Rahul Sharma',
    role: 'Primary Caregiver',
    relationship: 'Son (Bengaluru)',
    status: 'online',
    avatarColor: 'bg-emerald-600',
    phone: '+91 98110 43210',
  },
  {
    id: 'fam-2',
    name: 'Priya Sharma',
    role: 'Family Member',
    relationship: 'Daughter (London)',
    status: 'offline',
    lastSeen: '2 hours ago',
    avatarColor: 'bg-indigo-600',
    phone: '+44 7700 900123',
  },
  {
    id: 'fam-3',
    name: 'Nurse Ananya',
    role: 'Visiting Nurse',
    relationship: 'Care Partner (Daily 5 PM)',
    status: 'online',
    avatarColor: 'bg-teal-600',
    phone: '+91 94231 77889',
  },
];

export const initialAlerts: SmartAlert[] = [
  {
    id: 'alert-sample-1',
    timestamp: '10:33 AM',
    timeAgo: 'Just now',
    title: 'Routine Check-in Complete',
    readingType: 'Morning Wellness',
    readingValue: 'Stable Vitals',
    message: 'Mom completed her morning conversation naturally. Mood is relaxed and breakfast confirmed.',
    severity: 'normal',
    caregiverNotified: true,
    recipientName: 'Rahul',
    isDismissed: false,
    suggestedAction: 'No immediate action required.',
  },
];

export const initialInsights: ConversationInsight[] = [
  {
    id: 'ins-1',
    date: 'Today, 10:32 AM',
    observation: 'User mentioned feeling slightly tired and requested a brief afternoon rest reminder.',
    category: 'fatigue',
    significance: 'routine',
    safetyGuidance: 'Common with slight sleep disruption. Supportive afternoon rest scheduled.',
  },
  {
    id: 'ins-2',
    date: 'Yesterday, 4:15 PM',
    observation: 'User asked twice about the evening walk timing during conversation.',
    category: 'recall',
    significance: 'noteworthy',
    safetyGuidance: 'Repeated changes in conversation patterns may be worth gently noting over time.',
  },
  {
    id: 'ins-3',
    date: '3 days ago',
    observation: 'Medication confirmation delayed by 45 minutes after morning tea.',
    category: 'routine',
    significance: 'routine',
    safetyGuidance: 'Successfully resolved via audio voice reminder.',
  },
];

export const initialConversation: ConversationMessage[] = [
  {
    id: 'msg-1',
    role: 'assistant',
    text: 'Namaste Sharma ji! Good morning. Aaj aapki tabiyat kaisi mehsoos ho rahi hai?',
    timestamp: '10:30 AM',
  },
  {
    id: 'msg-2',
    role: 'user',
    text: 'Namaste beta. Sab theek hai, thodi der pehle breakfast aur paani le liya tha.',
    timestamp: '10:31 AM',
    extracted: {
      bloodPressure: null,
      bloodSugar: null,
      medicationStatus: null,
      mood: 'good',
      symptoms: [],
      isUnusual: false,
      alertSeverity: 'normal',
      safeNote: 'Healthy morning routine acknowledged.',
    },
  },
  {
    id: 'msg-3',
    role: 'assistant',
    text: 'Bahut badiya Sharma ji! Kya aapne subah wali Blood Pressure ki dawai le li hai?',
    timestamp: '10:31 AM',
  },
  {
    id: 'msg-4',
    role: 'user',
    text: 'Haan, Telmisartan le li hai. Aur mera BP 128 by 82 aaya tha.',
    timestamp: '10:32 AM',
    extracted: {
      bloodPressure: '128 / 82',
      bloodPressureValues: { systolic: 128, diastolic: 82 },
      bloodSugar: null,
      medicationStatus: 'taken',
      mood: 'good',
      symptoms: [],
      isUnusual: false,
      alertSeverity: 'normal',
      safeNote: 'Blood pressure is within typical baseline limits.',
    },
  },
  {
    id: 'msg-5',
    role: 'assistant',
    text: 'Great! Maine BP 128/82 aur morning medicine confirm kar di hai. Rahul ji ko bhi dashboard par update mil gaya hai. Khush rahiye!',
    timestamp: '10:32 AM',
  },
];

export const healthTrendsData = {
  days7: {
    bp: [
      { day: 'Mon', systolic: 124, diastolic: 80, time: '8:30 AM' },
      { day: 'Tue', systolic: 126, diastolic: 82, time: '8:15 AM' },
      { day: 'Wed', systolic: 130, diastolic: 84, time: '8:45 AM' },
      { day: 'Thu', systolic: 125, diastolic: 81, time: '8:20 AM' },
      { day: 'Fri', systolic: 128, diastolic: 82, time: '8:30 AM' },
      { day: 'Sat', systolic: 127, diastolic: 80, time: '8:35 AM' },
      { day: 'Sun (Today)', systolic: 128, diastolic: 82, time: '10:32 AM' },
    ],
    sugar: [
      { day: 'Mon', fasting: 108, postMeal: 138 },
      { day: 'Tue', fasting: 112, postMeal: 144 },
      { day: 'Wed', fasting: 110, postMeal: 140 },
      { day: 'Thu', fasting: 114, postMeal: 145 },
      { day: 'Fri', fasting: 109, postMeal: 139 },
      { day: 'Sat', fasting: 115, postMeal: 148 },
      { day: 'Sun', fasting: 111, postMeal: 142 },
    ],
    adherence: [
      { day: 'Mon', rate: 100 },
      { day: 'Tue', rate: 100 },
      { day: 'Wed', rate: 100 },
      { day: 'Thu', rate: 100 },
      { day: 'Fri', rate: 67 },
      { day: 'Sat', rate: 100 },
      { day: 'Sun', rate: 100 },
    ],
    mood: [
      { day: 'Mon', score: 90, label: 'Cheerful' },
      { day: 'Tue', score: 85, label: 'Good' },
      { day: 'Wed', score: 78, label: 'Fair' },
      { day: 'Thu', score: 88, label: 'Good' },
      { day: 'Fri', score: 70, label: 'Tired' },
      { day: 'Sat', score: 92, label: 'Cheerful' },
      { day: 'Sun', score: 84, label: 'Good' },
    ],
  },
  days30: {
    bpAverage: '127 / 81',
    sugarAverage: '140 mg/dL',
    adherenceOverall: '96%',
    checkInCompletion: '98%',
  },
};

export const initialCallSchedule: CallScheduleItem[] = [
  {
    id: 'sched-1',
    time: '08:00 AM',
    title: 'Morning Check-in',
    status: 'completed',
    duration: '2m 18s',
    purpose: 'Daily wellbeing, BP vitals recording, and morning medicine confirmation',
    language: 'hinglish',
    enabled: true,
  },
  {
    id: 'sched-2',
    time: '02:00 PM',
    title: 'Afternoon Check-in',
    status: 'scheduled',
    purpose: 'Lunch diabetes medicine check and hydration reminder',
    language: 'hinglish',
    enabled: true,
  },
  {
    id: 'sched-3',
    time: '08:00 PM',
    title: 'Evening Check-in',
    status: 'scheduled',
    purpose: 'Dinner supplement check, sleep wellness check, and daily reassurance',
    language: 'hinglish',
    enabled: true,
  },
];

export const initialCallHistory: CallHistoryItem[] = [
  {
    id: 'call-hist-1',
    timestamp: 'Today, 08:02 AM',
    title: 'Morning Check-in',
    status: 'completed',
    duration: '2m 18s',
    summary: 'Duration: 2m 18s | Status: ✓ Completed | Medication: ✓ Confirmed | Wellbeing: Slightly tired | Health: BP recorded | AI Observation: User mentioned feeling slightly weak.',
    caregiverSummary: "Sharma ji completed the morning check-in and confirmed their medication. They mentioned feeling slightly weak and reported a BP reading that was higher than recent readings.",
    transcript: [
      { role: 'ai', text: 'Namaste Sharma ji. Aaj aapki tabiyat kaisi hai?', time: '08:02 AM' },
      { role: 'user', text: 'Thodi weakness hai.', time: '08:02 AM' },
      { role: 'ai', text: 'Kya aapne breakfast kar liya?', time: '08:03 AM' },
      { role: 'user', text: 'Haan.', time: '08:03 AM' },
      { role: 'ai', text: 'Aaj ki medicine le li?', time: '08:03 AM' },
      { role: 'user', text: 'Haan.', time: '08:04 AM' },
    ],
    healthEvents: [
      { type: 'Blood Pressure', value: '128 / 82 mmHg' },
    ],
    medicationEvents: [
      { name: 'Blood Pressure Tablet (Telmisartan 40mg)', status: 'confirmed', time: '08:04 AM' },
    ],
    wellbeingObservation: 'User reported feeling slightly weak in the morning. Encouraged light rest and hydration.',
    alertsGenerated: ['Routine Check-in Complete'],
  },
  {
    id: 'call-hist-2',
    timestamp: 'Yesterday, 02:05 PM',
    title: 'Afternoon Check-in',
    status: 'completed',
    duration: '1m 46s',
    summary: 'Duration: 1m 46s | Status: ✓ Completed | Medication: ✓ Confirmed | Wellbeing: Good | Health: Blood sugar 142 mg/dL',
    caregiverSummary: 'Sharma ji completed their afternoon check-in smoothly. Metformin 500mg was confirmed taken after lunch with normal post-lunch glucose.',
    transcript: [
      { role: 'ai', text: 'Namaste Sharma ji! Dopahar ka khana kaisa raha?', time: '02:05 PM' },
      { role: 'user', text: 'Khana achha tha beta, abhi daal-roti khayi.', time: '02:05 PM' },
      { role: 'ai', text: 'Diabetes wali Metformin le li?', time: '02:06 PM' },
      { role: 'user', text: 'Haan, abhi le li. Aur meri sugar 142 aayi.', time: '02:06 PM' },
      { role: 'ai', text: 'Bahut badhiya! Maine note kar liya hai. Paani zaroor peete rahiye.', time: '02:06 PM' },
    ],
    healthEvents: [
      { type: 'Blood Sugar', value: '142 mg/dL' },
    ],
    medicationEvents: [
      { name: 'Diabetes Medicine (Metformin 500mg)', status: 'confirmed', time: '02:06 PM' },
    ],
    wellbeingObservation: 'User sounded pleasant and active after afternoon lunch.',
    alertsGenerated: [],
  },
  {
    id: 'call-hist-3',
    timestamp: 'Yesterday, 08:00 PM',
    title: 'Evening Check-in',
    status: 'completed',
    duration: '2m 04s',
    summary: 'Duration: 2m 04s | Status: ✓ Completed | Medication: ✓ Confirmed | Wellbeing: Relaxed',
    caregiverSummary: 'Sharma ji completed their evening check-in and took their calcium supplement before bed.',
    transcript: [
      { role: 'ai', text: 'Namaste Sharma ji! Sham ka check-in time hai. Sab theek hai?', time: '08:00 PM' },
      { role: 'user', text: 'Sab theek hai beta, bas soone ki tayyari kar raha hoon.', time: '08:01 PM' },
      { role: 'ai', text: 'Calcium wali dawai le li?', time: '08:01 PM' },
      { role: 'user', text: 'Haan, doodh ke sath le li.', time: '08:02 PM' },
      { role: 'ai', text: 'Shubh ratri Sharma ji! Achhi neend lijiye.', time: '08:02 PM' },
    ],
    healthEvents: [],
    medicationEvents: [
      { name: 'Evening Supplement (Calcium + Vitamin D3)', status: 'confirmed', time: '08:02 PM' },
    ],
    wellbeingObservation: 'Relaxed bedtime conversation. No pain or complaints noted.',
    alertsGenerated: [],
  },
];
