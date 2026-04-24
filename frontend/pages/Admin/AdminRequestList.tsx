import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import axios from 'axios';

// Types (garde les mêmes)
interface ProductAdmin {
  id: number;
  productName: string;
  productType: string;
  category: string;
  hsCode: string;
  isLinkedToBrand: boolean;
  brandName: string;
  isBrandOwner: boolean;
  hasBrandLicense: boolean;
  productState: string;
  originCountry: string;
  annualQuantityValue: string;
  annualQuantityUnit: string;
  commercialBrandName: string;
  productImage: string;
}

interface ImportDetails {
  invoiceNumber: string;
  invoiceDate: string;
  amount: number;
  currency: string;
  incoterm: string;
  transportMode: string;
  loadingPort: string;
  dischargePort: string;
  arrivalDate: string;
}

interface DocumentAdmin {
  id: number;
  name: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  filePath: string;
  documentType: string;
  status: string;
  uploadedAt: string;
  validatedAt: string | null;
  validationComment: string | null;
  validatedByName: string | null;
}

interface AdminDemande {
  id: number;
  reference: string;
  typeDemande: 'REGISTRATION' | 'PRODUCT_DECLARATION' | 'IMPORT';
  status: string;
  submittedAt: string;
  paymentReference: string | null;
  paymentAmount: string | null;
  paymentStatus: string;
  assignedToId: number | null;
  assignedToName: string | null;
  decisionDate: string | null;
  decisionComment: string | null;
  numeroAgrement: string | null;
  dateAgrement: string | null;
  applicantType: 'IMPORTATEUR' | 'EXPORTATEUR';
  applicantId: number | null;
  applicantName: string;
  applicantEmail: string;
  applicantMatriculeFiscale: string;
  exportateurEtrangerId: number | null;
  exportateurEtrangerNom: string | null;
  exportateurEtrangerPays: string | null;
  products: ProductAdmin[];
  importDetails: ImportDetails | null;
  documents: DocumentAdmin[];
  // Champs d'archivage
  archived?: boolean;
  archivedAt?: string | null;
  archivedBy?: string | null;
  archiveReason?: string | null;
  archiveType?: string | null;
}

