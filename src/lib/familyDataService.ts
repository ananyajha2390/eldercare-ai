import { supabase } from './supabase';
import { ElderlyProfile, FamilyMember, Medication, SmartAlert, HealthReading } from '../types';

const STORAGE_KEYS = {
  elderly: (userId: string) => `eldercare_elderly_${userId}`,
  family: (userId: string) => `eldercare_family_${userId}`,
  readings: (userId: string) => `eldercare_readings_${userId}`,
  meds: (userId: string) => `eldercare_meds_${userId}`,
  alerts: (userId: string) => `eldercare_alerts_${userId}`,
};

// ----------------------------------------------------------------------
// 1. ELDERLY PROFILE SERVICE
// ----------------------------------------------------------------------

export async function fetchElderlyProfile(ownerId: string): Promise<ElderlyProfile | null> {
  try {
    const { data, error } = await supabase
      .from('elderly_profiles')
      .select('*')
      .eq('owner_id', ownerId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      console.warn('Supabase fetchElderlyProfile error:', error.message);
    }

    if (data) {
      const profile: ElderlyProfile = {
        id: data.id,
        owner_id: data.owner_id,
        name: data.name,
        relationship: data.relationship || 'Family Member',
        age: Number(data.age) || 70,
        phone: data.phone || '',
        address: data.address || '',
        location: data.address || '',
        honorific: '',
        preferredLanguage: 'hinglish',
        primaryCaregiver: '',
        emergencyContact: '',
        created_at: data.created_at,
        updated_at: data.updated_at,
      };
      // Cache locally per user
      localStorage.setItem(STORAGE_KEYS.elderly(ownerId), JSON.stringify(profile));
      return profile;
    }
  } catch (err) {
    console.warn('Network or DB error fetching elderly profile:', err);
  }

  // Fallback to local cache for this user
  try {
    const cached = localStorage.getItem(STORAGE_KEYS.elderly(ownerId));
    if (cached) {
      return JSON.parse(cached);
    }
  } catch {
    // ignore
  }

  return null;
}

export async function saveElderlyProfile(
  ownerId: string,
  profileData: {
    id?: string;
    name: string;
    relationship: string;
    age: number;
    phone?: string;
    address?: string;
  }
): Promise<ElderlyProfile> {
  const payload = {
    owner_id: ownerId,
    name: profileData.name.trim(),
    relationship: profileData.relationship.trim(),
    age: Number(profileData.age) || 0,
    phone: profileData.phone?.trim() || null,
    address: profileData.address?.trim() || null,
    updated_at: new Date().toISOString(),
  };

  let savedId = profileData.id;

  try {
    if (savedId) {
      const { data, error } = await supabase
        .from('elderly_profiles')
        .update(payload)
        .eq('id', savedId)
        .eq('owner_id', ownerId)
        .select()
        .single();

      if (error) {
        console.warn('Supabase update elderly profile error:', error.message);
      } else if (data) {
        savedId = data.id;
      }
    } else {
      const { data, error } = await supabase
        .from('elderly_profiles')
        .insert({ ...payload, created_at: new Date().toISOString() })
        .select()
        .single();

      if (error) {
        console.warn('Supabase insert elderly profile error:', error.message);
      } else if (data) {
        savedId = data.id;
      }
    }
  } catch (err) {
    console.warn('Supabase save error:', err);
  }

  const result: ElderlyProfile = {
    id: savedId || `ep-${Date.now()}`,
    owner_id: ownerId,
    name: profileData.name.trim(),
    relationship: profileData.relationship.trim(),
    age: Number(profileData.age) || 0,
    phone: profileData.phone?.trim() || '',
    address: profileData.address?.trim() || '',
    location: profileData.address?.trim() || '',
    honorific: '',
    preferredLanguage: 'hinglish',
    primaryCaregiver: '',
    emergencyContact: '',
    updated_at: new Date().toISOString(),
  };

  try {
    localStorage.setItem(STORAGE_KEYS.elderly(ownerId), JSON.stringify(result));
  } catch {
    // ignore
  }

  return result;
}

