import React, { useState } from 'react';
import { X, Upload, FileText, Ship, Plane, Truck, Info, Check, Loader2 } from 'lucide-react';
import { ProductDeclarationFormProps } from '../../types/ProductDeclarationFormProps';
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080/api';

interface FileWithProgress extends File {
  progress?: number;
}

const ProductDeclarationForm: React.FC<ProductDeclarationFormProps> = ({ 
  product, 
  exporter, 
  onClose, 
  onSuccess 
}) => {
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});
  const [error, setError] = useState<string | null>(null);
  
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
      // Check file size (max 5 MB)
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (file.size > maxSize) {
        setError(`Le fichier "${file.name}" dépasse la taille maximale autorisée de 5 Mo.`);
        return;
      }
      
      // Check file type
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];
      if (!allowedTypes.includes(file.type)) {
        setError('Seuls les fichiers PDF, JPEG et PNG sont autorisés.');
        return;
      }
    }
    
    setFiles(prev => ({ ...prev, [label]: file }));
    if (error) setError(null);
  };

  const uploadFile = async (file: File, demandeId: number, documentType: string): Promise<boolean> => {
    const token = localStorage.getItem('token');
    
    if (!token) {
      throw new Error('Session expirée. Veuillez vous reconnecter.');
    }
    
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const response = await axios.post(
        `${API_BASE_URL}/importateur/demandes/${demandeId}/documents?documentType=${encodeURIComponent(documentType)}`,
        formData,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'multipart/form-data',
          },
          timeout: 30000, // 30 seconds timeout
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
      
      // Extract user-friendly error message
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

  const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  
  if (step === 1) {
    setStep(2);
    return;
  }
  
  // Check file sizes before upload
  const filesToUpload = Object.entries(files);
  const maxSize = 5 * 1024 * 1024; // 5MB
  
  for (const [label, file] of filesToUpload) {
    if (file && file instanceof File && file.size > maxSize) {
      setError(`Le fichier "${file.name}" dépasse la taille maximale de 5 Mo.`);
      return;
    }
  }
  
  // Check required documents
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
    
    // 1. Créer la demande d'importation
    const demandeRequest = {
      produitId: product.id,
      exportateurId: exporter.id,
      exportateurName: exporter.name,
      exportateurCountry: exporter.country,
      productName: product.name,
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
    
    const demande = demandeResponse.data;
    console.log('Demande créée:', demande);
    
    // 2. Uploader les documents
    const uploadPromises: Promise<boolean>[] = [];
    const uploadErrors: string[] = [];
    
    for (const [label, file] of Object.entries(files)) {
      if (file && file instanceof File) {
        const documentType = getDocumentType(label);
        uploadPromises.push(
          uploadFile(file, demande.id, documentType).catch((err) => {
            uploadErrors.push(`${label}: ${err.message}`);
            throw err;
          })
        );
      }
    }
    
    try {
      await Promise.all(uploadPromises);
      console.log('Tous les documents uploadés avec succès');
    } catch (uploadError) {
      console.error('Upload failed, errors:', uploadErrors);
      throw new Error(`Erreur d'upload:\n${uploadErrors.join('\n')}`);
    }
    
    // 3. Soumettre la demande
    console.log('Soumission de la demande...');
    await axios.post(
      `${API_BASE_URL}/importateur/demandes/${demande.id}/soumettre`,
      {},
      {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      }
    );
    
    console.log('Demande soumise avec succès');
    
    // Appeler le callback de succès
    if (onSuccess) {
      onSuccess();
    }
    
    // Fermer le formulaire
    onClose();
    
  } catch (error: any) {
    console.error('Erreur lors de la création de la demande:', error);
    
    let errorMessage = 'Une erreur est survenue lors de la création de la demande.';
    
    if (error.userMessage) {
      errorMessage = error.userMessage;
    } else if (error.response?.data?.message) {
      errorMessage = error.response.data.message;
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    setError(errorMessage);
  } finally {
    setIsSubmitting(false);
  }
};
  const placeholder = getProductPlaceholder(product.category || 'Autre');
  
  // Vérifier si un upload est en cours
  const isUploading = Object.values(uploadProgress).some(progress => {
    return typeof progress === 'number' && progress > 0 && progress < 100;
  });

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white w-full max-w-4xl rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-fade-in-scale">
        {/* Header */}
        <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-2xl overflow-hidden shadow-md flex items-center justify-center ${!product.image ? placeholder.color : 'bg-slate-100'}`}>
              {product.image ? (
                <img src={product.image} alt={product.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <i className={`fas ${placeholder.icon} text-2xl`}></i>
              )}
            </div>
            <div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg overflow-hidden border-2 border-white shadow-sm bg-white">
                  <img src={getFlagUrl(exporter.country)} alt="Flag" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900 uppercase italic tracking-tighter">Déclaration d'Importation</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    {product.name} &bull; {exporter.name}
                  </p>
                </div>
              </div>
            </div>
          </div>
          <button 
            onClick={onClose}
            disabled={isSubmitting}
            className="w-10 h-10 rounded-full bg-white shadow-md flex items-center justify-center text-slate-400 hover:text-tunisia-red transition-all disabled:opacity-50"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Content */}
        <div className="flex-grow overflow-y-auto p-8 md:p-12">
          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl text-red-600 text-sm">
              <strong>Erreur :</strong> {error}
            </div>
          )}
          
          {/* Progress Bar */}
          <div className="flex items-center gap-4 mb-10">
            <div className={`flex-1 h-2 rounded-full transition-all duration-500 ${step >= 1 ? 'bg-tunisia-red' : 'bg-slate-100'}`}></div>
            <div className={`flex-1 h-2 rounded-full transition-all duration-500 ${step >= 2 ? 'bg-tunisia-red' : 'bg-slate-100'}`}></div>
          </div>

          <form id="declaration-form" onSubmit={handleSubmit} className="space-y-8">
            {step === 1 ? (
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
            ) : (
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
                              disabled={isSubmitting}
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
                          disabled={isSubmitting}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              // Vérifier la taille du fichier (max 5 Mo)
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
            )}
          </form>
        </div>

        {/* Footer Actions */}
        <div className="p-8 border-t border-slate-100 bg-slate-50/50 flex justify-between gap-4">
          {step === 2 && (
            <button 
              onClick={() => setStep(1)}
              disabled={isSubmitting}
              className="px-8 py-4 bg-white border-2 border-slate-100 text-slate-600 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:border-slate-300 transition-all disabled:opacity-50"
            >
              Précédent
            </button>
          )}
          <div className="flex-grow"></div>
          <button 
            form="declaration-form"
            type="submit"
            disabled={isSubmitting || isUploading}
            className="px-12 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl shadow-slate-200 hover:bg-tunisia-red transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isSubmitting && <Loader2 className="animate-spin" size={16} />}
            {step === 1 ? 'Continuer' : (isSubmitting ? 'Traitement...' : 'Valider la déclaration')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductDeclarationForm;