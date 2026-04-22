import React from 'react';

interface UserLog {
  id: string;
  timestamp: string;
  adminName: string;
  targetUser: string;
  action: 'CREATE' | 'DEACTIVATE' | 'ACTIVATE' | 'PASSWORD_RESET' | 'ROLE_CHANGE';
  details: string;
}

const UserHistory: React.FC = () => {
  const [viewMode, setViewMode] = React.useState<'table' | 'timeline'>('table');
  const logs: UserLog[] = [
    { id: '1', timestamp: '2024-05-23 14:22', adminName: 'Admin Principal', targetUser: 'Sami Ben Amor', action: 'DEACTIVATE', details: 'Demande de désactivation acceptée (Motif: Départ définitif)' },
    { id: '2', timestamp: '2024-05-23 11:05', adminName: 'Admin Secrétaire', targetUser: 'Global Tech TR', action: 'PASSWORD_RESET', details: 'Réinitialisation forcée suite à 3 tentatives échouées' },
    { id: '3', timestamp: '2024-05-22 16:45', adminName: 'Admin Principal', targetUser: 'Ines Ghrab', action: 'CREATE', details: 'Nouvel utilisateur créé (Rôle: Importateur)' },
    { id: '4', timestamp: '2024-05-22 09:12', adminName: 'Système', targetUser: 'Mourad Khelifi', action: 'ACTIVATE', details: 'Réactivation automatique après période de suspension' },
    { id: '5', timestamp: '2024-05-21 15:30', adminName: 'Admin Secrétaire', targetUser: 'Leila Trabelsi', action: 'ROLE_CHANGE', details: 'Changement de rôle de "Opérateur" vers "Validateur"' },
  ];

  const getActionIcon = (action: string) => {
    switch(action) {
      case 'CREATE': return 'fa-user-plus';
      case 'DEACTIVATE': return 'fa-user-slash';
      case 'ACTIVATE': return 'fa-user-check';
      case 'PASSWORD_RESET': return 'fa-key';
      case 'ROLE_CHANGE': return 'fa-id-badge';
      default: return 'fa-circle';
    }
  };

  const getActionColor = (action: string) => {
    switch(action) {
      case 'CREATE': return 'text-emerald-500 bg-emerald-50';
      case 'DEACTIVATE': return 'text-red-500 bg-red-50';
      case 'ACTIVATE': return 'text-blue-500 bg-blue-50';
      case 'PASSWORD_RESET': return 'text-amber-500 bg-amber-50';
      case 'ROLE_CHANGE': return 'text-indigo-500 bg-indigo-50';
      default: return 'text-slate-400 bg-slate-50';
    }
  };

  const getActionStyle = (action: string) => {
    switch(action) {
      case 'CREATE': return 'bg-emerald-50 text-emerald-600 border-emerald-100';
      case 'DEACTIVATE': return 'bg-red-50 text-red-600 border-red-100';
      case 'ACTIVATE': return 'bg-blue-50 text-blue-600 border-blue-100';
      case 'PASSWORD_RESET': return 'bg-amber-50 text-amber-600 border-amber-100';
      case 'ROLE_CHANGE': return 'bg-indigo-50 text-indigo-600 border-indigo-100';
      default: return 'bg-slate-50 text-slate-400 border-slate-100';
    }
  };

  const getActionLabel = (action: string) => {
    switch(action) {
      case 'CREATE': return 'Création';
      case 'DEACTIVATE': return 'Désactivation';
      case 'ACTIVATE': return 'Activation';
      case 'PASSWORD_RESET': return 'Reset MDP';
      case 'ROLE_CHANGE': return 'Changement Rôle';
      default: return action;
    }
  };

  return (
    <div className="space-y-10 animate-fade-in">
      <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/30">
          <div className="flex items-center gap-6">
            <h3 className="text-lg font-black italic text-slate-900 uppercase tracking-tighter">Audit des Utilisateurs</h3>
            <div className="flex bg-white p-1 rounded-xl border border-slate-200">
               <button 
                 onClick={() => setViewMode('table')}
                 className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${viewMode === 'table' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
               >
                 <i className="fas fa-table mr-2"></i> Table
               </button>
               <button 
                 onClick={() => setViewMode('timeline')}
                 className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${viewMode === 'timeline' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
               >
                 <i className="fas fa-stream mr-2"></i> Timeline
               </button>
            </div>
          </div>
          <div className="flex gap-4">
             <div className="relative">
                <i className="fas fa-filter absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 text-[10px]"></i>
                <select className="pl-10 pr-6 py-2 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-600 outline-none focus:border-tunisia-red transition-all shadow-sm appearance-none">
                  <option>Toutes les actions</option>
                  <option>Créations</option>
                  <option>Désactivations</option>
                  <option>Reset MDP</option>
                </select>
             </div>
             <div className="relative">
                <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 text-[10px]"></i>
                <input type="text" placeholder="Rechercher un utilisateur..." className="pl-10 pr-6 py-2 bg-white border border-slate-200 rounded-xl text-[10px] font-bold outline-none focus:border-tunisia-red transition-all shadow-sm w-64" />
             </div>
          </div>
        </div>

        {viewMode === 'table' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/50">
                  <th className="px-8 py-5 text-[9px] font-black text-slate-400 uppercase tracking-widest">Date / Heure</th>
                  <th className="px-8 py-5 text-[9px] font-black text-slate-400 uppercase tracking-widest">Action</th>
                  <th className="px-8 py-5 text-[9px] font-black text-slate-400 uppercase tracking-widest">Administrateur</th>
                  <th className="px-8 py-5 text-[9px] font-black text-slate-400 uppercase tracking-widest">Utilisateur Cible</th>
                  <th className="px-8 py-5 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Détails</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-8 py-6 text-[10px] font-bold text-slate-500 whitespace-nowrap">{log.timestamp}</td>
                    <td className="px-8 py-6 whitespace-nowrap">
                      <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border ${getActionStyle(log.action)}`}>
                        {getActionLabel(log.action)}
                      </span>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-2">
                         <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px] text-slate-400">
                            <i className="fas fa-user-shield"></i>
                         </div>
                         <span className="text-[10px] font-black text-slate-900 uppercase tracking-tight">{log.adminName}</span>
                      </div>
                    </td>
                    <td className="px-8 py-6 font-black text-slate-700 italic text-[10px] italic tracking-tight">{log.targetUser}</td>
                    <td className="px-8 py-6 text-right">
                      <p className="text-[10px] font-medium text-slate-500 italic max-w-xs ml-auto">
                        {log.details}
                      </p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 space-y-12 relative">
            <div className="absolute left-[77px] top-12 bottom-12 w-0.5 bg-slate-100 hidden md:block"></div>
            {logs.map((log, i) => (
              <div key={log.id} className="flex flex-col md:flex-row gap-8 relative group">
                <div className="w-24 text-[10px] font-black text-slate-400 uppercase tracking-widest text-left pt-3">
                  {log.timestamp.split(' ')[1]}
                  <div className="text-[8px] mt-1 opacity-60 font-bold">{log.timestamp.split(' ')[0]}</div>
                </div>
                
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center relative z-10 transition-all group-hover:scale-110 shadow-sm ${getActionColor(log.action)}`}>
                  <i className={`fas ${getActionIcon(log.action)} text-sm`}></i>
                </div>

                <div className="flex-1 bg-slate-50/50 rounded-3xl p-6 border border-slate-100 hover:bg-white hover:shadow-xl hover:shadow-slate-200/50 transition-all">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                    <div className="flex items-center gap-3">
                      <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border ${getActionStyle(log.action)}`}>
                        {getActionLabel(log.action)}
                      </span>
                      <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight italic">{log.targetUser}</h4>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-lg border border-slate-100">
                       <i className="fas fa-user-shield text-[10px] text-slate-400"></i>
                       <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{log.adminName}</span>
                    </div>
                  </div>
                  <p className="text-xs font-bold text-slate-600 leading-relaxed italic border-l-2 border-slate-200 pl-4">
                    {log.details}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="p-6 bg-slate-50/50 border-t border-slate-50 flex justify-center">
           <button className="text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-900 transition-all">
              Charger plus d'historique <i className="fas fa-chevron-down ml-2"></i>
           </button>
        </div>
      </div>
    </div>
  );
};

export default UserHistory;
