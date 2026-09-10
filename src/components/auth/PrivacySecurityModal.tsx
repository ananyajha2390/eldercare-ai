import React from 'react';
import {
  X,
  ShieldCheck,
  Lock,
  Database,
  KeyRound,
  CheckCircle2,
  Users,
  FileCode
} from 'lucide-react';

interface PrivacySecurityModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PrivacySecurityModal: React.FC<PrivacySecurityModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200/80 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-teal-600 text-white flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Privacy & Row Level Security (RLS)</h3>
              <p className="text-[11px] text-slate-500">How your elderly relative's health data is isolated and protected</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 overflow-y-auto text-xs text-slate-700 leading-relaxed">
          <div className="p-3.5 rounded-2xl bg-teal-50 border border-teal-200/80 text-teal-900 space-y-1">
            <div className="flex items-center gap-2 font-bold text-teal-950">
              <Lock className="w-4 h-4 text-teal-700" />
              <span>Strict Data Isolation by Design</span>
            </div>
            <p className="text-[11px] text-teal-800 leading-normal">
              ElderCare AI enforces PostgreSQL Row Level Security (RLS) directly inside Supabase. Caregivers can only read and write data belonging to seniors they have an active care relationship with.
            </p>
          </div>

          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Security Architecture Highlights
            </h4>

            <div className="space-y-2.5">
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-slate-900">No Passwords in Application Tables:</strong> All credentials and authentication tokens are managed by Supabase Auth with bcrypt hashing and JWT rotation.
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-slate-900">Row Level Security (RLS) Enabled:</strong> Every query to <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-[10px]">profiles</code> and <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-[10px]">care_relationships</code> evaluates <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-[10px]">auth.uid() = user_id</code>.
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-slate-900">Zero Service Role Key Exposure:</strong> Only the public anonymized key (<code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-[10px]">VITE_SUPABASE_ANON_KEY</code>) is exposed to the frontend; elevated keys never enter client bundles.
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-slate-900">Authorized Relationship Verification:</strong> Caregivers must possess an active record in <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-[10px]">care_relationships</code> to view vitals or trigger voice calls for another profile.
                </div>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 space-y-1.5">
            <div className="flex items-center gap-1.5 text-slate-900 font-bold">
              <FileCode className="w-3.5 h-3.5 text-slate-500" />
              <span>SQL Schema & RLS Script</span>
            </div>
            <p className="text-[11px] text-slate-500">
              The complete SQL schema with security triggers and RLS policies is available in <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-[10px]">/supabase_schema.sql</code>.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-200 cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
