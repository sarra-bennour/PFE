
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { RequestStatus } from '../types';
import { useAuth } from '../App';
import Sidebar from '../components/Sidebar';

const ValidatorSpace: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [selectedAgency, setSelectedAgency] = useState('Min. Commerce');
  const [activeTab, setActiveTab] = useState<'instruction' | 'stats' | 'archive'>('instruction');

  const institutions = [
    "Ministère du Commerce",
    "Ministère de l'Industrie",
    "INSSPA (Sécurité Sanitaire)",
    "ANMPS (Médicaments)",
    "Ministère de l'Agriculture"
  ];

  const sidebarItems = [
    { id: 'instruction', label: 'Instruction', icon: 'fa-folder-open' },
    { id: 'stats', label: 'Statistiques', icon: 'fa-chart-bar' },
    { id: 'archive', label: 'Archives', icon: 'fa-archive' },
    { id: 'admin', label: 'Admin Panel', icon: 'fa-shield-halved', path: '/admin', roles: ['admin'] as any },
  ];

  const initialRequests = [
    { id: 'REQ-109', entity: 'EuroFood Group', type: 'Enregistrement Exportateur', date: '2025-11-01', risk: 'Low', status: 'En attente', institution: "INSSPA (Sécurité Sanitaire)" },
    { id: 'REQ-110', entity: 'Mediterranean Imports', type: 'Déclaration Importation', date: '2025-11-02', risk: 'Medium', status: 'En attente', institution: "Ministère du Commerce" },
    { id: 'REQ-111', entity: 'Turkish Textile Co', type: 'Enregistrement Exportateur', date: '2025-11-03', risk: 'High', status: 'En attente', institution: "Ministère de l'Industrie" },
  ];

  const [requests, setRequests] = useState(initialRequests);

  const handleAction = (id: string, action: 'APPROVED' | 'REJECTED' | 'REVISION') => {
    setVerifyingId(id);
    setTimeout(() => {
      setRequests(prev => prev.map(req => 
        req.id === id ? { ...req, status: action === 'APPROVED' ? 'Accepté' : action === 'REJECTED' ? 'Rejeté' : 'À Corriger' } : req
      ));
      setVerifyingId(null);
    }, 1000);
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar 
        activeTab={activeTab}
        onTabChange={(tab) => setActiveTab(tab as any)}
        items={sidebarItems}
        title="Espace Validateur"
        subtitle="Instruction Officielle"
        icon="fa-user-shield"
      />

      {/* Main Content */}
      <main className="flex-1 p-10 space-y-10 overflow-y-auto">
        {/* Header Content */}
        <div className="flex justify-between items-end">
          <div>
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
              <i className="fas fa-home"></i>
              <i className="fas fa-chevron-right text-[8px]"></i>
              <span>Validation</span>
              <i className="fas fa-chevron-right text-[8px]"></i>
              <span className="text-tunisia-red">{activeTab === 'instruction' ? 'Instruction' : activeTab === 'stats' ? 'Statistiques' : 'Archives'}</span>
            </div>
            <h2 className="text-4xl font-black text-slate-900 uppercase italic tracking-tighter">
              {activeTab === 'instruction' && "Instruction des Dossiers"}
              {activeTab === 'stats' && "Analyse des Performances"}
              {activeTab === 'archive' && "Historique des Décisions"}
            </h2>
          </div>
          
          <div className="flex gap-4">
            <div className="flex flex-col items-end gap-1">
              <label className="text-[8px] font-black uppercase tracking-widest text-slate-400">Institution</label>
              <select 
                value={selectedAgency}
                onChange={(e) => setSelectedAgency(e.target.value)}
                className="px-6 py-3 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-600 outline-none focus:border-tunisia-red transition-all shadow-sm"
              >
                {institutions.map(inst => <option key={inst} value={inst}>{inst}</option>)}
              </select>
            </div>
          </div>
        </div>

        {activeTab === 'instruction' && (
          <div className="space-y-10 animate-fade-in">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                { label: 'Dossiers à traiter', val: '12', color: 'bg-tunisia-red', icon: 'fa-folder-open' },
                { label: 'Délai moyen Instruction', val: '8.5h', color: 'bg-blue-600', icon: 'fa-stopwatch' },
                { label: 'Taux de conformité', val: '94%', color: 'bg-emerald-600', icon: 'fa-check-double' },
              ].map((stat, i) => (
                <div key={i} className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 relative overflow-hidden group hover:shadow-md transition-all">
                  <div className="flex justify-between items-start mb-6">
                    <div className={`w-12 h-12 rounded-2xl ${stat.color} text-white flex items-center justify-center shadow-lg`}>
                      <i className={`fas ${stat.icon} text-xl`}></i>
                    </div>
                    <span className="text-3xl font-black italic text-slate-900 tracking-tighter">{stat.val}</span>
                  </div>
                  <h4 className="text-slate-400 text-[10px] font-black uppercase tracking-widest">{stat.label}</h4>
                </div>
              ))}
            </div>

            {/* Requests Table */}
            <div className="bg-white rounded-[3rem] shadow-sm border border-slate-100 overflow-hidden">
              <div className="p-8 border-b border-slate-50 bg-slate-50/30 flex justify-between items-center">
                <h3 className="text-xl font-black text-slate-900 uppercase italic tracking-tighter">File de Travail Prioritaire</h3>
                <div className="flex gap-2">
                  <span className="px-3 py-1 bg-white border border-slate-200 rounded-lg text-[9px] font-black uppercase tracking-widest text-slate-400">Trier par Risque</span>
                </div>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-white">
                      <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Dossier</th>
                      <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Opérateur</th>
                      <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Institution</th>
                      <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Risque</th>
                      <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Statut</th>
                      <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {requests.map((req) => (
                      <tr key={req.id} className="group hover:bg-slate-50/50 transition-colors">
                        <td className="px-8 py-6">
                          <div className="font-black text-slate-900 italic tracking-tighter text-base">{req.id}</div>
                          <div className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{req.type}</div>
                        </td>
                        <td className="px-8 py-6 font-bold text-slate-600 text-xs uppercase tracking-tight">{req.entity}</td>
                        <td className="px-8 py-6">
                          <span className="text-[9px] font-black text-slate-500 uppercase tracking-tight bg-slate-100 px-3 py-1 rounded-full">{req.institution}</span>
                        </td>
                        <td className="px-8 py-6">
                          <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                            req.risk === 'Low' ? 'bg-green-50 text-green-700 border-green-200' :
                            req.risk === 'Medium' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                            'bg-red-50 text-red-700 border-red-200'
                          }`}>
                            {req.risk}
                          </span>
                        </td>
                        <td className="px-8 py-6">
                          <span className={`text-[10px] font-black uppercase tracking-widest ${
                            req.status === 'Accepté' ? 'text-emerald-500' : 
                            req.status === 'Rejeté' ? 'text-tunisia-red' :
                            req.status === 'À Corriger' ? 'text-amber-500' :
                            'text-slate-400 animate-pulse'
                          }`}>
                            {req.status}
                          </span>
                        </td>
                        <td className="px-8 py-6 text-right">
                          {req.status === 'En attente' ? (
                            <div className="flex justify-end gap-2">
                              <button 
                                onClick={() => handleAction(req.id, 'APPROVED')}
                                disabled={verifyingId === req.id}
                                className="w-8 h-8 rounded-xl bg-emerald-500 text-white hover:bg-emerald-600 transition-all flex items-center justify-center shadow-lg shadow-emerald-200"
                                title="Accepter"
                              >
                                <i className="fas fa-check"></i>
                              </button>
                              <button 
                                onClick={() => handleAction(req.id, 'REVISION')}
                                disabled={verifyingId === req.id}
                                className="w-8 h-8 rounded-xl bg-amber-500 text-white hover:bg-amber-600 transition-all flex items-center justify-center shadow-lg shadow-amber-200"
                                title="À Corriger"
                              >
                                <i className="fas fa-pen"></i>
                              </button>
                              <button 
                                onClick={() => handleAction(req.id, 'REJECTED')}
                                disabled={verifyingId === req.id}
                                className="w-8 h-8 rounded-xl bg-tunisia-red text-white hover:bg-red-700 transition-all flex items-center justify-center shadow-lg shadow-red-200"
                                title="Rejeter"
                              >
                                <i className="fas fa-times"></i>
                              </button>
                            </div>
                          ) : (
                            <div className="text-[10px] font-black uppercase tracking-widest text-slate-300 italic">Traité</div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'stats' && (
          <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-slate-100 animate-fade-in">
            <h3 className="text-xl font-black italic text-slate-900 uppercase tracking-tighter mb-8">Analyse des Performances</h3>
            <p className="text-slate-500">Visualisation des données de validation en cours de développement...</p>
          </div>
        )}

        {activeTab === 'archive' && (
          <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-slate-100 animate-fade-in">
            <h3 className="text-xl font-black italic text-slate-900 uppercase tracking-tighter mb-8">Historique des Décisions</h3>
            <p className="text-slate-500">Accès aux dossiers archivés en cours de développement...</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default ValidatorSpace;