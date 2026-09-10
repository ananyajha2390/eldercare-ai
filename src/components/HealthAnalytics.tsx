import React, { useState } from 'react';
import {
  Activity,
  Heart,
  Pill,
  Smile,
  Calendar,
  Sparkles,
  Info,
  TrendingUp,
  AlertCircle
} from 'lucide-react';
import { healthTrendsData } from '../data/mockData';

export const HealthAnalytics: React.FC = () => {
  const [activeRange, setActiveRange] = useState<'7d' | '30d' | '90d'>('7d');
  const [activeChart, setActiveChart] = useState<'bp' | 'sugar' | 'adherence' | 'mood'>('bp');

  const { bp, sugar, adherence, mood } = healthTrendsData.days7;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10" id="health-analytics-section">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-50 text-teal-800 text-xs font-semibold mb-2">
            <Activity className="w-3.5 h-3.5 text-teal-600" />
            <span>Health & Vitals Tracking</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Health Analytics
          </h2>
          <p className="text-slate-600 text-sm mt-0.5">
            Holistic trends extracted effortlessly from natural daily morning conversations.
          </p>
        </div>

        {/* Time Range Selector */}
        <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 shadow-xs self-start md:self-auto">
          {(['7d', '30d', '90d'] as const).map(range => (
            <button
              key={range}
              type="button"
              id={`range-tab-${range}`}
              onClick={() => setActiveRange(range)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeRange === range
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              {range === '7d' ? '7 Days' : range === '30d' ? '30 Days' : '90 Days'}
            </button>
          ))}
        </div>
      </div>

      {/* AI Insight Highlight Card */}
      <div className="mb-8 rounded-3xl p-5 sm:p-6 bg-gradient-to-r from-teal-50/90 via-emerald-50/70 to-sky-50/80 border border-teal-200/80 shadow-xs">
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5">
            <Sparkles className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-extrabold text-teal-900 uppercase tracking-wide">
                AI Health Insight
              </span>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-teal-200/60 text-teal-900">
                Informational Pattern
              </span>
            </div>
            <p className="text-sm font-semibold text-slate-800 leading-relaxed">
              "Today's BP is slightly higher than the recent average. Consider checking again and keeping the caregiver informed if the reading remains unusual."
            </p>
            <div className="flex items-center gap-1.5 text-[11px] text-slate-500 pt-1">
              <Info className="w-3.5 h-3.5 text-teal-600 shrink-0" />
              <span>
                Note: This is an informational trend observation, NOT a medical diagnosis. Consult healthcare professionals for medical advice.
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Chart Category Switcher */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-6">
        <button
          type="button"
          onClick={() => setActiveChart('bp')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold border transition-all shrink-0 ${
            activeChart === 'bp'
              ? 'bg-rose-50 text-rose-800 border-rose-300 shadow-xs'
              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
          }`}
        >
          <Heart className="w-3.5 h-3.5 text-rose-500" />
          <span>Blood Pressure Trend</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveChart('sugar')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold border transition-all shrink-0 ${
            activeChart === 'sugar'
              ? 'bg-amber-50 text-amber-800 border-amber-300 shadow-xs'
              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
          }`}
        >
          <Activity className="w-3.5 h-3.5 text-amber-500" />
          <span>Blood Sugar Trend</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveChart('adherence')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold border transition-all shrink-0 ${
            activeChart === 'adherence'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-300 shadow-xs'
              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
          }`}
        >
          <Pill className="w-3.5 h-3.5 text-emerald-600" />
          <span>Medication Adherence (96%)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveChart('mood')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold border transition-all shrink-0 ${
            activeChart === 'mood'
              ? 'bg-sky-50 text-sky-800 border-sky-300 shadow-xs'
              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
          }`}
        >
          <Smile className="w-3.5 h-3.5 text-sky-600" />
          <span>Mood & Energy Trend</span>
        </button>
      </div>

      {/* Main Chart Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs">
        {/* CHART 1: Blood Pressure */}
        {activeChart === 'bp' && (
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Blood Pressure Variations (Systolic & Diastolic)
                </h3>
                <p className="text-xs text-slate-500">
                  Baseline safe reference zone: 110-135 mmHg (Systolic) / 70-85 mmHg (Diastolic)
                </p>
              </div>

              <div className="flex items-center gap-4 text-xs font-medium">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-rose-500" />
                  <span className="text-slate-700">Systolic (mmHg)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-teal-500" />
                  <span className="text-slate-700">Diastolic (mmHg)</span>
                </div>
              </div>
            </div>

            {/* Responsive Visual SVG Chart */}
            <div className="w-full h-64 sm:h-72 relative">
              <svg className="w-full h-full" viewBox="0 0 700 240" preserveAspectRatio="none">
                {/* Horizontal reference grid lines */}
                <line x1="40" y1="40" x2="680" y2="40" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="4 4" />
                <text x="15" y="44" fill="#94a3b8" fontSize="10" fontWeight="bold">150</text>

                <line x1="40" y1="80" x2="680" y2="80" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="4 4" />
                <text x="15" y="84" fill="#94a3b8" fontSize="10" fontWeight="bold">130</text>

                <line x1="40" y1="130" x2="680" y2="130" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="4 4" />
                <text x="15" y="134" fill="#94a3b8" fontSize="10" fontWeight="bold">100</text>

                <line x1="40" y1="180" x2="680" y2="180" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="4 4" />
                <text x="15" y="184" fill="#94a3b8" fontSize="10" fontWeight="bold">75</text>

                {/* Safe baseline band */}
                <rect x="40" y="70" width="640" height="70" fill="rgba(20, 184, 166, 0.05)" rx="4" />

                {/* Systolic Line */}
                <path
                  d="M 60 92 L 150 88 L 245 76 L 340 90 L 435 84 L 530 86 L 625 84"
                  fill="none"
                  stroke="#f43f5e"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {/* Diastolic Line */}
                <path
                  d="M 60 170 L 150 166 L 245 162 L 340 168 L 435 166 L 530 170 L 625 166"
                  fill="none"
                  stroke="#0d9488"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {/* Data point dots */}
                {[
                  { x: 60, sys: 124, dia: 80, day: 'Mon' },
                  { x: 150, sys: 126, dia: 82, day: 'Tue' },
                  { x: 245, sys: 130, dia: 84, day: 'Wed' },
                  { x: 340, sys: 125, dia: 81, day: 'Thu' },
                  { x: 435, sys: 128, dia: 82, day: 'Fri' },
                  { x: 530, sys: 127, dia: 80, day: 'Sat' },
                  { x: 625, sys: 128, dia: 82, day: 'Today' },
                ].map((pt, i) => (
                  <g key={i}>
                    <circle cx={pt.x} cy={pt.sys === 130 ? 76 : pt.sys === 128 ? 84 : 88} r="5" fill="#f43f5e" stroke="#fff" strokeWidth="2" />
                    <circle cx={pt.x} cy={pt.dia === 84 ? 162 : pt.dia === 82 ? 166 : 170} r="5" fill="#0d9488" stroke="#fff" strokeWidth="2" />
                    <text x={pt.x} y="220" textAnchor="middle" fill="#64748b" fontSize="11" fontWeight="bold">
                      {pt.day}
                    </text>
                  </g>
                ))}
              </svg>
            </div>
          </div>
        )}

        {/* CHART 2: Blood Sugar */}
        {activeChart === 'sugar' && (
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Blood Sugar Readings (Post-meal & Fasting)
                </h3>
                <p className="text-xs text-slate-500">
                  Healthy target: 100-125 (Fasting) / &lt;150 mg/dL (Post-meal)
                </p>
              </div>

              <div className="flex items-center gap-4 text-xs font-medium">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-amber-500" />
                  <span className="text-slate-700">Post-meal (mg/dL)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-teal-600" />
                  <span className="text-slate-700">Fasting (mg/dL)</span>
                </div>
              </div>
            </div>

            <div className="w-full h-64 sm:h-72">
              <svg className="w-full h-full" viewBox="0 0 700 240" preserveAspectRatio="none">
                <line x1="40" y1="50" x2="680" y2="50" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="4 4" />
                <text x="15" y="54" fill="#94a3b8" fontSize="10" fontWeight="bold">160</text>

                <line x1="40" y1="110" x2="680" y2="110" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="4 4" />
                <text x="15" y="114" fill="#94a3b8" fontSize="10" fontWeight="bold">130</text>

                <line x1="40" y1="170" x2="680" y2="170" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="4 4" />
                <text x="15" y="174" fill="#94a3b8" fontSize="10" fontWeight="bold">100</text>

                {/* Post-meal bar chart */}
                {[
                  { x: 60, post: 138, fast: 108, day: 'Mon' },
                  { x: 150, post: 144, fast: 112, day: 'Tue' },
                  { x: 245, post: 140, fast: 110, day: 'Wed' },
                  { x: 340, post: 145, fast: 114, day: 'Thu' },
                  { x: 435, post: 139, fast: 109, day: 'Fri' },
                  { x: 530, post: 148, fast: 115, day: 'Sat' },
                  { x: 625, post: 142, fast: 111, day: 'Today' },
                ].map((item, idx) => (
                  <g key={idx}>
                    {/* Fasting bar */}
                    <rect
                      x={item.x - 14}
                      y={200 - item.fast}
                      width="12"
                      height={item.fast}
                      fill="#0d9488"
                      rx="3"
                    />
                    {/* Post-meal bar */}
                    <rect
                      x={item.x + 2}
                      y={200 - item.post * 0.95}
                      width="12"
                      height={item.post * 0.95}
                      fill="#f59e0b"
                      rx="3"
                    />
                    <text x={item.x} y="220" textAnchor="middle" fill="#64748b" fontSize="11" fontWeight="bold">
                      {item.day}
                    </text>
                  </g>
                ))}
              </svg>
            </div>
          </div>
        )}

        {/* CHART 3: Medication Adherence */}
        {activeChart === 'adherence' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Weekly Medication Consistency
                </h3>
                <p className="text-xs text-slate-500">
                  Average adherence rate over the last 7 days: 96.4%
                </p>
              </div>
              <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
                Excellent Adherence ✓
              </span>
            </div>

            <div className="grid grid-cols-7 gap-3 py-4">
              {adherence.map(item => (
                <div key={item.day} className="flex flex-col items-center gap-2">
                  <div className="w-full bg-slate-100 rounded-2xl h-44 flex flex-col justify-end p-1 relative">
                    <div
                      className={`w-full rounded-xl transition-all duration-700 flex items-center justify-center text-[11px] font-bold text-white ${
                        item.rate === 100 ? 'bg-emerald-500' : 'bg-amber-400'
                      }`}
                      style={{ height: `${item.rate}%` }}
                    >
                      {item.rate}%
                    </div>
                  </div>
                  <span className="text-xs font-bold text-slate-700">{item.day}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CHART 4: Mood */}
        {activeChart === 'mood' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Emotional Vitality & Energy Flow
                </h3>
                <p className="text-xs text-slate-500">
                  Extracted via gentle tone and sentiment analysis during morning voice check-ins
                </p>
              </div>
              <span className="px-3 py-1 rounded-full bg-sky-100 text-sky-800 text-xs font-bold">
                Positive Baseline
              </span>
            </div>

            <div className="grid grid-cols-7 gap-3 py-4">
              {mood.map(item => (
                <div key={item.day} className="flex flex-col items-center gap-2">
                  <div className="w-full bg-slate-50 border border-slate-200/70 rounded-2xl p-3 text-center">
                    <div className="text-xl mb-1">
                      {item.label === 'Cheerful' ? '😊' : item.label === 'Good' ? '🙂' : '😴'}
                    </div>
                    <div className="text-xs font-bold text-slate-800">{item.label}</div>
                    <div className="text-[10px] text-slate-600 font-mono mt-0.5">{item.score}%</div>
                  </div>
                  <span className="text-xs font-bold text-slate-700">{item.day}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
