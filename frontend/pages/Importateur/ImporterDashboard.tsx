
import React from 'react';
import { useTranslation } from 'react-i18next';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell, PieChart, Pie } from 'recharts';

const ImporterDashboard: React.FC = () => {
  const { t } = useTranslation();

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
  );
};

export default ImporterDashboard;
