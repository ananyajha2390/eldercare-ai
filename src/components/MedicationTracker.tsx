import React, { useState } from 'react';
import { Medication } from '../types';
import {
  Pill,
  CheckCircle2,
  Clock,
  Plus,
  RotateCcw,
  Bell,
  AlertCircle,
  Calendar,
  X
} from 'lucide-react';

interface MedicationTrackerProps {
  medications: Medication[];
  onToggleStatus: (id: string) => void;
  onAddMedication: (med: Omit<Medication, 'id'>) => void;
  onChangeTime: (id: string, newTime: string) => void;
}

export const MedicationTracker: React.FC<MedicationTrackerProps> = ({
  medications,
  onToggleStatus,
  onAddMedication,
  onChangeTime,
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [newMedName, setNewMedName] = useState('');
  const [newMedDosage, setNewMedDosage] = useState('');
  const [newMedTime, setNewMedTime] = useState('02:00 PM');
  const [newMedInstruction, setNewMedInstruction] = useState('Take with water after food');
  const [newMedCategory, setNewMedCategory] = useState<'cardio' | 'diabetes' | 'general' | 'supplement'>('general');

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMedName.trim()) return;

    onAddMedication({
      name: newMedName.trim(),
      dosage: newMedDosage.trim() || '1 Tablet',
      time: newMedTime,
      instruction: newMedInstruction,
      status: 'pending',
      category: newMedCategory,
    });

    setNewMedName('');
    setNewMedDosage('');
    setShowAddModal(false);
  };

  const takenCount = medications.filter(m => m.status === 'taken').length;

  return (
    <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs mb-8" id="medication-tracker">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Pill className="w-4 h-4" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">
              Daily Medication Schedule
            </h3>
          </div>
          <p className="text-xs text-slate-500">
            {takenCount} of {medications.length} doses confirmed today • Confirmed via Voice Companion
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="px-3.5 py-2 rounded-xl text-xs font-bold bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 flex items-center gap-1.5 transition-colors self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4 text-teal-600" />
          <span>Add Reminder</span>
        </button>
      </div>

      {/* Timeline List */}
      <div className="space-y-4">
        {medications.map((med) => {
          const isTaken = med.status === 'taken';
          const isPending = med.status === 'pending';

          return (
            <div
              key={med.id}
              id={`med-item-${med.id}`}
              className={`p-4 sm:p-5 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                isTaken
                  ? 'bg-emerald-50/40 border-emerald-200/70'
                  : isPending
                  ? 'bg-amber-50/30 border-amber-200/80'
                  : 'bg-slate-50/50 border-slate-200/80'
              }`}
            >
              <div className="flex items-start gap-4">
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 font-bold ${
                    isTaken
                      ? 'bg-emerald-500 text-white shadow-xs'
                      : isPending
                      ? 'bg-amber-100 text-amber-800 border border-amber-300'
                      : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {isTaken ? (
                    <CheckCircle2 className="w-6 h-6" />
                  ) : (
                    <Clock className="w-5 h-5" />
                  )}
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-extrabold text-slate-900">
                      {med.time}
                    </span>
                    <span className="text-xs text-slate-300">•</span>
                    <span className="text-xs font-semibold text-slate-500">
                      {med.dosage}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isTaken
                          ? 'bg-emerald-100 text-emerald-800'
                          : isPending
                          ? 'bg-amber-100 text-amber-800 animate-pulse'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {isTaken ? '✓ Taken' : isPending ? '○ Pending' : '○ Upcoming'}
                    </span>
                  </div>

                  <h4 className="text-base font-bold text-slate-900 mt-0.5">
                    {med.name}
                  </h4>

                  <p className="text-xs text-slate-500 mt-0.5">
                    {med.instruction} {med.takenAt && `(Logged at ${med.takenAt})`}
                  </p>
                </div>
              </div>

              {/* Accessible Actions */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => onToggleStatus(med.id)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    isTaken
                      ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs'
                  }`}
                >
                  {isTaken ? (
                    <>
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Undo</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Mark as Taken</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Medication Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl border border-slate-200 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <h4 className="text-lg font-bold text-slate-900">Add Medication Reminder</h4>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Medicine Name & Strength
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Amlodipine 5mg"
                  value={newMedName}
                  onChange={(e) => setNewMedName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Scheduled Time
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 02:00 PM"
                    value={newMedTime}
                    onChange={(e) => setNewMedTime(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Dosage
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 1 Tablet"
                    value={newMedDosage}
                    onChange={(e) => setNewMedDosage(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Instruction
                </label>
                <input
                  type="text"
                  placeholder="e.g. Take with half glass warm water after lunch"
                  value={newMedInstruction}
                  onChange={(e) => setNewMedInstruction(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2.5 rounded-xl text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 shadow-md shadow-teal-600/20"
                >
                  Save Reminder
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