// ----------------------------------------------------------------------
// 2. FAMILY CIRCLE SERVICE (CRUD)
// ----------------------------------------------------------------------

const AVATAR_COLORS = [
  'bg-emerald-500',
  'bg-indigo-500',
  'bg-teal-500',
  'bg-amber-500',
  'bg-rose-500',
  'bg-purple-500',
  'bg-blue-500',
];

export async function fetchFamilyMembers(ownerId: string, elderlyId?: string): Promise<FamilyMember[]> {
  try {
    let query = supabase
      .from('family_members')
      .select('*')
      .eq('owner_id', ownerId);

    if (elderlyId) {
      query = query.eq('elderly_id', elderlyId);
    }

    const { data, error } = await query.order('created_at', { ascending: true });

    if (error) {
      console.warn('Supabase fetchFamilyMembers error:', error.message);
      throw new Error(error.message);
    } else if (data) {
      const members: FamilyMember[] = data.map((item, index) => ({
        id: item.id,
        owner_id: item.owner_id,
        elderly_id: item.elderly_id,
        name: item.name,
        role: item.role || 'Family Member',
        relationship: item.relationship || 'Family',
        status: (item.status === 'offline' ? 'offline' : 'online') as 'online' | 'offline',
        phone: item.phone || '',
        location: item.location || '',
        email: item.email || '',
        is_primary_caregiver: Boolean(item.is_primary_caregiver),
        is_emergency_contact: Boolean(item.is_emergency_contact),
        avatarColor: AVATAR_COLORS[index % AVATAR_COLORS.length],
        created_at: item.created_at,
        updated_at: item.updated_at,
      }));

      return members;
    }
  } catch (err: any) {
    console.warn('Network error fetching family members:', err);
    throw err;
  }

  return [];
}

export async function addFamilyMember(
  ownerId: string,
  member: Omit<FamilyMember, 'id'>
): Promise<FamilyMember> {
  const isPrimary = Boolean(member.is_primary_caregiver);

  // Resolve elderly_id if not present
  let elderlyId = member.elderly_id;
  if (!elderlyId) {
    const { data: elderData } = await supabase
      .from('elderly_profiles')
      .select('id')
      .eq('owner_id', ownerId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (elderData?.id) {
      elderlyId = elderData.id;
    }
  }

  if (!elderlyId) {
    throw new Error('An Elderly Profile ID is required to add a family member. Please create or select an elderly profile first.');
  }

  // If new member is marked primary, unset primary on others
  if (isPrimary) {
    try {
      await supabase
        .from('family_members')
        .update({ is_primary_caregiver: false })
        .eq('owner_id', ownerId);
    } catch {
      // ignore
    }
  }

  const payload = {
    owner_id: ownerId,
    elderly_id: elderlyId,
    name: member.name.trim(),
    role: member.role?.trim() || 'Family Member',
    relationship: member.relationship?.trim() || 'Family',
    status: member.status || 'offline',
    phone: member.phone?.trim() || '',
    location: member.location?.trim() || null,
    email: member.email?.trim() || null,
    is_primary_caregiver: isPrimary,
    is_emergency_contact: Boolean(member.is_emergency_contact),
  };

  const { data, error } = await supabase
    .from('family_members')
    .insert(payload)
    .select()
    .single();

  if (error) {
    console.error('Supabase addFamilyMember error:', error);
    throw new Error(error.message);
  }

  return {
    id: data.id,
    owner_id: data.owner_id,
    elderly_id: data.elderly_id,
    name: data.name,
    role: data.role || 'Family Member',
    relationship: data.relationship || 'Family',
    status: (data.status === 'online' ? 'online' : 'offline') as 'online' | 'offline',
    phone: data.phone || '',
    location: data.location || '',
    email: data.email || '',
    is_primary_caregiver: Boolean(data.is_primary_caregiver),
    is_emergency_contact: Boolean(data.is_emergency_contact),
    avatarColor: AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)],
    created_at: data.created_at,
    updated_at: data.updated_at,
  };
}

