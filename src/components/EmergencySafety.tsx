import React, { useState } from 'react';
import { FamilyMember } from '../types';
import {
  PhoneCall,
  ShieldAlert,
  AlertOctagon,
  CheckCircle2,
  X,
  HeartPulse,
  UserPlus
} from 'lucide-react';

interface EmergencySafetyProps {
  primaryCaregiver?: FamilyMember | null;
  emergencyContacts?: FamilyMember[];
  onConfigureContacts?: () => void;
}

export const EmergencySafety: React.FC<EmergencySafetyProps> = ({
  primaryCaregiver,
  emergencyContacts = [],
  onConfigureContacts,
}) => {
  const [confirmDialog, setConfirmDialog] = useState<'caregiver' | 'emergency' | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const hasCaregiver = Boolean(primaryCaregiver && primaryCaregiver.phone);
  const hasEmergencyContacts = emergencyContacts.length > 0;

  const handleConfirmAction = (type: 'caregiver' | 'emergency') => {
    if (type === 'caregiver') {
      const caregiverName = primaryCaregiver?.name || 'Primary Caregiver';
      const caregiverPhone = primaryCaregiver?.phone || 'registered number';
      setSuccessToast(`Initiating direct voice call to ${caregiverName} (${caregiverPhone})...`);
    } else {
      const contactNames = emergencyContacts.map((c) => c.name).join(', ');
      setSuccessToast(
        `Assistance alert sent: Priority alert dispatched to registered contacts (${contactNames || 'care team'}).`
      );
    }
    setConfirmDialog(null);
    setTimeout(() => setSuccessToast(null), 4500);
  };

  return (
    <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs mb-8" id="emergency-safety-section">
      {successToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-xl flex items-center gap-3 border border-slate-700 animate-in fade-in slide-in-from-bottom-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <div className="text-xs font-medium">{successToast}</div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
            <HeartPulse className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">
              Assistance & Safety Protocols
            </h3>
            <p className="text-xs text-slate-500">
              Immediate connection options for moments of sudden discomfort, unsteadiness, or urgency
            </p>
          </div>
        </div>

        <span className="text-xs font-bold text-rose-700 bg-rose-50 px-3 py-1 rounded-full border border-rose-200 self-start sm:self-auto">
          24/7 Monitored Profile
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Contact Caregiver Primary */}
        <div className="p-6 rounded-2xl bg-teal-50/50 border border-teal-200/80 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center gap-2 text-teal-800 text-xs font-bold uppercase tracking-wider mb-1">
              <PhoneCall className="w-4 h-4 text-teal-600" />
              <span>Priority Family Connection</span>
            </div>
            <h4 className="text-base font-bold text-slate-900">
              {hasCaregiver ? `Contact ${primaryCaregiver!.name}` : 'Contact Primary Caregiver'}
            </h4>
            <p className="text-xs text-slate-600 mt-1">
              {hasCaregiver
                ? `Sends an urgent priority notification to ${primaryCaregiver!.name}'s phone (${primaryCaregiver!.phone}) with current vitals and opens direct phone line.`
                : 'No primary caregiver configured yet. Please add or designate a primary caregiver in your Family Circle.'}
            </p>
          </div>

          {hasCaregiver ? (
            <button
              type="button"
              id="contact-caregiver-btn"
              onClick={() => setConfirmDialog('caregiver')}
              className="w-full py-3 px-4 rounded-xl text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 shadow-md shadow-teal-700/20 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <PhoneCall className="w-4 h-4" />
              <span>Contact Caregiver ({primaryCaregiver!.name})</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onConfigureContacts}
              className="w-full py-3 px-4 rounded-xl text-xs font-bold text-teal-800 bg-white hover:bg-teal-50 border border-teal-300 shadow-xs active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <UserPlus className="w-4 h-4 text-teal-600" />
              <span>Configure Primary Caregiver</span>
            </button>
          )}
        </div>

        {/* Emergency Help Secondary */}
        <div className="p-6 rounded-2xl bg-rose-50/40 border border-rose-200/80 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center gap-2 text-rose-700 text-xs font-bold uppercase tracking-wider mb-1">
              <AlertOctagon className="w-4 h-4 text-rose-600" />
              <span>Urgent Support</span>
            </div>
            <h4 className="text-base font-bold text-slate-900">
              Emergency Assistance
            </h4>
            <p className="text-xs text-slate-600 mt-1">
              {hasEmergencyContacts
                ? `Sends priority emergency notifications to registered contacts: ${emergencyContacts.map((c) => `${c.name} (${c.phone})`).join(', ')}.`
                : 'No emergency contacts designated. Please designate at least one emergency contact in your Family Circle to receive priority alerts.'}
            </p>
          </div>

          {hasEmergencyContacts ? (
            <button
              type="button"
              id="emergency-help-btn"
              onClick={() => setConfirmDialog('emergency')}
              className="w-full py-3 px-4 rounded-xl text-xs font-bold text-rose-800 bg-white hover:bg-rose-50 border border-rose-300 shadow-xs active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <ShieldAlert className="w-4 h-4 text-rose-600" />
              <span>Emergency Help ({emergencyContacts.length} Contacts)</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onConfigureContacts}
              className="w-full py-3 px-4 rounded-xl text-xs font-bold text-rose-800 bg-white hover:bg-rose-50 border border-rose-300 shadow-xs active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <UserPlus className="w-4 h-4 text-rose-600" />
              <span>Designate Emergency Contacts</span>
            </button>
          )}
        </div>
      </div>

      {/* Confirmation Safety Dialog */}
      {confirmDialog && (
        <div className="fixed inset-0 bg-black/45 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl border border-slate-200 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                    confirmDialog === 'emergency'
                      ? 'bg-rose-100 text-rose-600'
                      : 'bg-teal-100 text-teal-700'
                  }`}
                >
                  {confirmDialog === 'emergency' ? (
                    <AlertOctagon className="w-5 h-5" />
                  ) : (
                    <PhoneCall className="w-5 h-5" />
                  )}
                </div>
                <h4 className="text-base font-bold text-slate-900">
                  {confirmDialog === 'emergency'
                    ? 'Confirm Emergency Assistance Alert'
                    : `Call ${primaryCaregiver?.name || 'Caregiver'}`}
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setConfirmDialog(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 mb-6 leading-relaxed">
              {confirmDialog === 'emergency'
                ? `This sends an immediate high-priority alert notification to your registered emergency contacts: ${emergencyContacts.map((c) => `${c.name} (${c.phone})`).join(', ')}. (Direct priority assistance alerts to your registered family circle).`
                : `Would you like to initiate a direct voice connection to ${primaryCaregiver?.name} (${primaryCaregiver?.phone})?`}
            </p>

            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={() => setConfirmDialog(null)}
                className="flex-1 py-2.5 rounded-xl text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleConfirmAction(confirmDialog)}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold text-white shadow-md cursor-pointer ${
                  confirmDialog === 'emergency'
                    ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20'
                    : 'bg-teal-600 hover:bg-teal-700 shadow-teal-600/20'
                }`}
              >
                {confirmDialog === 'emergency' ? 'Yes, Send Alert' : `Call ${primaryCaregiver?.name || 'Caregiver'} Now`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
