import React from 'react';
import { Pill, Activity, Users, ArrowDown, HelpCircle } from 'lucide-react';

export const ProblemSection: React.FC = () => {
  const problems = [
    {
      id: 'problem-1',
      number: '01',
      title: 'Medication routines',
      description: 'Elderly users may forget or miss medication schedules.',
      detail: 'Tiny pill bottle labels, shifting dosage times, and multiple daily prescriptions create anxiety and missed doses.',
      icon: Pill,
      badgeColor: 'bg-rose-50 text-rose-700 border-rose-200/60',
      iconBg: 'bg-rose-100 text-rose-600',
    },
    {
      id: 'problem-2',
      number: '02',
      title: 'Health tracking',
      description: 'Recording BP, glucose and other readings manually can be difficult.',
      detail: 'Complex smartphone health portals require typing, logging in, navigating dropdowns, and managing digital passwords.',
      icon: Activity,
      badgeColor: 'bg-amber-50 text-amber-700 border-amber-200/60',
      iconBg: 'bg-amber-100 text-amber-600',
    },
    {
      id: 'problem-3',
      number: '03',
      title: 'Staying connected',
      description: 'Families may not know when something feels different.',
      detail: 'Loved ones living in other cities often only learn of fatigue, dizziness, or unusual trends after an incident occurs.',
      icon: Users,
      badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200/60',
      iconBg: 'bg-indigo-100 text-indigo-600',
    },
  ];

  return (
    <section className="py-16 sm:py-20 bg-white border-y border-slate-200/70" id="problem-section">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold">
            <HelpCircle className="w-3.5 h-3.5 text-slate-500" />
            <span>The Reality of Aging Independently</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Technology shouldn't be another burden.
          </h2>
          <p className="text-base text-slate-600">
            For millions of elderly parents living alone, modern mobile apps are filled with tiny text, complex logins, and cumbersome menus.
          </p>
        </div>

        {/* 3 Major Problem Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 mt-12">
          {problems.map(problem => {
            const Icon = problem.icon;
            return (
              <div
                key={problem.id}
                id={problem.id}
                className="relative rounded-2xl p-6 sm:p-7 bg-[#FBFBFA] border border-slate-200/80 hover:border-slate-300 shadow-xs hover:shadow-md transition-all duration-300 flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center justify-between mb-5">
                    <div className={`w-12 h-12 rounded-xl ${problem.iconBg} flex items-center justify-center transition-transform group-hover:scale-105`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className="text-xs font-bold font-mono text-slate-400">
                      {problem.number}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-slate-900 mb-2">
                    {problem.title}
                  </h3>

                  <p className="text-sm font-semibold text-slate-800 leading-snug mb-3">
                    "{problem.description}"
                  </p>

                  <p className="text-xs text-slate-500 leading-relaxed">
                    {problem.detail}
                  </p>
                </div>

                <div className="pt-5 mt-4 border-t border-slate-200/60 flex items-center gap-2">
                  <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-md border ${problem.badgeColor}`}>
                    Major Friction Point
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Transition statement */}
        <div className="mt-14 pt-8 text-center max-w-2xl mx-auto border-t border-slate-100 flex flex-col items-center">
          <div className="w-9 h-9 rounded-full bg-teal-50 text-teal-600 flex items-center justify-center mb-3 animate-bounce">
            <ArrowDown className="w-4 h-4" />
          </div>
          <p className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            "What if checking in was as simple as having a conversation?"
          </p>
          <p className="text-sm text-slate-500 mt-1">
            No keyboards. No small buttons. Just speak naturally.
          </p>
        </div>
      </div>
    </section>
  );
};