export async function updateFamilyMember(
  memberId: string,
  ownerIdOrUpdates: string | Partial<FamilyMember>,
  maybeUpdates?: Partial<FamilyMember>
): Promise<FamilyMember> {
  const ownerId = typeof ownerIdOrUpdates === 'string' ? ownerIdOrUpdates : '';
  const updates: Partial<FamilyMember> =
    typeof ownerIdOrUpdates === 'object' ? ownerIdOrUpdates : (maybeUpdates || {});

  const isPrimary = Boolean(updates.is_primary_caregiver);

  if (isPrimary && ownerId) {
    try {
      await supabase
        .from('family_members')
        .update({ is_primary_caregiver: false })
        .eq('owner_id', ownerId)
        .neq('id', memberId);
    } catch {
      // ignore
    }
  }

  const payload: any = {
    updated_at: new Date().toISOString(),
  };
  if (updates.name !== undefined) payload.name = updates.name.trim();
  if (updates.role !== undefined) payload.role = updates.role.trim();
  if (updates.relationship !== undefined) payload.relationship = updates.relationship.trim();
  if (updates.status !== undefined) payload.status = updates.status;
  if (updates.phone !== undefined) payload.phone = updates.phone.trim();
  if (updates.location !== undefined) payload.location = updates.location.trim();
  if (updates.email !== undefined) payload.email = updates.email.trim();
  if (updates.is_primary_caregiver !== undefined) payload.is_primary_caregiver = isPrimary;
  if (updates.is_emergency_contact !== undefined) payload.is_emergency_contact = Boolean(updates.is_emergency_contact);

  try {
    let query = supabase.from('family_members').update(payload).eq('id', memberId);
    if (ownerId) {
      query = query.eq('owner_id', ownerId);
    }
    const { data, error } = await query.select().single();
    if (error) {
      console.error('Supabase updateFamilyMember error:', error);
      throw new Error(error.message);
    }
    return {
      id: data.id,
      owner_id: data.owner_id,
      elderly_id: data.elderly_id,
      name: data.name,
      role: data.role || 'Family Member',
      relationship: data.relationship || 'Family',
      status: (data.status === 'online' ? 'online' : 'offline') as 'online' | 'offline',
      phone: data.phone || '',
      location: data.location || '',
      email: data.email || '',
      is_primary_caregiver: Boolean(data.is_primary_caregiver),
      is_emergency_contact: Boolean(data.is_emergency_contact),
      created_at: data.created_at,
      updated_at: data.updated_at,
    };
  } catch (err: any) {
    console.error('Network error updating family member:', err);
    throw err;
  }
}

export async function deleteFamilyMember(memberId: string, ownerId?: string): Promise<boolean> {
  try {
    let query = supabase.from('family_members').delete().eq('id', memberId);
    if (ownerId) {
      query = query.eq('owner_id', ownerId);
    }
    const { error } = await query;
    if (error) {
      console.error('Supabase deleteFamilyMember error:', error);
      throw new Error(error.message);
    }
    return true;
  } catch (err: any) {
    console.error('Network error deleting family member:', err);
    throw err;
  }
}

async function fetchFamilyMembersFromCache(ownerId: string): Promise<FamilyMember[]> {
  try {
    const cached = localStorage.getItem(STORAGE_KEYS.family(ownerId));
    if (cached) return JSON.parse(cached);
  } catch {
    // ignore
  }
  return [];
}

// ----------------------------------------------------------------------
// 3. HEALTH READINGS SERVICE
// ----------------------------------------------------------------------

export interface TodayHealthData {
  latestBP: string | null;
  systolic: number | null;
  diastolic: number | null;
  latestSugar: string | null;
  mood: string | null;
  hydration: string | null;
  recordedAt: string | null;
  hasData: boolean;
}

