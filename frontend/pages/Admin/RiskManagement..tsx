// RiskManagement.tsx (version modifiée avec API réelle)
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface SuspectExporter {
  id: string;
  name: string;
  email: string;
  declaredCountry: string;
  signupIp: string;
  detectedIpCountry: string;
  riskScore: number;
  riskLevel: 'FAIBLE' | 'MOYEN' | 'ÉLEVÉ';
  riskFactors: string[];
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'VERIFICATION_REQUESTED';
  userStatus?: 'ACTIF' | 'INACTIF';
  usingVpn?: boolean;
  usingProxy?: boolean;
  usingTor?: boolean;
}

const RiskManagement: React.FC = () => {
  const [selectedExporter, setSelectedExporter] = useState<SuspectExporter | null>(null);
  const [exporters, setExporters] = useState<SuspectExporter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Charger les données réelles depuis le backend
  useEffect(() => {
    fetchExporters();
  }, []);

  const fetchExporters = async () => {
    setLoading(true);
    const token = localStorage.getItem('token');
    try {
      // Appel à votre backend Spring Boot
      const response = await fetch('http://localhost:8080/api/risk/exportateurs', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) {
        throw new Error('Erreur chargement des données');
      }
      const data = await response.json();
      setExporters(data);
      setError(null);
    } catch (err) {
      console.error('Erreur:', err);
      setError('Impossible de charger les exportateurs');
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (id: string, action: SuspectExporter['status']) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:8080/api/risk/${id}/action`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ action }),
      });
      
      if (response.ok) {
        setExporters(prev => prev.map(exp => 
          exp.id === id ? { ...exp, status: action } : exp
        ));
        setSelectedExporter(null);
      }
    } catch (err) {
      console.error('Erreur action:', err);
    }
  };
  
  // Ajouter cette fonction après handleAction (vers ligne 65)
const suspendUser = async (id: string, userEmail: string) => {
  const token = localStorage.getItem('token');
  
  if (!window.confirm(`Êtes-vous sûr de vouloir SUSPENDRE le compte de ${userEmail} ?`)) {
    return;
  }
  
  try {
    const response = await fetch(`http://localhost:8080/api/admin/users/${id}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ status: 'INACTIF' })
    });
    
    const data = await response.json();
    
    if (data.success) {
      alert(`Compte ${userEmail} suspendu avec succès`);
      // Recharger la liste et fermer le détail
      await fetchExporters();
      setSelectedExporter(null);
    } else {
      alert(data.error || 'Erreur lors de la suspension');
    }
  } catch (err) {
    console.error('Erreur suspension:', err);
    alert('Erreur de connexion au serveur');
  }
};

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-tunisia-red border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-500">Analyse des exportateurs en cours...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 bg-red-50 rounded-3xl text-center">
        <i className="fas fa-exclamation-triangle text-4xl text-red-500 mb-4"></i>
        <p className="text-red-600">{error}</p>
        <button 
          onClick={fetchExporters}
          className="mt-4 px-6 py-2 bg-tunisia-red text-white rounded-full text-sm"
        >
          Réessayer
        </button>
      </div>
    );
  }

  // Le reste de votre interface RESTE EXACTEMENT IDENTIQUE
  // (tout le JSX ci-dessous est inchangé par rapport à votre code original)

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* List of Suspects */}
        <div className="xl:col-span-2 bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-xl font-black italic text-slate-900 uppercase tracking-tighter">
              Exportateurs Suspects
            </h3>
            <span className="px-4 py-1.5 bg-red-50 text-tunisia-red rounded-full text-[10px] font-black uppercase tracking-widest border border-red-100">
              {exporters.filter(e => e.status === 'PENDING' && e.riskLevel === 'ÉLEVÉ').length} Risques Élevés
            </span>
          </div>

          <div className="space-y-4">
            {exporters.map((exporter) => (
              <div 
                key={exporter.id}
                className={`group p-6 rounded-3xl border transition-all cursor-pointer ${
                  selectedExporter?.id === exporter.id 
                    ? 'bg-slate-900 border-slate-900 shadow-xl' 
                    : 'bg-slate-50 border-slate-100 hover:border-slate-300'
                }`}
                onClick={() => setSelectedExporter(exporter)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl ${
                      selectedExporter?.id === exporter.id ? 'bg-white/10 text-white' : 'bg-white text-slate-400'
                    }`}>
                      <i className="fas fa-building"></i>
                    </div>
                    <div>
                      <h4 className={`font-black uppercase italic tracking-tighter text-lg ${
                        selectedExporter?.id === exporter.id ? 'text-white' : 'text-slate-900'
                      }`}>
                        {exporter.name}
                      </h4>
                      <p className={`text-[10px] font-black uppercase tracking-widest ${
                        selectedExporter?.id === exporter.id ? 'text-slate-400' : 'text-slate-400'
                      }`}>
                        {exporter.id} &bull; {exporter.email}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className={`text-2xl font-black italic tracking-tighter mb-1 ${
                      exporter.riskScore > 70 ? 'text-tunisia-red' : exporter.riskScore > 30 ? 'text-amber-500' : 'text-emerald-500'
                    }`}>
                      {exporter.riskScore}/100
                    </div>
                    <span className={`text-[8px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${
                      exporter.riskLevel === 'ÉLEVÉ' ? 'bg-red-500 text-white' : 
                      exporter.riskLevel === 'MOYEN' ? 'bg-amber-500 text-white' : 
                      'bg-emerald-500 text-white'
                    }`}>
                      Risque {exporter.riskLevel}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Analysis Detail */}
        <div className="relative">
          <AnimatePresence mode="wait">
            {selectedExporter ? (
              <motion.div 
                key={selectedExporter.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="bg-white p-8 rounded-[3rem] shadow-xl border border-slate-100 h-full overflow-y-auto sticky top-8"
              >
                <div className="space-y-8">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-xl font-black italic text-slate-900 uppercase tracking-tighter leading-none mb-2 text-wrap">
                        ANALYSE DE RISQUE
                      </h3>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                        Exportateur: <span className="text-slate-900">{selectedExporter.name}</span>
                      </p>
                    </div>
                    <button 
                      onClick={() => setSelectedExporter(null)}
                      className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:text-tunisia-red transition-all"
                    >
                      <i className="fas fa-times"></i>
                    </button>
                  </div>

                  {/* General Info avec badges VPN/Proxy/Tor */}
                  <div className="space-y-6">
                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                      <i className="fas fa-info-circle"></i>
                      <span>Informations générales</span>
                    </div>
                    
                    <div className="space-y-3 bg-slate-50 p-6 rounded-3xl border border-slate-100">
                      <div className="flex justify-between">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">Email</span>
                        <span className="text-[10px] font-black text-slate-900">{selectedExporter.email}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">Pays déclaré</span>
                        <span className="text-[10px] font-black text-slate-900">{selectedExporter.declaredCountry}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">IP signup</span>
                        <span className="text-[10px] font-black text-slate-900">{selectedExporter.signupIp}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">Pays IP détecté</span>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-black text-slate-900">{selectedExporter.detectedIpCountry}</span>
                          {selectedExporter.declaredCountry !== selectedExporter.detectedIpCountry && selectedExporter.detectedIpCountry && (
                            <span className="text-tunisia-red text-[10px] font-bold">(Incohérence)</span>
                          )}
                        </div>
                      </div>
                      {/* Badges VPN/Proxy/Tor */}
                      {(selectedExporter.usingVpn || selectedExporter.usingProxy || selectedExporter.usingTor) && (
                        <div className="flex gap-2 pt-2">
                          {selectedExporter.usingVpn && (
                            <span className="px-2 py-1 bg-red-100 text-tunisia-red text-[8px] font-black rounded-md">🔒 VPN</span>
                          )}
                          {selectedExporter.usingProxy && (
                            <span className="px-2 py-1 bg-orange-100 text-orange-700 text-[8px] font-black rounded-md">🔄 Proxy</span>
                          )}
                          {selectedExporter.usingTor && (
                            <span className="px-2 py-1 bg-purple-100 text-purple-700 text-[8px] font-black rounded-md">🌐 TOR</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Risk Factors */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                      <i className="fas fa-triangle-exclamation"></i>
                      <span>Facteurs de risque détectés</span>
                    </div>
                    <div className="space-y-2">
                      {selectedExporter.riskFactors.map((factor, index) => (
                        <div key={index} className="flex gap-3 p-4 bg-red-50 rounded-2xl border border-red-100 text-tunisia-red">
                          <i className="fas fa-check text-[10px] mt-1"></i>
                          <p className="text-[10px] font-black uppercase tracking-tight leading-tight">{factor}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Final Score */}
                  <div className="p-8 bg-slate-900 rounded-[2.5rem] text-center space-y-2 shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-16 translate-x-16 blur-2xl"></div>
                    <div className="relative z-10">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Score final</p>
                      <div className={`text-4xl font-black italic tracking-tighter mb-2 ${
                        selectedExporter.riskScore > 70 ? 'text-tunisia-red' : 
                        selectedExporter.riskScore > 30 ? 'text-amber-500' : 'text-emerald-500'
                      }`}>
                        {selectedExporter.riskScore}/100
                      </div>
                      <p className={`text-[10px] font-black uppercase tracking-widest py-1.5 px-4 rounded-full inline-block ${
                        selectedExporter.riskLevel === 'ÉLEVÉ' ? 'bg-red-500 text-white' : 
                        selectedExporter.riskLevel === 'MOYEN' ? 'bg-amber-500 text-white' : 'bg-emerald-500 text-white'
                      }`}>
                        RISQUE {selectedExporter.riskLevel}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="space-y-3">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 text-center mb-4">
                      Actions possibles
                    </p>
                    <button 
                      onClick={() => suspendUser(selectedExporter.id, selectedExporter.email)}
                      disabled={selectedExporter.userStatus === 'INACTIF'}
                      className={`w-full py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl font-sans flex items-center justify-center gap-2 transition-all ${
                        selectedExporter.userStatus === 'INACTIF'
                          ? 'bg-slate-300 cursor-not-allowed text-white'
                          : 'bg-tunisia-red hover:bg-red-700 text-white'
                      }`}
                    >
                      <i className="fas fa-hand"></i>
                      {selectedExporter.userStatus === 'INACTIF' ? 'Compte déjà suspendu' : 'Suspendre le compte'}
                    </button>
                  </div>
                </div>
              </motion.div>
            ) : (
              <div className="h-full flex items-center justify-center p-12 bg-slate-50 border-2 border-dashed border-slate-200 rounded-[3rem] text-center">
                <div>
                  <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-6 text-slate-300 shadow-sm border border-slate-100">
                    <i className="fas fa-search text-3xl"></i>
                  </div>
                  <h4 className="text-lg font-black text-slate-400 uppercase italic tracking-tighter">
                    Sélectionnez un profil
                  </h4>
                  <p className="text-[10px] font-medium text-slate-300 uppercase tracking-widest mt-2 px-8">
                    Cliquez sur un exportateur pour auditer son score de risque
                  </p>
                </div>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default RiskManagement;