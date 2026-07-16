import React, { useState } from 'react';
import { UserRole } from '../types';
import { Shield, Eye, Users, Truck, Factory, Lock, ChevronDown, ChevronUp } from 'lucide-react';

interface RoleSwitcherProps {
  currentRole: UserRole;
  onRoleChange: (role: UserRole) => void;
}

export default function RoleSwitcher({ currentRole, onRoleChange }: RoleSwitcherProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  const rolesList: { id: UserRole; name: string; desc: string; icon: React.ReactNode; color: string }[] = [
    {
      id: 'public',
      name: 'Public Website',
      desc: 'Guest landing page, login, & registrations',
      icon: <Eye className="w-4 h-4" />,
      color: 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300',
    },
    {
      id: 'customer',
      name: 'Customer',
      desc: 'Create requests, view rewards, wallet',
      icon: <Users className="w-4 h-4" />,
      color: 'bg-green-100 hover:bg-green-200 text-green-800 border-green-300',
    },
    {
      id: 'partner',
      name: 'Delivery Partner',
      desc: 'Accept requests, weight verification, billing',
      icon: <Truck className="w-4 h-4" />,
      color: 'bg-indigo-100 hover:bg-indigo-200 text-indigo-800 border-indigo-300',
    },
    {
      id: 'industry',
      name: 'Industry',
      desc: 'Inventory storage, processing updates',
      icon: <Factory className="w-4 h-4" />,
      color: 'bg-amber-100 hover:bg-amber-200 text-amber-800 border-amber-300',
    },
    {
      id: 'admin',
      name: 'Administrator',
      desc: 'User databases, pricing, approvals, metrics',
      icon: <Shield className="w-4 h-4" />,
      color: 'bg-rose-100 hover:bg-rose-200 text-rose-800 border-rose-300',
    },
  ];

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-xs sm:max-w-sm bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden transition-all duration-300">
      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between px-4 py-3 bg-slate-900 text-white cursor-pointer select-none"
      >
        <div className="flex items-center gap-2">
          <div className="p-1 rounded-md bg-brand-500 animate-pulse-subtle">
            <Lock className="w-3.5 h-3.5 text-white" />
          </div>
          <div>
            <h4 className="text-xs font-display font-bold tracking-wider uppercase">Vibe Prototype Controller</h4>
            <p className="text-[10px] text-slate-300">Active: <span className="font-semibold text-brand-400 capitalize">{currentRole}</span></p>
          </div>
        </div>
        {isExpanded ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronUp className="w-4 h-4 text-slate-400" />}
      </div>

      {isExpanded && (
        <div className="p-3 bg-slate-50 flex flex-col gap-1.5 border-t border-slate-100 max-h-[320px] overflow-y-auto">
          <p className="text-[10px] text-slate-500 mb-1 leading-relaxed">
            Switch roles below to immediately load any module with persistent reactive state. Fully functional without a backend!
          </p>
          {rolesList.map((r) => {
            const isActive = currentRole === r.id;
            return (
              <button
                key={r.id}
                onClick={() => {
                  onRoleChange(r.id);
                  setIsExpanded(false);
                }}
                className={`flex items-start gap-3 p-2 rounded-xl text-left border transition-all duration-150 ${
                  isActive 
                    ? 'bg-white border-brand-500 ring-2 ring-brand-100 shadow-md' 
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className={`p-2 rounded-lg mt-0.5 border ${
                  isActive 
                    ? 'bg-brand-500 text-white border-brand-600' 
                    : 'bg-slate-50 text-slate-600 border-slate-100'
                }`}>
                  {r.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-900">{r.name}</span>
                    {isActive && (
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-brand-500 animate-pulse" />
                    )}
                  </div>
                  <p className="text-[10px] text-slate-500 truncate mt-0.5">{r.desc}</p>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
