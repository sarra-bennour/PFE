import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import axios from 'axios';
import { DemandeEnregistrement, DemandeStatus } from '../types/DemandeEnregistrement';
import { PaymentStatus } from '../types/PaymentResult';

interface RequestArchiveProps {
  userRole: 'EXPORTATEUR' | 'IMPORTATEUR';
  onBack?: () => void;
}

const RequestArchive: React.FC<RequestArchiveProps> = ({ userRole, onBack }) => {
  const [loading, setLoading] = useState(true);
  const [archivedRequests, setArchivedRequests] = useState<DemandeEnregistrement[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<DemandeEnregistrement | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const API_BASE_URL = process.env.REACT_APP_API_URL || '';

  // Charger les demandes archivées
  const fetchArchivedRequests = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE_URL}/api/archive/my-archives?role=${userRole}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.success) {
        setArchivedRequests(response.data.data);
      }
    } catch (error: any) {
      console.error('Erreur lors du chargement des archives:', error);
      if (error.response?.status === 401) {
        // Token expiré
        localStorage.removeItem('token');
        window.location.href = '/login';
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArchivedRequests();
  }, []);

  const getStatusColor = (status: DemandeStatus) => {
    switch (status) {
      case DemandeStatus.VALIDEE: return 'bg-emerald-50/50 text-emerald-600/80 border-emerald-100/50';
      case DemandeStatus.REJETEE: return 'bg-rose-50/50 text-rose-600/80 border-rose-100/50';
      case DemandeStatus.EN_COURS_VALIDATION: return 'bg-sky-50/50 text-sky-600/80 border-sky-100/50';
      case DemandeStatus.SUSPENDUE: return 'bg-orange-50/50 text-orange-600/80 border-orange-100/50';
      case DemandeStatus.EN_ATTENTE_INFO: return 'bg-violet-50/50 text-violet-600/80 border-violet-100/50';
      case DemandeStatus.SOUMISE: return 'bg-slate-50/50 text-slate-500/80 border-slate-100/50';
      default: return 'bg-slate-50/50 text-slate-400/80 border-slate-100/50';
    }
  };

  const getPaymentStatusColor = (status: PaymentStatus) => {
    switch (status) {
      case PaymentStatus.REUSSI: return 'bg-emerald-50 text-emerald-600';
      case PaymentStatus.ECHEC: return 'bg-red-50 text-red-600';
      case PaymentStatus.INITIE: return 'bg-blue-50 text-blue-600';
      case PaymentStatus.REMBOURSE: return 'bg-purple-50 text-purple-600';
      default: return 'bg-slate-50 text-slate-400';
    }
  };

  const getFolderColor = (status: DemandeStatus) => {
    switch (status) {
      case DemandeStatus.VALIDEE: return {
        tab: 'bg-emerald-200',
        body: 'bg-emerald-50/20',
        border: 'border-emerald-200',
        accent: 'bg-emerald-100',
        icon: 'text-emerald-400'
      };
      case DemandeStatus.REJETEE: return {
        tab: 'bg-rose-200',
        body: 'bg-rose-50/20',
        border: 'border-rose-200',
        accent: 'bg-rose-100',
        icon: 'text-rose-400'
      };
      case DemandeStatus.EN_COURS_VALIDATION: return {
        tab: 'bg-sky-200',
        body: 'bg-sky-50/20',
        border: 'border-sky-200',
        accent: 'bg-sky-100',
        icon: 'text-sky-400'
      };
      case DemandeStatus.SUSPENDUE: return {
        tab: 'bg-orange-200',
        body: 'bg-orange-50/20',
        border: 'border-orange-200',
        accent: 'bg-orange-100',
        icon: 'text-orange-400'
      };
      case DemandeStatus.EN_ATTENTE_INFO: return {
        tab: 'bg-violet-200',
        body: 'bg-violet-50/20',
        border: 'border-violet-200',
        accent: 'bg-violet-100',
        icon: 'text-violet-400'
      };
      default: return {
        tab: 'bg-slate-200',
        body: 'bg-slate-50/20',
        border: 'border-slate-200',
        accent: 'bg-slate-100',
        icon: 'text-slate-300'
      };
    }
  };

  const getDemandeurName = (req: DemandeEnregistrement): string => {
    if (req.applicantType === 'EXPORTATEUR') {
      if (req.exportateur) {
        const nomComplet = `${req.exportateur.prenom || ''} ${req.exportateur.nom || ''}`.trim();
        return nomComplet || req.exportateur.raisonSociale || 'Exportateur';
      }
      return 'Exportateur';
    } else {
      if (req.importateur) {
        const nomComplet = `${req.importateur.prenom || ''} ${req.importateur.nom || ''}`.trim();
        return nomComplet || req.importateur.raisonSociale || 'Importateur';
      }
      return 'Importateur';
    }
  };

  const getTypeLabel = (req: DemandeEnregistrement): string => {
    switch (req.type) {
      case 'REGISTRATION': return 'Enregistrement';
      case 'PRODUCT_DECLARATION': return 'Déclaration Produits';
      case 'IMPORT': return 'Importation';
      default: return 'Demande';
    }
  };

  const filteredRequests = archivedRequests.filter(req => 
    req.reference?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <i className="fas fa-spinner fa-spin text-3xl text-tunisia-red"></i>
          <p className="mt-4 text-slate-500">Chargement des archives...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header avec bouton retour */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white/80 backdrop-blur-md p-6 rounded-[2rem] shadow-sm border border-slate-100">
        <div>
          <h3 className="text-xl font-bold text-slate-800 uppercase italic tracking-tighter">Archives des Demandes</h3>
          <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest mt-1 italic">
            Historique de vos demandes traitées
          </p>
        </div>
        <div className="relative w-full md:w-80 group">
          <input 
            type="text" 
            placeholder="Rechercher par référence..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-white border border-slate-100 rounded-2xl text-[10px] font-bold uppercase tracking-widest outline-none focus:border-slate-300 transition-all shadow-inner"
          />
          <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 text-[10px] group-focus-within:text-slate-400 transition-colors"></i>
        </div>
      </div>

      {/* Grille des archives */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
        {filteredRequests.map((req, idx) => {
          const folderTheme = getFolderColor(req.status as DemandeStatus);
          return (
            <motion.div
              key={req.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.03 }}
              onClick={() => setSelectedRequest(req)}
              className="group relative cursor-pointer"
            >
              {/* Folder Shape Background (Tab) */}
              <div className={`absolute -top-2 left-6 w-20 h-5 ${folderTheme.tab} rounded-t-xl opacity-30 group-hover:opacity-100 transition-all duration-500`}></div>
              
              <div className={`relative ${folderTheme.body} rounded-[2rem] rounded-tl-none p-8 border ${folderTheme.border} group-hover:border-slate-300 group-hover:bg-white transition-all duration-700 h-full flex flex-col justify-between min-h-[230px]`}>
                {/* Folder Line Accent */}
                <div className={`absolute top-0 left-0 w-1 h-full ${folderTheme.tab} opacity-10 group-hover:opacity-30 transition-opacity rounded-l-[2rem]`}></div>

                <div>
                  <div className="flex justify-between items-start mb-6">
                    <div className={`w-11 h-11 bg-white rounded-2xl flex items-center justify-center ${folderTheme.icon} border border-slate-50 transition-transform duration-500 group-hover:scale-105`}>
                      <i className={`fas ${req.type === 'PRODUCT_DECLARATION' ? 'fa-boxes-packing' : req.type === 'IMPORT' ? 'fa-ship' : 'fa-building'} text-lg opacity-60`}></i>
                    </div>
                    <div className="text-right">
                      <span className="text-[8px] font-bold text-slate-300 uppercase tracking-[0.2em] block mb-0.5">Réf. Dossier</span>
                      <span className="text-[11px] font-bold text-slate-500 tracking-tight font-mono whitespace-nowrap">{req.reference}</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-[13px] font-bold text-slate-700 uppercase italic tracking-tighter leading-tight">
                      {getTypeLabel(req)}
                    </h4>
                    <div className="flex items-center gap-2 pt-1">
                      <i className="fas fa-user-circle text-[10px] text-slate-300"></i>
                      <span className="text-[9px] font-medium text-slate-400 uppercase tracking-wider truncate max-w-[140px]">
                        {getDemandeurName(req)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-8 pt-5 border-t border-slate-100 flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-[7px] font-bold text-slate-300 uppercase tracking-widest mb-0.5">Soumis le</span>
                    <span className="text-[10px] font-medium text-slate-400 italic">
                      {req.submittedAt ? new Date(req.submittedAt).toLocaleDateString('fr-FR') : 'N/A'}
                    </span>
                  </div>
                  
                  {/* Status Stamp Style */}
                  <div className={`px-3 py-1 rounded-md border-2 border-dashed rotate-[-2deg] ${getStatusColor(req.status as DemandeStatus)} text-[9px] font-bold uppercase tracking-widest group-hover:rotate-0 transition-all duration-700`}>
                    {req.status}
                  </div>
                </div>

                {/* Decorative Document Edge */}
                <div className="absolute right-4 top-4 opacity-0 group-hover:opacity-5 group-hover:-translate-y-2 transition-all duration-700">
                  <i className="fas fa-file-invoice text-6xl text-slate-900"></i>
                </div>
              </div>
            </motion.div>
          );
        })}

        {filteredRequests.length === 0 && (
          <div className="col-span-full py-20 text-center bg-slate-50 rounded-[3rem] border-2 border-dashed border-slate-200">
            <i className="fas fa-box-open text-4xl text-slate-200 mb-4"></i>
            <h4 className="text-xl font-black text-slate-400 uppercase italic tracking-tighter text-center">Aucune archive trouvée</h4>
            <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest mt-2">
              Aucune demande archivée pour le moment.
            </p>
          </div>
        )}
      </div>

      {/* Modal Détails */}
      <AnimatePresence>
        {selectedRequest && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedRequest(null)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-4xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
            >
              {/* Header */}
              <div className="px-10 py-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-slate-900 text-white rounded-2xl flex items-center justify-center text-xl">
                    <i className="fas fa-archive"></i>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-xl font-black text-slate-900 uppercase italic tracking-tighter">Détails de la demande</h3>
                      <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border ${getStatusColor(selectedRequest.status as DemandeStatus)}`}>
                        {selectedRequest.status}
                      </span>
                    </div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Référence : {selectedRequest.reference}</p>
                  </div>
                </div>
                <button onClick={() => setSelectedRequest(null)} className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center hover:text-tunisia-red transition-all">
                  <i className="fas fa-times"></i>
                </button>
              </div>

              <div className="p-10 overflow-y-auto custom-scrollbar space-y-10">
                {/* Informations Générales */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100">
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Soumise le</p>
                    <p className="text-sm font-black text-slate-900 italic tracking-tight">
                      {selectedRequest.submittedAt ? new Date(selectedRequest.submittedAt).toLocaleDateString('fr-FR') : 'N/A'}
                    </p>
                  </div>
                  <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100">
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Type de demandeur</p>
                    <p className="text-sm font-black text-slate-900 italic tracking-tight">
                      {selectedRequest.applicantType === 'EXPORTATEUR' ? 'Exportateur' : 'Importateur'}
                    </p>
                  </div>
                  <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100">
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Assigné à</p>
                    <p className="text-sm font-black text-slate-900 italic tracking-tight">
                      {typeof selectedRequest.assignedTo === 'object' && selectedRequest.assignedTo 
                        ? `${selectedRequest.assignedTo || ''} ${selectedRequest.assignedTo || ''}`.trim() 
                        : selectedRequest.assignedTo || 'Non assigné'}
                    </p>
                  </div>
                </div>

                {/* Section Paiement */}
                <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-6 flex items-center gap-2">
                    <i className="fas fa-credit-card"></i> Détails du Paiement
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div>
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Montant</p>
                      <p className="text-xl font-black text-slate-900 italic">{selectedRequest.paymentAmount?.toLocaleString() || 'N/A'} TND</p>
                    </div>
                    <div>
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Réf. Transaction</p>
                      <p className="text-sm font-bold text-slate-600 font-mono">{selectedRequest.paymentReference || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Statut Paiement</p>
                      <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${getPaymentStatusColor((selectedRequest.paymentStatus as PaymentStatus) || PaymentStatus.EN_ATTENTE)}`}>
                        {selectedRequest.paymentStatus || 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Section Décision */}
                {(selectedRequest.decisionDate || selectedRequest.decisionComment || selectedRequest.numeroAgrement) && (
                  <div className="bg-slate-900 p-8 rounded-[2rem] text-white shadow-xl border-t-4 border-t-tunisia-red">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-tunisia-red mb-6 flex items-center gap-2">
                      <i className="fas fa-gavel"></i> Décision & Agrément
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                      <div className="space-y-6">
                        {selectedRequest.numeroAgrement && (
                          <div>
                            <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Numéro d'Agrément</p>
                            <p className="text-xl font-black text-emerald-400 italic tracking-tighter uppercase">{selectedRequest.numeroAgrement}</p>
                            {selectedRequest.dateAgrement && (
                              <p className="text-[9px] font-bold text-slate-400 mt-1 italic">
                                Délivré le {new Date(selectedRequest.dateAgrement).toLocaleDateString('fr-FR')}
                              </p>
                            )}
                          </div>
                        )}
                        <div>
                          <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Date de décision</p>
                          <p className="text-sm font-bold">
                            {selectedRequest.decisionDate ? new Date(selectedRequest.decisionDate).toLocaleDateString('fr-FR') : 'N/A'}
                          </p>
                        </div>
                      </div>
                      <div className="p-6 bg-white/5 rounded-2xl border border-white/10">
                        <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-2">Commentaire de l'instructeur</p>
                        <p className="text-[11px] font-medium leading-relaxed italic text-slate-300">
                          {selectedRequest.decisionComment || "Aucun commentaire supplémentaire n'a été fourni."}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Section Produits (Pour les déclarations produits) */}
                {selectedRequest.products && selectedRequest.products.length > 0 && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                        <i className="fas fa-boxes-stacked"></i> Produits Déclarés
                      </h4>
                    </div>
                    <div className="grid grid-cols-1 gap-6">
                      {selectedRequest.products.map((product, idx) => (
                        <div key={idx} className="p-6 bg-white rounded-2xl border border-slate-100 flex flex-col md:flex-row gap-6 hover:shadow-md transition-shadow">
                          {product.productImage ? (
                            <div className="w-24 h-24 rounded-xl overflow-hidden border border-slate-100 shrink-0">
                              <img src={product.productImage} alt={product.productName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            </div>
                          ) : (
                            <div className="w-24 h-24 bg-slate-50 rounded-xl flex items-center justify-center shrink-0 border border-slate-100">
                              <i className="fas fa-image text-slate-200 text-2xl"></i>
                            </div>
                          )}
                          <div className="flex-1 space-y-3">
                            <div className="flex justify-between items-start">
                              <div>
                                <h5 className="font-black text-slate-900 uppercase italic text-sm tracking-tight">{product.productName}</h5>
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{product.category} • {product.hsCode}</p>
                              </div>
                              <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest bg-slate-100 text-slate-600`}>
                                {product.productType}
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <span className="px-2 py-1 bg-slate-50 rounded-lg text-[8px] font-bold text-slate-500 border border-slate-100 uppercase">
                                <i className="fas fa-earth-africa mr-1"></i> {product.originCountry}
                              </span>
                              <span className="px-2 py-1 bg-slate-50 rounded-lg text-[8px] font-bold text-slate-500 border border-slate-100 uppercase">
                                <i className="fas fa-box mr-1"></i> {product.productState}
                              </span>
                              {product.brandName && (
                                <span className="px-2 py-1 bg-amber-50 rounded-lg text-[8px] font-bold text-amber-700 border border-amber-100 uppercase">
                                  <i className="fas fa-trademark mr-1"></i> {product.brandName}
                                </span>
                              )}
                              {product.isBrandOwner && (
                                <span className="px-2 py-1 bg-emerald-50 rounded-lg text-[8px] font-bold text-emerald-700 border border-emerald-100 uppercase">
                                  Propriétaire
                                </span>
                              )}
                              {product.hasBrandLicense && (
                                <span className="px-2 py-1 bg-blue-50 rounded-lg text-[8px] font-bold text-blue-700 border border-blue-100 uppercase">
                                  Sous Licence
                                </span>
                              )}
                            </div>
                            {product.commercialBrandName && product.commercialBrandName !== product.brandName && (
                              <p className="text-[9px] font-bold text-slate-400 uppercase italic">
                                Marque commerciale : {product.commercialBrandName}
                              </p>
                            )}
                            <p className="text-[10px] font-bold text-slate-700 bg-slate-50 w-fit px-3 py-1 rounded-full uppercase tracking-tighter">
                              Quantité annuelle : {product.annualQuantityValue} {product.annualQuantityUnit}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Section Importation */}
                {selectedRequest.type === 'IMPORT' && (
                  <div className="space-y-10">
                    <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm space-y-8">
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                        <i className="fas fa-file-invoice-dollar"></i> Détails de Facturation
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                        <div>
                          <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">N° Facture</p>
                          <p className="text-sm font-black text-slate-900 font-mono">{selectedRequest.invoiceNumber || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Date Facture</p>
                          <p className="text-sm font-bold text-slate-600">
                            {selectedRequest.invoiceDate ? new Date(selectedRequest.invoiceDate).toLocaleDateString('fr-FR') : 'N/A'}
                          </p>
                        </div>
                        <div>
                          <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Montant</p>
                          <p className="text-sm font-black text-emerald-600 uppercase italic tracking-tighter">
                            {selectedRequest.amount?.toLocaleString() || 'N/A'} {selectedRequest.currency}
                          </p>
                        </div>
                        <div>
                          <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Incoterm</p>
                          <p className="text-sm font-black text-slate-900 border border-slate-100 bg-slate-50 px-3 py-1 rounded-lg w-fit">{selectedRequest.incoterm || 'N/A'}</p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm space-y-8">
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                        <i className="fas fa-ship"></i> Logistique de Transport
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                        <div>
                          <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Mode</p>
                          <span className="text-[10px] font-black text-slate-900 uppercase italic flex items-center gap-2 mt-1">
                            <i className={`fas ${selectedRequest.transportMode === "MARITIME" ? 'fa-ship' : selectedRequest.transportMode === "AERIEN" ? 'fa-plane' : 'fa-truck'}`}></i>
                            {selectedRequest.transportMode || 'N/A'}
                          </span>
                        </div>
                        <div>
                          <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Port de chargement</p>
                          <p className="text-xs font-bold text-slate-600 uppercase italic tracking-tighter">{selectedRequest.loadingPort || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Port de déchargement</p>
                          <p className="text-xs font-bold text-slate-600 uppercase italic tracking-tighter">{selectedRequest.dischargePort || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Date d'arrivée prévue</p>
                          <p className="text-sm font-black text-tunisia-red italic tracking-tighter">
                            {selectedRequest.arrivalDate ? new Date(selectedRequest.arrivalDate).toLocaleDateString('fr-FR') : 'N/A'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="px-10 py-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-4">
                <button 
                  onClick={() => setSelectedRequest(null)}
                  className="px-8 py-3 bg-slate-900 text-white rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-black transition-all"
                >
                  Fermer l'archive
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default RequestArchive;