import React, { useState } from 'react';

interface CreateUserFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

const CreateUserForm: React.FC<CreateUserFormProps> = ({ onSuccess, onCancel }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    ministry: ''
  });

  const ministries = [
    "Ministère du Commerce",
    "Ministère de l'Industrie",
    "Ministère de l'Agriculture",
    "Ministère de la Santé",
    "Ministère des Finances",
    "Douanes Tunisiennes"
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    // Simulation d'appel API
    setTimeout(() => {
      setLoading(false);
      if (onSuccess) onSuccess();
    }, 1500);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 animate-fade-in-scale">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-1.5">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Prénom</label>
          <input 
            required
            type="text"
            value={formData.firstName}
            onChange={(e) => setFormData({...formData, firstName: e.target.value})}
            className="w-full px-5 py-3.5 rounded-2xl border-2 border-slate-50 font-bold bg-slate-50 focus:border-tunisia-red outline-none transition-all text-sm shadow-sm"
            placeholder="Ex: Ahmed"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nom</label>
          <input 
            required
            type="text"
            value={formData.lastName}
            onChange={(e) => setFormData({...formData, lastName: e.target.value})}
            className="w-full px-5 py-3.5 rounded-2xl border-2 border-slate-50 font-bold bg-slate-50 focus:border-tunisia-red outline-none transition-all text-sm shadow-sm"
            placeholder="Ex: Ben Ali"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">E-mail Professionnel</label>
        <input 
          required
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({...formData, email: e.target.value})}
          className="w-full px-5 py-3.5 rounded-2xl border-2 border-slate-50 font-bold bg-slate-50 focus:border-tunisia-red outline-none transition-all text-sm shadow-sm"
          placeholder="ahmed.benali@ministere.tn"
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Téléphone</label>
        <input 
          required
          type="tel"
          value={formData.phone}
          onChange={(e) => setFormData({...formData, phone: e.target.value})}
          className="w-full px-5 py-3.5 rounded-2xl border-2 border-slate-50 font-bold bg-slate-50 focus:border-tunisia-red outline-none transition-all text-sm shadow-sm"
          placeholder="+216 -- --- ---"
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Ministère / Institution</label>
        <select 
          required
          value={formData.ministry}
          onChange={(e) => setFormData({...formData, ministry: e.target.value})}
          className="w-full px-5 py-3.5 rounded-2xl border-2 border-slate-50 font-bold bg-slate-50 focus:border-tunisia-red outline-none transition-all text-sm shadow-sm appearance-none"
        >
          <option value="">Sélectionnez un ministère</option>
          {ministries.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>

      <div className="flex flex-col gap-3 pt-4">
        <button 
          type="submit"
          disabled={loading}
          className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl hover:bg-black transition-all disabled:opacity-50 active:scale-[0.98]"
        >
          {loading ? <i className="fas fa-circle-notch animate-spin"></i> : "Créer l'utilisateur"}
        </button>
        
        {onCancel && (
          <button 
            type="button" 
            onClick={onCancel}
            className="w-full text-[9px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-600 transition-colors"
          >
            Annuler
          </button>
        )}
      </div>
    </form>
  );
};

export default CreateUserForm;