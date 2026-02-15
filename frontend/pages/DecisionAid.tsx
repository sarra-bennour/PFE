
import React from 'react';
import { useTranslation } from 'react-i18next';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, ComposedChart, Line, Area } from 'recharts';
import { useAuth } from '../App';

const DecisionAid: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();

  const data = [
    { name: 'Jan', imports: 4000, exporters: 240, riskIndex: 12 },
    { name: 'Feb', imports: 3000, exporters: 198, riskIndex: 15 },
    { name: 'Mar', imports: 4500, exporters: 210, riskIndex: 10 },
    { name: 'Apr', imports: 2780, exporters: 390, riskIndex: 18 },
    { name: 'May', imports: 1890, exporters: 480, riskIndex: 22 },
    { name: 'Jun', imports: 3100, exporters: 380, riskIndex: 14 },
  ];

  const pieData = [
    { name: 'Alimentaire', value: 40 },
    { name: 'Textile', value: 25 },
    { name: 'Électronique', value: 20 },
    { name: 'Industriel', value: 15 },
  ];

  const COLORS = ['#E70013', '#334155', '#475569', '#94a3b8'];

  return (
    <div className="max-w-7xl mx-auto space-y-10 py-6 animate-fade-in-scale">
      {/* Header Stratégique */}
      <div className="flex flex-col md:flex-row justify-between items-end gap-6 bg-slate-900 p-12 rounded-[3.5rem] text-white relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
           <i className="fas fa-shield-halved text-[12rem] transform -rotate-12"></i>
        </div>
        <div className="relative z-10 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20">
             <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
             <span className="text-[10px] font-black uppercase tracking-widest text-white">{user?.companyName || "Cabinet Ministériel"}</span>
          </div>
          <h2 className="text-5xl font-black tracking-tighter uppercase italic leading-[0.9]">
            Pilotage <span className="text-tunisia-red">Stratégique</span>
          </h2>
          <p className="text-slate-400 font-medium max-w-xl">
            Surveillance macroéconomique et évaluation des flux de commerce extérieur pour l'aide à la décision gouvernementale.
          </p>
        </div>
        <div className="relative z-10 flex gap-4">
          <div className="bg-white/5 border border-white/10 px-8 py-4 rounded-[2rem] text-center">
             <span className="block text-2xl font-black italic tracking-tighter">1.2B <span className="text-xs">TND</span></span>
             <span className="block text-[8px] font-black uppercase tracking-widest text-slate-500">Flux Mensuel</span>
          </div>
          <div className="bg-white/5 border border-white/10 px-8 py-4 rounded-[2rem] text-center">
             <span className="block text-2xl font-black italic tracking-tighter text-emerald-400">Low</span>
             <span className="block text-[8px] font-black uppercase tracking-widest text-slate-500">Risque Global</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Graphique de Performance & Risque */}
        <div className="lg:col-span-2 bg-white p-12 rounded-[3.5rem] shadow-xl border border-slate-100">
          <div className="flex items-center justify-between mb-12">
             <h3 className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter">Surveillance des Importations</h3>
             <div className="flex gap-2">
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 mr-4">
                   <div className="w-2 h-2 rounded-full bg-tunisia-red"></div> Volume
                </div>
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                   <div className="w-2 h-2 rounded-full bg-blue-500"></div> Indice Risque
                </div>
             </div>
          </div>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={data}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700, fill: '#94a3b8'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700, fill: '#94a3b8'}} />
                <Tooltip 
                   contentStyle={{borderRadius: '25px', border: 'none', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.15)'}}
                   labelStyle={{fontWeight: 900, textTransform: 'uppercase', fontSize: '10px', color: '#64748b'}}
                />
                <Bar dataKey="imports" fill="#E70013" radius={[8, 8, 0, 0]} name="Flux (k TND)" barSize={40} />
                <Line type="monotone" dataKey="riskIndex" stroke="#3b82f6" strokeWidth={3} dot={{r: 6, fill: '#3b82f6', strokeWidth: 4, stroke: '#fff'}} name="Indice Risque" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Secteurs Stratégiques */}
        <div className="bg-white p-12 rounded-[3.5rem] shadow-xl border border-slate-100 flex flex-col justify-between">
          <div>
            <h3 className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter mb-10">Poids Sectoriel</h3>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={100}
                    paddingAngle={8}
                    dataKey="value"
                    stroke="none"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{borderRadius: '20px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'}} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="space-y-4 mt-8">
             {pieData.map((item, idx) => (
               <div key={idx} className="flex items-center justify-between pb-3 border-b border-slate-50 last:border-0">
                  <div className="flex items-center gap-3">
                     <div className="w-2.5 h-2.5 rounded-full" style={{backgroundColor: COLORS[idx % COLORS.length]}}></div>
                     <span className="text-[10px] font-black uppercase tracking-widest text-slate-600">{item.name}</span>
                  </div>
                  <span className="text-sm font-black italic text-slate-900">{item.value}%</span>
               </div>
             ))}
          </div>
        </div>
      </div>

      {/* Widgets IA Risques */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
         <div className="bg-red-50 border border-red-100 p-8 rounded-[2.5rem] flex flex-col justify-between group hover:bg-red-100 transition-all cursor-pointer">
            <div className="text-tunisia-red mb-6"><i className="fas fa-biohazard text-3xl"></i></div>
            <div>
              <span className="block text-4xl font-black italic tracking-tighter text-slate-900 mb-1">14</span>
              <span className="block text-[10px] font-black uppercase tracking-widest text-red-600">Risques Sanitaires</span>
            </div>
         </div>
         <div className="bg-slate-50 border border-slate-100 p-8 rounded-[2.5rem] flex flex-col justify-between">
            <div className="text-slate-900 mb-6"><i className="fas fa-boxes-packing text-3xl"></i></div>
            <div>
              <span className="block text-4xl font-black italic tracking-tighter text-slate-900 mb-1">4,281</span>
              <span className="block text-[10px] font-black uppercase tracking-widest text-slate-400">Opérateurs Agréés</span>
            </div>
         </div>
         <div className="bg-slate-50 border border-slate-100 p-8 rounded-[2.5rem] flex flex-col justify-between">
            <div className="text-slate-900 mb-6"><i className="fas fa-earth-africa text-3xl"></i></div>
            <div>
              <span className="block text-4xl font-black italic tracking-tighter text-slate-900 mb-1">112</span>
              <span className="block text-[10px] font-black uppercase tracking-widest text-slate-400">Pays Actifs</span>
            </div>
         </div>
         <div className="bg-emerald-50 border border-emerald-100 p-8 rounded-[2.5rem] flex flex-col justify-between">
            <div className="text-emerald-600 mb-6"><i className="fas fa-bolt text-3xl"></i></div>
            <div>
              <span className="block text-4xl font-black italic tracking-tighter text-slate-900 mb-1">2.4j</span>
              <span className="block text-[10px] font-black uppercase tracking-widest text-emerald-600">Délai Médian</span>
            </div>
         </div>
      </div>
    </div>
  );
};

export default DecisionAid;
