import React, { useState } from 'react';
import { X, Upload, FileText, Ship, Plane, Truck, Info, Check } from 'lucide-react';
import {ProductDeclarationFormProps} from '../types/ProductDeclarationFormProps';



const ProductDeclarationForm: React.FC<ProductDeclarationFormProps> = ({ product, exporter, onClose, onSuccess }) => {
  const [step, setStep] = useState(1);
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
  
  const [files, setFiles] = useState<{ [key: string]: File | null }>({
    'Facture commerciale (PDF)': null,
    'Documents de transport (BL/LTA)': null,
    'Autres documents requis': null,
  });

  const handleFileChange = (label: string, file: File | null) => {
    setFiles(prev => ({ ...prev, [label]: file }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (step === 1) {
      setStep(2);
    } else {
      if (!files['Facture commerciale (PDF)'] || !files['Documents de transport (BL/LTA)']) {
        alert('Veuillez télécharger les documents obligatoires.');
        return;
      }
      onSuccess();
    }
  };

  const placeholder = getProductPlaceholder(product.category || 'Autre');

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
            className="w-10 h-10 rounded-full bg-white shadow-md flex items-center justify-center text-slate-400 hover:text-tunisia-red transition-all"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Content */}
        <div className="flex-grow overflow-y-auto p-8 md:p-12">
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
                          <option value="TND">TND</option>
                          <option value="EUR">EUR</option>
                          <option value="USD">USD</option>
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
                    { label: 'Facture commerciale (PDF)', icon: <FileText className="text-blue-500" /> },
                    { label: 'Documents de transport (BL/LTA)', icon: <Ship className="text-emerald-500" /> },
                    { label: 'Autres documents requis', icon: <Info className="text-amber-500" /> }
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
                        <p className={`text-[10px] font-black uppercase tracking-widest mb-2 ${isUploaded ? 'text-emerald-700' : 'text-slate-900'}`}>{doc.label}</p>
                        {isUploaded ? (
                          <div className="space-y-2">
                            <p className="text-[9px] text-emerald-600 font-bold truncate px-2">{files[doc.label]?.name}</p>
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
                          <p className="text-[9px] text-slate-400 font-bold">Cliquez ou glissez un fichier</p>
                        )}
                        <input 
                          type="file" 
                          className="absolute inset-0 opacity-0 cursor-pointer" 
                          onChange={(e) => {
                            const file = e.target.files?.[0] || null;
                            handleFileChange(doc.label, file);
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
              className="px-8 py-4 bg-white border-2 border-slate-100 text-slate-600 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:border-slate-300 transition-all"
            >
              Précédent
            </button>
          )}
          <div className="flex-grow"></div>
          <button 
            form="declaration-form"
            type="submit"
            className="px-12 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl shadow-slate-200 hover:bg-tunisia-red transition-all"
          >
            {step === 1 ? 'Continuer' : 'Valider la déclaration'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductDeclarationForm;