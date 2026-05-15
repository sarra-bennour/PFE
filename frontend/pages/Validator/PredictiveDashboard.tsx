// PredictiveDashboard.tsx mis à jour
import React, { useState, useEffect } from 'react';
import { Brain, TrendingUp, AlertTriangle, Lightbulb, Loader2, Sparkles, Calendar, ArrowUp ,RefreshCw} from 'lucide-react';
import axios from 'axios';

interface MonthlyForecast {
  [key: string]: number;
}

interface PredictionsData {
  predictedIncrease: string;
  forecast: string;
  recommendations: string[];
  alerts: string[];
  monthlyForecast: MonthlyForecast;
}

const PredictiveDashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [predictions, setPredictions] = useState<PredictionsData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPredictions();
    
    // Rafraîchir toutes les 5 minutes
    const interval = setInterval(fetchPredictions, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchPredictions = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/predictive/dashboard', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPredictions(response.data);
    } catch (error) {
      console.error('Erreur prédictions:', error);
      setError('Impossible de charger les prédictions');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="h-64 bg-white rounded-[2.5rem] border border-slate-100 flex flex-col items-center justify-center gap-4">
        <Loader2 size={32} className="animate-spin text-tunisia-red" />
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Analyse de l'IA en cours...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-64 bg-white rounded-[2.5rem] border border-slate-100 flex flex-col items-center justify-center gap-4">
        <AlertTriangle size={32} className="text-amber-500" />
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{error}</p>
        <button onClick={fetchPredictions} className="px-4 py-2 bg-tunisia-red text-white rounded-xl text-[9px] font-black uppercase">
          Réessayer
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Prévisions mensuelles - Nouvelle section */}
      {predictions?.monthlyForecast && Object.keys(predictions.monthlyForecast).length > 0 && (
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-[2.5rem] p-8 text-white">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-blue-500/20 text-blue-400 rounded-xl flex items-center justify-center">
              <Calendar size={20} />
            </div>
            <h3 className="text-xl font-black italic uppercase tracking-tighter">Prévisions Mensuelles</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {Object.entries(predictions.monthlyForecast).map(([month, count]) => (
              <div key={month} className="p-6 bg-white/5 rounded-2xl border border-white/10 text-center">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">{month}</p>
                <p className="text-3xl font-black italic">{count}</p>
                <p className="text-[8px] text-slate-400 mt-1">demandes prévues</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Forecast Card */}
        <div className="lg:col-span-2 bg-slate-900 rounded-[2.5rem] p-10 text-white relative overflow-hidden border border-white/5 shadow-2xl">
          <div className="absolute top-0 right-0 p-8 opacity-10">
            <Brain size={120} />
          </div>
          
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 bg-tunisia-red/20 text-tunisia-red rounded-xl flex items-center justify-center">
                <Sparkles size={20} />
              </div>
              <h3 className="text-xl font-black italic uppercase tracking-tighter">Prévision des Flux Commerce</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Tendance Prédite</p>
                <div className="flex items-center gap-4 mb-6">
                  <span className="text-5xl font-black italic tracking-tighter text-tunisia-red">+{predictions?.predictedIncrease || '12'}%</span>
                  <TrendingUp size={32} className="text-emerald-500" />
                </div>
                <p className="text-sm font-medium text-slate-300 leading-relaxed italic">
                  "{predictions?.forecast}"
                </p>
              </div>

              <div className="space-y-6">
                <div className="p-6 bg-white/5 rounded-2xl border border-white/10">
                  <h4 className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
                    <Lightbulb size={12} className="text-amber-500" /> Recommandations Stratégiques
                  </h4>
                  <ul className="space-y-3">
                    {predictions?.recommendations?.map((r, i) => (
                      <li key={i} className="text-[10px] font-bold text-slate-200 flex items-start gap-2">
                        <div className="w-1 h-1 bg-tunisia-red rounded-full mt-1.5 flex-shrink-0"></div>
                        {r}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Alerts Column */}
        <div className="bg-white rounded-[2.5rem] p-10 border border-slate-100 shadow-sm flex flex-col">
          <h3 className="text-sm font-black italic uppercase tracking-widest text-slate-900 mb-8 border-b border-slate-50 pb-4">
            Points de Vigilance IA
          </h3>
          
          <div className="flex-1 space-y-6">
            {predictions?.alerts?.map((alert, i) => (
              <div key={i} className="p-4 bg-amber-50 rounded-2xl border border-amber-100 flex gap-4">
                <div className="w-8 h-8 bg-amber-200 text-amber-700 rounded-lg flex items-center justify-center flex-shrink-0">
                  <AlertTriangle size={16} />
                </div>
                <p className="text-[10px] font-bold text-amber-800 leading-relaxed">
                  {alert}
                </p>
              </div>
            ))}
            {(!predictions?.alerts || predictions.alerts.length === 0) && (
              <div className="flex flex-col items-center justify-center h-full opacity-30 grayscale p-8 text-center">
                <Brain size={48} className="mb-4" />
                <p className="text-[9px] font-black uppercase">Aucune alerte critique identifiée</p>
              </div>
            )}
          </div>

          <div className="mt-8 pt-6 border-t border-slate-50">
            <button 
              onClick={fetchPredictions}
              className="w-full py-4 bg-slate-50 text-slate-400 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-slate-900 hover:text-white transition-all flex items-center justify-center gap-2"
            >
              <RefreshCw size={12} />
              Rafraîchir l'analyse
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PredictiveDashboard;