import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Upload, FileText, Ship, Plane, Truck, Calendar, DollarSign, MapPin, Info, Check, Save, Loader2 } from 'lucide-react';
import { Declaration } from '../../types/Declaration';
import axios from 'axios';

interface EditImporterDeclarationModalProps {
  declaration: Declaration;
  onClose: () => void;
  onSave: (data: any) => void;
}

const EditImporterDeclarationModal: React.FC<EditImporterDeclarationModalProps> = ({ declaration, onClose, onSave }) => {
  const [step, setStep] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    invoiceNumber: declaration.invoiceNumber || '',
    invoiceDate: declaration.invoiceDate || declaration.date,
    amount: declaration.value ? parseFloat(declaration.value.replace(/[^0-9,.]/g, '').replace(',', '.')) : 0,
    currency: declaration.currency || (declaration.value?.includes('EUR') ? 'EUR' : declaration.value?.includes('USD') ? 'USD' : 'TND'),
    incoterm: declaration.incoterm || 'FOB',
    transportMode: declaration.transport || 'Maritime',
    loadingPort: declaration.loadingPort || '',
    dischargePort: declaration.dischargePort || 'Radès',
    arrivalDate: declaration.arrivalDate || declaration.date,
  });

  const [files, setFiles] = useState<{ [key: string]: string | null }>({
    'Facture commerciale (PDF)': declaration.invoiceNumber ? `facture_${declaration.invoiceNumber}.pdf` : null,
    'Documents de transport (BL/LTA)': declaration.loadingPort ? `transport_${declaration.loadingPort}.pdf` : null,
    'Autres documents requis': null,
  });

  const handleFileChange = (label: string, fileName: string | null) => {
    setFiles(prev => ({ ...prev, [label]: fileName }));
  };

  // Fonction pour appeler l'API de mise à jour
  const updateDemande = async () => {
    setIsSaving(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('token');
      const response = await axios.put(
        `http://localhost:8080/api/importateur/demandes/${declaration.demandeId}`,
        {
          invoiceNumber: formData.invoiceNumber,
          invoiceDate: formData.invoiceDate,
          amount: formData.amount,
          currency: formData.currency,
          incoterm: formData.incoterm,
          transportMode: formData.transportMode,
          loadingPort: formData.loadingPort,
          dischargePort: formData.dischargePort,
          arrivalDate: formData.arrivalDate
        },
        {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (response.data.success) {
        onSave(response.data);
        onClose();
      } else {
        setError(response.data.message || 'Erreur lors de la mise à jour');
      }
    } catch (err: any) {
      console.error('Erreur lors de la mise à jour:', err);
      setError(err.response?.data?.message || 'Une erreur est survenue lors de la mise à jour');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step === 1) {
      setStep(2);
    } else {
      await updateDemande();
    }
  };

  const getTransportIcon = (mode: string) => {
    switch (mode) {
      case 'Maritime': return <Ship size={12} className="mx-auto mb-1" />;
      case 'Aérien': return <Plane size={12} className="mx-auto mb-1" />;
      case 'Terrestre': return <Truck size={12} className="mx-auto mb-1" />;
      default: return <Ship size={12} className="mx-auto mb-1" />;
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
      />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-4xl bg-white rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-slate-100"
      >
        {/* Header */}
        <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-lg">
              <i className="fas fa-edit"></i>
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-900 uppercase italic tracking-tighter leading-none">Modifier la Déclaration</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                Dossier: {declaration.id} &bull; {declaration.product}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-white shadow-md flex items-center justify-center text-slate-400 hover:text-tunisia-red transition-all"
          >
            <X size={20} />
          </button>
        </div>

        {/* Message d'erreur */}
        {error && (
          <div className="mx-8 mt-4 p-4 bg-red-50 border border-red-200 rounded-2xl">
            <p className="text-sm text-red-600 font-medium">{error}</p>
          </div>
        )}

        {/* Form Content */}
        <div className="flex-grow overflow-y-auto p-8 md:p-12 custom-scrollbar">
          {/* Progress Bar */}
          <div className="flex items-center gap-4 mb-10">
            <div className={`flex-1 h-2 rounded-full transition-all duration-500 ${step >= 1 ? 'bg-tunisia-red' : 'bg-slate-100'}`}></div>
            <div className={`flex-1 h-2 rounded-full transition-all duration-500 ${step >= 2 ? 'bg-tunisia-red' : 'bg-slate-100'}`}></div>
          </div>

          <form id="edit-declaration-form" onSubmit={handleSubmit} className="space-y-8">
            <AnimatePresence mode="wait">
              {step === 1 ? (
                <motion.div 
                  key="step1"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="grid grid-cols-1 md:grid-cols-2 gap-8"
                >
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
                        <input 
                          required
                          type="date" 
                          value={formData.invoiceDate}
                          onChange={(e) => setFormData({...formData, invoiceDate: e.target.value})}
                          className="w-full px-5 py-4 rounded-2xl border-2 border-slate-50 font-bold bg-slate-50/50 focus:border-tunisia-red outline-none transition-all" 
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Montant</label>
                          <input 
                            required
                            type="number" 
                            step="0.01"
                            value={formData.amount}
                            onChange={(e) => setFormData({...formData, amount: parseFloat(e.target.value)})}
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
                              className={`py-3 rounded-xl text-[9px] font-black uppercase tracking-widest border-2 transition-all flex flex-col items-center justify-center ${formData.transportMode === mode ? 'border-tunisia-red bg-tunisia-red/5 text-tunisia-red' : 'border-slate-50 bg-slate-50/50 text-slate-400'}`}
                            >
                              {getTransportIcon(mode)}
                              {mode}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Port de chargement</label>
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
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Port de déchargement</label>
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
                </motion.div>
              ) : (
                <motion.div 
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-8"
                >
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
                      return (
                        <div 
                          key={idx} 
                          className={`group relative border-2 border-dashed rounded-[2rem] p-8 text-center transition-all cursor-pointer ${isUploaded ? 'border-emerald-500 bg-emerald-50/50' : 'border-slate-200 hover:border-tunisia-red hover:bg-tunisia-red/5'}`}
                        >
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform ${isUploaded ? 'bg-emerald-100' : 'bg-slate-50'}`}>
                            {isUploaded ? <Check className="text-emerald-600" /> : doc.icon}
                          </div>
                          <p className={`text-[10px] font-black uppercase tracking-widest mb-2 ${isUploaded ? 'text-emerald-700' : 'text-slate-900'}`}>
                            {doc.label}
                            {doc.required && <span className="text-red-500 ml-1">*</span>}
                          </p>
                          {isUploaded ? (
                            <div className="space-y-2">
                              <p className="text-[9px] text-emerald-600 font-bold truncate px-2">{files[doc.label]}</p>
                              <button 
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  handleFileChange(doc.label, null);
                                }}
                                className="text-[8px] font-black text-tunisia-red uppercase tracking-widest hover:underline"
                              >
                                Supprimer
                              </button>
                            </div>
                          ) : (
                            <>
                              <p className="text-[9px] text-slate-400 font-bold">Cliquez ou glissez un fichier</p>
                              <p className="text-[8px] text-slate-300 mt-1">PDF, JPG, PNG (max 5 Mo)</p>
                            </>
                          )}
                          <input 
                            type="file" 
                            className="absolute inset-0 opacity-0 cursor-pointer" 
                            accept=".pdf,.jpg,.jpeg,.png"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                if (file.size > 5 * 1024 * 1024) {
                                  alert('Le fichier ne doit pas dépasser 5 Mo');
                                  return;
                                }
                                handleFileChange(doc.label, file.name);
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
                      Assurez-vous que tous les documents sont lisibles et au format PDF, JPEG ou PNG. 
                      La taille maximale par fichier est de 5 Mo.
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </form>
        </div>

        {/* Footer Actions */}
        <div className="p-8 border-t border-slate-100 bg-slate-50/50 flex justify-between gap-4">
          {step === 2 && (
            <button 
              onClick={() => setStep(1)}
              disabled={isSaving}
              className="px-8 py-4 bg-white border-2 border-slate-100 text-slate-600 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:border-slate-300 transition-all disabled:opacity-50"
            >
              Précédent
            </button>
          )}
          <div className="flex-grow"></div>
          <button 
            form="edit-declaration-form"
            type="submit"
            disabled={isSaving}
            className="px-12 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl shadow-slate-200 hover:bg-tunisia-red transition-all flex items-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? (
              <><Loader2 className="animate-spin" size={14} /> Enregistrement...</>
            ) : (
              step === 1 ? (
                <>Continuer <i className="fas fa-chevron-right group-hover:translate-x-1 transition-transform"></i></>
              ) : (
                <><Save size={14} /> Enregistrer les modifications</>
              )
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default EditImporterDeclarationModal;