export async function fetchTodayHealthData(ownerId: string): Promise<TodayHealthData> {
  try {
    const { data, error } = await supabase
      .from('health_readings')
      .select('*')
      .eq('owner_id', ownerId)
      .order('recorded_at', { ascending: false })
      .limit(10);

    if (error) {
      console.warn('Supabase fetchTodayHealthData error:', error.message);
    } else if (data && data.length > 0) {
      // Find latest reading with BP
      const bpRow = data.find((r) => r.blood_pressure_systolic && r.blood_pressure_diastolic);
      const sugarRow = data.find((r) => r.blood_sugar);
      const moodRow = data.find((r) => r.mood);
      const hydrationRow = data.find((r) => r.hydration);

      const latestBP = bpRow
        ? `${bpRow.blood_pressure_systolic} / ${bpRow.blood_pressure_diastolic}`
        : null;

      return {
        latestBP,
        systolic: bpRow ? Number(bpRow.blood_pressure_systolic) : null,
        diastolic: bpRow ? Number(bpRow.blood_pressure_diastolic) : null,
        latestSugar: sugarRow ? String(sugarRow.blood_sugar) : null,
        mood: moodRow ? moodRow.mood : null,
        hydration: hydrationRow ? hydrationRow.hydration : null,
        recordedAt: data[0].recorded_at || null,
        hasData: Boolean(latestBP || sugarRow || moodRow || hydrationRow),
      };
    }
  } catch (err) {
    console.warn('Error fetching health data:', err);
  }

  // Fallback cache check
  try {
    const cached = localStorage.getItem(STORAGE_KEYS.readings(ownerId));
    if (cached) {
      return JSON.parse(cached);
    }
  } catch {
    // ignore
  }

  return {
    latestBP: null,
    systolic: null,
    diastolic: null,
    latestSugar: null,
    mood: null,
    hydration: null,
    recordedAt: null,
    hasData: false,
  };
}

export async function addHealthReading(
  ownerId: string,
  reading: {
    blood_pressure_systolic?: number | null;
    blood_pressure_diastolic?: number | null;
    blood_sugar?: string | number | null;
    mood?: string | null;
    hydration?: string | null;
    elderly_id?: string | null;
  }
): Promise<void> {
  const payload = {
    owner_id: ownerId,
    elderly_id: reading.elderly_id || null,
    blood_pressure_systolic: reading.blood_pressure_systolic || null,
    blood_pressure_diastolic: reading.blood_pressure_diastolic || null,
    blood_sugar: reading.blood_sugar ? String(reading.blood_sugar) : null,
    mood: reading.mood || null,
    hydration: reading.hydration || null,
    recorded_at: new Date().toISOString(),
  };

  try {
    await supabase.from('health_readings').insert(payload);
  } catch (err) {
    console.warn('Error adding health reading:', err);
  }

  // Update local cache
  try {
    const current = await fetchTodayHealthData(ownerId);
    const updated: TodayHealthData = {
      latestBP:
        reading.blood_pressure_systolic && reading.blood_pressure_diastolic
          ? `${reading.blood_pressure_systolic} / ${reading.blood_pressure_diastolic}`
          : current.latestBP,
      systolic: reading.blood_pressure_systolic || current.systolic,
      diastolic: reading.blood_pressure_diastolic || current.diastolic,
      latestSugar: reading.blood_sugar ? String(reading.blood_sugar) : current.latestSugar,
      mood: reading.mood || current.mood,
      hydration: reading.hydration || current.hydration,
      recordedAt: new Date().toISOString(),
      hasData: true,
    };
    localStorage.setItem(STORAGE_KEYS.readings(ownerId), JSON.stringify(updated));
  } catch {
    // ignore
  }
}

// ----------------------------------------------------------------------
// 4. MEDICATIONS SERVICE
// ----------------------------------------------------------------------

export interface MedicationItem {
  id: string;
  medicine_name: string;
  dosage: string;
  is_taken: boolean;
  taken_at: string | null;
  created_at?: string;
}

export async function fetchMedications(ownerId: string): Promise<MedicationItem[]> {
  try {
    const { data, error } = await supabase
      .from('medications')
      .select('*')
      .eq('owner_id', ownerId)
      .order('created_at', { ascending: true });

    if (error) {
      console.warn('Supabase fetchMedications error:', error.message);
    } else if (data && data.length > 0) {
      const items: MedicationItem[] = data.map((d) => ({
        id: d.id,
        medicine_name: d.medicine_name,
        dosage: d.dosage || '',
        is_taken: Boolean(d.is_taken),
        taken_at: d.taken_at || null,
        created_at: d.created_at,
      }));
      localStorage.setItem(STORAGE_KEYS.meds(ownerId), JSON.stringify(items));
      return items;
    }
  } catch (err) {
    console.warn('Error fetching medications:', err);
  }

  // Check local cache
  try {
    const cached = localStorage.getItem(STORAGE_KEYS.meds(ownerId));
    if (cached) return JSON.parse(cached);
  } catch {
    // ignore
  }

  return [];
}

