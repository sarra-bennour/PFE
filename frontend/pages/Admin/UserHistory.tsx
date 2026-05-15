import React from 'react';
import axios from 'axios';

export interface AuditLog {
  id: number;
  action: string;
  actionType: string;
  description: string;
  entityType: string;
  entityId: string;
  entityReference: string;
  userId: string;
  userEmail: string;
  userRole: string;
  userIpAddress: string;
  userAgent: string;
  details: any;
  status: string;
  errorMessage?: string;
  performedAt: string;
  sessionId: string;
  requestId: string;
}

export interface AuditLogFilter {
  action?: string;
  actionType?: string;
  entityType?: string;
  entityId?: number;
  userEmail?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  searchTerm?: string;
  page?: number;
  size?: number;
}

const API_BASE_URL = process.env.REACT_APP_API_URL || '/api';

const getAuthToken = () => localStorage.getItem('token');

const getHeaders = () => ({
  headers: {
    'Authorization': `Bearer ${getAuthToken()}`,
    'Content-Type': 'application/json'
  }
});

const UserHistory: React.FC = () => {
  const [viewMode, setViewMode] = React.useState<'table' | 'timeline'>('table');
  const [selectedLog, setSelectedLog] = React.useState<AuditLog | null>(null);
  const [logs, setLogs] = React.useState<AuditLog[]>([]);
  const [isLoadingMore, setIsLoadingMore] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [hasMore, setHasMore] = React.useState(true);
  const [offset, setOffset] = React.useState(0);
  const [totalCount, setTotalCount] = React.useState(0);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [selectedActionType, setSelectedActionType] = React.useState('');
  const [actionTypes, setActionTypes] = React.useState<string[]>([]);
  const pageSize = 5;

  const loadActionTypes = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/audit-logs/action-types`, getHeaders());
      if (response.data.success) {
        setActionTypes(response.data.actionTypes || []);
      }
    } catch (error) {
      console.error('Erreur chargement types actions:', error);
    }
  };

  const loadLogs = async (reset: boolean = true, currentOffset: number = 0) => {
    if (loading) return;
    
    setLoading(true);
    try {
      let url = `${API_BASE_URL}/audit-logs/all`;
      const params = new URLSearchParams();
      
      if (searchTerm) {
        params.append('searchTerm', searchTerm);
      }
      if (selectedActionType) {
        params.append('actionType', selectedActionType);
      }
      
      params.append('offset', currentOffset.toString());
      params.append('limit', pageSize.toString());
      
      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      console.log(`🔍 Chargement logs - offset: ${currentOffset}, limit: ${pageSize}`);
      
      const response = await axios.get(url, getHeaders());
      
      console.log('📊 *******Réponse API:', response.data);
      if (response.data.success) {
        const newLogs = response.data.data || [];
        const total = response.data.totalElements || response.data.count || newLogs.length;
        
        setTotalCount(total);
        
        if (reset) {
          setLogs(newLogs);
          setOffset(newLogs.length);
        } else {
          setLogs(prev => [...prev, ...newLogs]);
          setOffset(prev => prev + newLogs.length);
        }
        
        const loadedCount = reset ? newLogs.length : logs.length + newLogs.length;
        setHasMore(loadedCount < total);
        
        console.log(`✅ Chargés: ${newLogs.length} logs, Total: ${total}, A charger: ${loadedCount}, HasMore: ${loadedCount < total}`);
      }
    } catch (error) {
      console.error('Erreur chargement logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMore = () => {
    if (isLoadingMore || !hasMore || loading) return;
    
    setIsLoadingMore(true);
    loadLogs(false, offset).finally(() => {
      setIsLoadingMore(false);
    });
  };

  React.useEffect(() => {
    setOffset(0);
    setHasMore(true);
    setLogs([]);
    loadLogs(true, 0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, selectedActionType]);

  React.useEffect(() => {
    loadActionTypes();
  }, []);

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

      <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/30">
          <div className="flex items-center gap-6">
            <h3 className="text-lg font-black italic text-slate-900 uppercase tracking-tighter">Audit des Utilisateurs & Actions</h3>
            <div className="flex bg-white p-1 rounded-xl border border-slate-200">
               <button 
                 onClick={() => setViewMode('table')}
                 className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${viewMode === 'table' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
               >
                 <i className="fas fa-table mr-2"></i> Table
               </button>
               <button 
                 onClick={() => setViewMode('timeline')}
                 className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${viewMode === 'timeline' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
               >
                 <i className="fas fa-stream mr-2"></i> Timeline
               </button>
            </div>
          </div>
          <div className="flex gap-4">
             <div className="relative">
                <i className="fas fa-filter absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 text-[10px]"></i>
                <select 
                  className="pl-10 pr-6 py-2 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-600 outline-none focus:border-tunisia-red transition-all shadow-sm appearance-none"
                  value={selectedActionType}
                  onChange={(e) => setSelectedActionType(e.target.value)}
                >
                  <option value="">Toutes les actions</option>
                  {actionTypes.map((type) => (
                    <option key={type} value={type}>{getActionLabel(type)}</option>
                  ))}
                </select>
             </div>
             <div className="relative">
                <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 text-[10px]"></i>
                <input 
                  type="text" 
                  placeholder="Rechercher par utilisateur ou action..." 
                  className="pl-10 pr-6 py-2 bg-white border border-slate-200 rounded-xl text-[10px] font-bold outline-none focus:border-tunisia-red transition-all shadow-sm w-64"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
             </div>
          </div>
        </div>

        {loading && logs.length === 0 ? (
          <div className="p-20 text-center">
            <div className="w-12 h-12 border-4 border-tunisia-red border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Chargement des logs...</p>
          </div>
        ) : viewMode === 'table' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/50">
                  <th className="px-8 py-5 text-[9px] font-black text-slate-400 uppercase tracking-widest">Date / Heure</th>
                  <th className="px-8 py-5 text-[9px] font-black text-slate-400 uppercase tracking-widest">Action</th>
                  <th className="px-8 py-5 text-[9px] font-black text-slate-400 uppercase tracking-widest">Acteur</th>
                  <th className="px-8 py-5 text-[9px] font-black text-slate-400 uppercase tracking-widest">Entité Cible</th>
                  <th className="px-8 py-5 text-[9px] font-black text-slate-400 uppercase tracking-widest">Statut</th>
                  <th className="px-8 py-5 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {logs.map((log, idx) => (
                  <tr key={`${log.id}-${idx}`} className="hover:bg-slate-50/50 transition-colors cursor-pointer" onClick={() => setSelectedLog(log)}>
                    <td className="px-8 py-6 text-[10px] font-bold text-slate-500 whitespace-nowrap">{formatDate(log.performedAt)}</td>
                    <td className="px-8 py-6 whitespace-nowrap">
                       <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs ${getActionColor(log.actionType)}`}>
                             <i className={`fas ${getActionIcon(log.actionType)}`}></i>
                          </div>
                          <div>
                             <span className="text-[10px] font-black text-slate-900 uppercase tracking-tight block">{getActionLabel(log.actionType)}</span>
                             <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest leading-none">{log.description?.substring(0, 30)}...</span>
                          </div>
                       </div>
                     </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-2">
                         <span className="text-[10px] font-black text-slate-900 uppercase tracking-tight">{log.userEmail?.split('@')[0]}</span>
                      </div>
                     </td>
                    <td className="px-8 py-6 font-black text-slate-700 italic text-[10px] tracking-tight">{log.entityReference}</td>
                    <td className="px-8 py-6">
                       <span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase border ${getStatusStyle(log.status)}`}>
                          {log.status}
                       </span>
                     </td>
                    <td className="px-8 py-6 text-right">
                       <button 
                        onClick={(e) => { e.stopPropagation(); setSelectedLog(log); }}
                        className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 hover:bg-slate-900 hover:text-white transition-all ml-auto"
                       >
                         <i className="fas fa-eye text-xs"></i>
                       </button>
                     </td>
                   </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 space-y-12 relative">
            <div className="absolute left-[77px] top-12 bottom-12 w-0.5 bg-slate-100 hidden md:block"></div>
            {logs.map((log, i) => (
              <div key={`${log.id}-${i}`} className="flex flex-col md:flex-row gap-8 relative group cursor-pointer" onClick={() => setSelectedLog(log)}>
                <div className="w-24 text-[10px] font-black text-slate-400 uppercase tracking-widest text-left pt-3">
                  {formatDate(log.performedAt).split(' ')[1]}
                  <div className="text-[8px] mt-1 opacity-60 font-bold">{formatDate(log.performedAt).split(' ')[0]}</div>
                </div>
                
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center relative z-10 transition-all group-hover:scale-110 shadow-sm ${getActionColor(log.actionType)}`}>
                  <i className={`fas ${getActionIcon(log.actionType)} text-sm`}></i>
                </div>

                <div className="flex-1 bg-slate-50/50 rounded-3xl p-6 border border-slate-100 hover:bg-white hover:shadow-xl hover:shadow-slate-200/50 transition-all">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                    <div className="flex items-center gap-3">
                      <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border ${getStatusStyle(log.status)}`}>
                        {log.status}
                      </span>
                      <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight italic">{log.entityReference}</h4>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-lg border border-slate-100">
                       <i className="fas fa-user-shield text-[10px] text-slate-400"></i>
                       <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{log.userEmail}</span>
                    </div>
                  </div>
                  <p className="text-xs font-bold text-slate-600 leading-relaxed italic border-l-2 border-slate-200 pl-4">
                    {log.description}
                  </p>
                  <div className="mt-4 flex items-center gap-4 text-[8px] font-black uppercase tracking-widest text-slate-400">
                     <span>REF: {log.entityReference}</span>
                     <span>IP: {log.userIpAddress}</span>
                     <span>SESSION: {log.sessionId}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="p-8 bg-slate-50/50 border-t border-slate-50 flex justify-center">
           <button 
             onClick={loadMore}
             disabled={isLoadingMore || !hasMore || loading}
             className="text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-900 transition-all flex items-center gap-3 disabled:opacity-50"
           >
              {isLoadingMore ? (
                <><i className="fas fa-circle-notch animate-spin"></i> Chargement...</>
              ) : !hasMore ? (
                <><i className="fas fa-check-circle"></i> Tous les logs chargés ({totalCount} au total)</>
              ) : (
                <><i className="fas fa-chevron-down"></i> Charger plus ({logs.length}/{totalCount})</>
              )}
           </button>
        </div>
      </div>
    </div>
  );
};

export default UserHistory;