
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';

const DeclarationsList: React.FC = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const productDeclarations = [
    { 
      id: 'DEC-2026-0215', 
      product: 'Camembert Président 250g', 
      status: 'En cours de validation par les autorités', 
      date: '24/02/2026',
      ngp: '0406',
      category: 'Produits laitiers',
      weight: '1000 KG',
      value: '5000 EUR',
      origin: 'France',
      history: [
        { date: '24/02/2026', status: 'Soumission', comment: 'Dossier déposé sur le portail.' },
        { date: '24/02/2026', status: 'Analyse Douane', comment: 'Vérification de la conformité NGP.' }
      ]
    },
    { 
      id: 'DEC-2026-0216', 
      product: 'Huile d\'Olive Vierge Extra 1L', 
      status: 'Validé', 
      date: '20/02/2026',
      ngp: '1509',
      category: 'Huiles végétales',
      weight: '5000 L',
      value: '25000 EUR',
      origin: 'Tunisie',
      history: [
        { date: '20/02/2026', status: 'Validé', comment: 'Certificat de conformité émis.' }
      ]
    },
    { 
      id: 'DEC-2026-0217', 
      product: 'Dattes Deglet Nour 500g', 
      status: 'Rejeté', 
      date: '18/02/2026',
      ngp: '0804',
      category: 'Fruits secs',
      weight: '2000 KG',
      value: '8000 EUR',
      origin: 'Tunisie',
      history: [
        { date: '18/02/2026', status: 'Rejeté', comment: 'Document manquant : Certificat phytosanitaire.' }
      ]
    },
    // Add more mock data for pagination testing
    ...Array.from({ length: 12 }, (_, i) => ({
      id: `DEC-2026-02${18 + i}`,
      product: `Produit Export ${i + 1}`,
      status: i % 3 === 0 ? 'Validé' : (i % 3 === 1 ? 'En cours' : 'Rejeté'),
      date: '15/02/2026',
      ngp: '0000',
      category: 'Divers',
      weight: '100 KG',
      value: '1000 EUR',
      origin: 'Tunisie',
      history: []
    }))
  ];

  const filteredDeclarations = productDeclarations.filter(dec => 
    dec.product.toLowerCase().includes(searchTerm.toLowerCase()) || 
    dec.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    dec.ngp.includes(searchTerm)
  );

  const totalPages = Math.ceil(filteredDeclarations.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentDeclarations = filteredDeclarations.slice(startIndex, startIndex + itemsPerPage);

  const getStatusStyle = (status: string) => {
    if (status.includes('Validé')) return 'bg-emerald-50 text-emerald-600 border-emerald-100';
    if (status.includes('Rejeté')) return 'bg-red-50 text-red-600 border-red-100';
    return 'bg-amber-50 text-amber-600 border-amber-100';
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-6xl mx-auto space-y-8"
    >
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
              placeholder="Rechercher par produit, ID ou NGP..." 
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

      <div className="bg-white rounded-[3rem] shadow-xl border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Référence</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Produit</th>
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
                      <span className="text-[10px] font-mono font-bold bg-slate-900 text-white px-3 py-1 rounded-full">{dec.id}</span>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-2">{dec.date}</p>
                    </td>
                    <td className="px-8 py-6">
                      <h4 className="font-black text-slate-900 text-sm tracking-tight uppercase italic">{dec.product}</h4>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">NGP: {dec.ngp} • {dec.category}</p>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex flex-col gap-1">
                        <span className="text-[9px] font-bold text-slate-600 uppercase tracking-tight flex items-center gap-2">
                          <i className="fas fa-weight-hanging text-slate-300 w-3"></i> {dec.weight}
                        </span>
                        <span className="text-[9px] font-bold text-slate-600 uppercase tracking-tight flex items-center gap-2">
                          <i className="fas fa-coins text-slate-300 w-3"></i> {dec.value}
                        </span>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border flex items-center gap-2 w-fit ${getStatusStyle(dec.status)}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${dec.status.includes('Validé') ? 'bg-emerald-500' : (dec.status.includes('Rejeté') ? 'bg-red-500' : 'bg-amber-500 animate-pulse')}`}></span>
                        {dec.status}
                      </span>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <button className="w-10 h-10 rounded-xl bg-slate-50 text-slate-400 hover:bg-tunisia-red hover:text-white transition-all shadow-sm">
                        <i className="fas fa-eye"></i>
                      </button>
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
    </motion.div>
  );
};

export default DeclarationsList;
