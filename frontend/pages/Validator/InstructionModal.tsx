import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import axios from 'axios';
import { Product } from '@/types/Product';
import { ImportDetails, DemandeStatus } from '@/types/DemandeEnregistrement';


// Types de documents alimentaires (pour Santé/INSSPA/ANMPS)
const ALIMENTAIRE_DOC_TYPES = [
  'TECHNICAL_DATA_SHEET',
  'SANITARY_APPROVAL', 
  'SANITARY_CERT',
  'FREE_SALE_CERT',
  'BACTERIO_ANALYSIS',
  'PHYSICO_CHEM_ANALYSIS',
  'RADIOACTIVITY_ANALYSIS',
  'FUMIGATION_CERT',
  'HACCP_ISO_CERT',
  'BRAND_LICENSE',
  'COMPETENT_AUTHORITY_LETTER',
  'STORAGE_FACILITY_PLAN',
  'PRODUCTION_FACILITY_PLAN',
  'MONITORING_PLAN',
  'PRODUCT_SPECIFICATION',
  'PRODUCT_LABELS',
  'COMMISSION_LETTER',
  'QUALITY_CERT',
  'PRODUCT_SHEETS',
  'OFFICIAL_LETTER'
];

// Types de documents industriels (pour Industrie)
const INDUSTRIEL_DOC_TYPES = [
  'CONFORMITY_CERT_ANALYSIS_REPORT'
];

// Fonction de filtrage
const filterDocumentsByInstance = (documents: AttachedDocument[], structureName: string): AttachedDocument[] => {
  if (!structureName || !documents) return documents;
  
  // Ministère du Commerce -> voit tout
  if (structureName.includes('Commerce')) {
    return documents;
  }
  
  // Ministère de l'Industrie -> voit seulement documents industriels
  if (structureName.includes('Industrie')) {
    return documents.filter(doc => INDUSTRIEL_DOC_TYPES.includes(doc.documentType || ''));
  }
  
  // Ministère de la Santé / INSSPA / ANMPS -> voit seulement documents alimentaires
  if (structureName.includes('Santé') || structureName.includes('INSSPA') || structureName.includes('ANMPS')) {
    return documents.filter(doc => ALIMENTAIRE_DOC_TYPES.includes(doc.documentType || ''));
  }
  
  // Par défaut, voir tout
  return documents;
};

export type DocStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'NOT_SURE';

export interface AttachedDocument {
  id: string;
  name: string;
  status: DocStatus;
  comment?: string;
  fileUrl?: string;
  documentType?: string;
}

export type RequestType = 'REGISTRATION' | 'PRODUCT_DECLARATION' | 'IMPORT';

export interface ValidationRequest {
  id: string;
  reference: string;
  submittedAt: string;
  paymentAmount: string;
  applicantType: 'EXPORTATEUR' | 'IMPORTATEUR';
  applicantName: string;
  type: RequestType;
  status: DemandeStatus;
  decisionComment?: string;
  documents: AttachedDocument[];
  products?: Product[];
  importDetails?: ImportDetails;
  validationStatuses?: any;
}

interface InstructionModalProps {
  request: ValidationRequest;
  onClose: () => void;
  onDecision: (decision: DemandeStatus, updatedRequest: ValidationRequest, comment?: string) => void;
  readOnly?: boolean;
  currentStructureName?: string;
}



const filterProductsByInstance = (products: Product[], structureName: string): Product[] => {
  if (!structureName || !products) return products || [];
  
  // Si c'est le Ministère de la Santé -> seulement produits ALIMENTAIRE
  if (structureName.includes('Santé') || structureName.includes('INSSPA') || structureName.includes('ANMPS')) {
    return products.filter(p => p.productType === 'ALIMENTAIRE');
  }
  
  // Si c'est le Ministère de l'Industrie -> seulement produits INDUSTRIEL
  if (structureName.includes('Industrie') || structureName.includes('ANME')) {
    return products.filter(p => p.productType === 'INDUSTRIEL');
  }
  
  // Ministère du Commerce -> tous les produits
  return products;
};

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080/api';

