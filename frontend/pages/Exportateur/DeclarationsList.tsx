import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import axios from 'axios';
import { Product } from '@/types/Product';
import { DemandeEnregistrement } from '@/types/DemandeEnregistrement';
import PaymentForm from '../../components/PaymentForm';
import EditDeclarationModal from './EditDeclarationModal';
import FormAlert from '../../components/FormAlert'; // ✅ AJOUTÉ

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080/api';

const DeclarationsList: React.FC = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  const [selectedDeclaration, setSelectedDeclaration] = useState<DemandeEnregistrement | null>(null);
  const [declarations, setDeclarations] = useState<DemandeEnregistrement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState<number | null>(null);
  const [showEditModal, setShowEditModal] = useState<any | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState<DemandeEnregistrement | null>(null);
  const [alertMessage, setAlertMessage] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  
  // États pour le paiement
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [paymentSuccess, setPaymentSuccess] = useState<{ message: string; amount?: number } | null>(null);

  // Configuration axios avec token
  const axiosInstance = axios.create({
    baseURL: API_URL,
  });

  axiosInstance.interceptors.request.use(
    (config) => {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => Promise.reject(error)
  );

  useEffect(() => {
    fetchDemandes();
  }, []);

  const fetchDemandes = async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.get('/produits/mes-demandes');
      setDeclarations(response.data);
      console.log('Demandes reçues:', response.data);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur lors du chargement des demandes');
      console.error('Erreur:', err);
    } finally {
      setLoading(false);
    }
  };

  const showAlert = (message: string, type: 'success' | 'error') => {
    setAlertMessage({ message, type });
    setTimeout(() => setAlertMessage(null), 5000);
  };

  const handleDeleteDeclaration = async (id: number) => {
  try {
    // Appel DELETE à l'API
    await axiosInstance.delete(`/produits/${id}`);
    showAlert(`La demande ${id} a été supprimée avec succès.`, 'success');
    setShowDeleteModal(null);
    fetchDemandes(); // Recharger la liste
  } catch (err: any) {
    const errorMessage = err.response?.data?.message || 'Erreur lors de la suppression';
    showAlert(errorMessage, 'error');
  }
};

  const handleProceedToPayment = () => {
    setShowPaymentForm(true);
  };

  const handleBackToConfirmation = () => {
    setShowPaymentForm(false);
    setPaymentError(null);
    setPaymentSuccess(null);
  };

  const handlePaymentSubmit = async (paymentDetails: {
    paymentMethodId: string;
    cardHolder: string;
    receiptEmail: string;
  }) => {
    if (!showPaymentModal) return;

    setPaymentLoading(true);
    setPaymentError(null);
    setPaymentSuccess(null);

    try {
      // 1. D'ABORD, soumettre la demande (changer statut de BROUILLON à SOUMISE)
      console.log('📤 Étape 1: Soumission de la demande...');
      await axiosInstance.post(`/produits/${showPaymentModal.id}/soumettre`);
      console.log('✅ Demande soumise avec succès');

      // 2. ENSUITE, créer l'intention de paiement
      console.log('💰 Étape 2: Création de l\'intention de paiement...');
      const paymentIntentResponse = await axiosInstance.post('/stripe-payment/create-intent', {
        demandeId: showPaymentModal.id,
        successUrl: window.location.origin + '/payment-success',
        cancelUrl: window.location.origin + '/payment-cancel'
      });

      const { paymentIntentId, clientSecret } = paymentIntentResponse.data;

      if (!paymentIntentId) {
        throw new Error('Impossible de créer l\'intention de paiement');
      }

      // 3. Confirmer le paiement
      console.log('💳 Étape 3: Confirmation du paiement...');
      const confirmResponse = await axiosInstance.post('/stripe-payment/confirm-payment', {
        paymentIntentId: paymentIntentId,
        demandeId: showPaymentModal.id,
        paymentMethodId: paymentDetails.paymentMethodId,
        cardHolderName: paymentDetails.cardHolder,
        receiptEmail: paymentDetails.receiptEmail
      });

      if (confirmResponse.data.success) {
        setPaymentSuccess({
          message: 'Paiement effectué avec succès ! Votre demande a été soumise.',
          amount: confirmResponse.data.amount
        });

        // Attendre 2 secondes
        setTimeout(() => {
          setShowPaymentModal(null);
          setShowPaymentForm(false);
          setPaymentSuccess(null);
          setPaymentError(null);
          fetchDemandes();
          showAlert('Demande soumise avec succès', 'success');
        }, 2000);
        
      } else {
        throw new Error(confirmResponse.data.message || 'Le paiement a échoué');
      }
      
    } catch (err: any) {
      console.error('Erreur:', err);
      const errorMessage = err.response?.data?.message || err.message || 'Erreur lors du traitement';
      setPaymentError(errorMessage);
    } finally {
      setPaymentLoading(false);
    }
  };

  const getImageUrl = (imagePath: string | undefined | null): string => {
    if (!imagePath) return '';
    if (imagePath.startsWith('http')) return imagePath;
    if (imagePath.startsWith('/api')) {
      return `http://localhost:8080${imagePath}`;
    }
    return `http://localhost:8080${imagePath}`;
  };

  const getStatusStyle = (status: string) => {
    const statusMap: { [key: string]: string } = {
      'VALIDEE': 'bg-emerald-50 text-emerald-600 border-emerald-100',
      'REJETEE': 'bg-red-50 text-red-600 border-red-100',
      'SOUMISE': 'bg-blue-50 text-blue-600 border-blue-100',
      'EN_ATTENTE': 'bg-amber-50 text-amber-600 border-amber-100',
      'BROUILLON': 'bg-slate-50 text-slate-600 border-slate-100'
    };
    return statusMap[status] || 'bg-slate-50 text-slate-600 border-slate-100';
  };

  const getStatusText = (status: string) => {
    const statusMap: { [key: string]: string } = {
      'BROUILLON': 'Brouillon',
      'SOUMISE': 'Soumise',
      'EN_ATTENTE': 'En attente',
      'VALIDEE': 'Validée',
      'REJETEE': 'Rejetée'
    };
    return statusMap[status] || status;
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('fr-FR');
  };

  const formatProductList = (products: Product[] | undefined) => {
    if (!products || products.length === 0) return 'Aucun produit';
    if (products.length === 1) return products[0].productName;
    return `${products[0].productName} et ${products.length - 1} autre(s)`;
  };

  const getProductWeight = (product: Product) => {
    if (product.annualQuantityValue && product.annualQuantityUnit) {
      return `${product.annualQuantityValue} ${product.annualQuantityUnit}`;
    }
    return 'N/A';
  };

  const filteredDeclarations = declarations.filter(dec => 
    (dec.products?.some(p => 
      p.productName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.ngp?.toLowerCase().includes(searchTerm.toLowerCase())
    ) || false) || 
    dec.reference?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.ceil(filteredDeclarations.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentDeclarations = filteredDeclarations.slice(startIndex, startIndex + itemsPerPage);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-tunisia-red"></div>
      </div>
    );
  }

  return (
    <>
      {/* ✅ Alert Toast avec FormAlert */}
      <AnimatePresence>
        {alertMessage && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="fixed top-4 right-4 z-[300] w-96"
          >
            <FormAlert
              type={alertMessage.type}
              message={alertMessage.message}
              onClose={() => setAlertMessage(null)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-6xl mx-auto space-y-8"
      >
        <br />
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100">
          <div>
            <button 
              onClick={() => navigate('/exporter')}
              className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-tunisia-red transition-colors mb-2 flex items-center gap-2"
            >
              <i className="fas fa-arrow-left"></i> Retour au Dashboard
            </button>
            <h1 className="text-3xl font-black text-slate-900 tracking-tighter italic uppercase leading-none">Liste des Déclarations</h1>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-3">Historique complet de vos exportations</p>
          </div>
          
          <div className="flex items-center gap-4 w-full md:w-auto">
            <div className="relative flex-grow md:w-80">
              <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 text-xs"></i>
              <input 
                type="text" 
                placeholder="Rechercher par produit, référence ou NGP..." 
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                className="w-full pl-10 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-[11px] font-bold outline-none focus:border-tunisia-red transition-all shadow-inner"
              />
            </div>
            <button 
              onClick={() => navigate('/declare-product')}
              className="bg-tunisia-red text-white px-8 py-4 rounded-2xl shadow-xl shadow-red-500/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-3 group whitespace-nowrap"
            >
              <i className="fas fa-plus-circle"></i>
              <span className="text-[10px] font-black uppercase tracking-widest">Nouvelle</span>
            </button>
          </div>
        </div>

        {/* ✅ Affichage de l'erreur avec FormAlert */}
        {error && (
          <FormAlert
            type="error"
            message={error}
            onClose={() => setError(null)}
          />
        )}

        <div className="bg-white rounded-[3rem] shadow-xl border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Référence</th>
                  <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Produit(s)</th>
                  <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Détails</th>
                  <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Statut</th>
                  <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                <AnimatePresence mode="wait">
                  {currentDeclarations.map((dec) => (
                    <motion.tr 
                      key={dec.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="hover:bg-slate-50/30 transition-colors group"
                    >
                      <td className="px-8 py-6">
                        <span className="text-[10px] font-mono font-bold bg-slate-900 text-white px-3 py-1 rounded-full">{dec.reference}</span>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-2">
                          {formatDate(dec.submittedAt)}
                        </p>
                       </td>
                      <td className="px-8 py-6">
                        <h4 className="font-black text-slate-900 text-sm tracking-tight uppercase italic">
                          {formatProductList(dec.products)}
                        </h4>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                          {dec.products?.length} produit(s) • {dec.documents?.length} document(s)
                        </p>
                       </td>
                      <td className="px-8 py-6">
                        <div className="flex flex-col gap-1">
                          {dec.numeroAgrement && (
                            <span className="text-[9px] font-bold text-emerald-600 uppercase tracking-tight flex items-center gap-2">
                              <i className="fas fa-certificate text-emerald-300 w-3"></i> {dec.numeroAgrement}
                            </span>
                          )}
                          <span className="text-[9px] font-bold text-slate-600 uppercase tracking-tight flex items-center gap-2">
                            <i className="fas fa-credit-card text-slate-300 w-3"></i> {dec.paymentStatus}
                          </span>
                        </div>
                       </td>
                      <td className="px-8 py-6">
                        <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border flex items-center gap-2 w-fit ${getStatusStyle(dec.status)}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            dec.status === 'VALIDEE' ? 'bg-emerald-500' : 
                            dec.status === 'REJETEE' ? 'bg-red-500' : 
                            dec.status === 'SOUMISE' ? 'bg-blue-500 animate-pulse' :
                            'bg-amber-500 animate-pulse'
                          }`}></span>
                          {getStatusText(dec.status)}
                        </span>
                       </td>
                      <td className="px-8 py-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {dec.status === 'BROUILLON' && (
                            <>
                              <button 
                                onClick={() => setShowEditModal(dec)}
                                className="w-10 h-10 rounded-xl bg-blue-50 text-blue-400 hover:bg-blue-500 hover:text-white transition-all shadow-sm"
                                title="Modifier"
                              >
                                <i className="fas fa-edit"></i>
                              </button>
                              <button 
                                onClick={() => setShowDeleteModal(dec.id)}
                                className="w-10 h-10 rounded-xl bg-red-50 text-red-400 hover:bg-red-500 hover:text-white transition-all shadow-sm"
                                title="Supprimer"
                              >
                                <i className="fas fa-trash"></i>
                              </button>
                              <button 
                                onClick={() => {
                                  setShowPaymentModal(dec);
                                  setShowPaymentForm(false);
                                }}
                                className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-400 hover:bg-emerald-500 hover:text-white transition-all shadow-sm"
                                title="Soumettre"
                              >
                                <i className="fas fa-paper-plane"></i>
                              </button>
                            </>
                          )}
                          <button 
                            onClick={() => setSelectedDeclaration(dec)}
                            className="w-10 h-10 rounded-xl bg-slate-50 text-slate-400 hover:bg-tunisia-red hover:text-white transition-all shadow-sm"
                            title="Voir Détails"
                          >
                            <i className="fas fa-eye"></i>
                          </button>
                        </div>
                       </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="p-8 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Affichage de <span className="text-slate-900">{startIndex + 1}</span> à <span className="text-slate-900">{Math.min(startIndex + itemsPerPage, filteredDeclarations.length)}</span> sur <span className="text-slate-900">{filteredDeclarations.length}</span> résultats
            </p>
            <div className="flex items-center gap-2">
              <button 
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => prev - 1)}
                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${currentPage === 1 ? 'text-slate-200 cursor-not-allowed' : 'bg-white text-slate-600 hover:bg-tunisia-red hover:text-white shadow-sm border border-slate-100'}`}
              >
                <i className="fas fa-chevron-left text-xs"></i>
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`w-10 h-10 rounded-xl text-[10px] font-black transition-all ${currentPage === page ? 'bg-tunisia-red text-white shadow-lg shadow-red-200' : 'bg-white text-slate-600 hover:bg-slate-50 shadow-sm border border-slate-100'}`}
                >
                  {page}
                </button>
              ))}
              <button 
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => prev + 1)}
                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${currentPage === totalPages ? 'text-slate-200 cursor-not-allowed' : 'bg-white text-slate-600 hover:bg-tunisia-red hover:text-white shadow-sm border border-slate-100'}`}
              >
                <i className="fas fa-chevron-right text-xs"></i>
              </button>
            </div>
          </div>
        </div>

        {/* Modal de Détails avec Images des produits */}
        <AnimatePresence>
          {selectedDeclaration && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setSelectedDeclaration(null)}
                className="absolute inset-0 bg-slate-900/40 backdrop-blur-md"
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative w-full max-w-5xl bg-[#FDFDFD] rounded-[2.5rem] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.25)] overflow-hidden max-h-[90vh] flex flex-col border border-white border-t-4 border-t-tunisia-red"
              >
                {/* Header Premium */}
                <div className="px-10 py-8 border-b border-slate-100 flex justify-between items-center shrink-0 bg-white/50 backdrop-blur-sm">
                  <div className="flex items-center gap-5">
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-xl shadow-inner bg-slate-100 text-slate-600">
                      <i className="fas fa-file-alt"></i>
                    </div>
                    <div>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5">
                          <span className="w-1 h-1 rounded-full bg-tunisia-red animate-pulse"></span>
                          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Dossier de Déclaration</span>
                        </div>
                        <span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest border ${getStatusStyle(selectedDeclaration.status)}`}>
                          {getStatusText(selectedDeclaration.status)}
                        </span>
                      </div>
                      <h3 className="text-2xl font-black italic tracking-tighter uppercase text-slate-900 mt-0.5">{selectedDeclaration.reference}</h3>
                    </div>
                  </div>
                  <button 
                    onClick={() => setSelectedDeclaration(null)}
                    className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center hover:bg-tunisia-red hover:text-white transition-all group shadow-sm"
                  >
                    <i className="fas fa-times text-slate-400 group-hover:text-white transition-colors"></i>
                  </button>
                </div>

                {/* Content */}
                <div className="p-10 overflow-y-auto custom-scrollbar space-y-10">
                  {/* Informations de la demande */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="md:col-span-2 p-8 bg-white rounded-[2rem] border border-slate-100 shadow-sm">
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-emerald-600 flex items-center gap-2 mb-4">
                        <i className="fas fa-info-circle"></i> Informations Générales
                      </h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">Date de soumission</p>
                          <p className="text-sm font-bold text-slate-900">{formatDate(selectedDeclaration.submittedAt)}</p>
                        </div>
                        <div>
                          <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">Statut de paiement</p>
                          <p className="text-sm font-bold text-slate-900">{selectedDeclaration.paymentStatus}</p>
                        </div>
                        {selectedDeclaration.numeroAgrement && (
                          <>
                            <div>
                              <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">N° Agrément</p>
                              <p className="text-sm font-bold text-emerald-600">{selectedDeclaration.numeroAgrement}</p>
                            </div>
                            <div>
                              <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">Date d'agrément</p>
                              <p className="text-sm font-bold text-slate-900">{formatDate(selectedDeclaration.dateAgrement ?? null) || 'N/A'}</p>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                    
                    <div className="p-8 bg-slate-900 rounded-[2rem] text-white shadow-xl border-t-4 border-t-tunisia-red">
                      <h4 className="text-[9px] font-black uppercase tracking-widest text-tunisia-red mb-4">Documents</h4>
                      <p className="text-3xl font-black italic tracking-tighter text-white">{selectedDeclaration.documents?.length || 'N/A'}</p>
                      <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-1">Documents fournis</p>
                    </div>
                  </div>

                  {/* Liste des produits */}
                  <div className="space-y-6">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                      <i className="fas fa-boxes"></i> Produits déclarés ({selectedDeclaration.products?.length || 'N/A'})
                    </h4>
                    
                    {selectedDeclaration.products?.map((product) => (
                      <div key={product.id} className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
                        <div className="p-6 border-b border-slate-100 bg-slate-50/30">
                          <div className="flex items-center gap-4">
                            {product.productImage ? (
                              <div 
                                className="relative group overflow-hidden rounded-xl w-20 h-20 bg-slate-100 cursor-pointer flex-shrink-0 shadow-sm"
                                onClick={() => {setPreviewImage(getImageUrl(product.productImage));}}
                              >
                                <img 
                                  src={getImageUrl(product.productImage) || 'https://via.placeholder.com/150'}
                                  alt={product.productName} 
                                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                  referrerPolicy="no-referrer"
                                />
                                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                                  <i className="fas fa-search-plus text-white text-xl"></i>
                                </div>
                              </div>
                            ) : (
                              <div className="w-20 h-20 rounded-xl bg-slate-100 flex items-center justify-center text-slate-300 flex-shrink-0">
                                <i className="fas fa-image text-2xl"></i>
                              </div>
                            )}
                            
                            <div className="flex-1">
                              <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm ${
                                  product.productType === 'alimentaire' ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'
                                }`}>
                                  <i className={`fas ${product.productType === 'alimentaire' ? 'fa-apple-whole' : 'fa-gears'}`}></i>
                                </div>
                                <div>
                                  <h5 className="text-base font-black text-slate-900 uppercase italic">{product.productName}</h5>
                                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                                    NGP: {product.ngp} • {product.category} • {product.originCountry}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">Type</p>
                            <p className="text-xs font-bold text-slate-900 mt-1 capitalize">{product.productType}</p>
                          </div>
                          <div>
                            <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">État</p>
                            <p className="text-xs font-bold text-slate-900 mt-1">{product.productState || 'N/A'}</p>
                          </div>
                          <div>
                            <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">Quantité annuelle</p>
                            <p className="text-xs font-bold text-slate-900 mt-1">{getProductWeight(product)}</p>
                          </div>
                          
                          {product.isLinkedToBrand && (
                            <div className="md:col-span-3 pt-4 border-t border-slate-100">
                              <p className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-2">Marque</p>
                              <div className="flex flex-wrap gap-2">
                                <span className="px-3 py-1.5 bg-slate-50 rounded-xl text-[9px] font-bold text-slate-700">
                                  {product.brandName || product.commercialBrandName}
                                </span>
                                {product.isBrandOwner && (
                                  <span className="px-3 py-1.5 bg-emerald-50 rounded-xl text-[9px] font-bold text-emerald-700">
                                    Propriétaire
                                  </span>
                                )}
                                {product.hasBrandLicense && (
                                  <span className="px-3 py-1.5 bg-blue-50 rounded-xl text-[9px] font-bold text-blue-700">
                                    Licence
                                  </span>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Footer */}
                <div className="px-10 py-8 bg-white border-t border-slate-100 shrink-0 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <i className="fas fa-shield-halved text-tunisia-red text-sm"></i>
                    <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">Document Officiel • République Tunisienne</span>
                  </div>
                  <div className="flex items-center gap-3">
                    {selectedDeclaration.status === 'BROUILLON' && (
                      <>
                        <button 
                          onClick={() => {
                            const id = selectedDeclaration.id;
                            setSelectedDeclaration(null);
                            setShowEditModal(selectedDeclaration);
                          }}
                          className="px-6 py-4 bg-blue-500 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl hover:bg-blue-600 transition-all flex items-center gap-2"
                        >
                          <i className="fas fa-edit"></i> Modifier
                        </button>
                        <button 
                          onClick={() => {
                            const id = selectedDeclaration.id;
                            setSelectedDeclaration(null);
                            setShowDeleteModal(id);
                          }}
                          className="px-6 py-4 bg-red-500 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl hover:bg-red-600 transition-all flex items-center gap-2"
                        >
                          <i className="fas fa-trash"></i> Supprimer
                        </button>
                        <button 
                          onClick={() => {
                            const dec = selectedDeclaration;
                            setSelectedDeclaration(null);
                            setShowPaymentModal(dec);
                            setShowPaymentForm(false);
                          }}
                          className="px-6 py-4 bg-emerald-500 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl hover:bg-emerald-600 transition-all flex items-center gap-2"
                        >
                          <i className="fas fa-paper-plane"></i> Soumettre
                        </button>
                      </>
                    )}
                    <button 
                      onClick={() => setSelectedDeclaration(null)}
                      className="px-10 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl hover:bg-black transition-all active:scale-95"
                    >
                      Fermer
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Fullscreen Image Preview Modal */}
      <AnimatePresence>
        {previewImage && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 md:p-12">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setPreviewImage(null)}
              className="absolute inset-0 bg-slate-900/90 backdrop-blur-xl cursor-zoom-out"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative max-w-5xl w-full h-full flex flex-col gap-6"
            >
              <div className="flex justify-between items-center text-white shrink-0">
                <div className="flex items-center gap-3">
                  <i className="fas fa-image text-tunisia-red"></i>
                  <span className="text-[10px] font-black uppercase tracking-widest">Aperçu Haute Définition</span>
                </div>
                <button 
                  onClick={() => setPreviewImage(null)}
                  className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all"
                >
                  <i className="fas fa-times"></i>
                </button>
              </div>
              <div className="flex-1 overflow-hidden rounded-[2.5rem] bg-black/20 border border-white/10 shadow-2xl relative group">
                <img 
                  src={previewImage} 
                  className="w-full h-full object-contain"
                  alt="Aperçu"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 px-6 py-3 bg-black/50 backdrop-blur-md rounded-full border border-white/10 text-[10px] font-black uppercase tracking-widest text-white/50 opacity-0 group-hover:opacity-100 transition-opacity">
                  Utilisez la molette pour zoomer • Cliquez en dehors pour fermer
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
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
                Vous êtes sur le point de supprimer la demande <span className="font-black text-slate-900">{showDeleteModal}</span>. Cette action est irréversible.
              </p>
              <div className="grid grid-cols-2 gap-4">
                <button 
                  onClick={() => setShowDeleteModal(null)}
                  className="py-4 bg-slate-100 text-slate-400 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-slate-200 transition-all"
                >
                  Annuler
                </button>
                <button 
                  onClick={() => handleDeleteDeclaration(showDeleteModal)}
                  className="py-4 bg-red-500 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl hover:bg-red-600 transition-all"
                >
                  Supprimer
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Payment Modal - avec deux étapes */}
      <AnimatePresence>
        {showPaymentModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
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
              className="relative w-full max-w-lg"
            >
              {!showPaymentForm ? (
                // Étape 1: Modal de confirmation "Passer au paiement"
                <div className="bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-100">
                  <div className="p-8 border-b border-slate-100 bg-gradient-to-r from-emerald-50 to-white">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-2xl bg-emerald-500 text-white flex items-center justify-center text-xl shadow-lg">
                        <i className="fas fa-file-invoice-dollar"></i>
                      </div>
                      <div>
                        <h3 className="text-xl font-black text-slate-900 uppercase italic tracking-tighter">Confirmation</h3>
                        <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Prêt pour le paiement</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-8 space-y-6">
                    <div className="bg-slate-50 rounded-2xl p-6 text-center">
                      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 mb-4">
                        <i className="fas fa-receipt text-2xl"></i>
                      </div>
                      <h4 className="text-lg font-black text-slate-900 mb-2">{showPaymentModal.reference}</h4>
                      <p className="text-slate-500 text-sm mb-4">
                        Vous allez soumettre cette demande et procéder au paiement.
                      </p>
                      <div className="bg-white rounded-xl p-4 border border-slate-100">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Montant à payer</span>
                          <span className="text-2xl font-black text-emerald-600">100 DT</span>
                        </div>
                        <p className="text-[8px] text-slate-400 text-left">
                          <i className="fas fa-info-circle mr-1"></i> Ce montant inclut les frais de traitement
                        </p>
                      </div>
                    </div>

                    <div className="bg-amber-50 rounded-xl p-4 border border-amber-100">
                      <div className="flex gap-3">
                        <i className="fas fa-shield-alt text-amber-600 text-lg"></i>
                        <div>
                          <p className="text-[10px] font-black text-amber-800 uppercase tracking-widest">Paiement sécurisé</p>
                          <p className="text-[9px] text-amber-700 mt-1">
                            Vos informations bancaires sont cryptées et sécurisées par Stripe.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-8 bg-slate-50 border-t border-slate-100 flex gap-4">
                    <button
                      onClick={() => {
                        setShowPaymentModal(null);
                        setShowPaymentForm(false);
                      }}
                      className="flex-1 py-4 bg-white border border-slate-200 text-slate-600 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-slate-100 transition-all"
                    >
                      Annuler
                    </button>
                    <button
                      onClick={handleProceedToPayment}
                      className="flex-1 py-4 bg-emerald-500 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg hover:bg-emerald-600 transition-all flex items-center justify-center gap-2"
                    >
                      <i className="fas fa-credit-card"></i>
                      Passer au paiement
                    </button>
                  </div>
                </div>
              ) : (
                // Étape 2: Formulaire de paiement
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
              )}
              
            </motion.div>
          </div>
        )}
      </AnimatePresence>

       {/* Edit Declaration Modal (Simple Form) */}
        <AnimatePresence>
          {showEditModal && (
            <EditDeclarationModal 
              declaration={showEditModal}  // Maintenant c'est l'objet complet
              onClose={() => setShowEditModal(null)}
              onSave={async (updatedData) => {
                try {
                  // Appel API pour mettre à jour la déclaration
                  await axiosInstance.put(`/produits/${showEditModal.id}`, updatedData);
                  showAlert('Déclaration modifiée avec succès', 'success');
                  setShowEditModal(null);
                  fetchDemandes(); // Recharger la liste
                } catch (err: any) {
                  showAlert(err.response?.data?.message || 'Erreur lors de la modification', 'error');
                }
              }}
            />
          )}
        </AnimatePresence>
    </>
  );
};

export default DeclarationsList;