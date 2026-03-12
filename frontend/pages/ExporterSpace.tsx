import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { GoogleGenAI } from '@google/genai';
import { useAuth } from '../App';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import FormAlert from '../components/FormAlert';
import PaymentForm from '../components/PaymentForm';

// Définition de l'interface pour les données KYC
interface KycData {
  rcCert: File | null;
  rcTranslation: File | null;
  rcLegalization: File | null;
  statutes: File | null;
  statutesTranslation: File | null;
  tinCert: File | null;
  passport: File | null;
  designationPV: File | null;
  solvencyCert: File | null;
  annualAccounts: File | null;
  externalAudit: File | null;
}

// Interface pour la réponse du dossier
interface DossierResponse {
  success: boolean;
  message: string;
  timestamp: string;
  hasDossier: boolean;
  demandeId?: number;
  status?: string;
  paymentStatus?: string;
  reference?: string;
  submittedAt?: string;
  requiresCompletion?: boolean;
  prochainesEtapes?: string[];
  exportateurInfo?: any;
  documentsCount?: number;
}

// Interface pour la réponse de création de PaymentIntent
interface CreatePaymentIntentResponse {
  clientSecret: string;
  paymentIntentId: string;
  demandeId: number;
  amount: number;
  currency: string;
  requiresAction: boolean;
}

// Interface pour la réponse de paiement
interface PaymentResult {
  success: boolean;
  message: string;
  transactionId?: string;
  paymentReference?: string;
  amount?: number;
  status?: string;
}

// Composant de nœud de pipeline style Jenkins
const PipelineNode = ({ label, status, isLast = false }: { 
  label: string, 
  status: 'pending' | 'processing' | 'success' | 'failure',
  isLast?: boolean
}) => {
  const configs = {
    pending: { color: 'bg-slate-100 text-slate-300', icon: 'fa-circle', line: 'bg-slate-100' },
    processing: { color: 'bg-blue-500 text-white shadow-lg shadow-blue-200', icon: 'fa-sync fa-spin', line: 'bg-slate-100' },
    success: { color: 'bg-emerald-500 text-white shadow-lg shadow-emerald-200', icon: 'fa-check', line: 'bg-emerald-500' },
    failure: { color: 'bg-tunisia-red text-white shadow-lg shadow-red-200', icon: 'fa-times', line: 'bg-emerald-500' },
  };
  const config = configs[status];

  return (
    <div className={`flex items-center ${isLast ? '' : 'flex-grow'}`}>
      <div className="flex flex-col items-center relative group">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-[10px] transition-all duration-500 z-10 ${config.color}`}>
          <i className={`fas ${config.icon}`}></i>
        </div>
        <div className="absolute -bottom-8 whitespace-nowrap text-center w-32 left-1/2 -translate-x-1/2">
          <span className="text-[8px] font-black uppercase tracking-widest text-slate-900 opacity-60 group-hover:opacity-100 transition-opacity">{label}</span>
        </div>
      </div>
      {!isLast && (
        <div className={`h-[2px] flex-grow mx-2 rounded-full transition-colors duration-1000 ${config.line}`}></div>
      )}
    </div>
  );
};

// Composant de téléchargement (Style Neo-Gov)
const FileUploadBox = ({ 
  label, 
  field, 
  value,
  onChange,
  required = true, 
  icon = "fa-file-upload" 
}: { 
  label: string, 
  field: keyof KycData, 
  value: File | null,
  onChange: (field: keyof KycData, file: File | null) => void,
  required?: boolean, 
  icon?: string 
}) => (
  <div className="relative group">
    <div className={`p-4 rounded-2xl border-2 border-dashed transition-all flex flex-col items-center justify-center gap-2 text-center min-h-[130px] ${
      value 
        ? 'border-emerald-500 bg-emerald-50/50' 
        : 'border-slate-200 bg-slate-50 hover:border-tunisia-red hover:bg-white'
    }`}>
      <input 
        type="file" 
        required={required && !value}
        onChange={(e) => onChange(field, e.target.files?.[0] || null)}
        className="absolute inset-0 opacity-0 cursor-pointer z-10"
      />
      <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-1 transition-transform group-hover:scale-110 ${
        value ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400 group-hover:text-tunisia-red group-hover:bg-red-50'
      }`}>
        <i className={`fas ${value ? 'fa-check' : icon}`}></i>
      </div>
      <span className={`text-[9px] font-black uppercase tracking-tight leading-none px-2 ${value ? 'text-emerald-700' : 'text-slate-600'}`}>
        {label} {required && <span className="text-tunisia-red ml-0.5">*</span>}
      </span>
      {value && (
        <div className="mt-1 flex items-center gap-1 max-w-full px-4">
          <span className="text-[8px] font-bold text-emerald-600 truncate italic">
            {value.name}
          </span>
          <button 
            type="button"
            onClick={(e) => { e.preventDefault(); onChange(field, null); }}
            className="text-emerald-800 hover:text-red-500 z-20"
          >
            <i className="fas fa-times-circle text-[10px]"></i>
          </button>
        </div>
      )}
    </div>
  </div>
);

