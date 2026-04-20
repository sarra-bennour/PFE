import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import { Declaration, ImporterTrackingProps } from '../../types/Declaration';
import { RequestStatus } from '../../types';
import PaymentForm from '../../components/PaymentForm';
import FormAlert from '../../components/FormAlert'; 
import EditImporterDeclarationModal from './EditImporterDeclarationModal';

const ImporterTracking: React.FC<ImporterTrackingProps> = ({ onModalOpen }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDoc, setSelectedDoc] = useState<Declaration | null>(null);
  const [declarations, setDeclarations] = useState<Declaration[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [showEditModal, setShowEditModal] = useState<Declaration | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // États pour le paiement
  const [showPaymentModal, setShowPaymentModal] = useState<Declaration | null>(null);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [paymentSuccess, setPaymentSuccess] = useState<{ message: string; amount?: number } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'all' | RequestStatus>('all');

  const stats = {
    total: declarations.length,
    en_attente_info: declarations.filter(d => d.status === RequestStatus.EN_ATTENTE_INFO).length,
    en_cours_validation: declarations.filter(d => d.status === RequestStatus.EN_COURS_VALIDATION).length,
    validee: declarations.filter(d => d.status === RequestStatus.VALIDEE).length,
    suspendue: declarations.filter(d => d.status === RequestStatus.SUSPENDUE).length,
    rejetee: declarations.filter(d => d.status === RequestStatus.REJETEE).length,
    brouillon: declarations.filter(d => d.status === RequestStatus.BROULLION).length,
  };
  
  // Notifier le parent quand le modal s'ouvre/ferme et envoyer le contenu
  useEffect(() => {
    if (onModalOpen) {
      if (selectedDoc && !showPaymentModal && !showDeleteModal && !showEditModal) {
        onModalOpen(true, getModalContent());
      } else if (!selectedDoc && !showPaymentModal && !showDeleteModal && !showEditModal) {
        onModalOpen(false);
      }
    }
  }, [selectedDoc, onModalOpen, showDeleteModal, showPaymentModal, showEditModal]);
  
  // Récupérer les demandes de l'importateur connecté
  const fetchDemandes = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:8080/api/importateur/mes-demandes', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.success) {
        const demandes = response.data.demandes;
        console.log('**************Demandes brutes reçues:', demandes);
        const formattedDeclarations: Declaration[] = demandes.map((demande: any) => {
          return {
            id: demande.reference,
            demandeId: demande.id,
            date: demande.submittedAt ? new Date(demande.submittedAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
            exporter: demande.exportateurName || 'Exportateur inconnu',
            product: demande.productName || 'Produit inconnu',
            status: mapStatus(demande.status),
            ngp: demande.hsCode || 'N/A',
            value: `${demande.amount?.toLocaleString() || '0'} ${demande.currency || 'TND'}`,
            weight: demande.weight || 'N/A',
            origin: demande.exportateurCountry || 'N/A',
            transport: demande.transportMode || 'Non spécifié',
            // ✅ Nouveaux champs
            invoiceNumber: demande.invoiceNumber,
            invoiceDate: demande.invoiceDate,
            incoterm: demande.incoterm,
            loadingPort: demande.loadingPort,
            dischargePort: demande.dischargePort,
            arrivalDate: demande.arrivalDate,
            currency: demande.currency
          };
        });
        
        setDeclarations(formattedDeclarations);
      }
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDemandes();
  }, [fetchDemandes]);

  const mapStatus = (status: string): RequestStatus => {
    switch (status) {
      case 'VALIDEE': return RequestStatus.VALIDEE;
      case 'REJETEE': return RequestStatus.REJETEE;
      case 'SUSPENDUE': return RequestStatus.SUSPENDUE;
      case 'EN_COURS_VALIDATION': return RequestStatus.EN_COURS_VALIDATION;
      case 'EN_ATTENTE_INFO': return RequestStatus.EN_ATTENTE_INFO;
      case 'SOUMISE': return RequestStatus.SOUMISE;
      default: return RequestStatus.BROULLION;
    }
  };

  // Fonction pour supprimer une demande
  const handleDelete = async () => {
    if (!showDeleteModal) return;
    
    setDeleting(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.delete(`http://localhost:8080/api/importateur/demandes/${showDeleteModal}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.success) {
        setSuccessMessage('Demande supprimée avec succès');
        setDeclarations(prev => prev.filter(dec => dec.demandeId !== showDeleteModal));
        if (selectedDoc?.demandeId === showDeleteModal) {
          setSelectedDoc(null);
        }
        setTimeout(() => setSuccessMessage(null), 5000);
      }
    } catch (error: any) {
      console.error('Erreur lors de la suppression:', error);
      setPaymentError(error.response?.data?.message || 'Erreur lors de la suppression de la demande');
      setTimeout(() => setPaymentError(null), 5000);
    } finally {
      setDeleting(false);
      setShowDeleteModal(null);
    }
  };

  // Fonction pour soumettre la demande
  const handleSubmitDemande = async (demandeId: number) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `http://localhost:8080/api/importateur/demandes/${demandeId}/soumettre`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la soumission:', error);
      throw error;
    }
  };

  // Fonction pour créer le payment intent
  const handleCreatePaymentIntent = async (demandeId: number) => {
    const token = localStorage.getItem('token');
    const response = await axios.post(
      'http://localhost:8080/api/stripe-payment/create-intent',
      {
        demandeId: demandeId,
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
    return response.data;
  };

  // Fonction pour confirmer le paiement
  const handleProcessPayment = async (paymentIntentId: string, paymentDetails: any, demandeId: number) => {
    const token = localStorage.getItem('token');
    const paymentRequest = {
      paymentIntentId: paymentIntentId,
      demandeId: demandeId,
      paymentMethodId: paymentDetails.paymentMethodId,
      cardHolderName: paymentDetails.cardHolder,
      receiptEmail: paymentDetails.receiptEmail
    };
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

  // Fonction pour procéder au paiement
  const handleProceedToPayment = () => {
    setShowPaymentForm(true);
  };

  // Fonction pour revenir à la confirmation
  const handleBackToConfirmation = () => {
    setShowPaymentForm(false);
    setPaymentError(null);
    setPaymentSuccess(null);
  };

  // Fonction pour soumettre le paiement
  const handlePaymentSubmit = async (paymentDetails: any) => {
    if (!showPaymentModal?.demandeId) {
      setPaymentError('Aucune demande trouvée.');
      return;
    }

    setPaymentLoading(true);
    setPaymentError(null);
    setPaymentSuccess(null);

    try {
      console.log('💰 Traitement pour la demande ID:', showPaymentModal.demandeId);

      await handleSubmitDemande(showPaymentModal.demandeId);
      console.log('✅ Demande soumise avec succès');

      const createIntentResponse = await handleCreatePaymentIntent(showPaymentModal.demandeId);
      const paymentIntentId = createIntentResponse.paymentIntentId;

      if (!paymentIntentId) {
        throw new Error('Impossible de créer le PaymentIntent');
      }

      console.log('✅ PaymentIntent créé:', paymentIntentId);

      const result = await handleProcessPayment(paymentIntentId, paymentDetails, showPaymentModal.demandeId);

      if (result.success) {
        setPaymentSuccess({
          message: 'Paiement effectué avec succès! Votre demande a été soumise.',
          amount: result.amount
        });

        setDeclarations(prev => prev.map(dec => 
          dec.demandeId === showPaymentModal.demandeId
            ? { ...dec, status: RequestStatus.SOUMISE }
            : dec
        ));

        if (selectedDoc?.demandeId === showPaymentModal.demandeId) {
          setSelectedDoc({ ...selectedDoc, status: RequestStatus.SOUMISE });
        }

        setTimeout(() => {
          setShowPaymentModal(null);
          setShowPaymentForm(false);
          setPaymentSuccess(null);
        }, 2000);
      } else {
        setPaymentError(result.message || 'Erreur de paiement');
      }

    } catch (error: any) {
      console.error('❌ Erreur:', error);
      
      if (error.response?.status === 401) {
        setPaymentError('Votre session a expiré. Veuillez vous reconnecter.');
        setTimeout(() => {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          window.location.href = '/login';
        }, 2000);
      } else {
        const errorData = error.response?.data;
        if (errorData && errorData.error) {
          const errorMessage = errorData.error;
          if (errorMessage.includes('card_declined')) {
            setPaymentError('Votre carte a été refusée. Veuillez vérifier vos informations ou utiliser une autre carte.');
          } else if (errorMessage.includes('insufficient_funds')) {
            setPaymentError('Fonds insuffisants sur cette carte. Veuillez utiliser une autre carte.');
          } else if (errorMessage.includes('expired_card')) {
            setPaymentError('Votre carte a expiré. Veuillez utiliser une carte valide.');
          } else if (errorMessage.includes('incorrect_cvc')) {
            setPaymentError('Le code de sécurité (CVV) est incorrect. Veuillez vérifier et réessayer.');
          } else {
            const cleanMessage = errorMessage.split(';')[0];
            setPaymentError(cleanMessage);
          }
        } else if (errorData && errorData.message) {
          setPaymentError(errorData.message);
        } else {
          setPaymentError(error.message || 'Erreur lors du paiement');
        }
      }
    } finally {
      setPaymentLoading(false);
    }
  };

  // Fonction pour ouvrir le modal de paiement
  const openPaymentModal = async (dec: Declaration) => {
    setSubmitting(true);
    try {
      if (!dec.demandeId) {
        throw new Error('ID de demande manquant');
      }
      setShowPaymentModal(dec);
    } catch (error: any) {
      console.error('Erreur:', error);
      setPaymentError(error.message || 'Une erreur est survenue');
      setTimeout(() => setPaymentError(null), 3000);
    } finally {
      setSubmitting(false);
    }
  };

  // Filtrer par recherche et par statut
  const filteredDeclarations = declarations.filter(dec => {
    const matchesSearch = dec.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      dec.exporter.toLowerCase().includes(searchQuery.toLowerCase()) ||
      dec.product.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesFilter = activeFilter === 'all' || dec.status === activeFilter;
    
    return matchesSearch && matchesFilter;
  });

  const getStatusStyles = (status: RequestStatus) => {
    switch (status) {
      case RequestStatus.VALIDEE:
        return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.1)]';
      case RequestStatus.REJETEE:
        return 'bg-red-500/10 text-red-600 border-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.1)]';
      case RequestStatus.SUSPENDUE:
        return 'bg-amber-500/10 text-amber-600 border-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.1)]';
      case RequestStatus.EN_COURS_VALIDATION:
        return 'bg-blue-500/10 text-blue-600 border-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.1)]';
      case RequestStatus.EN_ATTENTE_INFO:
        return 'bg-violet-500/10 text-violet-600 border-violet-500/20 shadow-[0_0_15px_rgba(139,92,246,0.1)]';
      case RequestStatus.SOUMISE:
        return 'bg-green-500/10 text-green-600 border-green-500/20 shadow-[0_0_15px_rgba(34,197,94,0.1)]';
      default:
        return 'bg-amber-500/10 text-amber-600 border-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.1)]';
    }
  };

  /// Fonction pour générer le contenu du modal avec TOUS les détails et SCROLL
const getModalContent = () => {
  if (!selectedDoc) return null;
  
  return (
    <div className="bg-white w-full max-w-3xl rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
      {/* Header fixe */}
      <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 flex-shrink-0">
        <div>
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Détails du Dossier</span>
          <h3 className="text-3xl font-black text-slate-900 uppercase italic tracking-tighter">{selectedDoc.id}</h3>
        </div>
        <button 
          onClick={() => setSelectedDoc(null)}
          className="w-12 h-12 flex items-center justify-center bg-white border border-slate-200 rounded-2xl text-slate-400 hover:text-tunisia-red hover:border-tunisia-red transition-all shadow-sm"
        >
          <i className="fas fa-times text-xl"></i>
        </button>
      </div>

      {/* Contenu scrollable */}
      <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
        {/* Section 1: Informations générales */}
        <div>
          <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-2 mb-6">
            <i className="fas fa-info-circle text-tunisia-red"></i> Informations Générales
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Exportateur</span>
              <p className="text-lg font-bold text-slate-900">{selectedDoc.exporter}</p>
            </div>
            <div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Produit</span>
              <p className="text-lg font-black text-slate-900 uppercase italic tracking-tight">{selectedDoc.product}</p>
            </div>
            <div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Code NGP</span>
              <p className="text-sm font-mono font-bold text-tunisia-red">{selectedDoc.ngp}</p>
            </div>
            <div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Statut</span>
              <span className={`inline-block px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border ${getStatusStyles(selectedDoc.status)}`}>
                {selectedDoc.status}
              </span>
            </div>
          </div>
        </div>

        {/* Section 2: Informations Facture */}
        <div className="pt-4 border-t border-slate-100">
          <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-2 mb-6">
            <i className="fas fa-file-invoice-dollar text-tunisia-red"></i> Informations Facture
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Numéro de facture</span>
              <p className="text-sm font-bold text-slate-800">{selectedDoc.invoiceNumber || 'Non spécifié'}</p>
            </div>
            <div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Date de facture</span>
              <p className="text-sm font-bold text-slate-800">{selectedDoc.invoiceDate || 'Non spécifiée'}</p>
            </div>
            <div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Montant</span>
              <p className="text-lg font-black text-tunisia-red">{selectedDoc.value}</p>
            </div>
            <div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Incoterm</span>
              <p className="text-sm font-bold text-slate-800">{selectedDoc.incoterm || 'Non spécifié'}</p>
            </div>
          </div>
        </div>

        {/* Section 3: Logistique et Transport */}
        <div className="pt-4 border-t border-slate-100">
          <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-2 mb-6">
            <i className="fas fa-truck text-tunisia-red"></i> Logistique & Transport
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Mode de transport</span>
              <p className="text-sm font-bold text-slate-800">{selectedDoc.transport || 'Non spécifié'}</p>
            </div>
            <div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Origine</span>
              <p className="text-sm font-bold text-slate-800">{selectedDoc.origin || 'Non spécifié'}</p>
            </div>
            <div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Port de chargement</span>
              <p className="text-sm font-bold text-slate-800">{selectedDoc.loadingPort || 'Non spécifié'}</p>
            </div>
            <div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Port de déchargement</span>
              <p className="text-sm font-bold text-slate-800">{selectedDoc.dischargePort || 'Non spécifié'}</p>
            </div>
            <div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Poids</span>
              <p className="text-sm font-bold text-slate-800">{selectedDoc.weight || 'N/A'}</p>
            </div>
            <div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Date d'arrivée prévue</span>
              <p className="text-sm font-bold text-slate-800">{selectedDoc.arrivalDate || 'Non spécifiée'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer fixe avec actions */}
      <div className="pt-8 px-8 pb-8 border-t border-slate-100 bg-slate-50/50 flex justify-between items-end flex-shrink-0">
        <div>
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Valeur Totale en Douane</span>
          <p className="text-4xl font-black text-slate-900 italic tracking-tighter">{selectedDoc.value}</p>
        </div>
        <div className="flex gap-4">
          {selectedDoc.status === RequestStatus.BROULLION ? (
            <>
              <button 
                onClick={() => {
                  setSelectedDoc(null);
                  setShowEditModal(selectedDoc);
                }}
                className="px-6 py-3 bg-slate-100 text-slate-600 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all flex items-center gap-1.5"
              >
                <i className="fas fa-edit"></i> Modifier
              </button>
              <button 
                onClick={() => setShowDeleteModal(selectedDoc.demandeId || null)}
                className="px-6 py-3 bg-red-50 text-red-600 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-red-100 transition-all flex items-center gap-1.5"
              >
                <i className="fas fa-trash"></i> Supprimer
              </button>
              <button 
                onClick={() => openPaymentModal(selectedDoc)}
                disabled={submitting}
                className="px-6 py-3 bg-tunisia-red text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-red-700 transition-all shadow-lg shadow-tunisia-red/20 flex items-center gap-1.5 disabled:opacity-50"
              >
                {submitting ? (
                  <><i className="fas fa-spinner fa-spin"></i> Chargement...</>
                ) : (
                  <><i className="fas fa-paper-plane"></i> Soumettre</>
                )}
              </button>
            </>
          ) : (
            <>
              <button className="px-8 py-4 bg-slate-100 text-slate-600 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all">
                Télécharger PDF
              </button>
              <button className="px-8 py-4 bg-tunisia-red text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-red-700 transition-all shadow-lg shadow-tunisia-red/20">
                Contacter Douane
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <i className="fas fa-spinner fa-spin text-3xl text-tunisia-red mb-4"></i>
          <p className="text-slate-500">Chargement de vos dossiers...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-10 animate-fade-in">
        {/* Statistiques */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Dossiers', count: stats.total, color: 'text-slate-900', bg: 'bg-white', icon: 'fa-folder' },
            { label: 'Brouillons', count: stats.brouillon, color: 'text-slate-500', bg: 'bg-slate-50', icon: 'fa-edit' },
            { label: 'En attente d\'informations', count: stats.en_attente_info, color: 'text-amber-500', bg: 'bg-amber-50', icon: 'fa-clock' },
            { label: 'Approuvés', count: stats.validee, color: 'text-emerald-500', bg: 'bg-emerald-50', icon: 'fa-check-circle' },
          ].map((stat, i) => (
            <div key={i} className={`p-6 rounded-[2rem] border border-slate-100 ${stat.bg} shadow-sm group hover:shadow-md transition-all`}>
              <div className="flex items-center justify-between mb-2">
                <i className={`fas ${stat.icon} ${stat.color} text-lg opacity-50`}></i>
                <span className={`text-2xl font-black italic tracking-tighter ${stat.color}`}>{stat.count}</span>
              </div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Header & Search */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8">
          <div className="space-y-4">
            <div className="flex-1">
              <h3 className="text-3xl font-black text-slate-900 uppercase italic tracking-tighter">Suivi des Dossiers</h3>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-1">Gestion en temps réel de vos importations</p>
            </div>

            {/* Filtres par statut */}
            <div className="flex flex-wrap gap-2">
              {[
                { id: 'all', label: 'Tout' },
                { id: RequestStatus.BROULLION, label: 'Brouillons' },
                { id: RequestStatus.SOUMISE, label: 'Soumises' },
                { id: RequestStatus.EN_COURS_VALIDATION, label: 'En cours' },
                { id: RequestStatus.VALIDEE, label: 'Approuvés' },
                { id: RequestStatus.REJETEE, label: 'Rejetés' },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveFilter(tab.id as any)}
                  className={`px-5 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all ${
                    activeFilter === tab.id 
                      ? 'bg-slate-900 text-white border-slate-900 shadow-lg' 
                      : 'bg-white text-slate-400 border-slate-100 hover:border-slate-300'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
          
          <div className="relative w-full md:w-80 group">
            <input 
              type="text" 
              placeholder="Rechercher un dossier..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-white border-2 border-slate-100 rounded-2xl text-xs font-bold focus:border-tunisia-red outline-none transition-all shadow-sm group-hover:border-slate-200" 
            />
            <i className="fas fa-search absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-tunisia-red transition-colors"></i>
          </div>
        </div>

        {/* Messages de succès/erreur */}
        {successMessage && (
          <div className="mt-6">
            <FormAlert message={successMessage} type="success" onClose={() => setSuccessMessage(null)} />
          </div>
        )}
        {paymentError && (
          <div className="mt-6">
            <FormAlert message={paymentError} type="error" onClose={() => setPaymentError(null)} />
          </div>
        )}

        {/* Grid of Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          {filteredDeclarations.map((dec) => (
            <div 
              key={dec.id} 
              className="group bg-white rounded-[2rem] p-8 border border-slate-100 shadow-sm hover:shadow-xl hover:border-tunisia-red/20 transition-all duration-500 relative overflow-hidden"
            >
              <div className="absolute -right-12 -top-12 w-32 h-32 bg-slate-50 rounded-full group-hover:bg-tunisia-red/5 transition-colors duration-500"></div>
              
              <div className="relative z-10">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Référence Dossier</span>
                    <h4 className="text-2xl font-black text-slate-900 italic tracking-tighter uppercase">{dec.id}</h4>
                  </div>
                  <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border transition-all duration-500 ${getStatusStyles(dec.status)}`}>
                    {dec.status}
                  </span>
                </div>

                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Exportateur</span>
                      <p className="text-sm font-bold text-slate-800 leading-tight">{dec.exporter}</p>
                    </div>
                    <div>
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Date Dépôt</span>
                      <p className="text-sm font-mono font-bold text-slate-600">{dec.date}</p>
                    </div>
                  </div>

                  {/* Informations supplémentaires dans la carte */}
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 group-hover:bg-white group-hover:border-slate-200 transition-all duration-500">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-1">Produit</span>
                        <p className="text-xs font-black text-slate-900 uppercase italic tracking-tight">{dec.product}</p>
                      </div>
                      <div>
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-1">Code NGP</span>
                        <p className="text-[10px] font-mono font-bold text-tunisia-red">{dec.ngp}</p>
                      </div>
                      {dec.invoiceNumber && (
                        <div>
                          <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-1">Facture N°</span>
                          <p className="text-xs font-bold text-slate-700">{dec.invoiceNumber}</p>
                        </div>
                      )}
                      {dec.incoterm && (
                        <div>
                          <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-1">Incoterm</span>
                          <p className="text-xs font-bold text-slate-700">{dec.incoterm}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-4 border-t border-slate-50">
                    <div>
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Valeur Douane</span>
                      <p className="text-lg font-black text-slate-900 italic tracking-tighter">{dec.value}</p>
                    </div>
                    
                    <div className="flex flex-wrap gap-2">
                      {dec.status === RequestStatus.BROULLION ? (
                        <>
                          <button 
                            className="w-10 h-10 bg-slate-900 text-white rounded-xl hover:bg-tunisia-red transition-all flex items-center justify-center shadow-lg"
                            onClick={() => setSelectedDoc(dec)}
                            title="Détails"
                          >
                            <i className="fas fa-eye text-xs"></i>
                          </button>
                          <button 
                            className="w-10 h-10 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition-all flex items-center justify-center"
                            onClick={(e) => { 
                              e.stopPropagation(); 
                              setShowEditModal(dec);
                            }}
                            title="Modifier"
                          >
                            <i className="fas fa-edit text-xs"></i>
                          </button>
                          <button 
                            className="w-10 h-10 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-all flex items-center justify-center"
                            onClick={(e) => { 
                              e.stopPropagation(); 
                              setShowDeleteModal(dec.demandeId || null);
                            }}
                            title="Supprimer"
                          >
                            <i className="fas fa-trash text-xs"></i>
                          </button>
                          <button 
                            className="w-10 h-10 bg-tunisia-red text-white rounded-xl hover:bg-red-700 transition-all shadow-lg shadow-red-500/20 flex items-center justify-center"
                            onClick={(e) => { 
                              e.stopPropagation(); 
                              openPaymentModal(dec);
                            }}
                            title="Soumettre"
                          >
                            <i className="fas fa-paper-plane text-xs"></i>
                          </button>
                        </>
                      ) : (
                        <button 
                          onClick={() => setSelectedDoc(dec)}
                          className="px-6 py-3 bg-slate-900 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-tunisia-red transition-all shadow-lg active:scale-95 flex items-center gap-2"
                        >
                          Détails <i className="fas fa-arrow-right group-hover:translate-x-1 transition-transform"></i>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {filteredDeclarations.length === 0 && (
            <div className="col-span-full py-20 text-center bg-slate-50 rounded-[3rem] border-2 border-dashed border-slate-200">
              <i className="fas fa-folder-open text-4xl text-slate-200 mb-4"></i>
              <h4 className="text-xl font-black text-slate-400 uppercase italic tracking-tighter">Aucun dossier trouvé</h4>
              <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest mt-2">Essayez d'ajuster vos critères de recherche</p>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {createPortal(
        <AnimatePresence>
          {showDeleteModal && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowDeleteModal(null)}
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="relative w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl p-10 text-center border border-slate-100"
              >
                <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6 text-3xl">
                  <i className="fas fa-exclamation-triangle"></i>
                </div>
                <h3 className="text-xl font-black text-slate-900 uppercase italic tracking-tighter mb-4">Êtes-vous sûr ?</h3>
                <p className="text-slate-500 font-medium leading-relaxed mb-8">
                  Vous êtes sur le point de supprimer cette demande. Cette action est irréversible.
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <button 
                    onClick={() => setShowDeleteModal(null)}
                    disabled={deleting}
                    className="py-4 bg-slate-100 text-slate-400 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-slate-200 transition-all disabled:opacity-50"
                  >
                    Annuler
                  </button>
                  <button 
                    onClick={handleDelete}
                    disabled={deleting}
                    className="py-4 bg-red-500 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl hover:bg-red-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {deleting ? (
                      <>
                        <i className="fas fa-spinner fa-spin"></i>
                        Suppression...
                      </>
                    ) : (
                      'Supprimer'
                    )}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* Payment Modal */}
      {createPortal(
        <AnimatePresence>
          {showPaymentModal && (
            <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => {
                  if (!paymentLoading) {
                    setShowPaymentModal(null);
                    setShowPaymentForm(false);
                    setPaymentError(null);
                    setPaymentSuccess(null);
                  }
                }}
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="relative w-full max-w-md max-h-[90vh] flex flex-col"
              >
                {!showPaymentForm ? (
                  <div className="bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-100 overflow-y-auto max-h-full">
                    <div className="p-6 border-b border-slate-100 bg-gradient-to-r from-emerald-50 to-white">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center text-lg shadow-lg">
                          <i className="fas fa-file-invoice-dollar"></i>
                        </div>
                        <div>
                          <h3 className="text-lg font-black text-slate-900 uppercase italic tracking-tighter">Confirmation</h3>
                          <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">Prêt pour le paiement</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="p-6 space-y-4">
                      <div className="bg-slate-50 rounded-2xl p-5 text-center">
                        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 mb-3">
                          <i className="fas fa-receipt text-xl"></i>
                        </div>
                        <h4 className="text-base font-black text-slate-900 mb-1">{showPaymentModal.id}</h4>
                        <p className="text-slate-500 text-xs mb-3">
                          Vous allez soumettre cette demande et procéder au paiement.
                        </p>
                        <div className="bg-white rounded-xl p-3 border border-slate-100">
                          <div className="flex justify-between items-center">
                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Montant à payer</span>
                            <span className="text-xl font-black text-emerald-600">100 TND</span>
                          </div>
                        </div>
                      </div>

                      <div className="bg-amber-50 rounded-xl p-3 border border-amber-100">
                        <div className="flex gap-2">
                          <i className="fas fa-shield-alt text-amber-600 text-sm"></i>
                          <div>
                            <p className="text-[9px] font-black text-amber-800 uppercase tracking-widest">Paiement sécurisé</p>
                            <p className="text-[8px] text-amber-700">Vos informations sont cryptées par Stripe.</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-3">
                      <button
                        onClick={() => {
                          setShowPaymentModal(null);
                          setShowPaymentForm(false);
                          setPaymentError(null);
                          setPaymentSuccess(null);
                        }}
                        className="flex-1 py-3 bg-white border border-slate-200 text-slate-600 rounded-xl font-black uppercase tracking-widest text-[9px] hover:bg-slate-100 transition-all"
                      >
                        Annuler
                      </button>
                      <button
                        onClick={handleProceedToPayment}
                        className="flex-1 py-3 bg-emerald-500 text-white rounded-xl font-black uppercase tracking-widest text-[9px] shadow-lg hover:bg-emerald-600 transition-all flex items-center justify-center gap-2"
                      >
                        <i className="fas fa-credit-card text-xs"></i>
                        Passer au paiement
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white rounded-[2rem] shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-full">
                    <div className="overflow-y-auto p-5 custom-scrollbar">
                      <PaymentForm
                        amount={100}
                        onSubmit={handlePaymentSubmit}
                        onCancel={() => {
                          if (!paymentLoading) {
                            setShowPaymentModal(null);
                            setShowPaymentForm(false);
                            setPaymentError(null);
                            setPaymentSuccess(null);
                          }
                        }}
                        onBack={handleBackToConfirmation}
                        isLoading={paymentLoading}
                        error={paymentError}
                        success={paymentSuccess}
                      />
                    </div>
                  </div>
                )}
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* Edit Declaration Modal - Avec Portal */}
      {createPortal(
        <AnimatePresence>
          {showEditModal && (
            <div className="fixed inset-0 z-[400] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowEditModal(null)}
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto"
              >
                <EditImporterDeclarationModal 
                  declaration={showEditModal}
                  onClose={() => setShowEditModal(null)}
                  onSave={(data) => {
                    console.log('Saved data:', data);
                    setShowEditModal(null);
                    fetchDemandes();
                  }}
                />
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
};

export default ImporterTracking;