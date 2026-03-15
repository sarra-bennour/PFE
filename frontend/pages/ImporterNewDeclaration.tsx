
import React from 'react';

const ImporterNewDeclaration: React.FC = () => {
  return (
    <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-100 p-10 animate-fade-in-scale">
      <form className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Exportateur Agréé</label>
            <select className="w-full px-5 py-4 rounded-2xl border-2 border-slate-50 font-bold bg-slate-50/50 focus:border-tunisia-red outline-none transition-all appearance-none">
              <option>AgroEuro SA (ES-12345)</option>
              <option>TechChina Ltd (CN-88990)</option>
              <option>Global Fabrics (FR-55443)</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Code NGP</label>
            <input type="text" className="w-full px-5 py-4 rounded-2xl border-2 border-slate-50 font-bold bg-slate-50/50 focus:border-tunisia-red outline-none transition-all" placeholder="Ex: 15091020" />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Description</label>
          <textarea className="w-full px-5 py-4 rounded-2xl border-2 border-slate-50 font-bold bg-slate-50/50 focus:border-tunisia-red outline-none transition-all" rows={3} placeholder="Détails de la marchandise..."></textarea>
        </div>

        <button className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-slate-200 active:scale-95 transition-all">
          Soumettre la déclaration
        </button>
      </form>
    </div>
  );
};

export default ImporterNewDeclaration;