const ExporterSpace: React.FC = () => {
  const { t } = useTranslation();
  const { user, updateUserStatus, dossierStatus, updateDossierStatus } = useAuth();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(false);
  const [dossierInfo, setDossierInfo] = useState<DossierResponse | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [selectedDoc, setSelectedDoc] = useState<any | null>(null);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [userQuestion, setUserQuestion] = useState('');
  
  const [showInvoice, setShowInvoice] = useState(false);
  const [showTerminal, setShowTerminal] = useState(false);
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);
  const [formError, setFormError] = useState('');
  
  // États pour les alertes de paiement
  const [paymentSuccess, setPaymentSuccess] = useState<PaymentResult | null>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  // Ref pour éviter les appels multiples
  const hasFetchedRef = useRef(false);

  const [kycData, setKycData] = useState<KycData>({
    rcCert: null,
    rcTranslation: null,
    rcLegalization: null,
    statutes: null,
    statutesTranslation: null,
    tinCert: null,
    passport: null,
    designationPV: null,
    solvencyCert: null,
    annualAccounts: null,
    externalAudit: null,
  });

  // Au début du composant
  useEffect(() => {
    const token = localStorage.getItem('token');
    
    if (token) {
      // Décoder le token pour voir son contenu
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const payload = JSON.parse(window.atob(base64));
    }
  }, []);

  const productDeclarations = [
    { 
      id: 'DEC-2026-0215', 
      product: 'Camembert Président 250g', 
      status: 'En cours de validation par les autorités', 
      date: '24/02/2026',
      ngp: '0406',
      category: 'Produits laitiers',
      history: [
        { event: 'Déclaration soumise le 24/02/2026', type: 'submission' }
      ]
    }
  ];

  // Fonction pour charger les données depuis le backend (encapsulée dans useCallback)
  const fetchDossierStatus = useCallback(async (forceRefresh = false) => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      // Utiliser d'abord le cache si disponible et pas de rafraîchissement forcé
      if (!forceRefresh && dossierStatus) {
        console.log('📋 Utilisation des statuts en cache:', dossierStatus);
        setDossierInfo({
          hasDossier: true,
          status: dossierStatus.demandeStatus,
          paymentStatus: dossierStatus.paymentStatus,
          demandeId: dossierStatus.demandeId,
          reference: dossierStatus.reference,
          success: true,
          message: '',
          timestamp: dossierStatus.lastUpdated
        } as DossierResponse);
        return;
      }

      // Sinon, appel API
      console.log('🌐 Appel API pour rafraîchir les statuts');
      const response = await axios.get('http://localhost:8080/api/exportateur/dossier/statut', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setDossierInfo(response.data);
      
      // Mettre à jour le cache dans useAuth
      if (response.data.hasDossier) {
        updateDossierStatus(
          response.data.status || '',
          response.data.paymentStatus || 'EN_ATTENTE',
          {
            demandeId: response.data.demandeId,
            reference: response.data.reference
          }
        );
      }
      
      // Mettre à jour le statut utilisateur en fonction du dossier
      if (response.data.hasDossier) {
        if (response.data.status === 'SOUMISE' || response.data.status === 'EN_ATTENTE_PAIEMENT') {
          updateUserStatus('PENDING_VERIFICATION');
        } else if (response.data.status === 'VALIDEE') {
          updateUserStatus('VERIFIED');
        } else if (response.data.status === 'BROUILLON') {
          updateUserStatus('PROFILE_INCOMPLETE');
        } else if (response.data.status === 'PAYEE') {
          updateUserStatus('PAYMENT_PENDING');
        }
      }
    } catch (error) {
      console.error('Erreur lors de la récupération du dossier:', error);
    }
  }, [dossierStatus, updateDossierStatus, updateUserStatus]);

  // Chargement initial - ne s'exécute qu'une fois
  useEffect(() => {
    if (user?.email && !hasFetchedRef.current) {
      hasFetchedRef.current = true;
      fetchDossierStatus();
    }
  }, [user?.email, fetchDossierStatus]);

  // Fonction pour rafraîchir les données (appelée manuellement)
  const refreshDossierData = useCallback(async () => {
    hasFetchedRef.current = false; // Réinitialiser pour forcer le rafraîchissement
    await fetchDossierStatus(true); // true = force refresh
  }, [fetchDossierStatus]);

  const handleFileChange = (field: keyof KycData, file: File | null) => {
    setKycData(prev => ({ ...prev, [field]: file }));
  };

  const handleKycSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const token = localStorage.getItem('token');
      const requestData = {
        produits: []
      };
      
      // 1. Créer le dossier
      const createResponse = await axios.post('http://localhost:8080/api/exportateur/dossier/creer', requestData, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const demandeId = createResponse.data.demandeId;

      // Stocker le demandeId dans dossierInfo localement
      setDossierInfo(prev => ({
        ...prev,
        demandeId: demandeId,
        hasDossier: true,
        status: 'BROUILLON'
      } as DossierResponse));

      // Mettre à jour le cache
      updateDossierStatus('BROUILLON', 'EN_ATTENTE', { demandeId });

      // 2. MAPPING CORRECT des types de documents
      const documentTypeMapping: Record<string, string> = {
        rcCert: 'RC_CERT',
        rcTranslation: 'RC_TRANSLATION',
        rcLegalization: 'RC_LEGALIZATION',
        statutes: 'STATUTES',
        statutesTranslation: 'STATUTES_TRANSLATION',
        tinCert: 'TIN_CERT',
        passport: 'PASSPORT',
        designationPV: 'DESIGNATION_PV',
        solvencyCert: 'SOLVENCY_CERT',
        annualAccounts: 'ANNUAL_ACCOUNTS',
        externalAudit: 'EXTERNAL_AUDIT'
      };

      // 3. Upload séquentiel des documents
      for (const [field, file] of Object.entries(kycData)) {
        if (file) {
          const documentType = documentTypeMapping[field];
          
          if (!documentType) {
            console.warn(`⚠️ Type de document non mappé pour ${field}`);
            continue;
          }
          
          const formData = new FormData();
          formData.append('file', file as File);
          formData.append('documentType', documentType);
          
          await axios.post(
            `http://localhost:8080/api/exportateur/dossier/${demandeId}/documents`, 
            formData,
            {
              headers: { 
                Authorization: `Bearer ${token}`,
                'Content-Type': 'multipart/form-data'
              }
            }
          );
        }
      }

      // 4. Soumettre le dossier
      await axios.post(`http://localhost:8080/api/exportateur/dossier/${demandeId}/soumettre`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Mettre à jour le statut
      setDossierInfo(prev => ({
        ...prev,
        status: 'SOUMISE'
      } as DossierResponse));

      // Mettre à jour le cache
      updateDossierStatus('SOUMISE', 'EN_ATTENTE', { demandeId });

      setShowInvoice(true);
      
    } catch (error: any) {
      console.error('❌ Erreur globale:', error);
      setPaymentError(error.message || 'Une erreur est survenue lors de la soumission du dossier');
    } finally {
      setLoading(false);
    }
  };

  const handleGoToTerminal = () => {
    setShowInvoice(false);
    setShowTerminal(true);
    // Reset des alertes
    setPaymentSuccess(null);
    setPaymentError(null);
  };

  // Fonction pour créer le PaymentIntent via le backend
  const handleCreatePaymentIntent = async () => {
  // Vérifier que demandeId existe
  if (!dossierInfo?.demandeId) {
    throw new Error('ID de demande non trouvé');
  }
  
  const token = localStorage.getItem('token');
  
  const response = await axios.post(
    'http://localhost:8080/api/stripe-payment/create-intent',
    {
      demandeId: dossierInfo.demandeId,
      successUrl: window.location.origin + '/payment-success',
      cancelUrl: window.location.origin + '/payment-cancel'
    },
    {
      headers: { 
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    }
  );
  
  setPaymentIntentId(response.data.paymentIntentId);
  
  // Retourner l'objet complet avec paymentIntentId et clientSecret
  return response.data;
};

  // Fonction pour traiter le paiement via le backend
  const handleProcessPayment = async (paymentIntentId: string, paymentDetails: any) => {
  const token = localStorage.getItem('token');
  
  // IMPORTANT: On envoie paymentMethodId (reçu du PaymentForm) au lieu des détails de la carte
  const paymentRequest = {
    paymentIntentId: paymentIntentId,
    demandeId: dossierInfo?.demandeId,
    paymentMethodId: paymentDetails.paymentMethodId, // Reçu du PaymentForm
    cardHolderName: paymentDetails.cardHolder,
    receiptEmail: paymentDetails.receiptEmail
  };
  
  console.log('💰 Envoi de la requête de paiement:', paymentRequest);
  
  // Appeler le backend pour confirmer le paiement
  const response = await axios.post(
    'http://localhost:8080/api/stripe-payment/confirm-payment',
    paymentRequest,
    {
      headers: { 
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    }
  );
  
  return response.data;
};

  // Fonction principale de paiement - maintenant utilisée par PaymentForm
  // Dans ExporterSpace.tsx, modifier la fonction handlePaymentSubmit

const handlePaymentSubmit = async (paymentDetails: any) => {
  setLoading(true);
  setPaymentError(null);
  setPaymentSuccess(null);
  
  try {
    // Vérifier que demandeId existe
    if (!dossierInfo?.demandeId) {
      setPaymentError('ID de demande non trouvé. Veuillez réessayer.');
      setLoading(false);
      return;
    }
    
    console.log('💰 Début du processus de paiement pour la demande:', dossierInfo.demandeId);
    
    // Étape 1: Créer le PaymentIntent
    const createIntentResponse = await handleCreatePaymentIntent();
    const paymentIntentId = createIntentResponse.paymentIntentId;
    
    if (!paymentIntentId) {
      throw new Error('Impossible de créer le PaymentIntent');
    }
    
    console.log('✅ PaymentIntent créé:', paymentIntentId);
    
    // Étape 2: Traiter le paiement avec le PaymentMethod ID
    const result = await handleProcessPayment(paymentIntentId, paymentDetails);
    
    if (result.success) {
      // Afficher l'alerte de succès
      setPaymentSuccess({
        success: true,
        message: 'Paiement effectué avec succès!',
        paymentReference: result.paymentReference || result.transactionId,
        amount: result.amount,
        status: result.status
      });

      updateUserStatus('PAYMENT_PENDING');
      
      setDossierInfo(prev => ({
        ...prev,
        status: 'EN_COURS_VALIDATION',
        paymentStatus: 'REUSSI'
      } as DossierResponse));

      updateDossierStatus('EN_COURS_VALIDATION', 'REUSSI', { 
        demandeId: dossierInfo?.demandeId 
      });
      
      await refreshDossierData();
      
      setTimeout(() => {
        setShowTerminal(false);
        setShowInvoice(false);
        setPaymentSuccess(null);
      }, 3000);
      
    } else {
      setPaymentError(result.message || 'Erreur de paiement');
    }
    
  } catch (error: any) {
    console.error('❌ Erreur détaillée:', error);
    
    if (error.response?.status === 401) {
      setPaymentError('Votre session a expiré. Veuillez vous reconnecter.');
      setTimeout(() => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }, 2000);
    } else if (error.response?.data) {
      // 🔴 CORRECTION IMPORTANTE ICI 🔴
      // Le backend renvoie { "error": "message" }
      const errorData = error.response.data;
      
      if (typeof errorData === 'string') {
        setPaymentError(errorData);
      } else if (errorData.error) {
        // Cas où le backend renvoie { "error": "message" }
        setPaymentError(errorData.error);
      } else if (errorData.message) {
        setPaymentError(errorData.message);
      } else if (errorData.userMessage) {
        // Si vous utilisez PaymentException avec userMessage
        setPaymentError(errorData.userMessage);
      } else {
        setPaymentError('Erreur de paiement. Veuillez réessayer.');
      }
      
      console.log('Détails de l\'erreur:', errorData);
    } else {
      setPaymentError(error.message || 'Erreur lors du paiement');
    }
  } finally {
    setLoading(false);
  }
};

  // MODIFICATION: Simplification de handlePayLater
  const handlePayLater = () => {
    // Fermer la facture
    setShowInvoice(false);
    setShowTerminal(false);
    
    // Pas besoin de rafraîchir, le cache est déjà à jour
  };

  const handleBackToInvoice = () => {
    setShowTerminal(false);
    setShowInvoice(true);
    setPaymentError(null);
    setPaymentSuccess(null);
  };

  const getRemainingDays = () => {
    if (!user?.submissionDate) return 15;
    const start = new Date(user.submissionDate).getTime();
    const now = new Date().getTime();
    const diff = Math.ceil((start + 15 * 24 * 60 * 60 * 1000 - now) / (1000 * 60 * 60 * 24));
    return Math.max(0, diff);
  };

  const handleAiHelpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userQuestion.trim()) return;
    setLoading(true);
    setIsAiModalOpen(false);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.REACT_APP_API_KEY || '' });
      const response = await ai.models.generateContent({
        model: 'gemini-2.0-flash-exp',
        contents: `En tant qu'expert en douane tunisienne, réponds : ${userQuestion}`,
      });
      setAiAnalysis(response.text || 'Erreur.');
      setUserQuestion('');
    } catch (err) {
      setAiAnalysis("Service indisponible.");
    } finally {
      setLoading(false);
    }
  };

  const mockDocuments = [
    { id: 1, name: "Registre de Commerce", status: 'Validé', date: '2025-05-10', history: [{ status: 'Validé', date: '2025-05-10', comment: 'Certificat authentifié.' }] },
    { id: 2, name: "Attestation TIN/VAT", status: 'En attente', date: '2025-05-12', history: [{ status: 'Soumis', date: '2025-05-12', comment: 'En attente.' }] },
  ];

  // --- RENDU : FACTURE PRO-FORMA ---
  if (showInvoice) {
    return (
      <div className="max-w-xl mx-auto py-8 px-4 animate-fade-in-scale">
        <div className="bg-white rounded-[2.5rem] shadow-[0_40px_100px_-20px_rgba(0,0,0,0.1)] border border-slate-100 overflow-hidden">
          <div className="p-8 bg-slate-50/50 border-b border-dashed border-slate-200 flex justify-between items-center">
            <div className="flex items-center gap-3">
               <img src="https://upload.wikimedia.org/wikipedia/commons/c/ce/Coat_of_arms_of_Tunisia.svg" alt="Coat of Arms" className="w-8 h-8 grayscale opacity-60" />
               <div className="flex flex-col">
                 <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">Ministère du Commerce</span>
                 <span className="text-[10px] font-black text-slate-800 uppercase tracking-tighter">République Tunisienne</span>
               </div>
            </div>
            <div className="text-right">
               <h2 className="text-sm font-black italic uppercase text-slate-900 tracking-tighter">Note Pro-Forma</h2>
               <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">N° {dossierInfo?.reference || 'TN-' + Math.floor(1000 + Math.random() * 9000)}</p>
            </div>
          </div>

          <div className="p-10 space-y-8">
            <div className="space-y-3">
              <h3 className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-400 mb-4 text-center">Récapitulatif des Frais</h3>
              <div className="space-y-1">
                {[
                  { label: "Vérification Douane", price: 200 },
                  { label: "Analyse Min. Commerce", price: 150 },
                  { label: "Émission NEE", price: 100 },
                  { label: "Base de données", price: 50 },
                ].map((item, i) => (
                  <div key={i} className="flex justify-between items-center py-3 border-b border-slate-50 last:border-0">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">{item.label}</span>
                    <span className="text-xs font-black text-slate-800 italic">{item.price},000 DT</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="py-6 px-8 bg-slate-50 rounded-[1.5rem] flex justify-between items-center border border-slate-100">
               <div className="flex flex-col">
                  <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">Net à payer</span>
                  <span className="text-[10px] font-bold text-slate-500">Total Global</span>
               </div>
               <span className="text-4xl font-black italic text-slate-900 tracking-tighter">500,000 <span className="text-lg">DT</span></span>
            </div>

            <div className="space-y-3 pt-4">
              <button 
                onClick={handleGoToTerminal}
                className="w-full py-4 bg-tunisia-red text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-red-500/10 hover:bg-red-700 transition-all active:scale-[0.98] text-[10px]"
              >
                Procéder au paiement
              </button>
              <button 
                onClick={handlePayLater}
                className="w-full py-3 text-slate-400 font-black uppercase tracking-widest text-[9px] hover:text-slate-900 transition-colors"
              >
                Payer plus tard
              </button>
            </div>
          </div>

          <div className="p-4 bg-slate-50/50 text-center border-t border-slate-100 italic text-[8px] text-slate-400 font-bold uppercase tracking-widest">
            Document généré automatiquement le {new Date().toLocaleDateString()}
          </div>
        </div>
      </div>
    );
  }

  // --- RENDU : TERMINAL DE PAIEMENT (Utilisation du composant PaymentForm) ---
  if (showTerminal) {
    return (
      <PaymentForm
        amount={500}
        onSubmit={handlePaymentSubmit}
        onBack={handleBackToInvoice}
        isLoading={loading}
        error={paymentError}
        success={paymentSuccess ? {
          message: paymentSuccess.message,
          amount: paymentSuccess.amount
        } : null}
      />
    );
  }

  // --- RENDU : PREMIÈRE CONNEXION / DOSSIER INCOMPLET ---
  if (!dossierStatus || user?.status === 'PROFILE_INCOMPLETE') {
    const requiredFields: (keyof KycData)[] = [
      'rcCert', 'rcTranslation', 'rcLegalization', 
      'statutes', 'statutesTranslation', 'tinCert', 
      'passport', 'designationPV', 
      'solvencyCert', 'annualAccounts'
    ];
    const filledFields = requiredFields.filter(f => kycData[f] !== null).length;
    const progress = (filledFields / requiredFields.length) * 100;

    return (
      <div className="max-w-5xl mx-auto py-8 px-4 animate-fade-in-scale">
        {/* ALERTE D'ERREUR POUR LA SOUMISSION DU DOSSIER */}
        {paymentError && (
          <div className="mb-6">
            <FormAlert 
              type="error"
              message={paymentError}
              onClose={() => setPaymentError(null)}
            />
          </div>
        )}

        <div className="mb-12">
          <div className="flex justify-between items-end mb-4">
            <div>
              <h2 className="text-4xl font-black text-slate-900 uppercase italic tracking-tighter">
                {!dossierInfo?.hasDossier ? "Dossier de Conformité" : "Compléter votre dossier"}
              </h2>
              <p className="text-slate-500 font-bold uppercase text-[10px] tracking-widest mt-1">
                {dossierInfo?.message || "Enregistrement obligatoire des documents"}
              </p>
            </div>
            <div className="text-right">
              <span className="text-2xl font-black italic text-tunisia-red tracking-tighter">{Math.round(progress)}%</span>
              <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">Progression</p>
            </div>
          </div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden shadow-inner">
            <div className="h-full bg-tunisia-red transition-all duration-700 ease-out" style={{ width: `${progress}%` }}></div>
          </div>
        </div>

        <form onSubmit={handleKycSubmit} className="space-y-12">
          <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-100 p-10">
            <div className="flex items-center gap-4 mb-10">
              <div className="w-12 h-12 bg-slate-900 text-white rounded-2xl flex items-center justify-center text-xl shadow-lg">
                <i className="fas fa-landmark"></i>
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-900 uppercase italic tracking-tighter">1. Identité de l'Entreprise</h3>
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Documents d'immatriculation et statuts</p>
              </div>
            </div>
            
            <div className="space-y-10">
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-[2px] flex-grow bg-slate-100"></div>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Registre du Commerce</span>
                  <div className="h-[2px] flex-grow bg-slate-100"></div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <FileUploadBox label="Certificat d'immatriculation" field="rcCert" value={kycData.rcCert} onChange={handleFileChange} icon="fa-id-card" />
                  <FileUploadBox label="Traduction FR/AR" field="rcTranslation" value={kycData.rcTranslation} onChange={handleFileChange} icon="fa-language" />
                  <FileUploadBox label="Légalisation Ambassade" field="rcLegalization" value={kycData.rcLegalization} onChange={handleFileChange} icon="fa-stamp" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] block mb-4">Statuts de la société</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FileUploadBox label="Acte Notarié" field="statutes" value={kycData.statutes} onChange={handleFileChange} icon="fa-file-contract" />
                    <FileUploadBox label="Traduction" field="statutesTranslation" value={kycData.statutesTranslation} onChange={handleFileChange} icon="fa-language" />
                  </div>
                </div>
                <div>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] block mb-4">Attestation Fiscale</span>
                  <FileUploadBox label="Certificat TIN/VAT" field="tinCert" value={kycData.tinCert} onChange={handleFileChange} icon="fa-receipt" />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-100 p-10">
            <div className="flex items-center gap-4 mb-10">
              <div className="w-12 h-12 bg-slate-900 text-white rounded-2xl flex items-center justify-center text-xl shadow-lg">
                <i className="fas fa-user-shield"></i>
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-900 uppercase italic tracking-tighter">2. Représentant Légal</h3>
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Identification de la gouvernance</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FileUploadBox label="Passeport (Scan)" field="passport" value={kycData.passport} onChange={handleFileChange} icon="fa-passport" />
              <FileUploadBox label="PV de désignation" field="designationPV" value={kycData.designationPV} onChange={handleFileChange} icon="fa-file-signature" />
            </div>
          </div>

          <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-100 p-10">
            <div className="flex items-center gap-4 mb-10">
              <div className="w-12 h-12 bg-slate-900 text-white rounded-2xl flex items-center justify-center text-xl shadow-lg">
                <i className="fas fa-file-invoice-dollar"></i>
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-900 uppercase italic tracking-tighter">3. Documents Financiers</h3>
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Garanties et santé financière</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <FileUploadBox label="Certif. Solvabilité" field="solvencyCert" value={kycData.solvencyCert} onChange={handleFileChange} icon="fa-university" />
              <FileUploadBox label="Bilans & Comptes" field="annualAccounts" value={kycData.annualAccounts} onChange={handleFileChange} icon="fa-chart-pie" />
              <FileUploadBox label="Audit Externe" field="externalAudit" required={false} value={kycData.externalAudit} onChange={handleFileChange} icon="fa-magnifying-glass-chart" />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading || progress < 100} 
            className={`w-full py-6 rounded-3xl font-black uppercase tracking-widest shadow-2xl transition-all flex items-center justify-center gap-3 ${
              progress < 100 
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed' 
                : 'bg-tunisia-red text-white hover:bg-red-700 active:scale-[0.98]'
            }`}
          >
            {loading ? <i className="fas fa-circle-notch animate-spin text-xl"></i> : <><i className="fas fa-paper-plane"></i> Finaliser et soumettre le dossier</>}
          </button>
        </form>
      </div>
    );
  }


  // --- RENDU : DASHBOARD PRINCIPAL (DOCUMENTS VALIDÉS OU DOSSIER SOUMIS EN ATTENTE DE PAIEMENT) ---
  const daysRemaining = getRemainingDays();
  
  // MODIFICATION: Nouvelle logique simplifiée pour la bannière
  // La bannière s'affiche si le dossier est soumis (SOUMISE) et que le paiement n'est pas encore fait
  const shouldShowPaymentBanner = 
    dossierInfo?.hasDossier && 
    dossierInfo?.status === 'SOUMISE';

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in-scale">
      <br/>
      
      {/* Bannière de paiement - Ne s'affiche que si nécessaire */}
      {shouldShowPaymentBanner && (
        <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-2xl flex flex-col md:flex-row items-center justify-between gap-8 border-4 border-tunisia-red/30 animate-fade-in-scale relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
             <i className="fas fa-clock text-[8rem] transform -rotate-12"></i>
          </div>
          <div className="flex items-center gap-8 relative z-10">
            <div className="flex flex-col items-center">
              <div className="text-5xl font-black italic text-tunisia-red tracking-tighter leading-none">{daysRemaining}</div>
              <span className="text-[8px] font-black uppercase tracking-widest text-slate-500 mt-1">Jours restants</span>
            </div>
            <div className="h-12 w-[1px] bg-slate-800 hidden md:block"></div>
            <div>
              <h3 className="text-xl font-black uppercase italic tracking-tighter leading-none">Régularisation financière requise</h3>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-2">Le dossier est suspendu en attente du règlement de 500 DT.</p>
            </div>
          </div>
          <button onClick={() => setShowInvoice(true)} className="bg-tunisia-red text-white px-10 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-red-900/20 hover:scale-105 active:scale-95 transition-all relative z-10">
            Payer maintenant
          </button>
        </div>
      )}

      <div className="flex flex-col md:flex-row justify-between items-center bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight italic uppercase">Dashboard Exportateur</h2>
          <div className="mt-1">
             {dossierInfo?.status === 'VALIDEE' || user?.status === 'VERIFIED' ? (
                <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest flex items-center gap-2">
                   <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                   Profil Vérifié & Agréé
                </p>
             ) : (
                <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest flex items-center gap-2">
                   <i className="fas fa-exclamation-triangle"></i>
                   {dossierInfo?.status || "Profil Non Vérifié"}
                </p>
             )}
          </div>
        </div>
        <button onClick={() => setIsAiModalOpen(true)} className="mt-4 md:mt-0 bg-slate-900 text-white px-6 py-3 rounded-2xl flex items-center text-[10px] font-black uppercase tracking-widest shadow-lg hover:bg-black transition-all">
          <i className="fas fa-robot mr-2"></i> Support Expert IA
        </button>
      </div>
      
      {/* HERO SECTION : DÉCLARATIONS DE PRODUITS - Ne s'affiche que si le dossier est validé */}
      {dossierInfo?.status === 'VALIDEE' ? (
        <div className="bg-white p-10 rounded-[3rem] shadow-2xl border border-slate-100 relative overflow-hidden">
          <div className="absolute -right-20 -top-20 opacity-[0.03] pointer-events-none">
            <i className="fas fa-box-open text-[25rem] transform rotate-12"></i>
          </div>
          
          <div className="relative z-10">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
              <div>
                <h2 className="text-4xl font-black text-slate-900 tracking-tighter italic uppercase leading-none">Mes Déclarations</h2>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-3">Gestion des lots de marchandises en cours</p>
              </div>
              <div className="flex items-center gap-4 w-full md:w-auto">
                <button 
                  onClick={() => navigate('/declare-product')}
                  className="bg-tunisia-red text-white px-8 py-4 rounded-2xl shadow-xl shadow-red-500/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-3 group whitespace-nowrap"
                >
                  <i className="fas fa-plus-circle"></i>
                  <span className="text-[10px] font-black uppercase tracking-widest">Nouvelle</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
              <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100">
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-2">Total Déclarations</span>
                <div className="text-3xl font-black text-slate-900 italic tracking-tighter">01</div>
              </div>
              <div className="bg-amber-50 p-6 rounded-[2rem] border border-amber-100">
                <span className="text-[8px] font-black text-amber-600 uppercase tracking-widest block mb-2">En cours</span>
                <div className="text-3xl font-black text-amber-600 italic tracking-tighter">01</div>
              </div>
              <div className="bg-emerald-50 p-6 rounded-[2rem] border border-emerald-100">
                <span className="text-[8px] font-black text-emerald-600 uppercase tracking-widest block mb-2">Validées</span>
                <div className="text-3xl font-black text-emerald-600 italic tracking-tighter">00</div>
              </div>
            </div>

            <div className="space-y-4">
              <div 
                onClick={() => navigate('/declarations')}
                className="p-6 bg-slate-900 rounded-[2rem] flex items-center justify-between group cursor-pointer overflow-hidden relative"
              >
                 <div className="absolute inset-0 bg-tunisia-red translate-x-[-100%] group-hover:translate-x-0 transition-transform duration-500 opacity-10"></div>
                 <div className="flex items-center gap-4 relative z-10">
                    <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center border border-white/10">
                      <i className="fas fa-list-check text-white"></i>
                    </div>
                    <div>
                      <p className="text-sm font-black text-white uppercase italic tracking-tighter">Accéder au Registre Complet</p>
                      <p className="text-[9px] font-bold text-white/40 uppercase tracking-widest">Consultez, filtrez et suivez l'état de toutes vos déclarations</p>
                    </div>
                 </div>
                 <i className="fas fa-chevron-right text-white/20 group-hover:text-white transition-colors relative z-10"></i>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Message si le dossier n'est pas encore validé */
        <div className="bg-white p-10 rounded-[3rem] shadow-2xl border border-slate-100">
          <div className="text-center py-12">
            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <i className="fas fa-box-open text-3xl text-slate-400"></i>
            </div>
            <h3 className="text-2xl font-black text-slate-900 mb-3 uppercase italic tracking-tighter">Déclarations de produits</h3>
            <p className="text-slate-500 max-w-md mx-auto mb-2">
              La gestion des lots de marchandises sera disponible après la validation de votre dossier par le comité.
            </p>
            <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest">
              Statut actuel : {dossierInfo?.status === 'EN_COURS_VALIDATION' ? 'En cours de validation' : 'En attente de paiement'}
            </p>
          </div>
        </div>
      )}

      {/* PIPELINE DE STATUT TYPE JENKINS */}
      <div className="bg-white p-10 py-12 rounded-[2.5rem] shadow-xl border border-slate-100 animate-fade-in-scale">
        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-12 text-center">Pipeline de Conformité : {selectedDoc?.name || "Dossier Global"}</h3>
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <PipelineNode 
            label="Soumission" 
            status={selectedDoc ? 'success' : (dossierInfo?.hasDossier ? 'success' : 'processing')} 
          />
          <PipelineNode 
            label="Analyse IA" 
            status={selectedDoc ? (selectedDoc.status === 'Validé' ? 'success' : 'processing') : (dossierInfo?.status === 'SOUMISE' ? 'processing' : (dossierInfo?.status === 'VALIDEE' ? 'success' : 'pending'))} 
          />
          <PipelineNode 
            label="Validation" 
            status={selectedDoc ? (selectedDoc.status === 'Validé' ? 'success' : 'pending') : (dossierInfo?.status === 'VALIDEE' ? 'success' : 'pending')} 
          />
          <PipelineNode 
            label="Décision" 
            status={selectedDoc ? (selectedDoc.status === 'Validé' ? 'success' : 'pending') : (dossierInfo?.status === 'VALIDEE' ? 'success' : 'pending')} 
            isLast={true} 
          />
        </div>
        <br/>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8 bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100">
          <h3 className="text-xl font-black text-slate-900 uppercase italic tracking-tighter mb-8">Statut des Documents KYC</h3>
          <div className="space-y-4">
            {mockDocuments.map((doc) => (
              <div key={doc.id} onClick={() => setSelectedDoc(doc)} className={`p-6 rounded-3xl border-2 transition-all cursor-pointer ${selectedDoc?.id === doc.id ? 'border-tunisia-red bg-red-50/20' : 'border-slate-50 hover:border-slate-200 bg-slate-50/30'}`}>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm ${doc.status === 'Validé' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
                      <i className={`fas ${doc.status === 'Validé' ? 'fa-check' : 'fa-clock'}`}></i>
                    </div>
                    <div>
                      <h4 className="font-black text-slate-800 text-sm tracking-tight uppercase">{doc.name}</h4>
                      <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Mis à jour le {doc.date}</p>
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${doc.status === 'Validé' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>{doc.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-slate-900 text-white p-8 rounded-[2.5rem] shadow-2xl">
          {selectedDoc ? (
            <div className="animate-fade-in-scale">
              <h3 className="text-[10px] font-black uppercase italic tracking-tighter mb-6 text-slate-500 border-b border-white/10 pb-4 tracking-[0.2em]">Historique du document</h3>
              <div className="space-y-8 relative pl-4">
                <div className="absolute top-0 bottom-0 left-[19px] w-[1px] bg-white/10"></div>
                {selectedDoc.history.map((h: any, idx: number) => (
                  <div key={idx} className="relative pl-8">
                    <div className="absolute left-0 top-1 w-2.5 h-2.5 rounded-full bg-tunisia-red border-4 border-slate-900 z-10"></div>
                    <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1 block">{h.date}</span>
                    <span className="text-[10px] font-black uppercase tracking-tight block mb-2">{h.status}</span>
                    <p className="text-[10px] text-slate-400 italic">"{h.comment}"</p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center">
              <i className="fas fa-file-invoice text-4xl text-slate-800 mb-4"></i>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-600 italic">Détails de validation</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal IA */}
      {isAiModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setIsAiModalOpen(false)}>
          <div className="bg-white rounded-[2.5rem] p-8 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-black text-slate-900 mb-4">Support Expert IA</h3>
            <form onSubmit={handleAiHelpSubmit}>
              <textarea
                className="w-full p-4 border-2 border-slate-100 rounded-2xl mb-4"
                rows={4}
                placeholder="Posez votre question sur la réglementation douanière..."
                value={userQuestion}
                onChange={(e) => setUserQuestion(e.target.value)}
              />
              <div className="flex gap-2">
                <button type="submit" className="flex-1 bg-tunisia-red text-white py-3 rounded-2xl font-black uppercase tracking-widest">
                  Envoyer
                </button>
                <button type="button" onClick={() => setIsAiModalOpen(false)} className="px-6 py-3 border-2 border-slate-200 rounded-2xl font-black uppercase tracking-widest">
                  Annuler
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Réponse IA */}
      {aiAnalysis && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setAiAnalysis(null)}>
          <div className="bg-white rounded-[2.5rem] p-8 max-w-2xl w-full" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-black text-slate-900 mb-4">Réponse de l'Expert</h3>
            <div className="p-6 bg-slate-50 rounded-2xl mb-6">
              <p className="text-slate-700 whitespace-pre-wrap">{aiAnalysis}</p>
            </div>
            <button onClick={() => setAiAnalysis(null)} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black uppercase tracking-widest">
              Fermer
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExporterSpace; 