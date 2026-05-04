import React from 'react';
import { ValidationRequest } from './InstructionModal';
import ExporterMap from './ExporterMap';

interface ValidatorDashboardProps {
  requests: ValidationRequest[];
  onViewFullMap: () => void;
}

const ValidatorDashboard: React.FC<ValidatorDashboardProps> = ({ requests, onViewFullMap }) => {
  return (
    <div className="space-y-10 animate-fade-in">
      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Dossiers en attente', value: requests.filter(r => r.status === 'SOUMISE').length, icon: 'fa-clock', color: 'text-amber-500', bg: 'bg-amber-50' },
          { label: 'Traités aujourd\'hui', value: 12, icon: 'fa-check-double', color: 'text-emerald-500', bg: 'bg-emerald-50' },
          { label: 'Temps moyen (h)', value: '4.2', icon: 'fa-bolt', color: 'text-tunisia-red', bg: 'bg-red-50' },
          { label: 'Volume mensuel', value: 342, icon: 'fa-chart-line', color: 'text-blue-500', bg: 'bg-blue-50' },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex items-center justify-between group hover:scale-105 transition-all">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">{stat.label}</p>
              <p className="text-3xl font-black italic tracking-tighter text-slate-900">{stat.value}</p>
            </div>
            <div className={`w-14 h-14 ${stat.bg} ${stat.color} rounded-2xl flex items-center justify-center text-xl`}>
              <i className={`fas ${stat.icon}`}></i>
            </div>
          </div>
        ))}
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-10">
        {/* Map Section */}
        <div className="xl:col-span-2 space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-black italic text-slate-900 uppercase tracking-tighter">Répartition de l'activité</h3>
            <button 
              onClick={onViewFullMap}
              className="text-[10px] font-black uppercase tracking-widest text-tunisia-red hover:underline"
            >
              Voir plein écran
            </button>
          </div>
          <div className="h-[500px]">
            <ExporterMap height="h-full" />
          </div>
        </div>

        {/* Recent Activity Section */}
        <div className="space-y-6">
          <h3 className="text-xl font-black italic text-slate-900 uppercase tracking-tighter">Activités Récentes</h3>
          <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm space-y-6">
            {[
              { type: 'VALIDATION', title: 'Dossier REG-2024-001 validé', time: 'Il y a 10 min', icon: 'fa-check' },
              { type: 'REJET', title: 'Dossier PRD-2024-032 rejeté', time: 'Il y a 45 min', icon: 'fa-xmark' },
              { type: 'INFO', title: 'Demande d\'information envoyée', time: 'Il y a 2h', icon: 'fa-comment-dots' },
              { type: 'LOGIN', title: 'Connexion système détectée', time: 'Il y a 3h', icon: 'fa-shield-halved' },
            ].map((activity, i) => (
              <div key={i} className="flex gap-4">
                <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 shrink-0">
                  <i className={`fas ${activity.icon} text-xs`}></i>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900 leading-tight">{activity.title}</p>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{activity.time}</p>
                </div>
              </div>
            ))}
            <button className="w-full py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all">
              Voir tout le journal
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ValidatorDashboard;