const AdminRequestList: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [loadingArchives, setLoadingArchives] = useState(false);
  const [requests, setRequests] = useState<AdminDemande[]>([]);
  const [archivedRequests, setArchivedRequests] = useState<AdminDemande[]>([]);
  const [inboxTab, setInboxTab] = useState<'REGISTRATION' | 'PRODUCT_DECLARATION' | 'IMPORT' | 'ARCHIVE'>('REGISTRATION');
  const [selectedRequest, setSelectedRequest] = useState<AdminDemande | null>(null);
  const [downloading, setDownloading] = useState<number | null>(null);
  const [previewDoc, setPreviewDoc] = useState<DocumentAdmin | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [archiving, setArchiving] = useState(false);
  const [unarchiving, setUnarchiving] = useState(false);
  const [archiveSearchTerm, setArchiveSearchTerm] = useState('');

  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080';

  // Récupérer les demandes actives (non archivées)
  const fetchActiveDemandes = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE_URL}/api/admin/all-demandes`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      console.log('*****Demandes actives:', response.data);
      if (response.data.success && response.data.data) {
        // Filtrer uniquement les demandes non archivées
        const active = response.data.data.filter((d: AdminDemande) => !d.archived);
        setRequests(active);
      } else {
        console.error('Erreur:', response.data.error);
      }
    } catch (error: any) {
      console.error('Erreur lors du chargement:', error.response?.data?.error || error.message);
    } finally {
      setLoading(false);
    }
  };

  // Récupérer UNIQUEMENT les demandes archivées
  const fetchArchivedDemandes = async () => {
    setLoadingArchives(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE_URL}/api/admin/archived-demandes`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      console.log('*****Demandes archivées:', response.data);
      if (response.data.success && response.data.data) {
        setArchivedRequests(response.data.data);
      } else {
        console.error('Erreur chargement archives:', response.data.error);
        setArchivedRequests([]);
      }
    } catch (error: any) {
      console.error('Erreur lors du chargement des archives:', error.response?.data?.error || error.message);
      setArchivedRequests([]);
    } finally {
      setLoadingArchives(false);
    }
  };

  // Archiver une ou plusieurs demandes
  const handleArchive = async () => {
    if (selectedIds.length === 0) return;
    setArchiving(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(`${API_BASE_URL}/api/archive/bulk`, 
        {
          demandeIds: selectedIds.map(id => parseInt(id)),
          reason: `Archivage manuel par administrateur - ${new Date().toLocaleDateString()}`
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (response.data.success) {
        alert(`${selectedIds.length} demande(s) ont été archivées avec succès.`);
        setSelectedIds([]);
        // Rafraîchir les deux listes
        await fetchActiveDemandes();
        await fetchArchivedDemandes();
      } else {
        alert('Erreur lors de l\'archivage');
      }
    } catch (error: any) {
      console.error('Erreur archivage:', error);
      alert(error.response?.data?.error || 'Erreur lors de l\'archivage');
    } finally {
      setArchiving(false);
    }
  };

  // Désarchiver une ou plusieurs demandes
  const handleUnarchive = async () => {
    if (selectedIds.length === 0) return;
    setUnarchiving(true);
    try {
      const token = localStorage.getItem('token');
      // Pour chaque demande sélectionnée, la restaurer
      for (const id of selectedIds) {
        await axios.post(`${API_BASE_URL}/api/archive/restore/${parseInt(id)}`, 
          {},
          {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          }
        );
      }
      
      alert(`${selectedIds.length} demande(s) ont été restaurées avec succès.`);
      setSelectedIds([]);
      // Rafraîchir les deux listes
      await fetchActiveDemandes();
      await fetchArchivedDemandes();
    } catch (error: any) {
      console.error('Erreur désarchivage:', error);
      alert(error.response?.data?.error || 'Erreur lors du désarchivage');
    } finally {
      setUnarchiving(false);
    }
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      if (inboxTab === 'ARCHIVE') {
        setSelectedIds(archivedRequests.map(r => r.id.toString()));
      } else {
        const eligibleIds = requests
          .filter(r => r.typeDemande === inboxTab)
          .map(r => r.id.toString());
        setSelectedIds(eligibleIds);
      }
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const getImageUrl = (imagePath: string | undefined | null): string => {
    if (!imagePath) return '';
    if (imagePath.startsWith('http')) return imagePath;
    if (imagePath.startsWith('/api')) {
      return `http://localhost:8080${imagePath}`;
    }
    return `http://localhost:8080/api/produits${imagePath}`;
  };

  // Télécharger un document
  const handleDownloadDocument = async (doc: DocumentAdmin) => {
    setDownloading(doc.id);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE_URL}/api/admin/document/${doc.id}/preview`, {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        responseType: 'blob'
      });
      
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.fileName;
      document.body.appendChild(a);
      a.click();
      URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Erreur téléchargement:', error);
      alert('Erreur lors du téléchargement du document');
    } finally {
      setDownloading(null);
    }
  };

  const handlePreviewDocument = async (doc: DocumentAdmin) => {
    setPreviewDoc(doc);
    setPreviewLoading(true);
    setPreviewUrl(null);
    
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE_URL}/api/admin/document/${doc.id}/preview`, {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        responseType: 'blob'
      });
      const url = URL.createObjectURL(response.data);
      setPreviewUrl(url);
    } catch (error) {
      console.error('Erreur lors du chargement du document:', error);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleClosePreview = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewDoc(null);
    setPreviewUrl(null);
    setPreviewLoading(false);
  };

  const getFileType = (fileName: string): 'pdf' | 'image' | 'other' => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    if (extension === 'pdf') return 'pdf';
    if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(extension || '')) return 'image';
    return 'other';
  };

  // Chargement initial
  useEffect(() => {
    fetchActiveDemandes();
    fetchArchivedDemandes();
  }, []);

  const getStatusStyle = (status: string) => {
    switch(status) {
      case 'VALIDEE': return 'bg-emerald-50 text-emerald-600 border-emerald-100';
      case 'REJETEE': return 'bg-red-50 text-red-600 border-red-100';
      case 'EN_COURS_VALIDATION': return 'bg-blue-50 text-blue-600 border-blue-100';
      case 'EN_ATTENTE_INFO': return 'bg-amber-50 text-amber-600 border-amber-100';
      case 'SUSPENDUE': return 'bg-slate-50 text-slate-600 border-slate-100';
      case 'SOUMISE': return 'bg-purple-50 text-purple-600 border-purple-100';
      default: return 'bg-slate-50 text-slate-400 border-slate-100';
    }
  };

  const getPaymentStatusStyle = (status: string) => {
    switch(status) {
      case 'REUSSI': return 'bg-emerald-50 text-emerald-600';
      case 'ECHEC': return 'bg-red-50 text-red-600';
      case 'EN_ATTENTE': return 'bg-amber-50 text-amber-600';
      case 'INITIE': return 'bg-blue-50 text-blue-600';
      default: return 'bg-slate-50 text-slate-600';
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('fr-TN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDateOnly = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('fr-TN');
  };

  const getFormattedFileSize = (bytes: number): string => {
    if (!bytes) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  };

  const filteredRequests = requests.filter(r => r.typeDemande === inboxTab);
  
  // Filtrer les archives par recherche
  const filteredArchivedRequests = archivedRequests.filter(item =>
    item.reference.toLowerCase().includes(archiveSearchTerm.toLowerCase()) ||
    item.applicantName?.toLowerCase().includes(archiveSearchTerm.toLowerCase()) ||
    item.exportateurEtrangerNom?.toLowerCase().includes(archiveSearchTerm.toLowerCase())
  );

  const handleTabChange = (tabId: 'REGISTRATION' | 'PRODUCT_DECLARATION' | 'IMPORT' | 'ARCHIVE') => {
    setInboxTab(tabId);
    setSelectedIds([]);
    if (tabId === 'ARCHIVE') {
      // Recharger les archives quand on clique sur l'onglet
      fetchArchivedDemandes();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <i className="fas fa-spinner fa-spin text-3xl text-tunisia-red"></i>
          <p className="mt-4 text-slate-500">Chargement des demandes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10 animate-fade-in">
      {/* Inbox Tabs */}
      <div className="flex gap-4 p-2 bg-slate-100 rounded-3xl w-fit flex-wrap">
        {[
          { id: 'REGISTRATION', label: 'Enregistrements', icon: 'fa-user-plus', count: requests.filter(r => r.typeDemande === 'REGISTRATION').length },
          { id: 'PRODUCT_DECLARATION', label: 'Produits', icon: 'fa-box', count: requests.filter(r => r.typeDemande === 'PRODUCT_DECLARATION').length },
          { id: 'IMPORT', label: 'Importations', icon: 'fa-ship', count: requests.filter(r => r.typeDemande === 'IMPORT').length },
          { id: 'ARCHIVE', label: 'Archives', icon: 'fa-box-archive', count: archivedRequests.length },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id as any)}
            className={`px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-3 ${
              inboxTab === tab.id 
                ? 'bg-white text-slate-900 shadow-sm scale-[1.02]' 
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <i className={`fas ${tab.icon}`}></i>
            {tab.label}
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[8px] ${
              inboxTab === tab.id ? 'bg-tunisia-red text-white' : 'bg-slate-200 text-slate-500'
            }`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Section Archive */}
      {inboxTab === 'ARCHIVE' ? (
        <div className="space-y-6">
          <div className="bg-white/80 backdrop-blur-md p-8 rounded-[3rem] shadow-sm border border-slate-100">
            <div className="flex justify-between items-center mb-10">
              <div className="flex items-center gap-6">
                <div>
                  <h3 className="text-xl font-black text-slate-900 uppercase italic tracking-tighter">Index des Archives Administratives</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Dossiers traités et archivés</p>
                </div>
                {selectedIds.length > 0 && (
                  <motion.button 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    onClick={handleUnarchive}
                    disabled={unarchiving || loadingArchives}
                    className="px-6 py-2 bg-emerald-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/10 disabled:opacity-50"
                  >
                    <i className="fas fa-box-open"></i>
                    {unarchiving ? 'Désarchivage...' : `Désarchiver (${selectedIds.length})`}
                  </motion.button>
                )}
              </div>
              <div className="flex gap-4">
                <div className="px-6 py-3 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-3">
                  <i className="fas fa-search text-slate-300 text-[10px]"></i>
                  <input 
                    type="text" 
                    placeholder="RECHERCHER DANS L'ARCHIVE..." 
                    value={archiveSearchTerm}
                    onChange={(e) => setArchiveSearchTerm(e.target.value)}
                    className="bg-transparent outline-none text-[9px] font-bold uppercase tracking-widest text-slate-600 w-48" 
                  />
                </div>
                <button 
                  onClick={fetchArchivedDemandes}
                  className="px-4 py-3 bg-slate-100 rounded-2xl text-slate-500 hover:text-tunisia-red transition-all"
                  title="Rafraîchir les archives"
                >
                  <i className={`fas fa-sync-alt ${loadingArchives ? 'fa-spin' : ''}`}></i>
                </button>
              </div>
            </div>

            {loadingArchives ? (
              <div className="flex justify-center items-center h-64">
                <div className="text-center">
                  <i className="fas fa-spinner fa-spin text-3xl text-tunisia-red"></i>
                  <p className="mt-4 text-slate-500">Chargement des archives...</p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {/* Selection Toggle for Archive */}
                <div className="col-span-full mb-4 px-6 py-3 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-4">
                  <input 
                    type="checkbox" 
                    onChange={handleSelectAll}
                    checked={selectedIds.length > 0 && selectedIds.length === filteredArchivedRequests.length && filteredArchivedRequests.length > 0}
                    className="w-4 h-4 rounded accent-tunisia-red cursor-pointer"
                  />
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Sélectionner tout</span>
                  {selectedIds.length > 0 && (
                    <span className="text-[9px] font-black text-tunisia-red">
                      ({selectedIds.length} sélectionnée(s))
                    </span>
                  )}
                </div>

                {filteredArchivedRequests.length === 0 ? (
                  <div className="col-span-full py-20 flex flex-col items-center justify-center text-slate-400">
                    <i className="fas fa-box-archive text-5xl mb-4 opacity-50"></i>
                    <p className="text-[10px] font-black uppercase tracking-[0.3em]">
                      {archiveSearchTerm ? 'Aucune archive correspondante' : 'Aucune demande archivée'}
                    </p>
                    {archiveSearchTerm && (
                      <button 
                        onClick={() => setArchiveSearchTerm('')}
                        className="mt-4 text-[8px] text-tunisia-red hover:underline"
                      >
                        Effacer la recherche
                      </button>
                    )}
                  </div>
                ) : (
                  filteredArchivedRequests.map((item) => (
                    <motion.div 
                      key={item.id} 
                      whileHover={{ y: -5 }}
                      className={`group relative cursor-pointer ${selectedIds.includes(item.id.toString()) ? 'scale-[0.98]' : ''}`}
                      onClick={() => handleSelect(item.id.toString())}
                    >
                      <div className={`absolute -top-2 left-6 w-20 h-5 ${item.status === 'VALIDEE' ? 'bg-emerald-200' : 'bg-rose-200'} rounded-t-xl opacity-30 group-hover:opacity-100 transition-all duration-500`}></div>
                      <div className={`relative ${selectedIds.includes(item.id.toString()) ? 'bg-tunisia-red/5 border-tunisia-red shadow-lg shadow-tunisia-red/10' : 'bg-white/50 border-slate-100'} p-8 rounded-[2rem] rounded-tl-none border-2 group-hover:bg-white group-hover:shadow-xl group-hover:shadow-slate-200/50 transition-all duration-500 min-h-[220px] flex flex-col justify-between`}>
                        <div className="absolute top-4 right-4">
                          <div className={`w-5 h-5 rounded-md border-2 transition-all flex items-center justify-center ${
                            selectedIds.includes(item.id.toString()) 
                              ? 'bg-tunisia-red border-tunisia-red' 
                              : 'border-slate-200 group-hover:border-slate-300'
                          }`}>
                            {selectedIds.includes(item.id.toString()) && <i className="fas fa-check text-[10px] text-white"></i>}
                          </div>
                        </div>
                        <div>
                          <div className="flex justify-between items-start mb-6">
                            <div className={`w-11 h-11 bg-white rounded-2xl flex items-center justify-center ${item.status === 'VALIDEE' ? 'text-emerald-400' : 'text-rose-400'} border border-slate-50`}>
                              <i className={`fas ${item.typeDemande === 'PRODUCT_DECLARATION' ? 'fa-box' : item.typeDemande === 'IMPORT' ? 'fa-ship' : 'fa-building-shield'} text-lg opacity-60`}></i>
                            </div>
                            <div className="text-right">
                              <span className="text-[8px] font-bold text-slate-300 uppercase tracking-[0.2em] block mb-0.5">Réf. Archive</span>
                              <span className="text-[11px] font-bold text-slate-500 tracking-tight font-mono">{item.reference}</span>
                            </div>
                          </div>
                          <div className="space-y-1">
                            <h4 className="text-[12px] font-black text-slate-800 uppercase italic tracking-tighter">
                              {item.typeDemande === 'REGISTRATION' ? 'ENREGISTREMENT' : 
                               item.typeDemande === 'PRODUCT_DECLARATION' ? 'PRODUIT' : 'IMPORTATION'}
                            </h4>
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{item.applicantName || item.exportateurEtrangerNom}</p>
                          </div>
                        </div>
                        <div className="pt-5 border-t border-slate-100 flex items-center justify-between">
                          <span className="text-[9px] font-bold text-slate-300 uppercase italic tracking-widest">{formatDateOnly(item.submittedAt)}</span>
                          <span className={`px-3 py-1 rounded-md border-2 border-dashed ${item.status === 'VALIDEE' ? 'border-emerald-100 text-emerald-500' : item.status === 'REJETEE' ? 'border-rose-100 text-rose-500' : 'border-slate-100 text-slate-400'} text-[8px] font-black uppercase tracking-widest`}>
                            {item.status?.replace(/_/g, ' ') || 'N/A'}
                          </span>
                        </div>
                        {item.archivedAt && (
                          <div className="mt-3 pt-2 text-[7px] text-slate-300 border-t border-slate-50">
                            Archivé le: {formatDateOnly(item.archivedAt)} par {item.archivedBy || 'admin'}
                          </div>
                        )}
                        {item.archiveReason && (
                          <div className="mt-1 text-[6px] text-slate-300 italic truncate">
                            Raison: {item.archiveReason}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))
                )}
                
                <div className="col-span-full py-12 flex flex-col items-center justify-center opacity-20 border-2 border-dashed border-slate-200 rounded-[3rem]">
                  <i className="fas fa-boxes-packing text-4xl mb-4"></i>
                  <p className="text-[10px] font-black uppercase tracking-[0.3em]">Accès restreint au coffre-fort numérique</p>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Tableau des demandes actives - reste inchangé */
        <div className="bg-white rounded-[3rem] shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-8 border-b border-slate-50 bg-slate-50/30 flex justify-between items-center">
            <div className="flex items-center gap-6">
              <h3 className="text-xl font-black text-slate-900 uppercase italic tracking-tighter">
                {inboxTab === 'REGISTRATION' ? 'Enregistrements institutions' : inboxTab === 'PRODUCT_DECLARATION' ? 'Déclarations produits' : 'Importations'}
              </h3>
              {selectedIds.length > 0 && (
                <motion.button 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  onClick={handleArchive}
                  disabled={archiving}
                  className="px-6 py-2 bg-slate-900 text-white rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-black transition-all shadow-lg shadow-black/10 disabled:opacity-50"
                >
                  <i className="fas fa-archive"></i>
                  {archiving ? 'Archivage...' : `Archiver (${selectedIds.length})`}
                </motion.button>
              )}
            </div>
            <button 
              onClick={fetchActiveDemandes}
              className="w-8 h-8 rounded-full bg-white border border-slate-200 text-slate-400 hover:text-tunisia-red transition-all"
              title="Rafraîchir"
            >
              <i className="fas fa-sync-alt text-xs"></i>
            </button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-white">
                  <th className="px-8 py-5 w-10">
                    <input 
                      type="checkbox" 
                      onChange={handleSelectAll}
                      checked={selectedIds.length > 0 && selectedIds.length === filteredRequests.length && filteredRequests.length > 0}
                      className="w-4 h-4 rounded accent-tunisia-red cursor-pointer"
                    />
                  </th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Référence</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Demandeur</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Soumis le</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Paiement</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Statut</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                 </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredRequests.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-8 py-16 text-center text-slate-400">
                      <i className="fas fa-inbox text-3xl mb-3 block"></i>
                      <span className="text-xs">Aucune demande dans cette catégorie</span>
                    </td>
                  </tr>
                ) : (
                  filteredRequests.map((req) => (
                    <tr key={req.id} className={`group transition-colors ${selectedIds.includes(req.id.toString()) ? 'bg-tunisia-red/5' : 'hover:bg-slate-50/50'}`}>
                      <td className="px-8 py-6">
                        <input 
                          type="checkbox" 
                          checked={selectedIds.includes(req.id.toString())}
                          onChange={() => handleSelect(req.id.toString())}
                          className="w-4 h-4 rounded accent-tunisia-red cursor-pointer"
                        />
                      </td>
                      <td className="px-8 py-6">
                        <div className="font-black text-slate-900 italic tracking-tighter">{req.reference}</div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="text-xs font-bold text-slate-800 uppercase tracking-tight">
                          {req.applicantName || req.exportateurEtrangerNom || 'N/A'}
                        </div>
                        <div className="text-[8px] text-slate-400 font-black uppercase tracking-widest">
                          {req.applicantType === 'EXPORTATEUR' ? 'Exportateur' : 'Importateur'}
                          {req.exportateurEtrangerNom && ` • ${req.exportateurEtrangerPays || ''}`}
                        </div>
                      </td>
                      <td className="px-8 py-6 text-[10px] font-bold text-slate-500">
                        {formatDate(req.submittedAt)}
                      </td>
                      <td className="px-8 py-6">
                        <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-md ${getPaymentStatusStyle(req.paymentStatus)}`}>
                          {req.paymentStatus || 'N/A'}
                        </span>
                      </td>
                      <td className="px-8 py-6">
                        <span className={`text-[8px] font-black uppercase tracking-[0.2em] px-2 py-1 rounded-md border ${getStatusStyle(req.status)}`}>
                          {req.status?.replace(/_/g, ' ') || 'N/A'}
                        </span>
                      </td>
                      <td className="px-8 py-6 text-right">
                        <button 
                          onClick={() => setSelectedRequest(req)}
                          className="w-10 h-10 rounded-xl bg-slate-50 text-slate-400 hover:bg-slate-900 hover:text-white transition-all flex items-center justify-center ml-auto"
                          title="Voir Détails"
                        >
                          <i className="fas fa-eye text-xs"></i>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Détails - reste inchangé */}
      <AnimatePresence>
        {selectedRequest && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-4xl rounded-[3rem] shadow-2xl overflow-hidden border border-slate-100 flex flex-col relative z-10 my-8"
            >
              {/* Header */}
              <div className="p-8 border-b border-slate-50 bg-slate-50/30 flex justify-between items-center sticky top-0 bg-white z-10">
                <div>
                  <div className="flex items-center gap-3">
                    <h3 className="text-2xl font-black italic text-slate-900 uppercase tracking-tighter">
                      Détails de la demande
                    </h3>
                    <span className={`text-[8px] font-black uppercase tracking-[0.2em] px-3 py-1 rounded-md border ${getStatusStyle(selectedRequest.status)}`}>
                      {selectedRequest.status?.replace(/_/g, ' ') || 'N/A'}
                    </span>
                  </div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1">
                    Réf: {selectedRequest.reference}
                  </p>
                </div>
                <button 
                  onClick={() => setSelectedRequest(null)} 
                  className="w-10 h-10 rounded-full bg-white border border-slate-100 flex items-center justify-center text-slate-400 hover:text-tunisia-red transition-all shadow-sm"
                >
                  <i className="fas fa-times"></i>
                </button>
              </div>

              {/* Content - reste inchangé */}
              <div className="p-8 space-y-8 overflow-y-auto max-h-[70vh]">
                {/* Section 1: Demandeur & Status */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Demandeur</label>
                    <p className="text-sm font-bold text-slate-900">{selectedRequest.applicantName || selectedRequest.exportateurEtrangerNom || 'N/A'}</p>
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">
                      {selectedRequest.applicantType === 'EXPORTATEUR' ? 'Exportateur' : 'Importateur'}
                    </p>
                    {selectedRequest.applicantEmail && (
                      <p className="text-[9px] text-slate-400">{selectedRequest.applicantEmail}</p>
                    )}
                  </div>
                  {selectedRequest.exportateurEtrangerNom && (
                    <div className="space-y-1">
                      <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Exportateur Étranger</label>
                      <p className="text-sm font-bold text-slate-900">{selectedRequest.exportateurEtrangerNom}</p>
                      <p className="text-[9px] text-slate-500">{selectedRequest.exportateurEtrangerPays}</p>
                    </div>
                  )}
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Matricule Fiscal</label>
                    <p className="text-sm font-mono text-slate-800">{selectedRequest.applicantMatriculeFiscale || 'N/A'}</p>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Date Soumission</label>
                    <p className="text-sm font-bold text-slate-900">{formatDate(selectedRequest.submittedAt)}</p>
                  </div>
                </div>

                {/* Section 2: Paiement & Assignation */}
                <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 grid grid-cols-2 md:grid-cols-5 gap-5">
                  <div>
                    <label className="text-[8px] font-black uppercase tracking-widest text-slate-400 block mb-1">Réf. Paiement</label>
                    <span className="text-[10px] font-black text-slate-900 italic tracking-tighter">{selectedRequest.paymentReference || 'N/A'}</span>
                  </div>
                  <div>
                    <label className="text-[8px] font-black uppercase tracking-widest text-slate-400 block mb-1">Montant</label>
                    <span className="text-[10px] font-black text-slate-900">{selectedRequest.paymentAmount || 'N/A'}</span>
                  </div>
                  <div>
                    <label className="text-[8px] font-black uppercase tracking-widest text-slate-400 block mb-1">Statut Paiement</label>
                    <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-white shadow-sm border ${getPaymentStatusStyle(selectedRequest.paymentStatus)}`}>
                      {selectedRequest.paymentStatus || 'N/A'}
                    </span>
                  </div>
                  <div>
                    <label className="text-[8px] font-black uppercase tracking-widest text-slate-400 block mb-1">Assigné à</label>
                    <span className="text-[10px] font-bold text-slate-600">{selectedRequest.assignedToName || 'Non assigné'}</span>
                  </div>
                  {selectedRequest.numeroAgrement && (
                    <div>
                      <label className="text-[8px] font-black uppercase tracking-widest text-slate-400 block mb-1">N° Agrément</label>
                      <span className="text-[10px] font-black text-emerald-600">{selectedRequest.numeroAgrement}</span>
                    </div>
                  )}
                </div>

                {/* Section 3: Détails Spécifiques */}
                <div className="space-y-6">
                  <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-900 border-l-4 border-tunisia-red pl-4 italic">Détails de l'Opération</h4>
                  
                  {/* IMPORT Details */}
                  {selectedRequest.typeDemande === 'IMPORT' && selectedRequest.importDetails && (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-6 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                      <div>
                        <label className="text-[8px] font-black uppercase tracking-widest text-slate-400 block">Facture N°</label>
                        <span className="text-[10px] font-bold text-slate-900">{selectedRequest.importDetails.invoiceNumber || 'N/A'}</span>
                      </div>
                      <div>
                        <label className="text-[8px] font-black uppercase tracking-widest text-slate-400 block">Date Facture</label>
                        <span className="text-[10px] font-bold text-slate-900">{formatDateOnly(selectedRequest.importDetails.invoiceDate)}</span>
                      </div>
                      <div>
                        <label className="text-[8px] font-black uppercase tracking-widest text-slate-400 block">Montant</label>
                        <span className="text-[10px] font-bold text-slate-900">{selectedRequest.importDetails.amount} {selectedRequest.importDetails.currency}</span>
                      </div>
                      <div>
                        <label className="text-[8px] font-black uppercase tracking-widest text-slate-400 block">Incoterm</label>
                        <span className="text-[10px] font-bold text-slate-900">{selectedRequest.importDetails.incoterm || 'N/A'}</span>
                      </div>
                      <div>
                        <label className="text-[8px] font-black uppercase tracking-widest text-slate-400 block">Transport</label>
                        <span className="text-[10px] font-bold text-slate-900">{selectedRequest.importDetails.transportMode || 'N/A'}</span>
                      </div>
                      <div>
                        <label className="text-[8px] font-black uppercase tracking-widest text-slate-400 block">Chargement</label>
                        <span className="text-[10px] font-bold text-slate-900">{selectedRequest.importDetails.loadingPort || 'N/A'}</span>
                      </div>
                      <div>
                        <label className="text-[8px] font-black uppercase tracking-widest text-slate-400 block">Déchargement</label>
                        <span className="text-[10px] font-bold text-slate-900">{selectedRequest.importDetails.dischargePort || 'N/A'}</span>
                      </div>
                      <div>
                        <label className="text-[8px] font-black uppercase tracking-widest text-slate-400 block">Arrivée Prévue</label>
                        <span className="text-[10px] font-bold text-slate-900">{formatDateOnly(selectedRequest.importDetails.arrivalDate)}</span>
                      </div>
                    </div>
                  )}

                  {/* PRODUCT Details */}
                  {selectedRequest.typeDemande === 'PRODUCT_DECLARATION' && selectedRequest.products && selectedRequest.products.length > 0 && (
                    <div className="space-y-4">
                      {selectedRequest.products.map((prod, idx) => (
                        <div key={idx} className="flex gap-6 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                          {prod.productImage && (
                            <img
                              src={getImageUrl(prod.productImage) || 'https://via.placeholder.com/150'}
                              alt={prod.productName} 
                              className="w-24 h-24 rounded-2xl object-cover shadow-md border-2 border-slate-50" 
                            />
                          )}
                          <div className="flex-1 grid grid-cols-2 md:grid-cols-3 gap-y-4">
                            <div className="col-span-2 md:col-span-3">
                              <label className="text-[8px] font-black uppercase tracking-widest text-slate-400 block">Désignation Produit</label>
                              <span className="text-xs font-black text-slate-900 uppercase italic tracking-tighter">{prod.productName}</span>
                            </div>
                            <div>
                              <label className="text-[8px] font-black uppercase tracking-widest text-slate-400 block">Type / Catégorie</label>
                              <span className="text-[10px] font-bold text-slate-700">{prod.productType} &bull; {prod.category}</span>
                            </div>
                            <div>
                              <label className="text-[8px] font-black uppercase tracking-widest text-slate-400 block">Code HS / NGP</label>
                              <span className="text-[10px] font-black text-slate-900 italic">{prod.hsCode}</span>
                            </div>
                            <div>
                              <label className="text-[8px] font-black uppercase tracking-widest text-slate-400 block">Marque Commerciale</label>
                              <span className="text-[10px] font-bold text-indigo-600">{prod.commercialBrandName || prod.brandName || 'N/A'}</span>
                            </div>
                            <div>
                              <label className="text-[8px] font-black uppercase tracking-widest text-slate-400 block">Origine & État</label>
                              <span className="text-[10px] font-bold text-slate-700">{prod.originCountry} &bull; {prod.productState}</span>
                            </div>
                            <div>
                              <label className="text-[8px] font-black uppercase tracking-widest text-slate-400 block">Quantité Annuelle</label>
                              <span className="text-[10px] font-black text-slate-900">{prod.annualQuantityValue} {prod.annualQuantityUnit}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* REGISTRATION Details */}
                  {selectedRequest.typeDemande === 'REGISTRATION' && (
                    <div className="p-6 bg-indigo-50/50 rounded-3xl border border-indigo-100 flex items-center gap-4">
                      <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-indigo-600 shadow-sm border border-indigo-100">
                        <i className="fas fa-building-circle-check text-xl"></i>
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-900">Demande d'Enregistrement Officiel</p>
                        <p className="text-xs font-medium text-indigo-600">Enregistrement d'une nouvelle entité pour l'agrément d'opération de commerce extérieur.</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Section 4: Décision */}
                {selectedRequest.status !== 'SOUMISE' && selectedRequest.status !== 'EN_COURS_VALIDATION' && selectedRequest.status !== 'EN_ATTENTE_INFO' && (
                  <div className={`p-6 rounded-3xl border-2 border-dashed ${
                    selectedRequest.status === 'VALIDEE' ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'
                  }`}>
                    <div className="flex justify-between items-start mb-4">
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-900">Résultat de l'Instruction</h4>
                      <span className="text-[9px] font-bold text-slate-400 italic">
                        Décidé le: {formatDate(selectedRequest.decisionDate)}
                      </span>
                    </div>
                    <p className="text-xs italic text-slate-600 mb-6 bg-white p-4 rounded-xl shadow-inner leading-relaxed">
                      "{selectedRequest.decisionComment || 'Aucun commentaire fourni.'}"
                    </p>
                    {selectedRequest.status === 'VALIDEE' && selectedRequest.numeroAgrement && (
                      <div className="flex gap-4">
                        <div className="flex-1 p-4 bg-white rounded-2xl border border-emerald-100 flex items-center gap-3">
                          <i className="fas fa-certificate text-emerald-500"></i>
                          <div>
                            <p className="text-[7px] font-black uppercase text-slate-400">N° Agrément</p>
                            <p className="text-[11px] font-black text-slate-900 italic tracking-tighter">{selectedRequest.numeroAgrement}</p>
                          </div>
                        </div>
                        <div className="flex-1 p-4 bg-white rounded-2xl border border-emerald-100 flex items-center gap-3">
                          <i className="fas fa-calendar-check text-emerald-500"></i>
                          <div>
                            <p className="text-[7px] font-black uppercase text-slate-400">Date Agrément</p>
                            <p className="text-[11px] font-black text-slate-900 italic tracking-tighter">{formatDateOnly(selectedRequest.dateAgrement)}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Section 5: Documents */}
                <div className="space-y-4">
                  <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-900">Pièces Justificatives</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {selectedRequest.documents && selectedRequest.documents.length > 0 ? (
                      selectedRequest.documents.map((doc) => (
                        <div key={doc.id} className="flex justify-between items-center p-5 bg-white border border-slate-100 rounded-[1.5rem] shadow-sm hover:border-tunisia-red group transition-all">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-tunisia-red group-hover:bg-tunisia-red group-hover:text-white transition-all">
                              <i className={`fas ${doc.fileType?.includes('pdf') ? 'fa-file-pdf' : 'fa-file-image'}`}></i>
                            </div>
                            <div>
                              <span className="text-[10px] font-bold text-slate-900 uppercase block leading-tight">{doc.name || doc.fileName}</span>
                              <div className="flex items-center gap-2">
                                <span className={`text-[8px] font-black uppercase tracking-widest px-1 py-0.5 rounded ${
                                  doc.status === 'VALIDE' ? 'text-emerald-500 bg-emerald-50' : 
                                  doc.status === 'REJETE' ? 'text-red-500 bg-red-50' : 'text-amber-500 bg-amber-50'
                                }`}>
                                  {doc.status || 'EN_ATTENTE'}
                                </span>
                                <span className="text-[7px] text-slate-400">{getFormattedFileSize(doc.fileSize)}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-3 text-slate-300">
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                handlePreviewDocument(doc);
                              }}
                              className="w-8 h-8 rounded-full hover:bg-slate-50 flex items-center justify-center transition-all hover:text-tunisia-red"
                            >
                              <i className="fas fa-eye text-xs"></i>
                            </button>
                            <button 
                              onClick={() => handleDownloadDocument(doc)}
                              disabled={downloading === doc.id}
                              className="w-8 h-8 rounded-full hover:bg-slate-50 flex items-center justify-center transition-all hover:text-slate-900 text-slate-400 disabled:opacity-50"
                              title="Télécharger"
                            >
                              {downloading === doc.id ? (
                                <i className="fas fa-spinner fa-spin text-xs"></i>
                              ) : (
                                <i className="fas fa-download text-xs"></i>
                              )}
                            </button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-[10px] text-slate-400 italic col-span-2 text-center py-8">Aucun document joint</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="p-8 border-t border-slate-50 flex justify-end items-center gap-6 bg-slate-50/10">
                <p className="text-[8px] font-black uppercase tracking-widest text-slate-400 italic">
                  Plateforme Souveraine de Contrôle du Commerce Extérieur
                </p>
                <button 
                  onClick={() => setSelectedRequest(null)}
                  className="px-8 py-3 bg-slate-900 text-white rounded-xl font-black uppercase tracking-widest text-[9px] shadow-xl hover:bg-black transition-all"
                >
                  Fermer l'aperçu
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal Prévisualisation Document - reste inchangé */}
      <AnimatePresence>
        {previewDoc && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white w-full max-w-4xl h-[90vh] rounded-[3rem] shadow-[0_0_100px_-20px_rgba(0,0,0,0.5)] overflow-hidden border border-slate-100 flex flex-col relative"
            >
              {/* Header */}
              <div className="p-6 border-b border-slate-50 bg-slate-50/50 flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg ${
                    getFileType(previewDoc.fileName) === 'pdf' 
                      ? 'bg-red-500 text-white shadow-red-500/20' 
                      : getFileType(previewDoc.fileName) === 'image'
                      ? 'bg-blue-500 text-white shadow-blue-500/20'
                      : 'bg-slate-500 text-white shadow-slate-500/20'
                  }`}>
                    <i className={`text-xl ${
                      getFileType(previewDoc.fileName) === 'pdf' ? 'fas fa-file-pdf' : 
                      getFileType(previewDoc.fileName) === 'image' ? 'fas fa-file-image' : 'fas fa-file-alt'
                    }`}></i>
                  </div>
                  <div>
                    <h3 className="text-xl font-black italic text-slate-900 uppercase tracking-tighter">
                      {previewDoc.name || previewDoc.fileName}
                    </h3>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                      {getFormattedFileSize(previewDoc.fileSize)} • {previewDoc.fileType}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={handleClosePreview} 
                  className="w-10 h-10 rounded-full bg-white border border-slate-100 flex items-center justify-center text-slate-400 hover:text-tunisia-red transition-all shadow-sm hover:rotate-90"
                >
                  <i className="fas fa-times"></i>
                </button>
              </div>
              
              {/* Content */}
              <div className="flex-1 bg-slate-100 p-6 overflow-y-auto">
                {previewLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <i className="fas fa-spinner fa-spin text-3xl text-tunisia-red"></i>
                      <p className="mt-4 text-slate-500">Chargement du document...</p>
                    </div>
                  </div>
                ) : previewUrl ? (
                  <div className="w-full h-full">
                    {getFileType(previewDoc.fileName) === 'pdf' ? (
                      <iframe
                        src={previewUrl}
                        className="w-full h-full rounded-xl border-0"
                        title={previewDoc.fileName}
                      />
                    ) : getFileType(previewDoc.fileName) === 'image' ? (
                      <div className="flex items-center justify-center h-full">
                        <img
                          src={previewUrl}
                          alt={previewDoc.fileName}
                          className="max-w-full max-h-full object-contain rounded-xl shadow-lg"
                        />
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full text-center">
                        <div className="w-32 h-32 bg-white rounded-3xl flex items-center justify-center mb-6 shadow-lg">
                          <i className="fas fa-file-alt text-5xl text-slate-400"></i>
                        </div>
                        <p className="text-slate-500 mb-2">Aperçu non disponible pour ce type de fichier</p>
                        <p className="text-xs text-slate-400">Format: {previewDoc.fileType}</p>
                        <button
                          onClick={() => handleDownloadDocument(previewDoc)}
                          className="mt-6 px-6 py-3 bg-tunisia-red text-white rounded-xl font-black uppercase tracking-widest text-[9px] shadow-lg hover:bg-red-700 transition-all flex items-center gap-2"
                        >
                          <i className="fas fa-download"></i> Télécharger le fichier
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center text-red-500">
                      <i className="fas fa-exclamation-triangle text-3xl mb-3"></i>
                      <p>Erreur lors du chargement du document</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-6 border-t border-slate-50 flex justify-between items-center bg-white">
                <div className="flex gap-3">
                  <span className={`px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest ${
                    previewDoc.status === 'VALIDE' ? 'bg-emerald-50 text-emerald-600' :
                    previewDoc.status === 'REJETE' ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'
                  }`}>
                    {previewDoc.status || 'EN_ATTENTE'}
                  </span>
                  {previewDoc.validatedByName && (
                    <span className="text-[8px] text-slate-400">
                      Validé par: {previewDoc.validatedByName}
                    </span>
                  )}
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => handleDownloadDocument(previewDoc)}
                    className="px-6 py-2.5 bg-white border border-slate-200 rounded-xl text-[9px] font-black uppercase tracking-widest text-slate-600 shadow-sm hover:bg-slate-50 transition-all flex items-center gap-2"
                  >
                    <i className="fas fa-download"></i> Télécharger
                  </button>
                  <button 
                    onClick={handleClosePreview}
                    className="px-8 py-2.5 bg-slate-900 text-white rounded-xl font-black uppercase tracking-widest text-[9px] shadow-xl hover:bg-black transition-all"
                  >
                    Fermer
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminRequestList;