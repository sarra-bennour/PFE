
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { RequestStatus } from '../types';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell, PieChart, Pie } from 'recharts';

const ImporterSpace: React.FC = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'declare' | 'track' | 'visualize'>('track');

  const mockDeclarations = [
    { id: 'DEC-001', date: '2025-05-10', exporter: 'AgroEuro SA', product: 'Huile d\'olive raffinée', status: RequestStatus.APPROVED, ngp: '15091020' },
    { id: 'DEC-002', date: '2025-05-12', exporter: 'TechChina Ltd', product: 'Puces électroniques', status: RequestStatus.PENDING, ngp: '85423100' },
    { id: 'DEC-003', date: '2025-05-15', exporter: 'Global Fabrics', product: 'Textile coton', status: RequestStatus.REJECTED, ngp: '52081100' },
  ];

  const chartData = [
    { name: 'Lun', volume: 120 },
    { name: 'Mar', volume: 150 },
    { name: 'Mer', volume: 80 },
    { name: 'Jeu', volume: 210 },
    { name: 'Ven', volume: 190 },
    { name: 'Sam', volume: 50 },
    { name: 'Dim', volume: 30 },
  ];

  const categoryData = [
    { name: 'Alimentaire', value: 45 },
    { name: 'Textile', value: 25 },
    { name: 'Tech', value: 20 },
    { name: 'Autre', value: 10 },
  ];

  const countryData = [
    { name: 'Turquie', value: 350 },
    { name: 'Chine', value: 280 },
    { name: 'Italie', value: 210 },
    { name: 'France', value: 150 },
  ];

  const COLORS = ['#E70013', '#334155', '#475569', '#94a3b8'];

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-end gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic">Espace Importateurs Tunisiens</h2>
          <p className="text-slate-500 font-medium">Déclarez vos importations et gérez vos flux commerciaux.</p>
        </div>
        <div className="flex p-1 bg-slate-100 rounded-2xl shadow-inner border border-slate-200">
          <button 
            onClick={() => setActiveTab('declare')}
            className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'declare' ? 'bg-white text-tunisia-red shadow-lg' : 'text-slate-400'}`}
          >
            Nouveau
          </button>
          <button 
            onClick={() => setActiveTab('track')}
            className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'track' ? 'bg-white text-tunisia-red shadow-lg' : 'text-slate-400'}`}
          >
            Suivi
          </button>
          <button 
            onClick={() => setActiveTab('visualize')}
            className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'visualize' ? 'bg-white text-tunisia-red shadow-lg' : 'text-slate-400'}`}
          >
            Données
          </button>
        </div>
      </div>

      {activeTab === 'declare' && (
        <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-100 p-10 animate-fade-in-scale">
          <form className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Exportateur Agréé</label>
                <select className="w-full px-5 py-4 rounded-2xl border-2 border-slate-50 font-bold bg-slate-50/50 focus:border-tunisia-red outline-none transition-all appearance-none">
                  <option>AgroEuro SA (ES-12345)</option>
                  <option>TechChina Ltd (CN-88990)</option>
                  <option>Global Fabrics (FR-55443)</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Code NGP</label>
                <input type="text" className="w-full px-5 py-4 rounded-2xl border-2 border-slate-50 font-bold bg-slate-50/50 focus:border-tunisia-red outline-none transition-all" placeholder="Ex: 15091020" />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Description</label>
              <textarea className="w-full px-5 py-4 rounded-2xl border-2 border-slate-50 font-bold bg-slate-50/50 focus:border-tunisia-red outline-none transition-all" rows={3} placeholder="Détails de la marchandise..."></textarea>
            </div>

            <button className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-slate-200 active:scale-95 transition-all">
              Soumettre la déclaration
            </button>
          </form>
        </div>
      )}

      {activeTab === 'track' && (
        <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-100 overflow-hidden animate-fade-in-scale">
           <div className="p-8 border-b border-slate-50 flex justify-between items-center">
              <h3 className="text-xl font-black text-slate-900 uppercase italic tracking-tighter">Mes Dossiers Récents</h3>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <input type="text" placeholder="Recherche..." className="pl-10 pr-4 py-2 bg-slate-50 border-none rounded-xl text-xs focus:ring-1 focus:ring-tunisia-red outline-none" />
                  <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-300"></i>
                </div>
              </div>
           </div>
          <table className="w-full text-left rtl:text-right">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-50">
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Référence</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Exportateur</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Produit</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Statut</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {mockDeclarations.map((dec) => (
                <tr key={dec.id} className="group hover:bg-slate-50/50 transition-colors">
                  <td className="px-8 py-6 font-black text-slate-900 tracking-tighter italic">{dec.id}</td>
                  <td className="px-8 py-6 font-bold text-slate-600">{dec.exporter}</td>
                  <td className="px-8 py-6">
                    <span className="block text-sm font-bold text-slate-800">{dec.product}</span>
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{dec.ngp}</span>
                  </td>
                  <td className="px-8 py-6">
                    <span className={`px-4 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                      dec.status === RequestStatus.APPROVED ? 'bg-green-50 text-green-600 border-green-200' :
                      dec.status === RequestStatus.REJECTED ? 'bg-red-50 text-red-600 border-red-200' :
                      'bg-amber-50 text-amber-600 border-amber-200'
                    }`}>
                      {dec.status}
                    </span>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <button className="text-tunisia-red font-black uppercase text-[10px] tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">Consulter</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'visualize' && (
        <div className="space-y-8 animate-fade-in-scale">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Time Series Volume */}
            <div className="lg:col-span-2 bg-white p-10 rounded-[3rem] shadow-xl border border-slate-100">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-xl font-black text-slate-900 uppercase italic tracking-tighter">{t('import_volume')}</h3>
                  <div className="px-3 py-1 bg-slate-50 rounded-lg text-[10px] font-black text-slate-400 uppercase tracking-widest italic">7 Derniers Jours</div>
                </div>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="colorVolume" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#E70013" stopOpacity={0.15}/>
                          <stop offset="95%" stopColor="#E70013" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700, fill: '#94a3b8'}} />
                      <YAxis hide />
                      <Tooltip 
                        contentStyle={{borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)'}} 
                        labelStyle={{fontWeight: 900, textTransform: 'uppercase', fontSize: '10px'}}
                      />
                      <Area type="monotone" dataKey="volume" stroke="#E70013" strokeWidth={4} fillOpacity={1} fill="url(#colorVolume)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
            </div>

            {/* Performance Stats Overlay */}
            <div className="bg-slate-900 text-white p-10 rounded-[3rem] shadow-2xl flex flex-col justify-between relative overflow-hidden">
               <div className="absolute top-0 right-0 p-8 opacity-10">
                  <i className="fas fa-chart-pie text-9xl transform rotate-12"></i>
               </div>
               <div className="relative z-10">
                 <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-10">Score de Performance</h3>
                 <div className="space-y-10">
                    <div>
                      <span className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Volume Mensuel</span>
                      <div className="text-4xl font-black italic tracking-tighter">1.4M <span className="text-slate-500 text-sm">TND</span></div>
                    </div>
                    <div>
                      <span className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Accord Préalable</span>
                      <div className="text-4xl font-black italic tracking-tighter text-emerald-500">92%</div>
                    </div>
                 </div>
               </div>
               <button className="w-full py-5 bg-white/5 hover:bg-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all mt-8 border border-white/5">
                 Générer Rapport Analytique
               </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Volume By Category */}
            <div className="bg-white p-10 rounded-[3rem] shadow-xl border border-slate-100">
               <h3 className="text-xl font-black text-slate-900 uppercase italic tracking-tighter mb-10">{t('volume_by_category')} (%)</h3>
               <div className="flex flex-col md:flex-row items-center gap-10">
                  <div className="w-full h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={categoryData}
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {categoryData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{borderRadius: '15px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'}} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="w-full space-y-4">
                    {categoryData.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full" style={{backgroundColor: COLORS[idx % COLORS.length]}}></div>
                          <span className="text-xs font-bold text-slate-600 uppercase">{item.name}</span>
                        </div>
                        <span className="text-xs font-black text-slate-900">{item.value}%</span>
                      </div>
                    ))}
                  </div>
               </div>
            </div>

            {/* Volume By Country */}
            <div className="bg-white p-10 rounded-[3rem] shadow-xl border border-slate-100">
               <h3 className="text-xl font-black text-slate-900 uppercase italic tracking-tighter mb-10">{t('origin_country')} (Volume)</h3>
               <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={countryData} layout="vertical">
                      <XAxis type="number" hide />
                      {/* FIX: Removed textTransform from tick object as it's not a valid SVG attribute for tick labels */}
                      <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 900, fill: '#64748b'}} width={80} />
                      <Tooltip 
                        cursor={{fill: 'transparent'}}
                        contentStyle={{borderRadius: '15px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'}} 
                      />
                      <Bar dataKey="value" radius={[0, 10, 10, 0]}>
                        {countryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={index === 0 ? '#E70013' : '#cbd5e1'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
               </div>
               <p className="mt-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center italic">
                 La Turquie reste le partenaire principal pour vos importations de textile.
               </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImporterSpace;
