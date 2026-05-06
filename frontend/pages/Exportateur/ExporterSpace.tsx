import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { GoogleGenAI } from '@google/genai';
import { useAuth } from '../../App';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import FormAlert from '../../components/FormAlert';
import PaymentForm from '../../components/PaymentForm';
import { PreKycData } from '../../types/PreKycData';
import { KycData } from '../../types/KycData';
import { DossierResponse } from '../../types/DemandeEnregistrement';
import { PaymentResult } from '../../types/PaymentResult';
import RequestArchive from '../RequestArchive';
import { DemandeEnregistrement } from '../../types/DemandeEnregistrement';
import {  ProductDeclarationDemande } from '../../types/ProductDeclarationFormProps';
import { DemandeStatus } from '../../types/DemandeEnregistrement';
import { PaymentStatus } from '../../types/PaymentResult';
import SupportChatbot  from '../SupportChatbot';



  interface DisplayDeclaration {
    id: number;
    reference: string;
    step: number;
    currentValidator: string;
    products?: any[];
    status: string;
    submittedAt: string;
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
    <div className={`p-4 rounded-2xl border-2 border-dashed transition-all flex flex-col items-center justify-center gap-2 text-center min-h-[130px] ${value
        ? 'border-emerald-500 bg-emerald-50/50'
        : 'border-slate-200 bg-slate-50 hover:border-tunisia-red hover:bg-white'
      }`}>
      <input
        type="file"
        required={required && !value}
        onChange={(e) => onChange(field, e.target.files?.[0] || null)}
        className="absolute inset-0 opacity-0 cursor-pointer z-10"
      />
      <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-1 transition-transform group-hover:scale-110 ${value ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400 group-hover:text-tunisia-red group-hover:bg-red-50'
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
  const { user, updateUser, dossierStatus, updateDossierStatus } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [dossierInfo, setDossierInfo] = useState<DossierResponse | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [selectedDoc, setSelectedDoc] = useState<any | null>(null);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [userQuestion, setUserQuestion] = useState('');

  const [showInvoice, setShowInvoice] = useState(false);
  const [showTerminal, setShowTerminal] = useState(false);
  const [showArchive, setShowArchive] = useState(false);
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);
  const [formError, setFormError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // États pour les alertes de paiement
  const [paymentSuccess, setPaymentSuccess] = useState<PaymentResult | null>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  const [isPreKycDone, setIsPreKycDone] = useState(false);
  const [selectedDeclaration, setSelectedDeclaration] = useState<DisplayDeclaration | null>(null);
  const [showAllDeclarations, setShowAllDeclarations] = useState(false);
  const [userDeclarations, setUserDeclarations] = useState<DisplayDeclaration[]>([]);
  

  

  const [preKycData, setPreKycData] = useState<PreKycData>({
    username: '',
    officialRegistrationNumber: '',
    siteType: '',
    representativeRole: '',
    representativeEmail: user?.email || '',
    annualCapacity: '',
    numeroTVA: '',
  });

  // États pour la gestion du username (déplacés ici au niveau racine)
  const [usernameSuggestions, setUsernameSuggestions] = useState<string[]>([]);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [usernameMessage, setUsernameMessage] = useState<string>('');
  const [checkingUsername, setCheckingUsername] = useState(false);
  

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
      try {
        // Vérifier que le token a bien 3 parties
        const parts = token.split('.');
        if (parts.length === 3) {
          // Décoder le token pour voir son contenu
          const base64Url = parts[1];
          const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
          const payload = JSON.parse(window.atob(base64));
          console.log('📦 Payload du token:', payload);
        } else {
          console.warn('⚠️ Token invalide - mauvais nombre de parties:', parts.length);
        }
      } catch (error) {
        console.error('❌ Erreur lors du décodage du token:', error);
        // Nettoyer le token invalide
        localStorage.removeItem('token');
      }
    }
  }, []);


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
      console.log('🔍🔍🔍🔍🔍 Réponse API brute:', response.data);

      setDossierInfo(response.data);

      // Mettre à jour le cache dans useAuth
      if (response.data.hasDossier) {
        updateDossierStatus(
          response.data.status || '',
          response.data.paymentStatus || '',
          {
            demandeId: response.data.demandeId,
            reference: response.data.reference
          }
        );
      }
    } catch (error) {
      console.error('Erreur lors de la récupération du dossier:', error);
    }
  }, [dossierStatus, updateDossierStatus]);


