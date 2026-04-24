import React, { useState } from 'react';
import { InternalStructure, StructureType } from '../../types/InternalStructure';
import { Building2, Landmark, ShieldCheck, Edit2, Trash2, Search, X, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface InternalStructureListProps {
  structures: InternalStructure[];
  onEdit: (structure: InternalStructure) => void;
  onDelete: (id: number) => void;
}

const InternalStructureList: React.FC<InternalStructureListProps> = ({ structures, onEdit, onDelete }) => {
  const [search, setSearch] = useState('');
  const [structureToDelete, setStructureToDelete] = useState<InternalStructure | null>(null);

  const filtered = structures.filter(s => 
    s.officialName.toLowerCase().includes(search.toLowerCase()) ||
    (s.officialNameAr && s.officialNameAr.toLowerCase().includes(search.toLowerCase())) ||
    s.code.toLowerCase().includes(search.toLowerCase())
  );

  const handleDeleteClick = (structure: InternalStructure) => {
    setStructureToDelete(structure);
  };

  const handleConfirmDelete = () => {
    if (structureToDelete) {
      onDelete(structureToDelete.id);
      setStructureToDelete(null);
    }
  };

  const getIcon = (type: StructureType) => {
    switch (type) {
      case StructureType.MINISTRY: return <Building2 size={20} className="text-blue-500" />;
      case StructureType.BANK: return <Landmark size={20} className="text-amber-500" />;
      case StructureType.CUSTOMS: return <ShieldCheck size={20} className="text-emerald-500" />;
    }
  };

  const getBadgeColor = (type: StructureType) => {
    switch (type) {
      case StructureType.MINISTRY: return 'bg-blue-50 text-blue-600 border-blue-100';
      case StructureType.BANK: return 'bg-amber-50 text-amber-600 border-amber-100';
      case StructureType.CUSTOMS: return 'bg-emerald-50 text-emerald-600 border-emerald-100';
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
    <div className="space-y-6">
      {/* Modal de confirmation de suppression */}
      <AnimatePresence>
        {structureToDelete && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setStructureToDelete(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl p-10 text-center border border-slate-100"
            >
              <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <AlertTriangle size={36} strokeWidth={1.5} />
              </div>
              <h3 className="text-xl font-black text-slate-900 uppercase italic tracking-tighter mb-4">
                Confirmer la suppression
              </h3>
              <p className="text-slate-500 font-medium leading-relaxed mb-6">
                Vous êtes sur le point de supprimer la structure :
              </p>
              <div className="bg-slate-50 p-4 rounded-2xl mb-6 border border-slate-100">
                <p className="font-black text-slate-900 text-sm mb-1">{structureToDelete.officialName}</p>
                <p className="font-black text-slate-900 text-sm mb-1">{structureToDelete.officialNameAr}</p>
                <p className="font-mono text-xs text-slate-500">{structureToDelete.code}</p>
              </div>
              <p className="text-red-500 text-xs font-bold uppercase tracking-widest mb-8">
                Cette action est irréversible
              </p>
              <div className="grid grid-cols-2 gap-4">
                <button 
                  onClick={() => setStructureToDelete(null)}
                  className="py-4 bg-slate-100 text-slate-500 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-slate-200 transition-all"
                >
                  Annuler
                </button>
                <button 
                  onClick={handleConfirmDelete}
                  className="py-4 bg-red-500 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg hover:bg-red-600 transition-all"
                >
                  Supprimer
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Barre de recherche */}
      <div className="relative group">
        <input 
          type="text" 
          placeholder="Rechercher une structure (nom ou code)..." 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-12 pr-6 py-4 bg-white border-2 border-slate-50 rounded-2xl font-bold focus:border-tunisia-red outline-none transition-all text-sm shadow-sm group-hover:border-slate-100"
        />
        <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-tunisia-red transition-colors" size={18} />
      </div>

      {/* Liste des structures */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map(structure => (
          <div key={structure.id} className="p-6 bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all group animate-fade-in hover:border-slate-200">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center p-2.5 ${getBadgeColor(structure.type)} shadow-sm`}>
                  {getIcon(structure.type)}
                </div>
                <div>
                  <span className={`px-3 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest border ${getBadgeColor(structure.type)}`}>
                    {getTypeName(structure.type)}
                  </span>
                  <h4 className="text-sm font-black text-slate-800 leading-tight mt-1 line-clamp-1">{structure.officialName}</h4>
                  {structure.officialNameAr && (
                    <h5 className="text-[11px] font-bold text-slate-400 leading-tight mt-0.5 line-clamp-1 font-arabic" dir="rtl">
                      {structure.officialNameAr}
                    </h5>
                  )}
                </div>
              </div>
              <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={() => onEdit(structure)}
                  className="w-9 h-9 rounded-xl bg-slate-50 text-slate-400 hover:text-slate-900 transition-all flex items-center justify-center border border-slate-100 hover:border-slate-200"
                  title="Modifier"
                >
                  <Edit2 size={14} />
                </button>
                <button 
                  onClick={() => handleDeleteClick(structure)}
                  className="w-9 h-9 rounded-xl bg-red-50 text-red-400 hover:text-red-600 transition-all flex items-center justify-center border border-red-100 hover:border-red-200"
                  title="Supprimer"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-50 mt-4">
              <div>
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">Code Interne</span>
                <span className="text-[11px] font-mono font-black text-slate-900 uppercase">{structure.code}</span>
              </div>
              <div className="text-right">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">Statut</span>
                <span className={`text-[11px] font-black ${structure.isActive !== false ? 'text-emerald-600' : 'text-red-500'}`}>
                  {structure.isActive !== false ? 'Actif' : 'Inactif'}
                </span>
              </div>
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="col-span-full py-20 text-center bg-white rounded-3xl border-2 border-dashed border-slate-100">
            <Building2 className="mx-auto text-slate-100 mb-4" size={48} />
            <p className="text-sm font-black text-slate-300 uppercase italic tracking-tighter">Aucune structure trouvée</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default InternalStructureList;