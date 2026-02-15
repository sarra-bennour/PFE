
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { RequestStatus } from '../types';
import { useAuth } from '../App';

const ValidatorSpace: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [selectedAgency, setSelectedAgency] = useState('Min. Commerce');

  const institutions = [
    "Ministère du Commerce",
    "Ministère de l'Industrie",
    "INSSPA (Sécurité Sanitaire)",
    "ANMPS (Médicaments)",
    "Ministère de l'Agriculture"
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
    <div className="max-w-7xl mx-auto space-y-10 animate-fade-in-scale">
      <div className="flex flex-col md:flex-row justify-between items-start gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 mb-4">
             <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></span>
             <span className="text-[10px] font-black uppercase tracking-widest text-blue-600">{user?.companyName || "Instance de Validation"}</span>
          </div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic">Instruction des Dossiers</h2>
          <p className="text-slate-500 font-medium max-w-xl">Consultation et validation des demandes d'enregistrement et opérations d'importation.</p>
        </div>
        
        <div className="flex flex-col items-end gap-3">
           <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Filtrer par Institution</label>
           <select 
             value={selectedAgency}
             onChange={(e) => setSelectedAgency(e.target.value)}
             className="px-6 py-3 bg-white border-2 border-slate-100 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-600 outline-none focus:border-tunisia-red transition-all shadow-sm"
           >
             {institutions.map(inst => <option key={inst} value={inst}>{inst}</option>)}
           </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {[
          { label: 'Dossiers à traiter', val: '12', color: 'bg-tunisia-red', icon: 'fa-folder-open' },
          { label: 'Délai moyen Instruction', val: '8.5h', color: 'bg-blue-600', icon: 'fa-stopwatch' },
          { label: 'Taux de conformité', val: '94%', color: 'bg-emerald-600', icon: 'fa-check-double' },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-50 relative overflow-hidden group">
            <div className={`absolute top-0 right-0 w-24 h-24 ${stat.color} opacity-[0.03] rounded-bl-full`}></div>
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

      <div className="bg-white rounded-[3rem] shadow-2xl border border-slate-100 overflow-hidden">
        <div className="p-8 border-b border-slate-50 bg-slate-50/30 flex justify-between items-center">
           <h3 className="text-xl font-black text-slate-900 uppercase italic tracking-tighter">File de Travail Prioritaire</h3>
           <div className="flex gap-2">
              <span className="px-3 py-1 bg-white border border-slate-200 rounded-lg text-[9px] font-black uppercase tracking-widest text-slate-400">Trier par Risque</span>
           </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left rtl:text-right">
            <thead>
              <tr className="bg-white">
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Dossier</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Opérateur</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Institution Compétente</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Risque</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Statut</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions de Validation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {requests.map((req) => (
                <tr key={req.id} className="group hover:bg-slate-50/50 transition-colors">
                  <td className="px-8 py-6">
                    <div className="font-black text-slate-900 italic tracking-tighter text-base">{req.id}</div>
                    <div className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{req.type}</div>
                  </td>
                  <td className="px-8 py-6 font-bold text-slate-600">{req.entity}</td>
                  <td className="px-8 py-6">
                     <span className="text-[10px] font-black text-slate-500 uppercase tracking-tight bg-slate-100 px-3 py-1 rounded-full">{req.institution}</span>
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
                      <div className="text-slate-200">Traitement terminé</div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ValidatorSpace;