// Dans ExporterSpace.tsx, modifiez fetchUserDeclarations :

const fetchUserDeclarations = useCallback(async () => {
  const token = localStorage.getItem('token');
  if (!token) return;

  try {
    const response = await axios.get('http://localhost:8080/api/exportateur/declarations', {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('📦 Réponse complète:', response.data);
    
    // 🔥 CORRECTION: Vérifier la structure de la réponse
    let declarationsData = [];
    if (response.data.data && Array.isArray(response.data.data)) {
      declarationsData = response.data.data;
    } else if (Array.isArray(response.data)) {
      declarationsData = response.data;
    } else {
      console.error('Structure de réponse inattendue:', response.data);
      declarationsData = [];
    }
    
    const declarations: DisplayDeclaration[] = declarationsData.map((dec: any) => ({
      id: dec.id,
      reference: dec.reference,
      step: getStepFromStatus(dec.status),
      currentValidator: getCurrentValidator(dec.validationStatuses),
      products: dec.products || [],
      status: dec.status,
      submittedAt: dec.submittedAt
    }));
    
    setUserDeclarations(declarations);
    console.log('✅ Déclarations chargées:', declarations);
    
  } catch (error) {
    console.error('Erreur lors du chargement des déclarations:', error);
  }
}, []);

// Ajoutez avec les autres useEffect (vers ligne 350)
useEffect(() => {
  // Charger les déclarations si le dossier existe et est soumis ou validé
  if (dossierInfo?.hasDossier && (dossierInfo?.status === 'SOUMISE' || dossierInfo?.status === 'EN_COURS_VALIDATION' || dossierInfo?.status === 'VALIDEE')) {
    fetchUserDeclarations();
  }
}, [dossierInfo?.hasDossier, dossierInfo?.status, fetchUserDeclarations]);

// Fonctions helper
const getStatusLabel = (status: string): string => {
  switch (status) {
    case 'SOUMISE': return 'Soumis';
    case 'EN_COURS_VALIDATION': return 'En cours de validation';
    case 'EN_ATTENTE_INFO': return 'Info requise';
    case 'VALIDEE': return 'Validée';
    case 'REJETEE': return 'Rejetée';
    default: return status;
  }
};

const getStepFromStatus = (status: string): number => {
  switch (status) {
    case 'SOUMISE': return 1;
    case 'EN_COURS_VALIDATION': return 2;
    case 'EN_ATTENTE_INFO': return 2;
    case 'VALIDEE': return 4;
    case 'REJETEE': return 4;
    default: return 1;
  }
};

const getCurrentValidator = (validationStatuses: any[]): string => {
  if (!validationStatuses) return 'En attente';
  
  const pendingValidation = validationStatuses.find(v => v.validationStatus === 'EN_ATTENTE');
  if (pendingValidation) {
    return pendingValidation.structureName;
  }
  return 'Terminé';
};

  // Chargement initial - ne s'exécute qu'une fois
  useEffect(() => {
    if (user?.email && !hasFetchedRef.current) {
      hasFetchedRef.current = true;
      fetchDossierStatus();
    }
  }, [user?.email, fetchDossierStatus]);

  // useEffect pour charger les suggestions de username (déplacé ici)
  useEffect(() => {
    const fetchUsernameSuggestions = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(
          'http://localhost:8080/api/exportateur/pre-kyc/suggerer-usernames',
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setUsernameSuggestions(response.data.suggestions);
      } catch (error) {
        console.error('Erreur lors de la récupération des suggestions:', error);
      }
    };

    fetchUsernameSuggestions();
  }, []);

  // Debounce pour vérifier la disponibilité du username
  useEffect(() => {
    const timer = setTimeout(() => {
      if (preKycData.username) {
        checkUsernameAvailability(preKycData.username);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [preKycData.username]);

  // Fonction pour vérifier la disponibilité en temps réel
  const checkUsernameAvailability = async (username: string) => {
    if (!username || username.length < 3) {
      setUsernameAvailable(null);
      setUsernameMessage('');
      return;
    }

    setCheckingUsername(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `http://localhost:8080/api/exportateur/pre-kyc/verifier-username?username=${username}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setUsernameAvailable(response.data.disponible);
      setUsernameMessage(response.data.message);
    } catch (error) {
      console.error('Erreur lors de la vérification:', error);
      setUsernameAvailable(null);
      setUsernameMessage('Erreur de vérification');
    } finally {
      setCheckingUsername(false);
    }
  };

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
        const errorData = error.response.data;

        if (typeof errorData === 'string') {
          setPaymentError(errorData);
        } else if (errorData.error) {
          setPaymentError(errorData.error);
        } else if (errorData.message) {
          setPaymentError(errorData.message);
        } else if (errorData.userMessage) {
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

  const handlePayLater = () => {
    // Fermer la facture
    setShowInvoice(false);
    setShowTerminal(false);
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

  // --- RENDU : SECTION ARCHIVE ---
  if (showArchive) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <button 
            onClick={() => setShowArchive(false)}
            className="px-6 py-2 bg-white border border-slate-100 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all flex items-center gap-2"
          >
            <i className="fas fa-arrow-left"></i> Retour Dashboard
          </button>
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Section Archivage</span>
        </div>
        <RequestArchive userRole="EXPORTATEUR" />
      </div>
    );
  }

  // --- RENDU : FORMULAIRE PRÉ-KYC ---
  if ((!dossierStatus || !dossierInfo?.hasDossier) && !isPreKycDone) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-4 animate-fade-in-scale">
        <div className="bg-white rounded-[3rem] shadow-2xl border border-slate-100 overflow-hidden">
          <div className="p-10 bg-slate-900 text-white relative overflow-hidden">
            <div className="absolute -right-10 -top-10 opacity-10">
              <i className="fas fa-id-card text-[10rem]"></i>
            </div>
            <div className="relative z-10">
              <h2 className="text-3xl font-black uppercase italic tracking-tighter leading-none">Informations Préalables</h2>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-3">Étape 1 sur 2 : Configuration du profil exportateur</p>
            </div>
          </div>

          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setLoading(true);
              setFormError('');
              
              try {
                const token = localStorage.getItem('token');
                const dataToSend = {
                  username: preKycData.username,
                  numeroOfficielEnregistrement: preKycData.officialRegistrationNumber,
                  siteType: preKycData.siteType,
                  representantRole: preKycData.representativeRole,
                  representantEmail: preKycData.representativeEmail,
                  capaciteAnnuelle: preKycData.annualCapacity,
                  numeroTVA: preKycData.numeroTVA
                };

                const response = await axios.post(
                  'http://localhost:8080/api/exportateur/pre-kyc/completer',
                  dataToSend,
                  {
                    headers: {
                      'Authorization': `Bearer ${token}`,
                      'Content-Type': 'application/json'
                    }
                  }
                );
                console.log('✅ Réponse Pré-KYC:', response.data);
                if (response.data.success) {
                  // Mettre à jour l'utilisateur dans le contexte
                  updateUser({
                    ...user,
                    username: preKycData.username,
                    preKycCompleted: true
                  });
                  
                  setIsPreKycDone(true);
                  setSuccessMessage('Informations enregistrées avec succès !');
                }
              } catch (error: any) {
                console.error('Erreur Pré-KYC:', error);
                setFormError(error.response?.data?.error || 'Erreur lors de l\'enregistrement');
              } finally {
                setLoading(false);
              }
            }}
            className="p-10 space-y-10"
          >
              {/* Section 1: Identifiants */}
              <div className="space-y-6">
                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 border-b border-slate-100 pb-2">
                  Accès au Portail
                </h3>
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">
                    Nom d'utilisateur (Identifiant)
                    {checkingUsername && <i className="fas fa-spinner fa-spin ml-2"></i>}
                  </label>
                  <div className="relative">
                    <input 
                      type="text" 
                      required
                      value={preKycData.username}
                      onChange={(e) => setPreKycData({...preKycData, username: e.target.value})}
                      className={`w-full px-5 py-4 rounded-2xl bg-slate-50 border-2 transition-all font-bold text-sm ${
                        usernameAvailable === true
                          ? 'border-emerald-500 focus:border-emerald-500'
                          : usernameAvailable === false
                            ? 'border-red-500 focus:border-red-500'
                            : 'border-transparent focus:border-tunisia-red'
                      }`}
                      placeholder="ex: company_export_tn"
                    />
                    <i className="fas fa-at absolute right-5 top-1/2 -translate-y-1/2 text-slate-300"></i>
                  </div>
                  
                  {/* Message de disponibilité */}
                  {usernameMessage && (
                    <p className={`text-[8px] font-black uppercase tracking-widest mt-1 ${
                      usernameAvailable ? 'text-emerald-600' : 'text-red-600'
                    }`}>
                      <i className={`fas ${usernameAvailable ? 'fa-check-circle' : 'fa-exclamation-circle'} mr-1`}></i>
                      {usernameMessage}
                    </p>
                  )}
                  
                  {/* Suggestions de username */}
                  <div className="flex flex-wrap gap-2 mt-2">
                    {usernameSuggestions.map(suggestion => (
                      <button
                        key={suggestion}
                        type="button"
                        onClick={() => {
                          setPreKycData({...preKycData, username: suggestion});
                          checkUsernameAvailability(suggestion);
                        }}
                        className="text-[8px] font-black uppercase tracking-widest px-3 py-1.5 bg-slate-100 text-slate-500 rounded-full hover:bg-tunisia-red hover:text-white transition-all"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                {/* Section 2: Identifiants Légaux */}
                <div className="space-y-6">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 border-b border-slate-100 pb-2">
                    Identifiants Légaux
                  </h3>
                  
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">
                      Numéro Officiel d'Enregistrement
                    </label>
                    <div className="relative">
                      <input 
                        type="text" 
                        value={preKycData.officialRegistrationNumber}
                        onChange={(e) => setPreKycData({...preKycData, officialRegistrationNumber: e.target.value})}
                        className="w-full px-5 py-4 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-tunisia-red outline-none transition-all font-bold text-sm"
                        placeholder="ex: RC-TN-2024-XXXX"
                      />
                      <i className="fas fa-hashtag absolute right-5 top-1/2 -translate-y-1/2 text-slate-300"></i>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">
                      Numéro TVA
                    </label>
                    <div className="relative">
                      <input 
                        type="text" 
                        value={preKycData.numeroTVA}
                        onChange={(e) => setPreKycData({...preKycData, numeroTVA: e.target.value})}
                        className="w-full px-5 py-4 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-tunisia-red outline-none transition-all font-bold text-sm"
                        placeholder="ex: 1234567/A/M/000"
                      />
                      <i className="fas fa-receipt absolute right-5 top-1/2 -translate-y-1/2 text-slate-300"></i>
                    </div>
                  </div>
                </div>

                {/* Section 3: Détails du Site */}
                <div className="space-y-6">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 border-b border-slate-100 pb-2">
                    Localisation & Capacité
                  </h3>
                  
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">
                      Type de site de l'entreprise
                    </label>
                    <div className="relative">
                      <select 
                        required
                        value={preKycData.siteType}
                        onChange={(e) => setPreKycData({...preKycData, siteType: e.target.value as any})}
                        className="w-full px-5 py-4 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-tunisia-red outline-none transition-all font-bold text-sm appearance-none cursor-pointer"
                      >
                        <option value="">Sélectionner un type...</option>
                        <option value="SIEGE">Siège Social</option>
                        <option value="USINE">Usine de Production</option>
                        <option value="ENTREPOT">Entrepôt Logistique</option>
                        <option value="DISTRIBUTEUR">Centre de Distribution</option>
                      </select>
                      <i className="fas fa-chevron-down absolute right-5 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none"></i>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">
                      Capacité / Volume annuel estimé
                    </label>
                    <div className="relative">
                      <input 
                        type="text" 
                        value={preKycData.annualCapacity}
                        onChange={(e) => setPreKycData({...preKycData, annualCapacity: e.target.value})}
                        className="w-full px-5 py-4 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-tunisia-red outline-none transition-all font-bold text-sm"
                        placeholder="ex: 500 Tonnes / an"
                      />
                      <i className="fas fa-chart-line absolute right-5 top-1/2 -translate-y-1/2 text-slate-300"></i>
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 4: Représentant Légal */}
              <div className="space-y-6 pt-4 border-t border-slate-100">
                <div className="flex items-center gap-3">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">
                    Représentant Légal
                  </h3>
                  {user?.representantLegal && (
                    <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-[8px] font-black uppercase tracking-widest">
                      Identifié : {user.representantLegal}
                    </span>
                  )}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">
                      Fonction {user?.representantLegal ? `de ${user.representantLegal}` : ''}
                    </label>
                    <div className="relative">
                      <input 
                        type="text" 
                        value={preKycData.representativeRole}
                        onChange={(e) => setPreKycData({...preKycData, representativeRole: e.target.value})}
                        className="w-full px-5 py-4 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-tunisia-red outline-none transition-all font-bold text-sm"
                        placeholder="ex: Gérant, Directeur Général..."
                      />
                      <i className="fas fa-user-tie absolute right-5 top-1/2 -translate-y-1/2 text-slate-300"></i>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">
                      Email de contact direct
                    </label>
                    <div className="relative">
                      <input 
                        type="email" 
                        value={preKycData.representativeEmail}
                        onChange={(e) => setPreKycData({...preKycData, representativeEmail: e.target.value})}
                        className="w-full px-5 py-4 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-tunisia-red outline-none transition-all font-bold text-sm"
                        placeholder="directeur@entreprise.tn"
                      />
                      <i className="fas fa-envelope absolute right-5 top-1/2 -translate-y-1/2 text-slate-300"></i>
                    </div>
                  </div>
                </div>
              </div>
            <div className="pt-6">
              <button
                type="submit"
                disabled={usernameAvailable !== true}
                className={`w-full py-5 rounded-2xl font-black uppercase tracking-widest shadow-xl transition-all flex items-center justify-center gap-3 ${usernameAvailable === true
                    ? 'bg-tunisia-red text-white hover:scale-[1.02] active:scale-[0.98] shadow-red-500/20'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  }`}
              >
                <span>Continuer vers le dossier de conformité</span>
                <i className="fas fa-arrow-right"></i>
              </button>

              {usernameAvailable === false && (
                <p className="text-center text-[8px] font-black text-red-500 uppercase tracking-widest mt-3">
                  Veuillez choisir un nom d'utilisateur disponible
                </p>
              )}
            </div>
          </form>
        </div>
      </div>
    );
  }
  // --- RENDU : PREMIÈRE CONNEXION / DOSSIER INCOMPLET ---
  if (!dossierStatus || !dossierInfo?.hasDossier) {
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
            className={`w-full py-6 rounded-3xl font-black uppercase tracking-widest shadow-2xl transition-all flex items-center justify-center gap-3 ${progress < 100
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
    dossierInfo?.paymentStatus !== 'REUSSI' &&
    dossierInfo?.status !== 'SOUMISE';

    console.log('Dossier Info:', dossierInfo);

  return (
    <>
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in-scale">
      <br />

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
            {dossierInfo?.status === 'VALIDEE' ? (
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
            <SupportChatbot context="exporter" />



{/* SECTION PIPELINE DE DÉCLARATION */}
{userDeclarations.length > 0 && (
  <div id="pipeline-section" className="bg-white p-10 py-12 rounded-[2.5rem] shadow-xl border border-slate-100 animate-fade-in-scale">
    <div className="flex items-center justify-between mb-12">
      <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">
        Pipeline de Conformité : {selectedDeclaration?.reference || userDeclarations[0]?.reference || 'Déclaration'}
      </h3>
      <span className="text-[10px] font-black py-1 px-3 bg-slate-100 text-slate-600 rounded-full border border-slate-200 uppercase tracking-widest italic">
        {selectedDeclaration?.products?.[0]?.productName || userDeclarations[0]?.products?.[0]?.productName || 'Produit'}
      </span>
    </div>

    <div className="max-w-3xl mx-auto flex items-center justify-between">
      {(() => {
        const currentDec = selectedDeclaration || userDeclarations[0];
        const step = currentDec?.step || 1;
        
        return (
          <>
            <PipelineNode 
              label="Soumission" 
              status={step >= 1 ? (step > 1 ? 'success' : (step === 1 ? 'processing' : 'pending')) : 'pending'} 
            />
            <PipelineNode 
              label={currentDec?.currentValidator?.includes('Industrie') ? 'Ministère Industrie' : 
                    currentDec?.currentValidator?.includes('Santé') || currentDec?.currentValidator?.includes('INSSPA') ? 'Ministère Santé' : 
                    'Validation Technique'} 
              status={step >= 2 ? (step > 2 ? 'success' : (step === 2 ? 'processing' : 'pending')) : 'pending'} 
            />
            <PipelineNode 
              label="Ministère Commerce" 
              status={step >= 3 ? (step > 3 ? 'success' : (step === 3 ? 'processing' : 'pending')) : 'pending'} 
            />
            <PipelineNode 
              label="Décision Finale" 
              status={step === 4 ? 'success' : 'pending'} 
              isLast={true} 
            />
          </>
        );
      })()}
    </div>

    {/* État actuel sous les stages */}
    <div className="max-w-3xl mx-auto flex justify-between mt-12 text-center">
      {(() => {
        const currentDec = selectedDeclaration || userDeclarations[0];
        const step = currentDec?.step || 1;
        const stages = [
          { id: 1, text: "Dossier Reçu" },
          { id: 2, text: currentDec?.currentValidator || "Examen Technique" },
          { id: 3, text: "Visa Commerce" },
          { id: 4, text: "Accord Final" }
        ];
        return stages.map(stage => (
          <div key={stage.id} className="w-24">
            <span className={`text-[8px] font-black uppercase tracking-tight block leading-tight ${
              step === stage.id ? 'text-tunisia-red font-black' : step > stage.id ? 'text-emerald-500' : 'text-slate-300'
            }`}>
              {step === stage.id ? '► En cours' : step > stage.id ? '✓ Traité' : '○ En attente'}
            </span>
            <p className={`text-[7px] font-bold mt-1 uppercase leading-none ${step === stage.id ? 'text-slate-900' : 'text-slate-400'}`}>
              {stage.text.length > 15 ? stage.text.substring(0, 12) + '...' : stage.text}
            </p>
          </div>
        ));
      })()}
    </div>

    {/* "Voir Plus" pour les autres demandes */}
    {userDeclarations.length > 1 && (
      <div className="mt-12 text-center pt-8 border-t border-slate-50">
        <button 
          onClick={() => setShowAllDeclarations(!showAllDeclarations)}
          className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] hover:text-slate-900 transition-all flex items-center justify-center gap-3 mx-auto"
        >
          <span>{showAllDeclarations ? "Masquer les autres demandes" : "Voir plus de demandes"}</span>
          <i className={`fas fa-chevron-${showAllDeclarations ? 'up' : 'down'} transition-transform duration-300`}></i>
        </button>

        {showAllDeclarations && (
          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-4 duration-500">
            {userDeclarations.filter(d => d.id !== (selectedDeclaration?.id || userDeclarations[0]?.id)).map(dec => (
              <div 
                key={dec.id} 
                onClick={() => { 
                  setSelectedDeclaration(dec); 
                  setShowAllDeclarations(false); 
                  window.scrollTo({ top: document.getElementById('pipeline-section')?.offsetTop || 0, behavior: 'smooth' }); 
                }}
                className="p-5 bg-slate-50 rounded-2xl border border-slate-100 hover:border-tunisia-red hover:bg-red-50/30 transition-all cursor-pointer text-left group"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[8px] font-black text-tunisia-red uppercase tracking-widest">{dec.reference}</span>
                    <h4 className="text-[11px] font-black text-slate-800 uppercase italic mt-1 group-hover:text-tunisia-red">{dec.products?.[0]?.productName || 'Produit'}</h4>
                  </div>
                  <div className="text-right">
                    <span className="px-2 py-0.5 bg-white rounded-md text-[7px] font-black uppercase text-slate-400 border border-slate-200 block mb-1">
                      Validateur: {dec.currentValidator?.substring(0, 12) || 'N/A'}
                    </span>
                    <span className="text-[7px] font-bold text-tunisia-red uppercase tracking-tighter opacity-0 group-hover:opacity-100 transition-opacity">
                      Cliquer pour suivre <i className="fas fa-arrow-up ml-1"></i>
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    )}
  </div>
)}


      {/* RUBRIQUE CATALOGUE PRODUITS INDEPENDANTE */}
      {dossierInfo?.status === 'VALIDEE' ? (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="bg-white p-10 rounded-[3rem] shadow-xl border border-slate-100 flex flex-col justify-between group cursor-pointer hover:border-tunisia-red transition-all relative overflow-hidden" onClick={() => navigate('/products')}>
          <div className="absolute -right-10 -bottom-10 opacity-[0.03] group-hover:scale-110 transition-transform">
            <i className="fas fa-barcode text-[12rem]"></i>
          </div>
          <div>
            <div className="w-12 h-12 bg-slate-900 text-white rounded-2xl flex items-center justify-center mb-6">
              <i className="fas fa-boxes-stacked"></i>
            </div>
            <h3 className="text-2xl font-black text-slate-900 italic tracking-tighter uppercase mb-2">Catalogue Produits</h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">
              Gérez votre référentiel d'articles, consultez les fiches techniques et les codes NGP associés à votre entreprise.
            </p>
          </div>
          <div className="mt-8 flex items-center gap-3 text-tunisia-red font-black uppercase text-[10px] tracking-widest group-hover:gap-5 transition-all">
            Accéder au catalogue <i className="fas fa-arrow-right"></i>
          </div>
        </div>

        <div className="bg-white p-10 rounded-[3rem] shadow-xl border border-slate-100 flex flex-col justify-between group cursor-pointer hover:border-tunisia-red transition-all relative overflow-hidden" onClick={() => navigate('/declarations')}>
          <div className="absolute -right-10 -bottom-10 opacity-[0.03] group-hover:scale-110 transition-transform">
            <i className="fas fa-file-invoice text-[12rem]"></i>
          </div>
          <div>
            <div className="w-12 h-12 bg-emerald-500 text-white rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-emerald-500/20">
              <i className="fas fa-clipboard-list"></i>
            </div>
            <h3 className="text-2xl font-black text-slate-900 italic tracking-tighter uppercase mb-2">Mes Déclarations</h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">
              Consultez l'historique complet de vos demandes, suivez l'état d'avancement et téléchargez vos documents officiels.
            </p>
          </div>
          <div className="mt-8 flex items-center gap-3 text-emerald-600 font-black uppercase text-[10px] tracking-widest group-hover:gap-5 transition-all">
            Voir mes déclarations < i className="fas fa-arrow-right"></i>
          </div>
        </div>

        {/* Carte ARCHIVES - AJOUTÉE */}
        <div className="bg-white p-10 rounded-[3rem] shadow-xl border border-slate-100 flex flex-col justify-between group cursor-pointer hover:border-tunisia-red transition-all relative overflow-hidden" onClick={() => setShowArchive(true)}>
          <div className="absolute -right-10 -bottom-10 opacity-[0.03] group-hover:scale-110 transition-transform">
            <i className="fas fa-archive text-[12rem]"></i>
          </div>
          <div>
            <div className="w-12 h-12 bg-blue-500 text-white rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-blue-500/20">
              <i className="fas fa-history"></i>
            </div>
            <h3 className="text-2xl font-black text-slate-900 italic tracking-tighter uppercase mb-2">Archives</h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">
              Consultez l'historique de vos demandes validées ou rejetées.
            </p>
          </div>
          <div className="mt-8 flex items-center gap-3 text-blue-600 font-black uppercase text-[10px] tracking-widest group-hover:gap-5 transition-all">
            Consulter <i className="fas fa-arrow-right"></i>
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
              Statut actuel : {dossierInfo?.status === 'SOUMISE' ? 'En cours de validation' : 'En attente de paiement'}
            </p>
          </div>
        </div>
      )}
      
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
    <SupportChatbot context="exporter" />
    </>
  );
};

export default ExporterSpace;