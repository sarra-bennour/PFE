import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  AreaChart, Area, ComposedChart, Bar, XAxis, YAxis, 
  CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import { useAuth } from '../App';

const AdminPanel: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'traffic' | 'security'>('overview');

  const stats = [
    { label: "Utilisateurs Actifs", value: "4,281", icon: "fa-users", color: "text-blue-500", bg: "bg-blue-50" },
    { label: "Transactions (24h)", value: "1,240", icon: "fa-exchange-alt", color: "text-emerald-500", bg: "bg-emerald-50" },
    { label: "Alertes Sécurité", value: "02", icon: "fa-shield-virus", color: "text-tunisia-red", bg: "bg-red-50" },
    { label: "Uptime Système", value: "99.98%", icon: "fa-bolt", color: "text-purple-500", bg: "bg-purple-50" },
  ];

  const trafficData = [
    { name: '00:00', value: 400, trucks: 20 },
    { name: '04:00', value: 1200, trucks: 45 },
    { name: '08:00', value: 4500, trucks: 310 },
    { name: '12:00', value: 6800, trucks: 590 },
    { name: '16:00', value: 5200, trucks: 610 },
    { name: '20:00', value: 2800, trucks: 340 },
  ];

  const borderNodes = [
    { id: 'rades', name: 'Port de Radès', type: 'Maritime', status: 'Intense', volume: 642, load: 88, lat: '20%', lon: '45%' },
    { id: 'goulette', name: 'La Goulette', type: 'Maritime/Passagers', status: 'Fluide', volume: 215, load: 34, lat: '15%', lon: '42%' },
    { id: 'carthage', name: 'Tunis-Carthage', type: 'Aérien', status: 'Optimal', volume: 185, load: 45, lat: '12%', lon: '46%' },
    { id: 'sfax', name: 'Port de Sfax', type: 'Maritime', status: 'Modéré', volume: 312, load: 62, lat: '55%', lon: '52%' },
  ];

  const mockUsers = [
    { id: 'EXP-902', name: 'Global Tech TR', role: 'Exportateur', status: 'Active', country: 'Turquie' },
    { id: 'IMP-112', name: 'Sousse Textile', role: 'Importateur', status: 'Active', country: 'Tunisie' },
    { id: 'EXP-881', name: 'EuroFood FR', role: 'Exportateur', status: 'Suspended', country: 'France' },
  ];

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans overflow-hidden">
      {/* SIDEBAR PROFESSIONNELLE FIXE */}
      <aside className="w-72 bg-slate-900 text-white flex flex-col fixed h-full z-50 border-r border-white/5">
        <div className="p-8 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-tunisia-red rounded-xl flex items-center justify-center shadow-lg shadow-red-500/20">
              <i className="fas fa-tower-observation text-sm"></i>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 leading-none mb-1">Back-Office</span>
              <span className="text-sm font-black uppercase tracking-tighter italic">Admin <span className="text-tunisia-red">Central</span></span>
            </div>
          </div>
        </div>

        <nav className="flex-grow p-6 space-y-2 overflow-y-auto scrollbar-hide">
          {[
            { id: 'overview', label: 'Tableau de Bord', icon: 'fa-th-large' },
            { id: 'users', label: 'Gestion Opérateurs', icon: 'fa-user-shield' },
            { id: 'traffic', label: 'Radar Tactique', icon: 'fa-radar' },
            { id: 'security', label: 'Cyber-Sécurité', icon: 'fa-lock' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as any)}
              className={`w-full flex items-center gap-4 px-4 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
                activeTab === item.id 
                  ? 'bg-white/10 text-white shadow-xl ring-1 ring-white/10' 
                  : 'text-slate-500 hover:text-white hover:bg-white/5'
              }`}
            >
              <i className={`fas ${item.icon} w-5 text-center`}></i>
              {item.label}
            </button>
          ))}
          
          <div className="pt-6 mt-6 border-t border-white/5 space-y-2">
            <p className="px-4 text-[8px] font-black text-slate-600 uppercase tracking-widest mb-4">Utilisateur</p>
            <button
              onClick={() => navigate('/profile')}
              className="w-full flex items-center gap-4 px-4 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white hover:bg-white/5 transition-all"
            >
              <i className="fas fa-user-circle w-5 text-center"></i>
              Mon Profil
            </button>
          </div>
        </nav>

        <div className="p-6">
          <div className="bg-slate-800/50 p-5 rounded-3xl border border-white/5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-full bg-slate-700 overflow-hidden border border-white/10">
                <img src={`https://ui-avatars.com/api/?name=${user?.email}&background=random`} alt="User" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest truncate">Administrateur</span>
                <span className="text-[10px] font-bold text-white truncate">{user?.email}</span>
              </div>
            </div>
            <button onClick={() => logout()} className="w-full py-2.5 bg-white/5 hover:bg-red-500/10 text-slate-400 hover:text-tunisia-red rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border border-white/5">
              <i className="fas fa-power-off mr-2"></i> Déconnexion
            </button>
          </div>
        </div>
      </aside>

      {/* CONTENU PRINCIPAL - DÉCALÉ PAR LA SIDEBAR */}
      <main className="ml-72 flex-grow min-h-screen bg-slate-50 p-10 space-y-10 overflow-y-auto">
        
        {/* BARRE SUPÉRIEURE CONTEXTUELLE */}
        <div className="flex justify-between items-center bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
          <div>
            <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
              <span>Souveraineté Numérique</span>
              <i className="fas fa-chevron-right text-[7px] opacity-30"></i>
              <span className="text-slate-900">{activeTab.toUpperCase()}</span>
            </div>
            <h1 className="text-3xl font-black text-slate-900 italic uppercase tracking-tighter">Console Centrale de Pilotage</h1>
          </div>
          <div className="flex items-center gap-6">
             <div className="flex flex-col items-end">
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Dernière Sync</span>
                <span className="text-[10px] font-bold text-slate-900">Aujourd'hui, 14:42</span>
             </div>
             <div className="w-10 h-10 bg-emerald-50 text-emerald-500 rounded-2xl flex items-center justify-center border border-emerald-100 shadow-sm">
                <i className="fas fa-sync-alt animate-spin-slow"></i>
             </div>
          </div>
        </div>

        {/* BENTO DASHBOARD KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat, i) => (
            <div key={i} className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 flex items-center gap-6 hover:shadow-md transition-shadow cursor-default group">
              <div className={`w-14 h-14 ${stat.bg} ${stat.color} rounded-2xl flex items-center justify-center text-xl transition-transform group-hover:scale-110`}>
                <i className={`fas ${stat.icon}`}></i>
              </div>
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">{stat.label}</p>
                <p className="text-3xl font-black italic tracking-tighter text-slate-900 leading-none">{stat.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* CONTENU DYNAMIQUE DES ONGLETS */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in-scale">
            {/* GRAPHIQUE HYBRIDE VALEUR/FLUX */}
            <div className="lg:col-span-2 bg-white p-10 rounded-[3.5rem] shadow-sm border border-slate-100">
               <div className="flex justify-between items-center mb-12">
                  <div>
                    <h3 className="text-xl font-black italic uppercase tracking-tighter text-slate-900">Suivi des Flux Douaniers</h3>
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mt-1">Analyse corrélée Valeur (TND) vs Volume (Trafic)</p>
                  </div>
                  <div className="flex gap-4">
                     <div className="flex items-center gap-2 text-[9px] font-black uppercase text-tunisia-red">
                        <div className="w-2.5 h-2.5 bg-tunisia-red rounded-full"></div> Valeur
                     </div>
                     <div className="flex items-center gap-2 text-[9px] font-black uppercase text-slate-900">
                        <div className="w-2.5 h-2.5 bg-slate-900 rounded-full"></div> Camions
                     </div>
                  </div>
               </div>
               <div className="h-[400px]">
                 <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={trafficData}>
                       <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                       <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 9, fontWeight: 800, fill: '#94a3b8'}} />
                       <YAxis hide />
                       <Tooltip 
                          contentStyle={{borderRadius: '24px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)'}}
                          itemStyle={{fontSize: '10px', fontWeight: 900, textTransform: 'uppercase'}}
                       />
                       <Area type="monotone" dataKey="value" fill="#E70013" stroke="#E70013" strokeWidth={3} fillOpacity={0.05} />
                       <Bar dataKey="trucks" barSize={25} fill="#0f172a" radius={[6, 6, 0, 0]} />
                    </ComposedChart>
                 </ResponsiveContainer>
               </div>
            </div>

            <div className="space-y-8">
               <div className="bg-slate-900 text-white p-10 rounded-[3.5rem] shadow-2xl flex flex-col justify-between h-full relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-10 opacity-5 pointer-events-none">
                     <i className="fas fa-fingerprint text-[15rem] transform rotate-12"></i>
                  </div>
                  <div className="relative z-10">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-10">Intégrité des Transactions</h4>
                    <div className="text-center space-y-6 py-4">
                       <div className="w-28 h-28 bg-white/5 border border-white/10 rounded-full flex items-center justify-center mx-auto shadow-2xl relative">
                          <i className="fas fa-shield-check text-5xl text-emerald-400"></i>
                          <div className="absolute inset-0 rounded-full border border-emerald-500/20 animate-ping"></div>
                       </div>
                       <div>
                          <div className="text-5xl font-black italic tracking-tighter mb-2">99.2%</div>
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-relaxed">Score de Conformité Global</p>
                       </div>
                    </div>
                  </div>
                  <button className="w-full py-5 bg-white text-slate-900 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl hover:bg-slate-50 transition-all relative z-10">
                    Rapport de Sécurité
                  </button>
               </div>
            </div>
          </div>
        )}

        {activeTab === 'users' && (
          <div className="bg-white rounded-[3rem] shadow-sm border border-slate-100 overflow-hidden animate-fade-in-scale">
             <div className="p-10 border-b border-slate-50 flex justify-between items-center bg-slate-50/20">
                <h3 className="text-xl font-black italic uppercase tracking-tighter text-slate-900">Répertoire National des Opérateurs</h3>
                <div className="flex gap-4">
                   <div className="relative">
                      <input type="text" placeholder="TIN, Nom..." className="pl-12 pr-6 py-3 bg-white border border-slate-200 rounded-2xl text-[10px] font-bold outline-none focus:border-tunisia-red transition-all w-64 shadow-inner" />
                      <i className="fas fa-search absolute left-5 top-1/2 -translate-y-1/2 text-slate-300"></i>
                   </div>
                </div>
             </div>
             <div className="overflow-x-auto">
               <table className="w-full text-left">
                  <thead className="bg-white border-b border-slate-50">
                     <tr>
                        <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Identifiant Unique</th>
                        <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Entité Commerciale</th>
                        <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Origine</th>
                        <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">État du Dossier</th>
                        <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                     {mockUsers.map((u) => (
                        <tr key={u.id} className="group hover:bg-slate-50 transition-colors">
                           <td className="px-10 py-7 text-sm font-black italic tracking-tighter text-slate-900">{u.id}</td>
                           <td className="px-10 py-7">
                              <p className="text-xs font-black uppercase tracking-tight text-slate-800">{u.name}</p>
                              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{u.role}</p>
                           </td>
                           <td className="px-10 py-7 text-[10px] font-black uppercase tracking-widest text-slate-500">{u.country}</td>
                           <td className="px-10 py-7">
                              <span className={`px-4 py-1.5 rounded-full text-[8px] font-black uppercase border ${u.status === 'Active' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-red-50 text-red-600 border-red-200'}`}>
                                 {u.status}
                              </span>
                           </td>
                           <td className="px-10 py-7 text-right">
                              <button className="w-9 h-9 rounded-xl bg-slate-50 text-slate-300 hover:text-tunisia-red hover:bg-red-50 transition-all border border-slate-100 flex items-center justify-center">
                                 <i className="fas fa-ellipsis-h"></i>
                              </button>
                           </td>
                        </tr>
                     ))}
                  </tbody>
               </table>
             </div>
          </div>
        )}

        {activeTab === 'traffic' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 animate-fade-in-scale">
             <div className="bg-slate-900 p-10 rounded-[4rem] shadow-2xl relative overflow-hidden group border border-white/5">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,_rgba(231,0,19,0.05)_0%,_transparent_70%)]"></div>
                <div className="flex justify-between items-center mb-10 relative z-10">
                   <div>
                     <h3 className="text-xl font-black italic text-white uppercase tracking-tighter">Radar Tactique Transfrontalier</h3>
                     <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest mt-1">Surveillance des nœuds logistiques critiques</p>
                   </div>
                   <span className="px-4 py-2 bg-red-500/20 text-red-500 border border-red-500/30 rounded-2xl text-[8px] font-black uppercase tracking-widest animate-pulse">Tracking Live</span>
                </div>
                
                <div className="relative h-[480px] bg-slate-800/50 rounded-[3rem] border border-white/5 overflow-hidden shadow-inner">
                   <div className="absolute inset-0 opacity-10 pointer-events-none flex items-center justify-center">
                      <i className="fas fa-map-marked-alt text-[45rem]"></i>
                   </div>
                   
                   {borderNodes.map((node) => (
                     <div key={node.id} className="absolute cursor-pointer group/node" style={{ top: node.lat, left: node.lon }}>
                        <div className={`w-5 h-5 rounded-full ${node.load > 85 ? 'bg-tunisia-red' : 'bg-emerald-500'} animate-ping opacity-40 absolute inset-0`}></div>
                        <div className={`w-5 h-5 rounded-full ${node.load > 85 ? 'bg-tunisia-red' : 'bg-emerald-500'} border-4 border-slate-900 relative z-10 shadow-xl`}></div>
                        
                        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-white text-slate-900 p-5 rounded-3xl shadow-2xl opacity-0 group-hover/node:opacity-100 transition-all w-56 pointer-events-none z-20 translate-y-2 group-hover/node:translate-y-0 border border-slate-100">
                           <h5 className="text-[10px] font-black uppercase mb-1">{node.name}</h5>
                           <div className="flex justify-between text-[8px] font-bold text-slate-400 mb-3">
                              <span>{node.type}</span>
                              <span className={node.load > 85 ? 'text-tunisia-red' : 'text-emerald-500'}>{node.status}</span>
                           </div>
                           <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden mb-2">
                              <div className={`h-full ${node.load > 85 ? 'bg-tunisia-red' : 'bg-emerald-500'}`} style={{ width: `${node.load}%` }}></div>
                           </div>
                           <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest text-center">{node.volume} transits / heure</p>
                        </div>
                     </div>
                   ))}
                </div>
             </div>

             <div className="space-y-8">
                <div className="bg-white p-10 rounded-[3.5rem] shadow-sm border border-slate-100">
                   <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-10 border-b border-slate-50 pb-5">Statut de Charge par Zone</h4>
                   <div className="space-y-6">
                      {borderNodes.map((node) => (
                        <div key={node.id} className="flex items-center justify-between p-5 bg-slate-50 rounded-[2rem] border border-slate-100 hover:border-tunisia-red/20 transition-all">
                           <div className="flex items-center gap-5">
                              <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center text-slate-400 shadow-sm border border-slate-50">
                                 <i className={`fas ${node.type === 'Maritime' ? 'fa-ship' : node.type === 'Aérien' ? 'fa-plane' : 'fa-truck'}`}></i>
                              </div>
                              <div>
                                 <h5 className="text-[11px] font-black uppercase italic tracking-tighter text-slate-900">{node.name}</h5>
                                 <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{node.type} &bull; {node.volume} Transits</span>
                              </div>
                           </div>
                           <div className="text-right">
                              <span className={`text-base font-black italic tracking-tighter ${node.load > 85 ? 'text-tunisia-red' : 'text-slate-900'}`}>{node.load}%</span>
                              <p className="text-[7px] font-black uppercase tracking-widest text-slate-400">Capacité</p>
                           </div>
                        </div>
                      ))}
                   </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                   <div className="bg-emerald-600 p-8 rounded-[3rem] text-white shadow-xl shadow-emerald-600/10">
                      <i className="fas fa-bolt text-2xl mb-4 opacity-50"></i>
                      <h5 className="text-[9px] font-black uppercase tracking-widest mb-1 text-emerald-100">Optimisation Flux</h5>
                      <span className="text-3xl font-black italic tracking-tighter">+14%</span>
                      <p className="text-[8px] font-medium text-emerald-100 mt-2">Vs semaine précédente</p>
                   </div>
                   <div className="bg-slate-900 p-8 rounded-[3rem] text-white shadow-xl">
                      <i className="fas fa-map-location-dot text-2xl mb-4 opacity-30 text-tunisia-red"></i>
                      <h5 className="text-[9px] font-black uppercase tracking-widest mb-1 text-slate-500">Nœuds Actifs</h5>
                      <span className="text-3xl font-black italic tracking-tighter">18 / 20</span>
                      <p className="text-[8px] font-medium text-slate-500 mt-2">Surveillance intégrale</p>
                   </div>
                </div>
             </div>
          </div>
        )}

        {activeTab === 'security' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 animate-fade-in-scale">
             <div className="lg:col-span-2 bg-white p-10 rounded-[3.5rem] shadow-sm border border-slate-100">
                <div className="flex justify-between items-center mb-10">
                   <h3 className="text-xl font-black italic text-slate-900 uppercase tracking-tighter">Journal des Événements Critiques</h3>
                   <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Temps Réel (Logs)</span>
                </div>
                <div className="space-y-4">
                   {[
                     { time: "14:22:10", type: "ACCÈS", desc: "Authentification biométrique Mobile ID réussie", ip: "197.0.12.44", level: "info" },
                     { time: "11:05:45", type: "SÉCURITÉ", desc: "Blocage temporaire compte EXP-902 (Force brute)", ip: "45.1.88.2", level: "warn" },
                     { time: "09:12:01", type: "SYSTÈME", desc: "Mise à jour noyau passerelle CNI effectuée", ip: "INTERNAL", level: "info" },
                     { time: "08:45:30", type: "DOUANE", desc: "Nouvelle règle tarifaire NGP activée", ip: "DB-AUTH", level: "info" },
                   ].map((log, i) => (
                     <div key={i} className="p-5 rounded-[2rem] bg-slate-50 flex items-start gap-5 border border-slate-100 hover:bg-white hover:shadow-md transition-all">
                        <div className={`w-1.5 h-12 rounded-full ${log.level === 'warn' ? 'bg-tunisia-red' : 'bg-emerald-500'} shadow-sm`}></div>
                        <div className="flex-grow">
                           <div className="flex justify-between items-center mb-1.5">
                              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{log.time} &bull; <span className={log.level === 'warn' ? 'text-tunisia-red' : 'text-slate-600'}>{log.type}</span></span>
                              <span className="text-[9px] font-mono font-bold text-slate-300">{log.ip}</span>
                           </div>
                           <p className="text-xs font-black text-slate-700 tracking-tight">{log.desc}</p>
                        </div>
                     </div>
                   ))}
                </div>
             </div>

             <div className="bg-tunisia-red text-white p-10 rounded-[3.5rem] shadow-2xl relative overflow-hidden flex flex-col justify-between">
                <div className="absolute -bottom-10 -right-10 opacity-20 pointer-events-none">
                   <i className="fas fa-fingerprint text-[18rem]"></i>
                </div>
                <div className="relative z-10">
                   <h3 className="text-[10px] font-black uppercase tracking-widest text-red-100 mb-10">Protection Souveraine</h3>
                   <div className="text-center space-y-8">
                      <div className="w-24 h-24 bg-white/20 rounded-[2.5rem] flex items-center justify-center mx-auto border-4 border-white/30 backdrop-blur-md shadow-2xl">
                         <i className="fas fa-shield-alt text-4xl"></i>
                      </div>
                      <div>
                        <div className="text-4xl font-black italic tracking-tighter uppercase mb-2">Statut OK</div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-red-100 leading-relaxed">Infrastructure sécurisée par pare-feu multicouches CNI.</p>
                      </div>
                   </div>
                </div>
                <div className="space-y-3 relative z-10">
                   <button className="w-full py-4 bg-white text-tunisia-red rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl hover:bg-red-50 transition-all">
                      Scan de Vulnérabilité
                   </button>
                   <button className="w-full py-4 bg-red-800/40 text-red-100 border border-white/10 rounded-2xl font-black uppercase tracking-widest text-[9px] hover:bg-red-800 transition-all">
                      Isolation Réseau (Urgence)
                   </button>
                </div>
             </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminPanel;