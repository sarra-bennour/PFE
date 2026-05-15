// ImporterDashboard.tsx
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell, PieChart, Pie } from 'recharts';
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || '/api';

interface DashboardStats {
  volumeMensuel: number;
  performanceScore: number;
  volumeParCategorie: Array<{ name: string; value: number }>;
  volumeParPays: Array<{ name: string; value: number }>;
  volumeHebdomadaire: Array<{ name: string; volume: number }>;
  topPartenaire: string;
  topPartenaireMessage: string;
}

const ImporterDashboard: React.FC = () => {
  const { t } = useTranslation();
  const [stats, setStats] = useState<DashboardStats>({
    volumeMensuel: 0,
    performanceScore: 0,
    volumeParCategorie: [],
    volumeParPays: [],
    volumeHebdomadaire: [],
    topPartenaire: '',
    topPartenaireMessage: ''
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE_URL}/importateur/dashboard/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.success) {
        setStats(response.data.data);
      }
      setError(null);
    } catch (err) {
      console.error('Erreur lors du chargement des statistiques:', err);
      setError('Impossible de charger les statistiques');
    } finally {
      setLoading(false);
    }
  };

  const generateRapport = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE_URL}/importateur/dashboard/rapport`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `rapport_importations_${new Date().toISOString().split('T')[0]}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Erreur lors de la génération du rapport:', err);
      alert('Erreur lors de la génération du rapport');
    }
  };

  // ✅ Formateur sécurisé pour les valeurs (gère undefined)
  const formatVolume = (value: number | undefined) => {
    if (value === undefined || value === null) return ['0 TND', 'Volume'];
    return [`${value.toLocaleString()} TND`, 'Volume'];
  };

  // ✅ Formateur pour les pourcentages
  const formatPercentage = (value: number | undefined) => {
    if (value === undefined || value === null) return '0%';
    return `${value}%`;
  };

  // ✅ Formateur pour l'étiquette du PieChart
  const renderPieLabel = (entry: any) => {
    const percent = entry.percent;
    if (percent === undefined || percent === null) return entry.name;
    return `${entry.name} ${(percent * 100).toFixed(0)}%`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-tunisia-red border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-500 font-bold">Chargement des statistiques...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-3xl p-8 text-center">
        <i className="fas fa-exclamation-triangle text-red-500 text-4xl mb-4"></i>
        <p className="text-red-600 font-bold">{error}</p>
        <button 
          onClick={fetchDashboardStats}
          className="mt-4 px-6 py-2 bg-red-500 text-white rounded-xl text-sm font-bold"
        >
          Réessayer
        </button>
      </div>
    );
  }

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
                <AreaChart data={stats.volumeHebdomadaire}>
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
                    formatter={formatVolume}
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
                  <div className="text-4xl font-black italic tracking-tighter">{stats.volumeMensuel.toLocaleString()} <span className="text-slate-500 text-sm">TND</span></div>
                </div>
                <div>
                  <span className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Accord Préalable</span>
                  <div className="text-4xl font-black italic tracking-tighter text-emerald-500">{stats.performanceScore}%</div>
                </div>
             </div>
           </div>
           <button 
             onClick={generateRapport}
             className="w-full py-5 bg-white/5 hover:bg-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all mt-8 border border-white/5"
           >
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
                      data={stats.volumeParCategorie}
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                      label={renderPieLabel}
                      labelLine={false}
                    >
                      {stats.volumeParCategorie.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={['#E70013', '#334155', '#475569', '#94a3b8'][index % 4]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={formatPercentage} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="w-full space-y-4">
                {stats.volumeParCategorie.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{backgroundColor: ['#E70013', '#334155', '#475569', '#94a3b8'][idx % 4]}}></div>
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
                <BarChart data={stats.volumeParPays} layout="vertical">
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 900, fill: '#64748b'}} width={80} />
                  <Tooltip 
                    cursor={{fill: 'transparent'}}
                    formatter={formatVolume}
                    contentStyle={{borderRadius: '15px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'}} 
                  />
                  <Bar dataKey="value" radius={[0, 10, 10, 0]}>
                    {stats.volumeParPays.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={index === 0 ? '#E70013' : '#cbd5e1'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
           </div>
           <p className="mt-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center italic">
             {stats.topPartenaireMessage}
           </p>
        </div>
      </div>
    </div>
  );
};

export default ImporterDashboard;