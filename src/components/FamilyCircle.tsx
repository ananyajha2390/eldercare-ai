import React, { useState, useEffect } from 'react';
import { FamilyMember } from '../types';
import { supabase } from '../lib/supabase';
import {
  Users,
  PhoneCall,
  MessageSquare,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  X,
  Send,
  ShieldCheck,
  Phone,
  MapPin,
  HeartHandshake,
  AlertCircle
} from 'lucide-react';

interface FamilyCircleProps {
  members?: FamilyMember[];
  elderlyId?: string;
  onAddMember?: (member: Omit<FamilyMember, 'id'>) => Promise<void> | void;
  onUpdateMember?: (id: string, updates: Partial<FamilyMember>) => Promise<void> | void;
  onDeleteMember?: (id: string) => Promise<void> | void;
  onRefresh?: () => Promise<void> | void;
  onCallMember?: (member: FamilyMember) => void;
}

const ROLE_OPTIONS = [
  'Primary Caregiver',
  'Family Member',
  'Visiting Nurse',
  'Secondary Caregiver',
  'Doctor / Specialist',
  'Emergency Contact',
];

const RELATIONSHIP_OPTIONS = [
  'Son',
  'Daughter',
  'Spouse',
  'Sibling',
  'Grandchild',
  'Nurse',
  'Doctor',
  'Neighbor',
  'Relative',
  'Other',
];

const AVATAR_COLORS = [
  'bg-emerald-500',
  'bg-indigo-500',
  'bg-teal-500',
  'bg-amber-500',
  'bg-rose-500',
  'bg-purple-500',
  'bg-blue-500',
];

