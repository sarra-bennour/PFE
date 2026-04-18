import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import axios from 'axios';
import { Product } from '@/types/Product';
import { ImportDetails } from '@/types/DemandeEnregistrement';

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
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'MORE_INFO';
  documents: AttachedDocument[];
  products?: Product[];
  importDetails?: ImportDetails;
}

interface InstructionModalProps {
  request: ValidationRequest;
  onClose: () => void;
  onDecision: (decision: 'APPROVED' | 'REJECTED' | 'MORE_INFO', updatedRequest: ValidationRequest, comment?: string) => void;
}

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080/api';

const InstructionModal: React.FC<InstructionModalProps> = ({ request, onClose, onDecision }) => {
  const [localRequest, setLocalRequest] = React.useState<ValidationRequest>({ ...request });
  const [previewDoc, setPreviewDoc] = React.useState<AttachedDocument | null>(null);
  const [zoom, setZoom] = React.useState(1);
  const [loading, setLoading] = React.useState(false);
  const [decisionComment, setDecisionComment] = React.useState('');
  const [confirmationDecision, setConfirmationDecision] = React.useState<'APPROVED' | 'REJECTED' | 'MORE_INFO' | null>(null);
  
  // 🔥 Ref pour suivre si une soumission est en cours
  const isSubmitting = React.useRef(false);
  // 🔥 Compteur pour tracer les appels
  let callCounter = 0;

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.2, 2));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.2, 0.5));

  const handleUpdateDocStatus = async (docId: string, status: DocStatus, comment?: string) => {
  if (loading || isSubmitting.current) return;
  
  // 🔥 Mettre à jour localement immédiatement (optimiste)
  const updatedDocs = localRequest.documents.map(doc => 
    doc.id === docId ? { ...doc, status, comment } : doc
  );
  setLocalRequest({ ...localRequest, documents: updatedDocs });
  
  // 🔥 Envoyer la validation au backend
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
    // 🔥 Revert local change on error
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

    if (allAccepted) return 'APPROVED';
    if (anyNotSure) return 'MORE_INFO';
    if (anyRejected) return 'REJECTED';
    return null;
  };

  const recommendation = getRecommendation();

  const allDocumentsReviewed = !localRequest.documents.some(d => d.status === 'PENDING');
  
  const hasRejected = localRequest.documents.some(d => d.status === 'REJECTED');
  const hasNotSure = localRequest.documents.some(d => d.status === 'NOT_SURE');
  const allAccepted = localRequest.documents.every(d => d.status === 'ACCEPTED');

  let activeButton: 'APPROVED' | 'REJECTED' | 'MORE_INFO' | null = null;
  if (allDocumentsReviewed) {
    if (hasRejected) {
      activeButton = 'REJECTED';
    } else if (hasNotSure) {
      activeButton = 'MORE_INFO';
    } else if (allAccepted) {
      activeButton = 'APPROVED';
    }
  }

  const handleDecisionClick = (decision: 'APPROVED' | 'REJECTED' | 'MORE_INFO') => {
    console.log('🔘 [handleDecisionClick]', { decision, loading, isSubmitting: isSubmitting.current });
    if (loading || isSubmitting.current) {
      console.log('⚠️ [handleDecisionClick] Bloqué - soumission en cours');
      return;
    }
    setConfirmationDecision(decision);
  };

  const confirmDecision = async () => {
  const callId = ++callCounter;
  console.log(`🚀 [confirmDecision #${callId}] DEBUT`, { 
    confirmationDecision, 
    loading, 
    isSubmitting: isSubmitting.current,
    timestamp: new Date().toISOString()
  });
  
  if (!confirmationDecision) {
    console.log(`❌ [confirmDecision #${callId}] Aucune décision à confirmer`);
    return;
  }
  
  if (loading || isSubmitting.current) {
    console.log(`⚠️ [confirmDecision #${callId}] SOUMISSION DÉJÀ EN COURS - IGNORÉE`);
    return;
  }
  
  isSubmitting.current = true;
  setLoading(true);
  console.log(`🔒 [confirmDecision #${callId}] Verrou acquis, début de la soumission`);
  
  try {
    // 🔥 NE PAS modifier les documents ici !
    // Le backend s'occupe de mettre à jour uniquement les documents PENDING
    
    const decision = confirmationDecision;
    setConfirmationDecision(null);
    
    console.log(`📤 [confirmDecision #${callId}] Appel de handleFinalDecision`);
    await handleFinalDecision(decision, localRequest, callId);
    
  } catch (error) {
    console.error(`💥 [confirmDecision #${callId}] Erreur:`, error);
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
    
    let correctedUrl = doc.fileUrl;
    if (correctedUrl.includes('/api/api/')) {
      correctedUrl = correctedUrl.replace('/api/api/', '/api/');
    }
    
    setPreviewDoc(doc);
    try {
      const token = localStorage.getItem('token');
      console.log('Fetching document from:', correctedUrl);
      
      const response = await axios.get(correctedUrl, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Accept': 'application/pdf,image/*,*/*'
        },
        responseType: 'blob'
      });
      
      const blobUrl = URL.createObjectURL(response.data);
      setPreviewDoc({ ...doc, fileUrl: blobUrl });
    } catch (error) {
      console.error('Error fetching document:', error);
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 403) {
          alert('Accès non autorisé au document. Vérifiez vos permissions.');
        } else if (error.response?.status === 404) {
          alert('Document non trouvé.');
        } else {
          alert(`Erreur lors du chargement du document: ${error.message}`);
        }
      } else {
        alert('Erreur lors du chargement du document');
      }
    }
  };

  const handleFinalDecision = async (decision: 'APPROVED' | 'REJECTED' | 'MORE_INFO', updatedRequest: ValidationRequest, callId?: number) => {
    const requestId = callId || ++callCounter;
    console.log(`🌐 [handleFinalDecision #${requestId}] DEBUT`, { decision, endpoint: '' });
    
    try {
      const token = localStorage.getItem('token');
      let endpoint = '';
      
      if (decision === 'APPROVED') {
        endpoint = `${API_BASE_URL}/validation/demandes/${request.id}/approve`;
        console.log(`📡 [handleFinalDecision #${requestId}] Appel API: POST ${endpoint}`);
      } else if (decision === 'REJECTED') {
        endpoint = `${API_BASE_URL}/validation/demandes/${request.id}/reject`;
        console.log(`📡 [handleFinalDecision #${requestId}] Appel API: POST ${endpoint}`);
      } else {
        endpoint = `${API_BASE_URL}/validation/demandes/${request.id}/request-info`;
        console.log(`📡 [handleFinalDecision #${requestId}] Appel API: POST ${endpoint}`);
      }
      
      console.log(`⏳ [handleFinalDecision #${requestId}] Envoi de la requête...`);
      
      const response = await axios.post(endpoint, 
        { comment: decisionComment },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      console.log(`✅ [handleFinalDecision #${requestId}] SUCCÈS API`, { status: response.status, data: response.data });
      
      console.log(`📞 [handleFinalDecision #${requestId}] Appel onDecision callback`);
      onDecision(decision, updatedRequest, decisionComment);
      
      console.log(`🚪 [handleFinalDecision #${requestId}] Fermeture du modal`);
      onClose();
      
    } catch (error) {
      console.error(`❌ [handleFinalDecision #${requestId}] ÉCHEC API:`, error);
      if (axios.isAxiosError(error)) {
        console.error(`   - Status: ${error.response?.status}`);
        console.error(`   - Message: ${error.response?.data?.message || error.message}`);
        alert(`Erreur: ${error.response?.data?.message || error.message}`);
      } else {
        alert('Erreur lors de la soumission de la décision');
      }
      throw error;
    } finally {
      console.log(`🔓 [handleFinalDecision #${requestId}] FIN - Nettoyage des verrous`);
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
            {/* Left Column: Details - inchangé */}
            <div className="space-y-8">
              {(localRequest.type === 'PRODUCT_DECLARATION' || localRequest.type === 'REGISTRATION') && localRequest.products && (
                <div className="space-y-6">
                  <h4 className="text-sm font-black italic text-slate-900 uppercase tracking-tight flex items-center gap-2">
                    <i className="fas fa-box-open text-tunisia-red"></i> Liste des Produits
                  </h4>
                  <div className="space-y-4">
                    {localRequest.products.map((p, idx) => (
                      <div key={idx} className="p-6 bg-slate-50 rounded-3xl border border-slate-100 space-y-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="text-[8px] font-black uppercase tracking-widest text-tunisia-red px-2 py-0.5 bg-red-50 rounded-full">{p.productType}</span>
                            <h5 className="text-sm font-black text-slate-900 uppercase tracking-tight mt-1 italic">{p.productName}</h5>
                          </div>
                          <div className="text-right">
                            <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">HSCODE</div>
                            <div className="text-xs font-bold text-slate-900">{p.ngp}</div>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-[10px]">
                          <div>
                            <span className="text-slate-400 font-bold uppercase tracking-widest block mb-1">Catégorie</span>
                            <span className="font-bold text-slate-700">{p.category}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 font-bold uppercase tracking-widest block mb-1">Pays Origine</span>
                            <span className="font-bold text-slate-700">{p.originCountry}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 font-bold uppercase tracking-widest block mb-1">Marque Commerciale</span>
                            <span className="font-bold text-slate-700">{p.brandName}</span>
                          </div>
                          {p.productType === 'ALIMENTAIRE' && (
                            <>
                              <div>
                                <span className="text-slate-400 font-bold uppercase tracking-widest block mb-1">État Produit</span>
                                <span className="font-bold text-slate-700">{p.productState}</span>
                              </div>
                              <div>
                                <span className="text-slate-400 font-bold uppercase tracking-widest block mb-1">Quantité Annuelle</span>
                                <span className="font-bold text-slate-700">{p.annualQuantityValue} {p.annualQuantityUnit}</span>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {localRequest.type === 'IMPORT' && localRequest.importDetails && (
                <div className="space-y-6">
                  <h4 className="text-sm font-black italic text-slate-900 uppercase tracking-tight flex items-center gap-2">
                    <i className="fas fa-file-invoice-dollar text-tunisia-red"></i> Détails de l'Importation
                  </h4>
                  <div className="bg-slate-900 text-white p-8 rounded-[2.5rem] shadow-xl space-y-6">
                    <div className="grid grid-cols-2 gap-8">
                      <div>
                        <p className="text-[8px] font-black uppercase tracking-widest text-slate-500 mb-1">Facture N°</p>
                        <p className="text-sm font-black italic tracking-tight">{localRequest.importDetails.invoiceNum}</p>
                      </div>
                      <div>
                        <p className="text-[8px] font-black uppercase tracking-widest text-slate-500 mb-1">Date Facture</p>
                        <p className="text-sm font-black italic tracking-tight">{localRequest.importDetails.invoiceDate}</p>
                      </div>
                      <div>
                        <p className="text-[8px] font-black uppercase tracking-widest text-slate-500 mb-1">Montant</p>
                        <p className="text-xl font-black italic tracking-tighter text-emerald-400">{localRequest.importDetails.amount} {localRequest.importDetails.currency}</p>
                      </div>
                      <div>
                        <p className="text-[8px] font-black uppercase tracking-widest text-slate-500 mb-1">Incoterm</p>
                        <p className="text-sm font-black italic tracking-tight">{localRequest.importDetails.incoterm}</p>
                      </div>
                    </div>
                    <div className="h-px bg-white/10 w-full"></div>
                    <div className="grid grid-cols-2 gap-8">
                      <div>
                        <p className="text-[8px] font-black uppercase tracking-widest text-slate-500 mb-1">Transport</p>
                        <p className="text-sm font-black italic tracking-tight flex items-center gap-2">
                          <i className={`fas ${localRequest.importDetails.transportMode === 'SEA' ? 'fa-ship' : 'fa-plane'}`}></i>
                          {localRequest.importDetails.transportMode}
                        </p>
                      </div>
                      <div>
                        <p className="text-[8px] font-black uppercase tracking-widest text-slate-500 mb-1">Arrivée Prévue</p>
                        <p className="text-sm font-black italic tracking-tight">{localRequest.importDetails.arrivalDate}</p>
                      </div>
                      <div>
                        <p className="text-[8px] font-black uppercase tracking-widest text-slate-500 mb-1">Port Départ</p>
                        <p className="text-sm font-black italic tracking-tight">{localRequest.importDetails.departurePort}</p>
                      </div>
                      <div>
                        <p className="text-[8px] font-black uppercase tracking-widest text-slate-500 mb-1">Port Arrivée</p>
                        <p className="text-sm font-black italic tracking-tight">{localRequest.importDetails.arrivalPort}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {localRequest.type === 'REGISTRATION' && !localRequest.products && (
                <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 space-y-6">
                  <h4 className="text-sm font-black italic text-slate-900 uppercase tracking-tight">Informations Demandeur</h4>
                  <div className="space-y-4 text-[10px]">
                    <div className="flex justify-between border-b border-slate-50 pb-2">
                      <span className="text-slate-400 font-black uppercase tracking-widest">Type</span>
                      <span className="font-black text-slate-900">{localRequest.applicantType}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-50 pb-2">
                      <span className="text-slate-400 font-black uppercase tracking-widest">Nom</span>
                      <span className="font-black text-slate-900">{localRequest.applicantName}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-50 pb-2">
                      <span className="text-slate-400 font-black uppercase tracking-widest">Paiement</span>
                      <span className="font-black text-emerald-600">{localRequest.paymentAmount}</span>
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
                <button 
                  onClick={handleAutoValidateAll}
                  disabled={loading || isSubmitting.current}
                  className="px-4 py-2 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-xl text-[8px] font-black uppercase tracking-widest hover:bg-emerald-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <i className="fas fa-magic mr-1"></i> Validation Auto
                </button>
              </div>

              <div className="space-y-4">
                {localRequest.documents.map((doc) => (
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
                        <button 
                          onClick={() => handleUpdateDocStatus(doc.id, 'ACCEPTED')}
                          disabled={loading || isSubmitting.current}
                          className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${doc.status === 'ACCEPTED' ? 'bg-emerald-500 text-white' : 'bg-slate-50 text-slate-300 hover:text-emerald-500'} disabled:opacity-50 disabled:cursor-not-allowed`}
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
                      </div>
                    </div>

                    {(doc.status === 'REJECTED' || doc.status === 'NOT_SURE') && (
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
              </div>

              {/* Decision Comment Section */}
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
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-8 border-t border-slate-50 bg-slate-50/50 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Recommandation Système :</div>
            {recommendation ? (
              <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                recommendation === 'APPROVED' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                recommendation === 'REJECTED' ? 'bg-red-50 text-red-600 border-red-100' :
                'bg-amber-50 text-amber-600 border-amber-100'
              }`}>
                {recommendation === 'APPROVED' ? 'Accepter' : recommendation === 'REJECTED' ? 'Rejeter' : 'Plus d\'infos'}
              </span>
            ) : (
              <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest italic">En attente de revue...</span>
            )}
          </div>

          <div className="flex gap-4">
            <button 
              onClick={() => handleDecisionClick('MORE_INFO')}
              disabled={loading || isSubmitting.current || (allDocumentsReviewed && activeButton !== 'MORE_INFO')}
              className={`px-8 py-3 bg-white border-2 border-amber-500 text-amber-500 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-amber-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {loading ? 'Traitement...' : 'Demander plus d\'infos'}
            </button>
            <button 
              onClick={() => handleDecisionClick('REJECTED')}
              disabled={loading || isSubmitting.current || (allDocumentsReviewed && activeButton !== 'REJECTED')}
              className={`px-8 py-3 bg-white border-2 border-tunisia-red text-tunisia-red rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-red-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {loading ? 'Traitement...' : 'Rejeter Dossier'}
            </button>
            <button 
              onClick={() => handleDecisionClick('APPROVED')}
              disabled={loading || isSubmitting.current || (allDocumentsReviewed && activeButton !== 'APPROVED')}
              className={`px-8 py-3 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl hover:bg-black transition-all disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {loading ? 'Traitement...' : 'Valider Dossier'}
            </button>
          </div>
        </div>
      </motion.div>

      {/* Document Preview Overlay - inchangé */}
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
                    <button 
                      onClick={handleZoomIn}
                      className="w-8 h-8 rounded-lg bg-white border border-slate-200 text-slate-400 flex items-center justify-center hover:text-slate-600 transition-all"
                    >
                      <i className="fas fa-search-plus"></i>
                    </button>
                    <button 
                      onClick={handleZoomOut}
                      className="w-8 h-8 rounded-lg bg-white border border-slate-200 text-slate-400 flex items-center justify-center hover:text-slate-600 transition-all"
                    >
                      <i className="fas fa-search-minus"></i>
                    </button>
                    <button 
                      onClick={() => setZoom(1)}
                      className="px-3 h-8 rounded-lg bg-white border border-slate-200 text-[8px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-all"
                    >
                      Reset
                    </button>
                  </div>
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Zoom: {Math.round(zoom * 100)}%</div>
                  {previewDoc.fileUrl && previewDoc.fileUrl.startsWith('blob:') && (
                    <a 
                      href={previewDoc.fileUrl}
                      download={previewDoc.name}
                      className="w-8 h-8 rounded-lg bg-white border border-slate-200 text-slate-400 flex items-center justify-center hover:text-slate-600 transition-all"
                    >
                      <i className="fas fa-download"></i>
                    </a>
                  )}
                </div>
                <div className="flex-1 p-12 overflow-y-auto bg-slate-200 flex justify-center">
                  {previewDoc.fileUrl && previewDoc.fileUrl.startsWith('blob:') ? (
                    <iframe 
                      src={previewDoc.fileUrl}
                      className="w-full h-full min-h-[600px]"
                      title={previewDoc.name}
                    />
                  ) : (
                    <div 
                      className="w-full max-w-2xl bg-white shadow-lg p-16 min-h-[1000px] relative transition-transform duration-200 origin-top"
                      style={{ transform: `scale(${zoom})` }}
                    >
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
                      
                      <div className="space-y-8">
                        <div className="text-center py-10 border-2 border-dashed border-slate-100 rounded-3xl">
                          <h2 className="text-xl font-black uppercase italic tracking-tight text-slate-900 mb-2">{previewDoc.name}</h2>
                          <div className="w-20 h-1 bg-tunisia-red mx-auto"></div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-10">
                          <div className="space-y-4">
                            <div className="h-4 bg-slate-50 rounded-full w-3/4"></div>
                            <div className="h-4 bg-slate-50 rounded-full w-full"></div>
                            <div className="h-4 bg-slate-50 rounded-full w-5/6"></div>
                          </div>
                          <div className="space-y-4">
                            <div className="h-4 bg-slate-50 rounded-full w-full"></div>
                            <div className="h-4 bg-slate-50 rounded-full w-2/3"></div>
                            <div className="h-4 bg-slate-50 rounded-full w-full"></div>
                          </div>
                        </div>
                        
                        <div className="pt-20 space-y-6">
                          <div className="h-32 bg-slate-50 rounded-3xl w-full"></div>
                          <div className="flex justify-between items-end pt-20">
                            <div className="space-y-4">
                              <div className="h-4 bg-slate-50 rounded-full w-40"></div>
                              <div className="w-32 h-32 border-4 border-slate-50 rounded-2xl flex items-center justify-center text-slate-100">
                                <i className="fas fa-stamp text-5xl"></i>
                              </div>
                            </div>
                            <div className="text-right space-y-4">
                              <div className="h-4 bg-slate-50 rounded-full w-40 ml-auto"></div>
                              <div className="italic text-slate-300 font-serif text-4xl opacity-50">Signature</div>
                            </div>
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
                confirmationDecision === 'APPROVED' ? 'bg-emerald-50 text-emerald-500' :
                confirmationDecision === 'REJECTED' ? 'bg-red-50 text-tunisia-red' :
                'bg-amber-50 text-amber-500'
              }`}>
                <i className={`fas ${
                  confirmationDecision === 'APPROVED' ? 'fa-check-circle' :
                  confirmationDecision === 'REJECTED' ? 'fa-times-circle' :
                  'fa-question-circle'
                }`}></i>
              </div>
              
              <div className="space-y-4">
                <h3 className="text-2xl font-black italic text-slate-900 uppercase tracking-tighter">Êtes-vous sûr ?</h3>
                <p className="text-xs font-bold text-slate-500 leading-relaxed">
                  {!allDocumentsReviewed && (
                    <>
                      Certains documents n'ont pas encore été vérifiés. 
                      <br />
                    </>
                  )}
                  <span className="text-slate-900">
                    {!allDocumentsReviewed ? (
                      <>Si vous continuez, tous les documents en attente seront 
                      {confirmationDecision === 'APPROVED' ? ' ACCEPTÉS' : 
                       confirmationDecision === 'REJECTED' ? ' REJETÉS' : 
                       ' marqués comme NÉCESSITANT PLUS D\'INFOS'}.</>
                    ) : (
                      <>Voulez-vous vraiment {confirmationDecision === 'APPROVED' ? 'accepter' : confirmationDecision === 'REJECTED' ? 'rejeter' : 'demander plus d\'informations pour'} ce dossier ?</>
                    )}
                  </span>
                </p>
              </div>

              <div className="flex flex-col gap-3">
                <button 
                  onClick={confirmDecision}
                  disabled={loading || isSubmitting.current}
                  className={`w-full py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white shadow-lg transition-all ${
                    confirmationDecision === 'APPROVED' ? 'bg-emerald-500 hover:bg-emerald-600' :
                    confirmationDecision === 'REJECTED' ? 'bg-tunisia-red hover:bg-red-600' :
                    'bg-amber-500 hover:bg-amber-600'
                  } disabled:opacity-50`}
                >
                  {loading ? 'Traitement en cours...' : `Confirmer et ${confirmationDecision === 'APPROVED' ? 'Accepter' : confirmationDecision === 'REJECTED' ? 'Rejeter' : 'Demander plus d\'infos'}`}
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