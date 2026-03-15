
import React from 'react';
import { RequestStatus } from '../types';

const ImporterTracking: React.FC = () => {
  const mockDeclarations = [
    { id: 'DEC-001', date: '2025-05-10', exporter: 'AgroEuro SA', product: 'Huile d\'olive raffinée', status: RequestStatus.APPROVED, ngp: '15091020' },
    { id: 'DEC-002', date: '2025-05-12', exporter: 'TechChina Ltd', product: 'Puces électroniques', status: RequestStatus.PENDING, ngp: '85423100' },
    { id: 'DEC-003', date: '2025-05-15', exporter: 'Global Fabrics', product: 'Textile coton', status: RequestStatus.REJECTED, ngp: '52081100' },
  ];

  return (
    <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-100 overflow-hidden animate-fade-in-scale">
       <div className="p-8 border-b border-slate-50 flex justify-between items-center">
          <h3 className="text-xl font-black text-slate-900 uppercase italic tracking-tighter">Mes Dossiers Récents</h3>
          <div className="flex items-center gap-3">
            <div className="relative">
              <input type="text" placeholder="Recherche..." className="pl-10 pr-4 py-2 bg-slate-50 border-none rounded-xl text-xs focus:ring-1 focus:ring-tunisia-red outline-none" />
              <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-300"></i>
            </div>
          </div>
       </div>
      <table className="w-full text-left rtl:text-right">
        <thead>
          <tr className="bg-slate-50/50 border-b border-slate-50">
            <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Référence</th>
            <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Exportateur</th>
            <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Produit</th>
            <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Statut</th>
            <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {mockDeclarations.map((dec) => (
            <tr key={dec.id} className="group hover:bg-slate-50/50 transition-colors">
              <td className="px-8 py-6 font-black text-slate-900 tracking-tighter italic">{dec.id}</td>
              <td className="px-8 py-6 font-bold text-slate-600">{dec.exporter}</td>
              <td className="px-8 py-6">
                <span className="block text-sm font-bold text-slate-800">{dec.product}</span>
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{dec.ngp}</span>
              </td>
              <td className="px-8 py-6">
                <span className={`px-4 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                  dec.status === RequestStatus.APPROVED ? 'bg-green-50 text-green-600 border-green-200' :
                  dec.status === RequestStatus.REJECTED ? 'bg-red-50 text-red-600 border-red-200' :
                  'bg-amber-50 text-amber-600 border-amber-200'
                }`}>
                  {dec.status}
                </span>
              </td>
              <td className="px-8 py-6 text-right">
                <button className="text-tunisia-red font-black uppercase text-[10px] tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">Consulter</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ImporterTracking;