export const FamilyCircle: React.FC<FamilyCircleProps> = ({
  members = [],
  elderlyId,
  onAddMember,
  onUpdateMember,
  onDeleteMember,
  onRefresh,
  onCallMember,
}) => {
  const [circleMembers, setCircleMembers] = useState<FamilyMember[]>(members);
  const [activeModal, setActiveModal] = useState<{
    type: 'message' | 'add' | 'edit' | 'delete';
    member?: FamilyMember;
  } | null>(null);

  const [messageInput, setMessageInput] = useState('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form states for Add / Edit
  const [formName, setFormName] = useState('');
  const [formRelationship, setFormRelationship] = useState('Son');
  const [formRole, setFormRole] = useState('Family Member');
  const [formPhone, setFormPhone] = useState('');
  const [formLocation, setFormLocation] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formStatus, setFormStatus] = useState<'online' | 'offline'>('online');
  const [formIsPrimary, setFormIsPrimary] = useState(false);
  const [formIsEmergency, setFormIsEmergency] = useState(false);

  const displayedMembers = circleMembers.length > 0 ? circleMembers : members;

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // 10. Load members using supabase.from('family_members').select('*') filtered by owner_id / elderly_id
  const loadMembers = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        if (members && members.length > 0) {
          setCircleMembers(members);
        }
        return;
      }

      let query = supabase
        .from('family_members')
        .select('*')
        .eq('owner_id', user.id);

      if (elderlyId) {
        query = query.eq('elderly_id', elderlyId);
      }

      const { data, error } = await query.order('created_at', { ascending: true });

      if (error) {
        console.warn('Supabase loadMembers error:', error.message);
      } else if (data) {
        const mapped: FamilyMember[] = data.map((item, index) => ({
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
        setCircleMembers(mapped);
      }
    } catch (err) {
      console.warn('Network error loading family members:', err);
    }
  };

  useEffect(() => {
    loadMembers();
  }, [elderlyId]);

  useEffect(() => {
    if (members && members.length > 0) {
      setCircleMembers(members);
    }
  }, [members]);

  const handleOpenAdd = () => {
    setFormError(null);
    setFormName('');
    setFormRelationship('Son');
    setFormRole(displayedMembers.length === 0 ? 'Primary Caregiver' : 'Family Member');
    setFormPhone('');
    setFormLocation('');
    setFormEmail('');
    setFormStatus('online');
    setFormIsPrimary(displayedMembers.length === 0);
    setFormIsEmergency(displayedMembers.length === 0);
    setActiveModal({ type: 'add' });
  };

  const handleOpenEdit = (member: FamilyMember) => {
    setFormError(null);
    setFormName(member.name);
    setFormRelationship(member.relationship);
    setFormRole(member.role);
    setFormPhone(member.phone);
    setFormLocation(member.location || '');
    setFormEmail(member.email || '');
    setFormStatus(member.status);
    setFormIsPrimary(Boolean(member.is_primary_caregiver));
    setFormIsEmergency(Boolean(member.is_emergency_contact));
    setActiveModal({ type: 'edit', member });
  };

  const handleSaveMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formName.trim() || !formPhone.trim()) {
      setFormError('Please enter both full name and contact phone.');
      showToast('Please enter both full name and contact phone.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Use the currently authenticated Supabase user:
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setFormError('You must be logged in to add or edit family members.');
        showToast('You must be logged in to add or edit family members.', 'error');
        setIsSubmitting(false);
        return;
      }

      // 3. Use the currently selected elderly profile ID for elderly_id. Do not invent a UUID.
      let targetElderlyId = elderlyId;
      if (!targetElderlyId) {
        const { data: elderData, error: elderErr } = await supabase
          .from('elderly_profiles')
          .select('id')
          .eq('owner_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (elderErr) {
          setFormError(`Failed to query elderly profile: ${elderErr.message}`);
          showToast(elderErr.message, 'error');
          setIsSubmitting(false);
          return;
        }

        if (elderData?.id) {
          targetElderlyId = elderData.id;
        }
      }

      if (!targetElderlyId) {
        setFormError('No elderly profile found. Please configure an Elderly Profile first before adding family members.');
        showToast('Please configure an Elderly Profile first before adding family members.', 'error');
        setIsSubmitting(false);
        return;
      }

      // If designating as primary caregiver, unset primary on others
      if (formIsPrimary) {
        try {
          await supabase
            .from('family_members')
            .update({ is_primary_caregiver: false })
            .eq('owner_id', user.id);
        } catch {
          // ignore
        }
      }

      if (activeModal?.type === 'add') {
        // 4. Map the form fields correctly:
        // full name -> name
        // relationship -> relationship
        // role -> role
        // phone -> phone
        // email -> email
        // location -> location
        // status -> status
        // primary caregiver -> is_primary_caregiver
        // emergency contact -> is_emergency_contact
        // 2. Set owner_id to user.id
        const newMemberPayload = {
          owner_id: user.id,
          elderly_id: targetElderlyId,
          name: formName.trim(),
          relationship: formRelationship.trim(),
          role: formRole.trim(),
          phone: formPhone.trim(),
          email: formEmail.trim() || null,
          location: formLocation.trim() || null,
          status: formStatus,
          is_primary_caregiver: formIsPrimary,
          is_emergency_contact: formIsEmergency,
        };

        const { error: insertError } = await supabase
          .from('family_members')
          .insert(newMemberPayload)
          .select()
          .single();

        if (insertError) {
          console.error('Supabase family_members insert error:', insertError);
          // 7. Show the actual Supabase error to the user if the insert fails.
          setFormError(insertError.message);
          showToast(`Error: ${insertError.message}`, 'error');
          setIsSubmitting(false);
          return; // Keep modal open
        }

        // 6. After successful insert, refresh/reload the Family Circle list from Supabase so the newly added member appears immediately.
        await loadMembers();
        if (onRefresh) {
          await onRefresh();
        }
        if (onAddMember) {
          try {
            await onAddMember({
              name: formName.trim(),
              relationship: formRelationship.trim(),
              role: formRole.trim(),
              phone: formPhone.trim(),
              location: formLocation.trim() || undefined,
              email: formEmail.trim() || undefined,
              status: formStatus,
              is_primary_caregiver: formIsPrimary,
              is_emergency_contact: formIsEmergency,
              elderly_id: targetElderlyId,
              owner_id: user.id,
            });
          } catch {
            // callback notification only
          }
        }

        showToast(`Added ${formName.trim()} to your Family Circle.`, 'success');
        setActiveModal(null);
      } else if (activeModal?.type === 'edit' && activeModal.member) {
        const updatePayload: any = {
          name: formName.trim(),
          relationship: formRelationship.trim(),
          role: formRole.trim(),
          phone: formPhone.trim(),
          location: formLocation.trim() || null,
          email: formEmail.trim() || null,
          status: formStatus,
          is_primary_caregiver: formIsPrimary,
          is_emergency_contact: formIsEmergency,
          updated_at: new Date().toISOString(),
        };

        const { error: updateError } = await supabase
          .from('family_members')
          .update(updatePayload)
          .eq('id', activeModal.member.id)
          .eq('owner_id', user.id);

        if (updateError) {
          console.error('Supabase family_members update error:', updateError);
          setFormError(updateError.message);
          showToast(`Error: ${updateError.message}`, 'error');
          setIsSubmitting(false);
          return;
        }

        await loadMembers();
        if (onRefresh) {
          await onRefresh();
        }
        if (onUpdateMember) {
          try {
            await onUpdateMember(activeModal.member.id, updatePayload);
          } catch {
            // ignore
          }
        }

        showToast(`Updated details for ${formName.trim()}.`, 'success');
        setActiveModal(null);
      }
    } catch (err: any) {
      console.error('Error saving family member:', err);
      const msg = err?.message || 'Could not save family member. Please try again.';
      setFormError(msg);
      showToast(`Error: ${msg}`, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteMember = async () => {
    if (!activeModal?.member) return;
    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      let query = supabase.from('family_members').delete().eq('id', activeModal.member.id);
      if (user) {
        query = query.eq('owner_id', user.id);
      }
      const { error: deleteError } = await query;
      if (deleteError) {
        console.error('Supabase delete error:', deleteError);
        showToast(`Error: ${deleteError.message}`, 'error');
      } else {
        showToast(`Removed ${activeModal.member.name} from Family Circle.`, 'success');
        await loadMembers();
        if (onRefresh) await onRefresh();
        if (onDeleteMember) {
          try {
            await onDeleteMember(activeModal.member.id);
          } catch {
            // ignore
          }
        }
      }
      setActiveModal(null);
    } catch (err: any) {
      console.error('Error deleting member:', err);
      showToast(`Error: ${err?.message || 'Could not remove member'}`, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() || !activeModal?.member) return;

    showToast(`Message sent to ${activeModal.member.name}: "${messageInput}"`, 'success');
    setMessageInput('');
    setActiveModal(null);
  };

  const handleSimulateCall = (member: FamilyMember) => {
    if (onCallMember) {
      onCallMember(member);
    } else {
      showToast(`Initiating direct voice call to ${member.name} (${member.phone})...`, 'success');
    }
  };

  return (
    <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs mb-8" id="family-circle">
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 text-white px-4 py-3 rounded-2xl shadow-xl flex items-center gap-3 border animate-in fade-in slide-in-from-bottom-3 ${
          toast.type === 'error' ? 'bg-rose-900 border-rose-700' : 'bg-slate-900 border-slate-700'
        }`}>
          {toast.type === 'error' ? (
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          ) : (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          )}
          <div className="text-xs font-medium">{toast.message}</div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">Family Circle</h3>
            <p className="text-xs text-slate-500">
              Trusted family members & visiting healthcare professionals with dashboard access
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
            {displayedMembers.length} {displayedMembers.length === 1 ? 'Connected' : 'Connected'}
          </span>
          <button
            type="button"
            onClick={handleOpenAdd}
            className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Member</span>
          </button>
        </div>
      </div>

      {/* Empty State */}
      {displayedMembers.length === 0 ? (
        <div className="py-12 px-6 rounded-2xl bg-[#FBFBFA] border border-dashed border-slate-300 text-center flex flex-col items-center justify-center">
          <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center mb-3">
            <HeartHandshake className="w-6 h-6" />
          </div>
          <h4 className="text-base font-bold text-slate-900 mb-1">No Family Members Added Yet</h4>
          <p className="text-xs text-slate-500 max-w-sm mb-5">
            Add your primary caregiver and family members so they receive daily health updates, vital alerts, and emergency calls.
          </p>
          <button
            type="button"
            onClick={handleOpenAdd}
            className="px-4 py-2.5 rounded-xl text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white flex items-center gap-2 transition-colors shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add First Family Member</span>
          </button>
        </div>
      ) : (
        /* Member Grid */
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {displayedMembers.map((member) => {
            const avatarBg = member.avatarColor || 'bg-teal-600';
            const isPrimary = Boolean(member.is_primary_caregiver);
            const isEmergency = Boolean(member.is_emergency_contact);

            return (
              <div
                key={member.id}
                id={`family-card-${member.id}`}
                className="p-5 rounded-2xl bg-[#FBFBFA] border border-slate-200/80 hover:border-slate-300 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-11 h-11 rounded-xl ${avatarBg} text-white flex items-center justify-center font-bold text-sm shadow-xs shrink-0`}
                      >
                        {member.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-sm font-bold text-slate-900 truncate">{member.name}</h4>
                        <p className="text-xs text-slate-500 truncate">{member.relationship}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          member.status === 'online' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'
                        }`}
                      />
                      <span className="text-[10px] font-bold text-slate-600 capitalize">
                        {member.status}
                      </span>
                    </div>
                  </div>

                  {/* Badges for Primary / Emergency */}
                  {(isPrimary || isEmergency) && (
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {isPrimary && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-teal-50 border border-teal-200 text-[10px] font-bold text-teal-700">
                          <ShieldCheck className="w-3 h-3" />
                          <span>Primary Caregiver</span>
                        </span>
                      )}
                      {isEmergency && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-50 border border-rose-200 text-[10px] font-bold text-rose-700">
                          <PhoneCall className="w-3 h-3" />
                          <span>Emergency Contact</span>
                        </span>
                      )}
                    </div>
                  )}

                  <div className="space-y-1.5 text-xs text-slate-600 mb-4 pt-1 border-t border-slate-200/50">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-500">Care Role</span>
                      <span className="font-semibold text-slate-700">{member.role}</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-500">Phone</span>
                      <span className="font-mono text-slate-700">{member.phone}</span>
                    </div>
                    {member.location && (
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-500">Location</span>
                        <span className="text-slate-700 truncate max-w-[150px]">{member.location}</span>
                      </div>
                    )}
                    {member.email && (
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-500">Email</span>
                        <span className="text-slate-700 truncate max-w-[150px]">{member.email}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-3 border-t border-slate-200/60">
                  <button
                    type="button"
                    onClick={() => handleSimulateCall(member)}
                    className="flex-1 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
                  >
                    <Phone className="w-3.5 h-3.5 text-teal-600" />
                    <span>Call</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveModal({ type: 'message', member })}
                    className="p-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 transition-colors shadow-2xs cursor-pointer"
                    title="Send message"
                  >
                    <MessageSquare className="w-3.5 h-3.5 text-slate-600" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleOpenEdit(member)}
                    className="p-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 transition-colors shadow-2xs cursor-pointer"
                    title="Edit details"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-slate-600" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveModal({ type: 'delete', member })}
                    className="p-1.5 rounded-xl bg-white hover:bg-rose-50 text-slate-400 hover:text-rose-600 border border-slate-200 transition-colors shadow-2xs cursor-pointer"
                    title="Remove member"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Modal */}
      {activeModal && (activeModal.type === 'add' || activeModal.type === 'edit') && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-lg w-full shadow-2xl border border-slate-200 animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-5">
              <div>
                <h4 className="text-base font-bold text-slate-900">
                  {activeModal.type === 'add' ? 'Add Family Member or Caregiver' : 'Edit Member Details'}
                </h4>
                <p className="text-xs text-slate-500">
                  Connected to your personal account on Supabase
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Error Message Box inside modal */}
            {formError && (
              <div className="p-3.5 mb-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5 animate-in fade-in">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div className="flex-1 font-medium leading-relaxed">{formError}</div>
              </div>
            )}

            <form onSubmit={handleSaveMember} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Rahul Sharma or Priya Verma"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Relationship <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formRelationship}
                    onChange={(e) => setFormRelationship(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                  >
                    {RELATIONSHIP_OPTIONS.map((rel) => (
                      <option key={rel} value={rel}>
                        {rel}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Role in Care <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formRole}
                    onChange={(e) => setFormRole(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                  >
                    {ROLE_OPTIONS.map((role) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Phone Number <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    placeholder="e.g. +91 98765 43210"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Location / City
                  </label>
                  <input
                    type="text"
                    value={formLocation}
                    onChange={(e) => setFormLocation(e.target.value)}
                    placeholder="e.g. New Delhi, 15 km away"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Email Address (Optional)
                  </label>
                  <input
                    type="email"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Status
                  </label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as 'online' | 'offline')}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                  >
                    <option value="online">Online / Active</option>
                    <option value="offline">Offline</option>
                  </select>
                </div>
              </div>

              {/* Checkboxes for Primary and Emergency designations */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2.5">
                <label className="flex items-center gap-2.5 cursor-pointer text-xs font-semibold text-slate-800">
                  <input
                    type="checkbox"
                    checked={formIsPrimary}
                    onChange={(e) => setFormIsPrimary(e.target.checked)}
                    className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500 border-slate-300"
                  />
                  <span>Designate as Primary Caregiver</span>
                </label>
                <p className="text-[11px] text-slate-500 pl-6.5">
                  Used by the "Contact Caregiver" quick-dial protocol and priority alerts.
                </p>

                <label className="flex items-center gap-2.5 cursor-pointer text-xs font-semibold text-slate-800 pt-1">
                  <input
                    type="checkbox"
                    checked={formIsEmergency}
                    onChange={(e) => setFormIsEmergency(e.target.checked)}
                    className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 border-slate-300"
                  />
                  <span>Designate as Emergency Contact</span>
                </label>
                <p className="text-[11px] text-slate-500 pl-6.5">
                  Receives high-priority emergency notifications when the elderly triggers assistance.
                </p>
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white transition-colors shadow-xs cursor-pointer flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <span>Saving...</span>
                  ) : (
                    <span>{activeModal.type === 'add' ? 'Add to Circle' : 'Save Changes'}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {activeModal && activeModal.type === 'delete' && activeModal.member && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-200 animate-in zoom-in-95">
            <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mb-4">
              <Trash2 className="w-5 h-5" />
            </div>
            <h4 className="text-base font-bold text-slate-900 mb-1">Remove Family Member?</h4>
            <p className="text-xs text-slate-500 mb-5">
              Are you sure you want to remove <strong>{activeModal.member.name}</strong> from your Family Circle?
            </p>
            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                disabled={isSubmitting}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteMember}
                disabled={isSubmitting}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white transition-colors shadow-xs cursor-pointer"
              >
                {isSubmitting ? 'Removing...' : 'Remove Member'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Message Modal */}
      {activeModal && activeModal.type === 'message' && activeModal.member && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div>
                <h4 className="text-base font-bold text-slate-900">
                  Send Message to {activeModal.member.name}
                </h4>
                <p className="text-xs text-slate-500">{activeModal.member.relationship} • {activeModal.member.phone}</p>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSendMessage} className="space-y-4">
              <textarea
                rows={3}
                required
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                placeholder={`Type a quick note or care instruction for ${activeModal.member.name}...`}
                className="w-full p-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white transition-colors shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send Message</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