const InstructionModal: React.FC<InstructionModalProps> = ({ request, onClose, onDecision, readOnly = false,currentStructureName = ''  }) => {
  const [localRequest, setLocalRequest] = React.useState<ValidationRequest>({ ...request });
  const [previewDoc, setPreviewDoc] = React.useState<AttachedDocument | null>(null);
  const [zoom, setZoom] = React.useState(1);
  const [loading, setLoading] = React.useState(false);
  const [decisionComment, setDecisionComment] = React.useState('');
  const [confirmationDecision, setConfirmationDecision] = React.useState<DemandeStatus| null>(null);

  const filteredProducts = filterProductsByInstance(localRequest.products || [], currentStructureName);
  // Filtrer les documents
  const filteredDocuments = filterDocumentsByInstance(localRequest.documents, currentStructureName);
  
  // Afficher le nombre de documents masqués
  const hiddenDocsCount = localRequest.documents.length - filteredDocuments.length;

  const isSubmitting = React.useRef(false);
  let callCounter = 0;

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.2, 2));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.2, 0.5));

  const handleUpdateDocStatus = async (docId: string, status: DocStatus, comment?: string) => {
    if (loading || isSubmitting.current) return;
    
    const updatedDocs = localRequest.documents.map(doc => 
      doc.id === docId ? { ...doc, status, comment } : doc
    );
    setLocalRequest({ ...localRequest, documents: updatedDocs });
    
    try {
      const token = localStorage.getItem('token');
      let backendStatus = '';
      switch (status) {
        case 'ACCEPTED': backendStatus = 'VALIDE'; break;
        case 'REJECTED': backendStatus = 'REJETE'; break;
        case 'NOT_SURE': backendStatus = 'A_COMPLETER'; break;
        default: return;
      }
      
      await axios.post(`${API_BASE_URL}/validation/documents/${docId}/validate`,
        { status: backendStatus, comment: comment || '' },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      console.log(`Document ${docId} validé avec statut ${backendStatus}`);
    } catch (error) {
      console.error('Erreur lors de la validation du document:', error);
      setLocalRequest({ ...localRequest });
      alert('Erreur lors de la validation du document');
    }
  };

  const handleAutoValidateAll = () => {
    if (loading || isSubmitting.current) return;
    const updatedDocs = localRequest.documents.map(doc => ({ ...doc, status: 'ACCEPTED' as DocStatus }));
    setLocalRequest({ ...localRequest, documents: updatedDocs });
  };

  const getRecommendation = () => {
    const allAccepted = localRequest.documents.every(d => d.status === 'ACCEPTED');
    const anyRejected = localRequest.documents.some(d => d.status === 'REJECTED');
    const anyNotSure = localRequest.documents.some(d => d.status === 'NOT_SURE');

    if (allAccepted) return DemandeStatus.VALIDEE;
    if (anyNotSure) return DemandeStatus.EN_ATTENTE_INFO;
    if (anyRejected) return DemandeStatus.REJETEE;
    return null;
  };

  const recommendation = getRecommendation();
  const allDocumentsReviewed = !localRequest.documents.some(d => d.status === 'PENDING');
  const hasRejected = localRequest.documents.some(d => d.status === 'REJECTED');
  const hasNotSure = localRequest.documents.some(d => d.status === 'NOT_SURE');
  const allAccepted = localRequest.documents.every(d => d.status === 'ACCEPTED');

  let activeButton: DemandeStatus | null = null;
  if (allDocumentsReviewed) {
    if (hasRejected) {
      activeButton = DemandeStatus.REJETEE;
    } else if (hasNotSure) {
      activeButton = DemandeStatus.EN_ATTENTE_INFO;
    } else if (allAccepted) {
      activeButton = DemandeStatus.VALIDEE;
    }
  }

  const handleDecisionClick = (decision: DemandeStatus) => {
    if (loading || isSubmitting.current) return;
    setConfirmationDecision(decision);
  };

  const confirmDecision = async () => {
    const callId = ++callCounter;
    
    if (!confirmationDecision) return;
    if (loading || isSubmitting.current) return;
    
    isSubmitting.current = true;
    setLoading(true);
    
    try {
      const decision = confirmationDecision;
      setConfirmationDecision(null);
      await handleFinalDecision(decision, localRequest, callId);
    } catch (error) {
      console.error(`Erreur:`, error);
      isSubmitting.current = false;
      setLoading(false);
    }
  };

  const handleViewDocument = async (doc: AttachedDocument) => {
  if (loading || isSubmitting.current) return;
  
  if (!doc.fileUrl) {
    console.error('No file URL for document:', doc);
    alert('URL du document non disponible');
    return;
  }
  
  console.log('🔍 URL originale du document:', doc.fileUrl);
  
  let correctedUrl = doc.fileUrl;
  if (correctedUrl.includes('/api/api/')) {
    correctedUrl = correctedUrl.replace('/api/api/', '/api/');
  }
  
  // 🔥 Assurez-vous que l'URL commence par http
  if (!correctedUrl.startsWith('http')) {
    correctedUrl = `http://localhost:8080${correctedUrl}`;
  }
  
  console.log('🔍 URL corrigée:', correctedUrl);
  
  setPreviewDoc(doc);
  try {
    const token = localStorage.getItem('token');
    console.log('🔑 Token présent:', !!token);
    
    const response = await axios.get(correctedUrl, {
      headers: { 
        Authorization: `Bearer ${token}`,
        'Accept': 'application/pdf,image/*,*/*'
      },
      responseType: 'blob'
    });
    
    console.log('✅ Document récupéré, taille:', response.data.size);
    
    const blobUrl = URL.createObjectURL(response.data);
    setPreviewDoc({ ...doc, fileUrl: blobUrl });
  } catch (error) {
    console.error('❌ Error fetching document:', error);
    if (axios.isAxiosError(error)) {
      console.error('Status:', error.response?.status);
      console.error('Message:', error.response?.data);
      if (error.response?.status === 403) {
        alert('Accès non autorisé au document. Vérifiez vos permissions.');
      } else if (error.response?.status === 404) {
        alert('Document non trouvé. Vérifiez que le document existe.');
      } else {
        alert(`Erreur lors du chargement du document: ${error.message}`);
      }
    } else {
      alert('Erreur lors du chargement du document');
    }
  }
};


  const handleFinalDecision = async (decision: DemandeStatus, updatedRequest: ValidationRequest, callId?: number) => {
    try {
      const token = localStorage.getItem('token');
      let endpoint = '';
      
      if (decision === DemandeStatus.VALIDEE) {
        endpoint = `${API_BASE_URL}/validation/demandes/${request.id}/approve`;
      } else if (decision === DemandeStatus.REJETEE) {
        endpoint = `${API_BASE_URL}/validation/demandes/${request.id}/reject`;
      } else {
        endpoint = `${API_BASE_URL}/validation/demandes/${request.id}/request-info`;
      }
      
      await axios.post(endpoint, 
        { comment: decisionComment },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      onDecision(decision, updatedRequest, decisionComment);
      onClose();
      
    } catch (error) {
      console.error(`Erreur API:`, error);
      if (axios.isAxiosError(error)) {
        alert(`Erreur: ${error.response?.data?.message || error.message}`);
      } else {
        alert('Erreur lors de la soumission de la décision');
      }
      throw error;
    } finally {
      isSubmitting.current = false;
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-white w-full max-w-6xl max-h-[90vh] rounded-[3rem] shadow-2xl overflow-hidden flex flex-col"
      >
        {/* Modal Header */}
        <div className="p-8 border-b border-slate-50 bg-slate-50/30 flex justify-between items-center">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <span className="px-3 py-1 bg-tunisia-red text-white rounded-full text-[8px] font-black uppercase tracking-widest">Instruction</span>
              <h3 className="text-2xl font-black italic text-slate-900 uppercase tracking-tighter">{localRequest.reference}</h3>
              {currentStructureName && (
                <span className="px-2 py-1 bg-slate-100 rounded-lg text-[8px] font-black text-slate-500">
                  <i className="fas fa-filter mr-1"></i>
                  {currentStructureName.includes('Santé') ? 'Alimentaire uniquement' : 
                   currentStructureName.includes('Industrie') ? 'Industriel uniquement' : 
                   'Tous produits'}
                </span>
              )}
            </div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{localRequest.applicantName} ({localRequest.applicantType})</p>
          </div>
          <button 
            onClick={onClose}
            disabled={loading || isSubmitting.current}
            className="w-12 h-12 rounded-full bg-white border border-slate-100 flex items-center justify-center text-slate-400 hover:text-tunisia-red transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <i className="fas fa-times"></i>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-10 space-y-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            {/* Left Column: Details */}
            <div className="space-y-8">
              {/* PRODUCT DECLARATION - Style comme le premier code */}
              {(localRequest.type === 'PRODUCT_DECLARATION' || localRequest.type === 'REGISTRATION') && localRequest.products && localRequest.products.length > 0 && (
                <div className="space-y-6">
                  <h4 className="text-sm font-black italic text-slate-900 uppercase tracking-tight flex items-center gap-2">
                    <i className="fas fa-box-open text-tunisia-red"></i> Liste des Produits
                  </h4>
                  <div className="space-y-4">
                    {filteredProducts.map((p, idx) => (
                      <div key={idx} className="p-6 bg-slate-50 rounded-3xl border border-slate-100 space-y-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${
                              p.productType === 'ALIMENTAIRE' ? 'bg-red-50 text-tunisia-red' : 'bg-blue-50 text-blue-600'
                            }`}>
                              {p.productType === 'ALIMENTAIRE' ? 'Alimentaire' : 'Industriel'}
                            </span>
                            <h5 className="text-sm font-black text-slate-900 uppercase tracking-tight mt-2 italic">{p.productName}</h5>
                          </div>
                          <div className="text-right">
                            <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Code HS / NGP</div>
                            <div className="text-xs font-bold text-slate-900">{p.hsCode}</div>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-[10px]">
                          <div>
                            <span className="text-slate-400 font-bold uppercase tracking-widest block mb-1">Catégorie</span>
                            <span className="font-bold text-slate-700">{p.category}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 font-bold uppercase tracking-widest block mb-1">Pays d'Origine</span>
                            <span className="font-bold text-slate-700">{p.originCountry}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 font-bold uppercase tracking-widest block mb-1">Marque Commerciale</span>
                            <span className="font-bold text-indigo-600">{p.commercialBrandName || p.brandName || 'N/A'}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 font-bold uppercase tracking-widest block mb-1">État du Produit</span>
                            <span className="font-bold text-slate-700">{p.productState || 'N/A'}</span>
                          </div>
                          {p.productType === 'ALIMENTAIRE' && (
                            <div>
                              <span className="text-slate-400 font-bold uppercase tracking-widest block mb-1">Quantité Annuelle</span>
                              <span className="font-bold text-slate-900">{p.annualQuantityValue} {p.annualQuantityUnit}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* IMPORT Details - Style comme le premier code */}
              {localRequest.type === 'IMPORT' && localRequest.importDetails && (
                <div className="space-y-6">
                  <h4 className="text-sm font-black italic text-slate-900 uppercase tracking-tight flex items-center gap-2">
                    <i className="fas fa-file-invoice-dollar text-tunisia-red"></i> Détails de l'Importation
                  </h4>
                  <div className="bg-slate-900 text-white p-8 rounded-[2.5rem] shadow-xl space-y-6">
                    <div className="grid grid-cols-2 gap-8">
                      <div>
                        <p className="text-[8px] font-black uppercase tracking-widest text-slate-500 mb-1">Facture N°</p>
                        <p className="text-sm font-black italic tracking-tight">{localRequest.importDetails.invoiceNum || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-[8px] font-black uppercase tracking-widest text-slate-500 mb-1">Date Facture</p>
                        <p className="text-sm font-black italic tracking-tight">{localRequest.importDetails.invoiceDate || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-[8px] font-black uppercase tracking-widest text-slate-500 mb-1">Montant</p>
                        <p className="text-xl font-black italic tracking-tighter text-emerald-400">{localRequest.importDetails.amount} {localRequest.importDetails.currency}</p>
                      </div>
                      <div>
                        <p className="text-[8px] font-black uppercase tracking-widest text-slate-500 mb-1">Incoterm</p>
                        <p className="text-sm font-black italic tracking-tight">{localRequest.importDetails.incoterm || 'N/A'}</p>
                      </div>
                    </div>
                    <div className="h-px bg-white/10 w-full"></div>
                    <div className="grid grid-cols-2 gap-8">
                      <div>
                        <p className="text-[8px] font-black uppercase tracking-widest text-slate-500 mb-1">Transport</p>
                        <p className="text-sm font-black italic tracking-tight flex items-center gap-2">
                          <i className={`fas ${localRequest.importDetails.transportMode === 'SEA' ? 'fa-ship' : localRequest.importDetails.transportMode === 'AIR' ? 'fa-plane' : 'fa-truck'}`}></i>
                          {localRequest.importDetails.transportMode || 'N/A'}
                        </p>
                      </div>
                      <div>
                        <p className="text-[8px] font-black uppercase tracking-widest text-slate-500 mb-1">Arrivée Prévue</p>
                        <p className="text-sm font-black italic tracking-tight">{localRequest.importDetails.arrivalDate || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-[8px] font-black uppercase tracking-widest text-slate-500 mb-1">Port Chargement</p>
                        <p className="text-sm font-black italic tracking-tight">{localRequest.importDetails.departurePort || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-[8px] font-black uppercase tracking-widest text-slate-500 mb-1">Port Déchargement</p>
                        <p className="text-sm font-black italic tracking-tight">{localRequest.importDetails.arrivalPort || 'N/A'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* REGISTRATION Details - Style comme le premier code */}
              {localRequest.type === 'REGISTRATION' && (!localRequest.products || localRequest.products.length === 0) && (
                <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 space-y-6">
                  <h4 className="text-sm font-black italic text-slate-900 uppercase tracking-tight flex items-center gap-2">
                    <i className="fas fa-building text-tunisia-red"></i> Informations Demandeur
                  </h4>
                  <div className="space-y-4 text-[10px]">
                    <div className="flex justify-between border-b border-slate-50 pb-2">
                      <span className="text-slate-400 font-black uppercase tracking-widest">Type de demandeur</span>
                      <span className="font-black text-slate-900">{localRequest.applicantType === 'EXPORTATEUR' ? 'Exportateur' : 'Importateur'}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-50 pb-2">
                      <span className="text-slate-400 font-black uppercase tracking-widest">Raison Sociale</span>
                      <span className="font-black text-slate-900">{localRequest.applicantName}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-50 pb-2">
                      <span className="text-slate-400 font-black uppercase tracking-widest">Montant Payé</span>
                      <span className="font-black text-emerald-600">{localRequest.paymentAmount}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-50 pb-2">
                      <span className="text-slate-400 font-black uppercase tracking-widest">Date Soumission</span>
                      <span className="font-black text-slate-900">{localRequest.submittedAt}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Right Column: Documents */}
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-black italic text-slate-900 uppercase tracking-tight flex items-center gap-2">
                  <i className="fas fa-file-shield text-tunisia-red"></i> Documents Attachés
                </h4>
                {!readOnly && (
                  <button 
                    onClick={handleAutoValidateAll}
                    disabled={loading || isSubmitting.current}
                    className="px-4 py-2 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-xl text-[8px] font-black uppercase tracking-widest hover:bg-emerald-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <i className="fas fa-magic mr-1"></i> Validation Auto
                  </button>
                )}
              </div>

              <div className="space-y-4">
                {filteredDocuments.map((doc) => (
                  <div key={doc.id} className="p-6 bg-white rounded-3xl border border-slate-100 shadow-sm space-y-4">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400">
                          <i className="fas fa-file-pdf text-lg"></i>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-xs font-black text-slate-800 uppercase tracking-tight italic">{doc.name}</span>
                          <button 
                            onClick={() => handleViewDocument(doc)}
                            className="text-[8px] font-black text-tunisia-red uppercase tracking-widest hover:underline text-left"
                          >
                            <i className="fas fa-eye mr-1"></i> Consulter le document
                          </button>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {readOnly ? (
                          <div className={`px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest ${
                            doc.status === 'ACCEPTED' ? 'bg-emerald-50 text-emerald-500 border border-emerald-100' :
                            doc.status === 'REJECTED' ? 'bg-red-50 text-red-500 border border-red-100' :
                            'bg-amber-50 text-amber-500 border border-amber-100'
                          }`}>
                            {doc.status === 'ACCEPTED' ? 'VALIDÉ' : doc.status === 'REJECTED' ? 'REJETÉ' : 'EN ATTENTE'}
                          </div>
                        ) : (
                          <>
                            <button 
                              onClick={() => handleUpdateDocStatus(doc.id, 'ACCEPTED')}
                              disabled={loading || isSubmitting.current}
                              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all 
                                ${doc.status === 'ACCEPTED' ? 'bg-emerald-500 text-white' : 'bg-slate-50 text-slate-300 hover:text-emerald-500'} disabled:opacity-50 disabled:cursor-not-allowed`}
                            >
                              <i className="fas fa-check"></i>
                            </button>
                            <button 
                              onClick={() => handleUpdateDocStatus(doc.id, 'NOT_SURE')}
                              disabled={loading || isSubmitting.current}
                              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${doc.status === 'NOT_SURE' ? 'bg-amber-500 text-white' : 'bg-slate-50 text-slate-300 hover:text-amber-500'} disabled:opacity-50 disabled:cursor-not-allowed`}
                            >
                              <i className="fas fa-question"></i>
                            </button>
                            <button 
                              onClick={() => handleUpdateDocStatus(doc.id, 'REJECTED')}
                              disabled={loading || isSubmitting.current}
                              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${doc.status === 'REJECTED' ? 'bg-tunisia-red text-white' : 'bg-slate-50 text-slate-300 hover:text-tunisia-red'} disabled:opacity-50 disabled:cursor-not-allowed`}
                            >
                              <i className="fas fa-times"></i>
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {(doc.status === 'REJECTED' || doc.status === 'NOT_SURE') && !readOnly && (
                      <textarea 
                        placeholder="Pourquoi ? (Commentaire obligatoire)"
                        value={doc.comment || ''}
                        onChange={(e) => handleUpdateDocStatus(doc.id, doc.status, e.target.value)}
                        disabled={loading || isSubmitting.current}
                        className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-[10px] font-bold outline-none focus:border-tunisia-red transition-all h-16 resize-none disabled:opacity-50"
                      ></textarea>
                    )}
                  </div>
                ))}

                {hiddenDocsCount > 0 && !readOnly && (
                  <div className="p-3 bg-amber-50 rounded-xl text-center border border-amber-100">
                    <p className="text-[8px] font-bold text-amber-600">
                      <i className="fas fa-eye-slash mr-1"></i>
                      {hiddenDocsCount} document(s) non visible(s) car hors de votre périmètre
                    </p>
                  </div>
                )}
              </div>

              {/* Decision Comment Section */}
              {!readOnly && (
                <div className="mt-6 p-6 bg-slate-50 rounded-3xl border border-slate-100">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-3">
                    Commentaire général (optionnel)
                  </label>
                  <textarea
                    value={decisionComment}
                    onChange={(e) => setDecisionComment(e.target.value)}
                    disabled={loading || isSubmitting.current}
                    placeholder="Ajoutez un commentaire global pour cette décision..."
                    className="w-full p-4 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-tunisia-red transition-all h-24 resize-none disabled:opacity-50"
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-8 border-t border-slate-50 bg-slate-50/50 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              {readOnly ? 'Décision Finale :' : 'Recommandation Système :'}
            </div>
            {readOnly ? (
              <span className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border ${
                localRequest.status === 'VALIDEE' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                localRequest.status === 'REJETEE' ? 'bg-red-50 text-red-600 border-red-100' :
                'bg-amber-50 text-amber-600 border-amber-100'
              }`}>
                {localRequest.status === 'VALIDEE' ? 'Demande Acceptée' : localRequest.status === 'REJETEE' ? 'Demande Rejetée' : 'Compléments requis'}
              </span>
            ) : recommendation ? (
              <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                recommendation === DemandeStatus.VALIDEE ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                recommendation === DemandeStatus.REJETEE ? 'bg-red-50 text-red-600 border-red-100' :
                'bg-amber-50 text-amber-600 border-amber-100'
              }`}>
                {recommendation === DemandeStatus.VALIDEE ? 'Accepter' : recommendation === DemandeStatus.REJETEE ? 'Rejeter' : 'Plus d\'infos'}
              </span>
            ) : (
              <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest italic">En attente de revue...</span>
            )}
          </div>

          {!readOnly && (
            <div className="flex gap-4">
              <button 
                onClick={() => handleDecisionClick(DemandeStatus.EN_ATTENTE_INFO)}
                disabled={loading || isSubmitting.current || (allDocumentsReviewed && activeButton !== DemandeStatus.EN_ATTENTE_INFO)}
                className={`px-8 py-3 bg-white border-2 border-amber-500 text-amber-500 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-amber-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {loading ? 'Traitement...' : 'Demander plus d\'infos'}
              </button>
              <button 
                onClick={() => handleDecisionClick(DemandeStatus.REJETEE)}
                disabled={loading || isSubmitting.current || (allDocumentsReviewed && activeButton !== DemandeStatus.REJETEE)}
                className={`px-8 py-3 bg-white border-2 border-tunisia-red text-tunisia-red rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-red-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {loading ? 'Traitement...' : 'Rejeter Dossier'}
              </button>
              <button 
                onClick={() => handleDecisionClick(DemandeStatus.VALIDEE)}
                disabled={loading || isSubmitting.current || (allDocumentsReviewed && activeButton !== DemandeStatus.VALIDEE)}
                className={`px-8 py-3 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl hover:bg-black transition-all disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {loading ? 'Traitement...' : 'Valider Dossier'}
              </button>
            </div>
          )}
          
          {readOnly && (
            <button 
              onClick={onClose}
              className="px-10 py-3 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl hover:bg-black transition-all"
            >
              Fermer l'archive
            </button>
          )}
        </div>
      </motion.div>

      {/* Document Preview Overlay */}
      {/* Document Preview Overlay - Version avec affichage du dossier */}
<AnimatePresence>
  {previewDoc && (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[110] bg-slate-900/90 backdrop-blur-md flex items-center justify-center p-10"
    >
      <div className="relative w-full max-w-4xl h-full flex flex-col">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-tunisia-red text-white flex items-center justify-center shadow-lg">
              <i className="fas fa-file-pdf text-xl"></i>
            </div>
            <div>
              <h4 className="text-xl font-black text-white uppercase italic tracking-tighter">{previewDoc.name}</h4>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Visualisation Sécurisée</p>
            </div>
          </div>
          <button 
            onClick={() => {
              if (previewDoc.fileUrl && previewDoc.fileUrl.startsWith('blob:')) {
                URL.revokeObjectURL(previewDoc.fileUrl);
              }
              setPreviewDoc(null);
            }}
            className="w-12 h-12 rounded-full bg-white/10 text-white hover:bg-white/20 transition-all flex items-center justify-center"
          >
            <i className="fas fa-times"></i>
          </button>
        </div>
        
        <div className="flex-1 bg-white rounded-[2rem] shadow-2xl overflow-hidden flex flex-col">
          <div className="p-4 bg-slate-100 border-b border-slate-200 flex justify-between items-center">
            <div className="flex gap-2">
              <button onClick={handleZoomIn} className="w-8 h-8 rounded-lg bg-white border border-slate-200 text-slate-400 flex items-center justify-center hover:text-slate-600 transition-all">
                <i className="fas fa-search-plus"></i>
              </button>
              <button onClick={handleZoomOut} className="w-8 h-8 rounded-lg bg-white border border-slate-200 text-slate-400 flex items-center justify-center hover:text-slate-600 transition-all">
                <i className="fas fa-search-minus"></i>
              </button>
              <button onClick={() => setZoom(1)} className="px-3 h-8 rounded-lg bg-white border border-slate-200 text-[8px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-all">
                Reset
              </button>
            </div>
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Zoom: {Math.round(zoom * 100)}%</div>
            {previewDoc.fileUrl && previewDoc.fileUrl.startsWith('blob:') && (
              <a href={previewDoc.fileUrl} download={previewDoc.name} className="w-8 h-8 rounded-lg bg-white border border-slate-200 text-slate-400 flex items-center justify-center hover:text-slate-600 transition-all">
                <i className="fas fa-download"></i>
              </a>
            )}
          </div>
          
          <div className="flex-1 p-12 overflow-y-auto bg-slate-200 flex justify-center">
            {previewDoc.fileUrl && previewDoc.fileUrl.startsWith('blob:') ? (
              <iframe src={previewDoc.fileUrl} className="w-full h-full min-h-[600px]" title={previewDoc.name} />
            ) : (
              <div 
                className="w-full max-w-2xl bg-white shadow-lg p-16 min-h-[1000px] relative transition-transform duration-200 origin-top"
                style={{ transform: `scale(${zoom})` }}
              >
                {/* En-tête officiel */}
                <div className="absolute top-10 right-10 opacity-10">
                  <i className="fas fa-shield-halved text-8xl"></i>
                </div>
                <div className="border-b-4 border-slate-900 pb-8 mb-12 flex justify-between items-start">
                  <div>
                    <h1 className="text-2xl font-black uppercase tracking-tighter italic mb-2">République Tunisienne</h1>
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Ministère du Commerce et de l'Exportation</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Document Officiel</p>
                    <p className="text-xs font-bold text-slate-900">REF: {localRequest.reference}</p>
                  </div>
                </div>
                
                {/* Contenu du document */}
                <div className="space-y-8">
                  <div className="text-center py-10 border-2 border-dashed border-slate-100 rounded-3xl">
                    <h2 className="text-xl font-black uppercase italic tracking-tight text-slate-900 mb-2">{previewDoc.name}</h2>
                    <div className="w-20 h-1 bg-tunisia-red mx-auto"></div>
                  </div>
                  
                  {/* Informations du demandeur */}
                  <div className="bg-slate-50 p-6 rounded-2xl space-y-3">
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">Informations du demandeur</h3>
                    <div className="grid grid-cols-2 gap-4 text-[10px]">
                      <div>
                        <span className="text-slate-400 font-black uppercase tracking-widest block">Type</span>
                        <span className="font-bold text-slate-900">{localRequest.applicantType === 'EXPORTATEUR' ? 'Exportateur' : 'Importateur'}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 font-black uppercase tracking-widest block">Nom / Raison Sociale</span>
                        <span className="font-bold text-slate-900">{localRequest.applicantName}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 font-black uppercase tracking-widest block">Date de soumission</span>
                        <span className="font-bold text-slate-900">{localRequest.submittedAt}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 font-black uppercase tracking-widest block">Montant payé</span>
                        <span className="font-bold text-emerald-600">{localRequest.paymentAmount}</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Détails du dossier selon le type */}
                  {localRequest.type === 'PRODUCT_DECLARATION' && localRequest.products && (
                    <div className="space-y-4">
                      <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">Produits déclarés</h3>
                      {filteredProducts.map((p, idx) => (
                        <div key={idx} className="border border-slate-100 rounded-xl p-4">
                          <div className="flex justify-between items-start mb-3">
                            <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${
                              p.productType === 'ALIMENTAIRE' ? 'bg-red-50 text-tunisia-red' : 'bg-blue-50 text-blue-600'
                            }`}>
                              {p.productType === 'ALIMENTAIRE' ? 'Alimentaire' : 'Industriel'}
                            </span>
                            <span className="text-[8px] font-black text-slate-400">HS Code: {p.hsCode}</span>
                          </div>
                          <p className="font-bold text-slate-900 mb-2">{p.productName}</p>
                          <div className="grid grid-cols-2 gap-2 text-[9px]">
                            <div><span className="text-slate-400">Catégorie:</span> {p.category}</div>
                            <div><span className="text-slate-400">Origine:</span> {p.originCountry}</div>
                            <div><span className="text-slate-400">Marque:</span> {p.commercialBrandName || p.brandName || 'N/A'}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {localRequest.type === 'IMPORT' && localRequest.importDetails && (
                    <div className="space-y-4">
                      <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">Détails de l'importation</h3>
                      <div className="bg-slate-900 text-white p-6 rounded-2xl">
                        <div className="grid grid-cols-2 gap-4 text-[10px]">
                          <div><span className="text-slate-400">Facture N°</span><br/>{localRequest.importDetails.invoiceNum}</div>
                          <div><span className="text-slate-400">Date</span><br/>{localRequest.importDetails.invoiceDate}</div>
                          <div><span className="text-slate-400">Montant</span><br/>{localRequest.importDetails.amount} {localRequest.importDetails.currency}</div>
                          <div><span className="text-slate-400">Incoterm</span><br/>{localRequest.importDetails.incoterm}</div>
                          <div><span className="text-slate-400">Transport</span><br/>{localRequest.importDetails.transportMode}</div>
                          <div><span className="text-slate-400">Arrivée</span><br/>{localRequest.importDetails.arrivalDate}</div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Signature */}
                  <div className="pt-20 flex justify-end">
                    <div className="w-40 h-20 border-2 border-dashed border-slate-200 rounded-xl flex items-center justify-center italic text-[9px] text-slate-300">
                      Signature et cachet
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  )}
</AnimatePresence>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {confirmationDecision && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white w-full max-w-md rounded-[2.5rem] p-10 shadow-2xl text-center space-y-8"
            >
              <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto text-3xl ${
                confirmationDecision === DemandeStatus.VALIDEE ? 'bg-emerald-50 text-emerald-500' :
                confirmationDecision === DemandeStatus.REJETEE ? 'bg-red-50 text-tunisia-red' :
                'bg-amber-50 text-amber-500'
              }`}>
                <i className={`fas ${
                  confirmationDecision === DemandeStatus.VALIDEE ? 'fa-check-circle' :
                  confirmationDecision === DemandeStatus.REJETEE ? 'fa-times-circle' :
                  'fa-question-circle'
                }`}></i>
              </div>
              
              <div className="space-y-4">
                <h3 className="text-2xl font-black italic text-slate-900 uppercase tracking-tighter">Êtes-vous sûr ?</h3>
                <p className="text-xs font-bold text-slate-500 leading-relaxed">
                  {!allDocumentsReviewed && (
                    <>Certains documents n'ont pas encore été vérifiés.<br /></>
                  )}
                  <span className="text-slate-900">
                    {!allDocumentsReviewed ? (
                      <>Si vous continuez, tous les documents en attente seront 
                      {confirmationDecision === DemandeStatus.VALIDEE ? ' ACCEPTÉS' : 
                       confirmationDecision === DemandeStatus.REJETEE ? ' REJETÉS' : 
                       ' marqués comme NÉCESSITANT PLUS D\'INFOS'}.</>
                    ) : (
                      <>Voulez-vous vraiment {confirmationDecision === DemandeStatus.VALIDEE ? 'accepter' : confirmationDecision === DemandeStatus.REJETEE ? 'rejeter' : 'demander plus d\'informations pour'} ce dossier ?</>
                    )}
                  </span>
                </p>
              </div>

              <div className="flex flex-col gap-3">
                <button 
                  onClick={confirmDecision}
                  disabled={loading || isSubmitting.current}
                  className={`w-full py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white shadow-lg transition-all ${
                    confirmationDecision === DemandeStatus.VALIDEE ? 'bg-emerald-500 hover:bg-emerald-600' :
                    confirmationDecision === DemandeStatus.REJETEE ? 'bg-tunisia-red hover:bg-red-600' :
                    'bg-amber-500 hover:bg-amber-600'
                  } disabled:opacity-50`}
                >
                  {loading ? 'Traitement en cours...' : `Confirmer et ${confirmationDecision === DemandeStatus.VALIDEE ? 'Accepter' : confirmationDecision === DemandeStatus.REJETEE ? 'Rejeter' : 'Demander plus d\'infos'}`}
                </button>
                <button 
                  onClick={() => setConfirmationDecision(null)}
                  disabled={loading || isSubmitting.current}
                  className="w-full py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:bg-slate-50 transition-all disabled:opacity-50"
                >
                  Annuler et vérifier les documents
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default InstructionModal;