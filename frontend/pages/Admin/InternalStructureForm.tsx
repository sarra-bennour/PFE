import React, { useState, useEffect } from 'react';
import { StructureType, InternalStructure } from '../../types/InternalStructure';
import { X, Save, Building2, Landmark, ShieldCheck } from 'lucide-react';

interface InternalStructureFormProps {
  onSuccess: (data: { type: StructureType; officialName: string }) => void;
  onCancel: () => void;
  initialData?: InternalStructure;
}

const InternalStructureForm: React.FC<InternalStructureFormProps> = ({ onSuccess, onCancel, initialData }) => {
  const [formData, setFormData] = useState({
    type: initialData?.type || StructureType.MINISTRY,
    officialName: initialData?.officialName || '',
    code: initialData?.code || ''
  });


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSuccess({
      type: formData.type,
      officialName: formData.officialName
    });
  };

  const getTypeIcon = (type: StructureType) => {
    switch (type) {
      case StructureType.MINISTRY: return <Building2 size={18} />;
      case StructureType.BANK: return <Landmark size={18} />;
      case StructureType.CUSTOMS: return <ShieldCheck size={18} />;
    }
  };

  const getTypeName = (type: StructureType) => {
    switch (type) {
      case StructureType.MINISTRY: return 'Ministère';
      case StructureType.BANK: return 'Banque';
      case StructureType.CUSTOMS: return 'Douane';
    }
  };

  return (
    <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-xl max-w-lg w-full">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h3 className="text-xl font-black text-slate-900 uppercase italic tracking-tighter">
            {initialData ? 'Modifier la structure' : 'Créer une structure'}
          </h3>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Saisie des informations officielles</p>
        </div>
        <button onClick={onCancel} className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:text-slate-900 transition-all">
          <X size={20} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-1.5">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Type de structure</label>
          <div className="grid grid-cols-3 gap-3">
            {Object.values(StructureType).map(type => (
              <button
                key={type}
                type="button"
                onClick={() => setFormData({ ...formData, type })}
                className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all ${
                  formData.type === type 
                    ? 'border-tunisia-red bg-tunisia-red/5 text-tunisia-red' 
                    : 'border-slate-50 bg-slate-50/50 text-slate-400 hover:border-slate-100'
                }`}
              >
                {getTypeIcon(type)}
                <span className="text-[9px] font-black uppercase tracking-widest">{getTypeName(type)}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nom Officiel</label>
          <input 
            required
            type="text"
            value={formData.officialName}
            onChange={(e) => setFormData({...formData, officialName: e.target.value})}
            className="w-full px-5 py-4 rounded-2xl border-2 border-slate-50 font-bold bg-slate-50 focus:border-tunisia-red outline-none transition-all text-sm"
            placeholder="Ex: Ministère du Commerce et du Développement des Exportations"
          />
        </div>

        <div className="space-y-1.5 opacity-80">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1.5">
                Code Interne 
                <span className="text-[8px] border border-slate-200 px-1.5 rounded text-slate-300">
                    GÉNÉRÉ AUTOMATIQUEMENT
                </span>
            </label>
            <div className="px-5 py-4 rounded-2xl border-2 border-slate-50 bg-slate-50 text-slate-400 text-sm font-mono">
                {initialData ? initialData.code : "Sera généré à l'enregistrement"}
            </div>
        </div>

        <div className="pt-4">
          <button 
            type="submit"
            className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl hover:bg-black transition-all flex items-center justify-center gap-3 group active:scale-[0.98]"
          >
            <Save size={18} className="group-hover:rotate-12 transition-transform" />
            {initialData ? 'Mettre à jour' : 'Enregistrer la structure'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default InternalStructureForm;