export async function addMedication(
  ownerId: string,
  med: { medicine_name: string; dosage: string; is_taken?: boolean; elderly_id?: string }
): Promise<MedicationItem> {
  const payload = {
    owner_id: ownerId,
    elderly_id: med.elderly_id || null,
    medicine_name: med.medicine_name.trim(),
    dosage: med.dosage.trim(),
    is_taken: Boolean(med.is_taken),
    taken_at: med.is_taken ? new Date().toISOString() : null,
    created_at: new Date().toISOString(),
  };

  let newId = `med-${Date.now()}`;
  try {
    const { data, error } = await supabase.from('medications').insert(payload).select().single();
    if (!error && data) {
      newId = data.id;
    }
  } catch (err) {
    console.warn('Error adding medication:', err);
  }

  const result: MedicationItem = {
    id: newId,
    medicine_name: med.medicine_name.trim(),
    dosage: med.dosage.trim(),
    is_taken: Boolean(med.is_taken),
    taken_at: med.is_taken ? new Date().toISOString() : null,
    created_at: new Date().toISOString(),
  };

  try {
    const current = await fetchMedications(ownerId);
    localStorage.setItem(STORAGE_KEYS.meds(ownerId), JSON.stringify([...current, result]));
  } catch {
    // ignore
  }

  return result;
}

export async function toggleMedication(
  medId: string,
  ownerId: string,
  isTaken: boolean
): Promise<void> {
  const takenAt = isTaken ? new Date().toISOString() : null;

  try {
    await supabase
      .from('medications')
      .update({ is_taken: isTaken, taken_at: takenAt })
      .eq('id', medId)
      .eq('owner_id', ownerId);
  } catch (err) {
    console.warn('Error toggling medication:', err);
  }

  try {
    const current = await fetchMedications(ownerId);
    const updated = current.map((m) =>
      m.id === medId ? { ...m, is_taken: isTaken, taken_at: takenAt } : m
    );
    localStorage.setItem(STORAGE_KEYS.meds(ownerId), JSON.stringify(updated));
  } catch {
    // ignore
  }
}

// ----------------------------------------------------------------------
// 5. ALERTS SERVICE
// ----------------------------------------------------------------------

export async function fetchAlerts(ownerId: string): Promise<SmartAlert[]> {
  try {
    const { data, error } = await supabase
      .from('alerts')
      .select('*')
      .eq('owner_id', ownerId)
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Supabase fetchAlerts error:', error.message);
    } else if (data && data.length > 0) {
      return data.map((d) => ({
        id: d.id,
        timestamp: d.created_at,
        timeAgo: 'Recently',
        title: d.title || 'Health Alert',
        readingType: 'Health',
        readingValue: '',
        message: d.message || '',
        severity: (d.severity as 'normal' | 'attention' | 'urgent') || 'attention',
        caregiverNotified: true,
        recipientName: 'Primary Caregiver',
        isDismissed: false,
        suggestedAction: 'Review reading and check in with elderly family member.',
      }));
    }
  } catch (err) {
    console.warn('Error fetching alerts:', err);
  }

  return [];
}

export const familyDataService = {
  fetchElderlyProfile,
  getElderlyProfile: fetchElderlyProfile,
  saveElderlyProfile,
  fetchFamilyMembers,
  getFamilyMembers: fetchFamilyMembers,
  addFamilyMember,
  updateFamilyMember,
  deleteFamilyMember,
  fetchTodayHealthData,
  getLatestHealthReading: fetchTodayHealthData,
  addHealthReading,
  saveHealthReading: addHealthReading,
  fetchMedications,
  getMedications: fetchMedications,
  addMedication,
  saveMedication: addMedication,
  toggleMedication,
  fetchAlerts,
};
