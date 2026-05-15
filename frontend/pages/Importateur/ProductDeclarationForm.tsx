import React, { useState } from 'react';
import { X, Upload, FileText, Ship, Plane, Truck, Info, Check, Loader2, Save } from 'lucide-react';
import { ProductDeclarationFormProps } from '../../types/ProductDeclarationFormProps';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import PaymentForm from '../../components/PaymentForm';

const API_BASE_URL = process.env.REACT_APP_API_URL || '/api';

interface FileWithProgress extends File {
  progress?: number;
}

const ProductDeclarationForm: React.FC<ProductDeclarationFormProps> = ({ 
  product, 
  exporter, 
  onClose, 
  onSuccess,
  onDeclarationCreated
}) => {
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [showDraftModal, setShowDraftModal] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});
  const [error, setError] = useState<string | null>(null);
  const [demandeId, setDemandeId] = useState<number | null>(null);
  
  // États pour le paiement
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [paymentSuccess, setPaymentSuccess] = useState<{ message: string; amount?: number } | null>(null);
  const [isPaid, setIsPaid] = useState(false);
  
  const [formData, setFormData] = useState({
    invoiceNumber: '',
    invoiceDate: '',
    amount: '',
    currency: 'TND',
    incoterm: 'FOB',
    transportMode: 'Maritime',
    loadingPort: '',
    dischargePort: '',
    arrivalDate: '',
  });

  const [files, setFiles] = useState<{ [key: string]: File | null }>({
    'Facture commerciale (PDF)': null,
    'Documents de transport (BL/LTA)': null,
    'Autres documents requis': null,
  });

  const getProductPlaceholder = (category: string) => {
    switch (category) {
      case "Produits laitiers":
        return { color: 'bg-sky-50 text-sky-400', icon: 'fa-cheese', label: 'Produits laitiers' };
      case "Fruits et Légumes":
        return { color: 'bg-emerald-50 text-emerald-400', icon: 'fa-apple-alt', label: 'Fruits & Légumes' };
      case "Huiles végétales":
        return { color: 'bg-amber-50 text-amber-400', icon: 'fa-oil-can', label: 'Huiles' };
      case "Préparations de viandes":
        return { color: 'bg-rose-50 text-rose-400', icon: 'fa-drumstick-bite', label: 'Viandes' };
      case "Sucres et sucreries":
        return { color: 'bg-pink-50 text-pink-400', icon: 'fa-candy-cane', label: 'Sucreries' };
      case "Machines et appareils":
        return { color: 'bg-slate-50 text-slate-400', icon: 'fa-cogs', label: 'Machines' };
      case "Appareils électriques":
        return { color: 'bg-indigo-50 text-indigo-400', icon: 'fa-bolt', label: 'Électrique' };
      case "Jouets et modèles":
        return { color: 'bg-purple-50 text-purple-400', icon: 'fa-puzzle-piece', label: 'Jouets' };
      case "Meubles":
        return { color: 'bg-orange-50 text-orange-400', icon: 'fa-couch', label: 'Meubles' };
      default:
        return { color: 'bg-emerald-50 text-emerald-400', icon: 'fa-utensils', label: 'Alimentaire' };
    }
  };

  const getFlagUrl = (country: string) => {
    const code = country || 'UN';
    return `https://flagcdn.com/w160/${code.toLowerCase()}.png`;
  };

  const handleFileChange = (label: string, file: File | null) => {
    if (file) {
      const maxSize = 5 * 1024 * 1024;
      if (file.size > maxSize) {
        setError(`Le fichier "${file.name}" dépasse la taille maximale autorisée de 5 Mo.`);
        return;
      }
      
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];
      if (!allowedTypes.includes(file.type)) {
        setError('Seuls les fichiers PDF, JPEG et PNG sont autorisés.');
        return;
      }
    }
    
    setFiles(prev => ({ ...prev, [label]: file }));
    if (error) setError(null);
  };

  const uploadFile = async (file: File, demandeIdParam: number, documentType: string): Promise<boolean> => {
    const token = localStorage.getItem('token');
    
    if (!token) {
      throw new Error('Session expirée. Veuillez vous reconnecter.');
    }
    
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const response = await axios.post(
        `${API_BASE_URL}/importateur/demandes/${demandeIdParam}/documents?documentType=${encodeURIComponent(documentType)}`,
        formData,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'multipart/form-data',
          },
          timeout: 30000,
          onUploadProgress: (progressEvent) => {
            if (progressEvent.total) {
              const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
              setUploadProgress(prev => ({ ...prev, [documentType]: percentCompleted }));
            }
          }
        }
      );
      return response.data.success;
    } catch (error: any) {
      console.error(`Erreur lors de l'upload du fichier ${documentType}:`, error);
      
      let errorMessage = `Erreur lors de l'upload du fichier: ${file.name}`;
      
      if (error.userMessage) {
        errorMessage = error.userMessage;
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      throw new Error(errorMessage);
    }
  };

  const getDocumentType = (label: string): string => {
    switch (label) {
      case 'Facture commerciale (PDF)':
        return 'INVOICE';
      case 'Documents de transport (BL/LTA)':
        return 'TRANSPORT_DOCUMENT';
      case 'Autres documents requis':
        return 'OTHER_DOCUMENT';
      default:
        return 'OTHER_DOCUMENT';
    }
  };

  const createDemandeOnly = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('Session expirée. Veuillez vous reconnecter.');
    }
    
    const demandeRequest = {
      produitId: product.id,
      exportateurId: exporter.id,
      exportateurName: exporter.nom || exporter.companyName || 'Exportateur',
      exportateurCountry: exporter.paysOrigine || 'UN',
      productName: product.productName,
      hsCode: product.hsCode,
      category: product.category,
      invoiceNumber: formData.invoiceNumber,
      invoiceDate: formData.invoiceDate,
      amount: parseFloat(formData.amount),
      currency: formData.currency,
      incoterm: formData.incoterm,
      transportMode: formData.transportMode,
      loadingPort: formData.loadingPort,
      dischargePort: formData.dischargePort,
      arrivalDate: formData.arrivalDate,
      documents: []
    };
    
    console.log('Création de la demande d\'importation:', demandeRequest);
    
    const demandeResponse = await axios.post(
      `${API_BASE_URL}/importateur/demandes`,
      demandeRequest,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );
    
    return demandeResponse.data;
  };

  const uploadAllDocuments = async (demandeIdParam: number) => {
    const uploadPromises: Promise<boolean>[] = [];
    const uploadErrors: string[] = [];
    
    for (const [label, file] of Object.entries(files)) {
      if (file && file instanceof File) {
        const documentType = getDocumentType(label);
        uploadPromises.push(
          uploadFile(file, demandeIdParam, documentType).catch((err) => {
            uploadErrors.push(`${label}: ${err.message}`);
            throw err;
          })
        );
      }
    }
    
    if (uploadPromises.length > 0) {
      await Promise.all(uploadPromises);
    }
    
    return uploadErrors;
  };

  const submitDemande = async (demandeIdParam: number) => {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('Session expirée. Veuillez vous reconnecter.');
    }
    
    console.log('📤 Soumission de la demande ID:', demandeIdParam);
    const response = await axios.post(
      `${API_BASE_URL}/importateur/demandes/${demandeIdParam}/soumettre`,
      {},
      {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      }
    );
    return response.data;
  };

  const handleCreatePaymentIntent = async (demandeIdParam: number) => {
    const token = localStorage.getItem('token');
    const response = await axios.post(
      '/api/stripe-payment/create-intent',
      {
        demandeId: demandeIdParam,
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

  const handleProcessPayment = async (paymentIntentId: string, paymentDetails: any, demandeIdParam: number) => {
    const token = localStorage.getItem('token');
    const paymentRequest = {
      paymentIntentId: paymentIntentId,
      demandeId: demandeIdParam,
      paymentMethodId: paymentDetails.paymentMethodId,
      cardHolderName: paymentDetails.cardHolder,
      receiptEmail: paymentDetails.receiptEmail
    };
    const response = await axios.post(
      '/api/stripe-payment/confirm-payment',
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

  const handleSaveDraft = async () => {
    setShowDraftModal(false);
    setIsSavingDraft(true);
    setError(null);
    
    try {
      if (!files['Facture commerciale (PDF)'] || !files['Documents de transport (BL/LTA)']) {
        setError('Veuillez télécharger la facture commerciale et les documents de transport avant de sauvegarder.');
        setIsSavingDraft(false);
        return;
      }
      
      const demande = await createDemandeOnly();
      console.log('Demande créée en brouillon:', demande);
      
      await uploadAllDocuments(demande.id);
      console.log('Documents uploadés avec succès');
      
      if (onDeclarationCreated) {
        onDeclarationCreated(demande.id);
      }
      
      if (onSuccess) {
        onSuccess();
      }
      
      onClose();
      
    } catch (error: any) {
      console.error('Erreur lors de la sauvegarde du brouillon:', error);
      let errorMessage = 'Une erreur est survenue lors de la sauvegarde.';
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      setError(errorMessage);
    } finally {
      setIsSavingDraft(false);
    }
  };

  const handlePaymentSubmit = async (paymentDetails: any) => {
    if (!demandeId) {
      setPaymentError('Aucune demande trouvée.');
      return;
    }

    setPaymentLoading(true);
    setPaymentError(null);
    setPaymentSuccess(null);

    try {
      console.log('💰 Paiement pour la demande ID:', demandeId);

      const createIntentResponse = await handleCreatePaymentIntent(demandeId);
      const paymentIntentId = createIntentResponse.paymentIntentId;

      if (!paymentIntentId) {
        throw new Error('Impossible de créer le PaymentIntent');
      }

      console.log('✅ PaymentIntent créé:', paymentIntentId);

      const result = await handleProcessPayment(paymentIntentId, paymentDetails, demandeId);

      if (result.success) {
        setPaymentSuccess({
          message: 'Paiement effectué avec succès! Votre demande a été soumise.',
          amount: result.amount
        });

        setIsPaid(true);

        setTimeout(() => {
          if (onSuccess) {
            onSuccess();
          }
          onClose();
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (step === 1) {
      setStep(2);
      return;
    }
    
    if (step === 2) {
      const maxSize = 5 * 1024 * 1024;
      
      for (const [label, file] of Object.entries(files)) {
        if (file && file instanceof File && file.size > maxSize) {
          setError(`Le fichier "${file.name}" dépasse la taille maximale de 5 Mo.`);
          return;
        }
      }
      
      if (!files['Facture commerciale (PDF)'] || !files['Documents de transport (BL/LTA)']) {
        setError('Veuillez télécharger la facture commerciale et les documents de transport.');
        return;
      }
      
      setIsSubmitting(true);
      setError(null);
      
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          throw new Error('Session expirée. Veuillez vous reconnecter.');
        }
        
        const demande = await createDemandeOnly();
        console.log('Demande créée:', demande);
        setDemandeId(demande.id);
        
        await uploadAllDocuments(demande.id);
        console.log('Documents uploadés avec succès');
        
        if (onDeclarationCreated) {
          onDeclarationCreated(demande.id);
        }
        
        await submitDemande(demande.id);
        console.log('Demande soumise avec succès');
        
        setStep(3);
        
      } catch (error: any) {
        console.error('Erreur:', error);
        let errorMessage = 'Une erreur est survenue lors de la création de la demande.';
        if (error.response?.data?.message) {
          errorMessage = error.response.data.message;
        } else if (error.message) {
          errorMessage = error.message;
        }
        setError(errorMessage);
      } finally {
        setIsSubmitting(false);
      }
      return;
    }
  };
  
  const placeholder = getProductPlaceholder(product.category || 'Autre');
  
  const isUploading = Object.values(uploadProgress).some(progress => {
    return typeof progress === 'number' && progress > 0 && progress < 100;
  });

  return (
    <>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
        <div className="bg-white w-full max-w-4xl rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-fade-in-scale">
          {/* Header */}
          <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-2xl overflow-hidden shadow-md flex items-center justify-center ${!product.productImage ? placeholder.color : 'bg-slate-100'}`}>
                {product.productImage ? (
                  <img src={product.productImage} alt={product.productName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <i className={`fas ${placeholder.icon} text-2xl`}></i>
                )}
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg overflow-hidden border-2 border-white shadow-sm bg-white">
                    <img src={getFlagUrl(exporter.paysOrigine || 'UN')} alt="Flag" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-900 uppercase italic tracking-tighter">Déclaration d'Importation</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      {product.productName} &bull; {exporter.nom || exporter.companyName || 'Exportateur'} &bull; {exporter.paysOrigine || 'Pays Inconnu'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <button 
              onClick={onClose}
              disabled={isSubmitting || isSavingDraft || paymentLoading}
              className="w-10 h-10 rounded-full bg-white shadow-md flex items-center justify-center text-slate-400 hover:text-tunisia-red transition-all disabled:opacity-50"
            >
              <X size={20} />
            </button>
          </div>

          {/* Progress Bar */}
          <div className="px-8 pt-8">
            <div className="flex items-center gap-4 mb-6">
              <div className={`flex-1 h-2 rounded-full transition-all duration-500 ${step >= 1 ? 'bg-tunisia-red' : 'bg-slate-100'}`}></div>
              <div className={`flex-1 h-2 rounded-full transition-all duration-500 ${step >= 2 ? 'bg-tunisia-red' : 'bg-slate-100'}`}></div>
              <div className={`flex-1 h-2 rounded-full transition-all duration-500 ${step >= 3 ? 'bg-tunisia-red' : 'bg-slate-100'}`}></div>
            </div>
            <div className="flex justify-between px-2 mb-4">
              <span className={`text-[9px] font-black uppercase tracking-widest ${step >= 1 ? 'text-tunisia-red' : 'text-slate-400'}`}>Informations</span>
              <span className={`text-[9px] font-black uppercase tracking-widest ${step >= 2 ? 'text-tunisia-red' : 'text-slate-400'}`}>Documents</span>
              <span className={`text-[9px] font-black uppercase tracking-widest ${step >= 3 ? 'text-tunisia-red' : 'text-slate-400'}`}>Paiement</span>
            </div>
          </div>

          {/* Form Content */}
          <div className="flex-grow overflow-y-auto p-8 md:p-12">
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl text-red-600 text-sm">
                <strong>Erreur :</strong> {error}
              </div>
            )}
            
            {step === 1 ? (
              <form id="declaration-form" onSubmit={handleSubmit} className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Invoice Info */}
                  <div className="space-y-6">
                    <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                      <FileText size={14} className="text-tunisia-red" /> Informations Facture
                    </h4>
                    <div className="space-y-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Numéro de facture</label>
                        <input 
                          required
                          type="text" 
                          value={formData.invoiceNumber}
                          onChange={(e) => setFormData({...formData, invoiceNumber: e.target.value})}
                          className="w-full px-5 py-4 rounded-2xl border-2 border-slate-50 font-bold bg-slate-50/50 focus:border-tunisia-red outline-none transition-all" 
                          placeholder="Ex: INV-2024-001"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Date de la facture</label>
                        <div className="relative">
                          <input 
                            required
                            type="date" 
                            value={formData.invoiceDate}
                            onChange={(e) => setFormData({...formData, invoiceDate: e.target.value})}
                            className="w-full px-5 py-4 rounded-2xl border-2 border-slate-50 font-bold bg-slate-50/50 focus:border-tunisia-red outline-none transition-all" 
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Montant</label>
                          <input 
                            required
                            type="number" 
                            step="0.01"
                            value={formData.amount}
                            onChange={(e) => setFormData({...formData, amount: e.target.value})}
                            className="w-full px-5 py-4 rounded-2xl border-2 border-slate-50 font-bold bg-slate-50/50 focus:border-tunisia-red outline-none transition-all" 
                            placeholder="0.00"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Devise</label>
                          <select 
                            value={formData.currency}
                            onChange={(e) => setFormData({...formData, currency: e.target.value})}
                            className="w-full px-5 py-4 rounded-2xl border-2 border-slate-50 font-bold bg-slate-50/50 focus:border-tunisia-red outline-none transition-all appearance-none"
                          >
                            <option value="TND">TND - Dinar Tunisien</option>
                            <option value="EUR">EUR - Euro</option>
                            <option value="USD">USD - Dollar US</option>
                            <option value="GBP">GBP - Livre Sterling</option>
                            <option value="CAD">CAD - Dollar Canadien</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Logistics Info */}
                  <div className="space-y-6">
                    <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                      <Ship size={14} className="text-tunisia-red" /> Logistique & Transport
                    </h4>
                    <div className="space-y-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Incoterms</label>
                        <select 
                          value={formData.incoterm}
                          onChange={(e) => setFormData({...formData, incoterm: e.target.value})}
                          className="w-full px-5 py-4 rounded-2xl border-2 border-slate-50 font-bold bg-slate-50/50 focus:border-tunisia-red outline-none transition-all appearance-none"
                        >
                          <option value="EXW">EXW - Ex Works</option>
                          <option value="FOB">FOB - Free On Board</option>
                          <option value="CIF">CIF - Cost, Insurance & Freight</option>
                          <option value="DDP">DDP - Delivered Duty Paid</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Mode de transport</label>
                        <div className="grid grid-cols-3 gap-2">
                          {['Maritime', 'Aérien', 'Terrestre'].map(mode => (
                            <button
                              key={mode}
                              type="button"
                              onClick={() => setFormData({...formData, transportMode: mode})}
                              className={`py-3 rounded-xl text-[9px] font-black uppercase tracking-widest border-2 transition-all ${formData.transportMode === mode ? 'border-tunisia-red bg-tunisia-red/5 text-tunisia-red' : 'border-slate-50 bg-slate-50/50 text-slate-400'}`}
                            >
                              {mode === 'Maritime' && <Ship size={12} className="mx-auto mb-1" />}
                              {mode === 'Aérien' && <Plane size={12} className="mx-auto mb-1" />}
                              {mode === 'Terrestre' && <Truck size={12} className="mx-auto mb-1" />}
                              {mode}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Port Embarquement</label>
                          <input 
                            required
                            type="text" 
                            value={formData.loadingPort}
                            onChange={(e) => setFormData({...formData, loadingPort: e.target.value})}
                            className="w-full px-5 py-4 rounded-2xl border-2 border-slate-50 font-bold bg-slate-50/50 focus:border-tunisia-red outline-none transition-all" 
                            placeholder="Ex: Marseille"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Port Débarquement</label>
                          <input 
                            required
                            type="text" 
                            value={formData.dischargePort}
                            onChange={(e) => setFormData({...formData, dischargePort: e.target.value})}
                            className="w-full px-5 py-4 rounded-2xl border-2 border-slate-50 font-bold bg-slate-50/50 focus:border-tunisia-red outline-none transition-all" 
                            placeholder="Ex: Radès"
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Date prévue d'arrivée</label>
                        <input 
                          required
                          type="date" 
                          value={formData.arrivalDate}
                          onChange={(e) => setFormData({...formData, arrivalDate: e.target.value})}
                          className="w-full px-5 py-4 rounded-2xl border-2 border-slate-50 font-bold bg-slate-50/50 focus:border-tunisia-red outline-none transition-all" 
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </form>
            ) : step === 2 ? (
              <div className="space-y-8 animate-fade-in">
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                  <Upload size={14} className="text-tunisia-red" /> Documents Justificatifs
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {[
                    { label: 'Facture commerciale (PDF)', icon: <FileText className="text-blue-500" />, required: true },
                    { label: 'Documents de transport (BL/LTA)', icon: <Ship className="text-emerald-500" />, required: true },
                    { label: 'Autres documents requis', icon: <Info className="text-amber-500" />, required: false }
                  ].map((doc, idx) => {
                    const isUploaded = !!files[doc.label];
                    const docType = getDocumentType(doc.label);
                    const progress = uploadProgress[docType];
                    const isUploadingDoc = typeof progress === 'number' && progress > 0 && progress < 100;
                    
                    return (
                      <div 
                        key={idx} 
                        className={`group relative border-2 border-dashed rounded-[2rem] p-8 text-center transition-all cursor-pointer ${isUploaded ? 'border-emerald-500 bg-emerald-50/50' : 'border-slate-200 hover:border-tunisia-red hover:bg-tunisia-red/5'}`}
                      >
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform ${isUploaded ? 'bg-emerald-100' : 'bg-slate-50'}`}>
                          {isUploadingDoc ? (
                            <Loader2 className="text-tunisia-red animate-spin" size={24} />
                          ) : isUploaded ? (
                            <Check className="text-emerald-600" />
                          ) : (
                            doc.icon
                          )}
                        </div>
                        <p className={`text-[10px] font-black uppercase tracking-widest mb-2 ${isUploaded ? 'text-emerald-700' : 'text-slate-900'}`}>
                          {doc.label}
                          {doc.required && <span className="text-red-500 ml-1">*</span>}
                        </p>
                        {isUploadingDoc && (
                          <div className="mt-2">
                            <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-tunisia-red transition-all duration-300"
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                            <p className="text-[8px] text-slate-400 mt-1">{progress}%</p>
                          </div>
                        )}
                        {isUploaded && !isUploadingDoc && files[doc.label] && (
                          <div className="space-y-2">
                            <p className="text-[9px] text-emerald-600 font-bold truncate px-2">{files[doc.label]?.name}</p>
                            <button 
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                handleFileChange(doc.label, null);
                              }}
                              className="text-[8px] font-black text-tunisia-red uppercase tracking-widest hover:underline"
                              disabled={isSubmitting || isSavingDraft}
                            >
                              Supprimer
                            </button>
                          </div>
                        )}
                        {!isUploaded && (
                          <p className="text-[9px] text-slate-400 font-bold">Cliquez ou glissez un fichier</p>
                        )}
                        <input 
                          type="file" 
                          className="absolute inset-0 opacity-0 cursor-pointer" 
                          disabled={isSubmitting || isSavingDraft}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              if (file.size > 5 * 1024 * 1024) {
                                setError('La taille du fichier ne doit pas dépasser 5 Mo.');
                                return;
                              }
                              handleFileChange(doc.label, file);
                            }
                          }}
                        />
                      </div>
                    );
                  })}
                </div>

                <div className="bg-amber-50 border border-amber-100 p-6 rounded-2xl flex gap-4">
                  <Info className="text-amber-500 flex-shrink-0" size={20} />
                  <p className="text-xs text-amber-800 font-medium leading-relaxed">
                    Assurez-vous que tous les documents sont lisibles et au format PDF. La taille maximale par fichier est de 5 Mo.
                    Les documents marqués d'un <span className="text-red-500">*</span> sont obligatoires.
                  </p>
                </div>
              </div>
            ) : (
              <div className="animate-fade-in">
                <PaymentForm
                  amount={100}
                  onSubmit={handlePaymentSubmit}
                  onBack={() => setStep(1)}
                  isLoading={paymentLoading}
                  error={paymentError}
                  success={paymentSuccess}
                />
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="p-8 border-t border-slate-100 bg-slate-50/50 flex justify-between gap-4">
            {step === 2 && (
              <button 
                onClick={() => setStep(1)}
                disabled={isSubmitting || isSavingDraft || paymentLoading}
                className="px-8 py-4 bg-white border-2 border-slate-100 text-slate-600 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:border-slate-300 transition-all disabled:opacity-50"
              >
                Précédent
              </button>
            )}
            
            {step === 3 && (
              <button 
                onClick={() => setStep(2)}
                disabled={paymentLoading || isPaid}
                className="px-8 py-4 bg-white border-2 border-slate-100 text-slate-600 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:border-slate-300 transition-all disabled:opacity-50"
              >
                Retour
              </button>
            )}
            
            {step === 2 && (
              <button 
                onClick={() => setShowDraftModal(true)}
                disabled={isSubmitting || isSavingDraft || isUploading}
                className="px-8 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-slate-200 transition-all flex items-center gap-2 border border-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save size={14} />
                Sauvegarder Brouillon
              </button>
            )}
            
            <div className="flex-grow"></div>
            
            {step !== 3 && (
              <button 
                onClick={handleSubmit}
                disabled={isSubmitting || isSavingDraft || isUploading}
                className="px-12 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl shadow-slate-200 hover:bg-tunisia-red transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {(isSubmitting || isSavingDraft) && <Loader2 className="animate-spin" size={16} />}
                {step === 1 ? 'Continuer' : (isSubmitting ? 'Traitement...' : 'Valider la déclaration')}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Draft Modal */}
      <AnimatePresence>
        {showDraftModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowDraftModal(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-lg bg-white rounded-[2.5rem] shadow-2xl p-10 border border-slate-100 overflow-hidden"
            >
              <div className="w-16 h-16 bg-amber-50 text-amber-500 rounded-2xl flex items-center justify-center text-2xl mb-6">
                <Save size={28} />
              </div>
              <h3 className="text-xl font-black text-slate-900 uppercase italic tracking-tighter mb-4">Enregistrer en tant que brouillon ?</h3>
              <div className="space-y-4 text-slate-500 font-medium leading-relaxed mb-8">
                <p>
                  En choisissant d'enregistrer cette demande comme brouillon, <span className="text-slate-900 font-black">elle ne sera pas encore soumise aux autorités</span> pour validation.
                </p>
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-[10px] space-y-2">
                  <p className="flex items-center gap-2">
                    <i className="fas fa-eye-slash text-slate-400 w-4"></i>
                    <span>La demande ne sera pas visible par les instances de contrôle.</span>
                  </p>
                  <p className="flex items-center gap-2">
                    <i className="fas fa-credit-card text-slate-400 w-4"></i>
                    <span>Le paiement des frais ne sera pas effectué à ce stade.</span>
                  </p>
                  <p className="flex items-center gap-2">
                    <i className="fas fa-arrow-right text-tunisia-red w-4"></i>
                    <span className="text-slate-900">Vous devrez finaliser le paiement et soumettre officiellement la demande plus tard.</span>
                  </p>
                </div>
              </div>
              <div className="flex flex-col gap-3">
                <button 
                  onClick={handleSaveDraft}
                  disabled={isSavingDraft}
                  className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-black transition-all shadow-xl flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isSavingDraft ? (
                    <><Loader2 className="animate-spin" size={16} /> Enregistrement...</>
                  ) : (
                    <>Confirmer l'enregistrement</>
                  )}
                </button>
                <button 
                  onClick={() => setShowDraftModal(false)}
                  className="w-full py-4 bg-white text-slate-400 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-slate-50 transition-all"
                >
                  Annuler
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

export default ProductDeclarationForm;