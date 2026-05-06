import React, { useState, useEffect } from 'react';
import { useAuth } from '../App';
import { AuditLog } from '../types/AuditLog';
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080/api';

const getAuthToken = () => localStorage.getItem('token');

const getHeaders = () => ({
  headers: {
    'Authorization': `Bearer ${getAuthToken()}`,
    'Content-Type': 'application/json'
  }
});

const PersonalHistory: React.FC = () => {
  const { user } = useAuth();
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [currentOffset, setCurrentOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const limit = 5;

  // Charger les logs depuis l'API
  const loadLogs = async (reset: boolean = true, offsetValue: number = 0) => {
    if (loading) return;
    
    setLoading(true);
    try {
      let url = `${API_BASE_URL}/audit-logs/my-logs`;
      const params = new URLSearchParams();
      params.append('offset', offsetValue.toString());
      params.append('limit', limit.toString());
      
      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      console.log(`🔍 Chargement logs - offset: ${offsetValue}, limit: ${limit}`);
      
      const response = await axios.get(url, getHeaders());
      
      if (response.data.success) {
        const newLogs = response.data.data || [];
        const total = response.data.totalElements || response.data.count || 0;
        
        setTotalCount(total);
        
        if (reset) {
          setLogs(newLogs);
          setCurrentOffset(newLogs.length);
        } else {
          setLogs(prev => [...prev, ...newLogs]);
          setCurrentOffset(prev => prev + newLogs.length);
        }
        
        // Vérifier s'il y a encore des logs à charger
        const loadedCount = reset ? newLogs.length : currentOffset + newLogs.length;
        const more = loadedCount < total;
        setHasMore(more);
        
        console.log(`✅ Chargés: ${newLogs.length} logs, Total: ${total}, Chargés au total: ${loadedCount}, HasMore: ${more}`);
      }
    } catch (error) {
      console.error('Erreur chargement logs:', error);
    } finally {
      setLoading(false);
    }
  };

  // Charger plus de logs
  const loadMore = () => {
    if (isLoadingMore || !hasMore || loading) return;
    
    console.log(`🔄 Chargement plus - offset actuel: ${currentOffset}`);
    setIsLoadingMore(true);
    loadLogs(false, currentOffset).finally(() => {
      setIsLoadingMore(false);
    });
  };

  useEffect(() => {
    if (user?.id) {
      setCurrentOffset(0);
      setHasMore(true);
      setLogs([]);
      loadLogs(true, 0);
    }
  }, [user]);

  const getStatusStyle = (status: string) => {
    switch(status) {
      case 'SUCCESS': return 'bg-emerald-50 text-emerald-600 border-emerald-100';
      case 'FAILURE': return 'bg-red-50 text-red-600 border-red-100';
      case 'WARNING': return 'bg-amber-50 text-amber-600 border-amber-100';
      default: return 'bg-slate-50 text-slate-400 border-slate-100';
    }
  };

  const getActionIcon = (type: string) => {
    switch(type) {
      case 'AUTHENTICATION': return 'fa-sign-in-alt';
      case 'CREATION': return 'fa-plus-circle';
      case 'MODIFICATION': return 'fa-edit';
      case 'DELETION': return 'fa-trash-alt';
      case 'VALIDATION': return 'fa-check-circle';
      case 'REJECTION': return 'fa-times-circle';
      case 'PAYMENT': return 'fa-credit-card';
      case 'UPLOAD': return 'fa-upload';
      case 'DOWNLOAD': return 'fa-download';
      case 'NOTIFICATION': return 'fa-bell';
      case 'EXPORT': return 'fa-file-export';
      case 'SEARCH': return 'fa-search';
      case 'SYSTEM': return 'fa-microchip';
      case 'SECURITY': return 'fa-shield-alt';
      default: return 'fa-circle';
    }
  };

  const getActionColor = (type: string) => {
    switch(type) {
      case 'AUTHENTICATION': return 'text-blue-500 bg-blue-50';
      case 'CREATION': return 'text-emerald-500 bg-emerald-50';
      case 'MODIFICATION': return 'text-amber-500 bg-amber-50';
      case 'DELETION': return 'text-red-500 bg-red-50';
      case 'VALIDATION': return 'text-green-500 bg-green-50';
      case 'REJECTION': return 'text-rose-500 bg-rose-50';
      case 'PAYMENT': return 'text-purple-500 bg-purple-50';
      case 'UPLOAD': return 'text-sky-500 bg-sky-50';
      case 'DOWNLOAD': return 'text-indigo-500 bg-indigo-50';
      case 'NOTIFICATION': return 'text-pink-500 bg-pink-50';
      case 'EXPORT': return 'text-teal-500 bg-teal-50';
      case 'SEARCH': return 'text-slate-500 bg-slate-50';
      case 'SYSTEM': return 'text-gray-500 bg-gray-50';
      case 'SECURITY': return 'text-red-600 bg-red-50';
      default: return 'text-slate-400 bg-slate-50';
    }
  };

  const getActionLabel = (type: string) => {
    switch(type) {
      case 'AUTHENTICATION': return 'Authentification';
      case 'CREATION': return 'Création';
      case 'MODIFICATION': return 'Modification';
      case 'DELETION': return 'Suppression';
      case 'VALIDATION': return 'Validation';
      case 'REJECTION': return 'Rejet';
      case 'PAYMENT': return 'Paiement';
      case 'UPLOAD': return 'Upload';
      case 'DOWNLOAD': return 'Download';
      case 'NOTIFICATION': return 'Notification';
      case 'EXPORT': return 'Export';
      case 'SEARCH': return 'Recherche';
      case 'SYSTEM': return 'Système';
      case 'SECURITY': return 'Sécurité';
      default: return type;
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleString('fr-TN');
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-10 animate-fade-in">
      <br />
      {/* Modal Détails Log */}
      {selectedLog && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fade-in">
          <div className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[90vh]">
            <div className="p-10 border-b border-slate-50 bg-slate-50/30 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-5">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-xl shadow-inner ${getActionColor(selectedLog.actionType)}`}>
                  <i className={`fas ${getActionIcon(selectedLog.actionType)}`}></i>
                </div>
                <div>
                  <h3 className="text-2xl font-black italic text-slate-900 uppercase tracking-tighter">{selectedLog.action}</h3>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">ID Action: {selectedLog.requestId}</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedLog(null)}
                className="w-12 h-12 rounded-2xl bg-white border border-slate-100 flex items-center justify-center text-slate-400 hover:text-tunisia-red transition-all shadow-sm"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
            
            <div className="p-10 overflow-y-auto custom-scrollbar space-y-10">
              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div>
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Acteur de l'action</h4>
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <div className="text-xs font-black text-slate-900 uppercase tracking-tight mb-1">{selectedLog.userEmail}</div>
                      <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{selectedLog.userRole}</div>
                    </div>
                  </div>
                  <div>
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Entité concernée</h4>
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <div className="text-xs font-black text-slate-900 uppercase tracking-tight mb-1">{selectedLog.entityReference}</div>
                      <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Type: {selectedLog.entityType} (ID: {selectedLog.entityId})</div>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div>
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Contexte Technique</h4>
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-[8px] font-black text-slate-400 uppercase">IP</span>
                        <span className="text-[10px] font-mono font-bold text-slate-900">{selectedLog.userIpAddress}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[8px] font-black text-slate-400 uppercase">Status</span>
                        <span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase border ${getStatusStyle(selectedLog.status)}`}>{selectedLog.status}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[8px] font-black text-slate-400 uppercase">Session</span>
                        <span className="text-[8px] font-mono text-slate-500">{selectedLog.sessionId}</span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Navigateur</h4>
                    <div 
                      className="p-4 bg-slate-50 rounded-2xl border border-slate-100 italic text-[9px] text-slate-500 leading-relaxed truncate hover:whitespace-normal hover:overflow-visible hover:bg-white transition-all cursor-help"
                      title={selectedLog.userAgent}
                    >
                      {selectedLog.userAgent}
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Détails de l'action</h4>
                <div className="bg-slate-900 rounded-[2rem] p-8 overflow-hidden relative">
                  <div className="absolute top-0 right-0 p-4 opacity-10">
                    <i className="fas fa-code text-5xl text-white"></i>
                  </div>
                  <pre className="text-blue-400 font-mono text-[10px] overflow-x-auto custom-scrollbar">
                    {JSON.stringify(selectedLog.details, null, 2)}
                  </pre>
                </div>
              </div>

              {selectedLog.errorMessage && (
                <div className="p-6 bg-red-50 rounded-2xl border border-red-100 flex items-start gap-4">
                  <i className="fas fa-circle-exclamation text-red-500 mt-1"></i>
                  <div>
                    <h5 className="text-[10px] font-black text-red-600 uppercase tracking-widest mb-1">Erreur de Traitement</h5>
                    <p className="text-xs font-bold text-red-500 italic">{selectedLog.errorMessage}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="p-10 bg-slate-50/50 border-t border-slate-50 flex items-center justify-between shrink-0">
               <div className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                  <i className="fas fa-calendar-check mr-2"></i> Exécuté le {formatDate(selectedLog.performedAt)}
               </div>
               <button 
                  onClick={() => setSelectedLog(null)}
                  className="px-8 py-3 bg-slate-900 text-white rounded-xl text-[9px] font-black uppercase tracking-widest shadow-xl hover:bg-slate-800 transition-all font-sans"
               >
                  Fermer
               </button>
            </div>
          </div>
        </div>
      )}

      {/* Header avec informations utilisateur */}
      <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-gradient-to-r from-tunisia-red to-red-600 flex items-center justify-center text-white text-2xl font-black">
            {user?.nom?.charAt(0) || user?.email?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-900 italic tracking-tighter">
              Mon Historique d'Activités
            </h2>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">
              {user?.nom ? `${user.prenom || ''} ${user.nom}`.trim() : user?.email} • {user?.role || 'Utilisateur'}
            </p>
          </div>
        </div>
      </div>

      {/* Liste Chronologique */}
      <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-8 border-b border-slate-50 bg-slate-50/30 flex justify-between items-center">
          <h3 className="text-lg font-black italic text-slate-900 uppercase tracking-tighter">Mon Historique d'Activités</h3>
          <div className="flex items-center gap-3">
             <i className="fas fa-shield-halved text-blue-500 text-xs"></i>
             <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Traçabilité complète de vos opérations</span>
          </div>
        </div>

        {loading && logs.length === 0 ? (
          <div className="p-20 text-center">
            <div className="w-12 h-12 border-4 border-tunisia-red border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Chargement de votre historique...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="p-20 text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <i className="fas fa-history text-2xl text-slate-300"></i>
            </div>
            <p className="text-sm font-black text-slate-400 uppercase tracking-widest italic">
              Aucune activité enregistrée
            </p>
            <p className="text-[9px] text-slate-400 mt-2">
              Vos actions seront affichées ici au fur et à mesure
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {logs.map((log, idx) => (
              <div 
                key={log.id || idx} 
                onClick={() => setSelectedLog(log)}
                className="p-8 flex items-center justify-between hover:bg-slate-50/50 transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-6">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-sm transition-transform group-hover:scale-110 shadow-sm ${getActionColor(log.actionType)}`}>
                    <i className={`fas ${getActionIcon(log.actionType)}`}></i>
                  </div>
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <span className="text-xs font-black text-slate-900 uppercase tracking-tight">{log.action}</span>
                      <span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase border ${getStatusStyle(log.status)}`}>
                        {log.status === 'SUCCESS' ? 'Réussi' : 'Échoué'}
                      </span>
                    </div>
                    <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wide leading-none">{log.entityReference}</p>
                  </div>
                </div>
                
                <div className="flex flex-col items-end">
                  <span className="text-[10px] font-black text-slate-900 uppercase">{formatDate(log.performedAt).split(' ')[1]}</span>
                  <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">{formatDate(log.performedAt).split(' ')[0]}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {hasMore && logs.length > 0 && (
          <div className="p-8 bg-slate-50/50 border-t border-slate-50 flex justify-center">
             <button 
               onClick={loadMore}
               disabled={isLoadingMore || loading}
               className="text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-900 transition-all flex items-center gap-3 disabled:opacity-50"
             >
                {isLoadingMore ? (
                  <><i className="fas fa-circle-notch animate-spin"></i> Chargement...</>
                ) : (
                  <><i className="fas fa-chevron-down"></i> Charger plus d'activités ({logs.length}/{totalCount})</>
                )}
             </button>
          </div>
        )}
        
        {!hasMore && logs.length > 0 && (
          <div className="p-8 bg-slate-50/50 border-t border-slate-50 flex justify-center">
            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">
              <i className="fas fa-check-circle mr-2"></i> Tous les logs chargés ({totalCount} au total)
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PersonalHistory;