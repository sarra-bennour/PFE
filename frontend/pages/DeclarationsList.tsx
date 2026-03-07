
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';

const DeclarationsList: React.FC = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  const [selectedDeclaration, setSelectedDeclaration] = useState<any | null>(null);


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
      type: 'alimentaire',
      productState: 'Frais',
      isLinkedToBrand: true,
      brandName: 'Président',
      isBrandOwner: false,
      hasBrandLicense: true,
      annualQuantity: '12000 KG',
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
      type: 'alimentaire',
      productState: 'Transformé',
      isLinkedToBrand: true,
      brandName: 'Terra Delyssa',
      isBrandOwner: true,
      hasBrandLicense: false,
      annualQuantity: '50000 L',
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
      type: 'alimentaire',
      productState: 'Brut',
      isLinkedToBrand: false,
      brandName: '',
      isBrandOwner: false,
      hasBrandLicense: false,
      annualQuantity: '15000 KG',
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
      type: i % 2 === 0 ? 'alimentaire' : 'industriel',
      productState: 'Frais',
      isLinkedToBrand: false,
      brandName: '',
      isBrandOwner: false,
      hasBrandLicense: false,
      annualQuantity: '1000 KG',
      commercialBrandName: i % 2 !== 0 ? 'Brand X' : '',
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
                      <button 
                        onClick={() => setSelectedDeclaration(dec)}
                        className="w-10 h-10 rounded-xl bg-slate-50 text-slate-400 hover:bg-tunisia-red hover:text-white transition-all shadow-sm"
                      >
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

      {/* Modal de Détails */}
      <AnimatePresence>
        {selectedDeclaration && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedDeclaration(null)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-3xl bg-[#FDFDFD] rounded-[2.5rem] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.25)] overflow-hidden max-h-[90vh] flex flex-col border border-white border-t-4 border-t-tunisia-red"
            >
              {/* Header Premium */}
              <div className="px-10 py-8 border-b border-slate-100 flex justify-between items-center shrink-0 bg-white/50 backdrop-blur-sm">
                <div className="flex items-center gap-5">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-xl shadow-inner ${selectedDeclaration.type === 'alimentaire' ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'}`}>
                    <i className={`fas ${selectedDeclaration.type === 'alimentaire' ? 'fa-apple-whole' : 'fa-gears'}`}></i>
                  </div>
                  <div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5">
                        <span className="w-1 h-1 rounded-full bg-tunisia-red animate-pulse"></span>
                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Dossier de Déclaration</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest border ${getStatusStyle(selectedDeclaration.status)}`}>
                        {selectedDeclaration.status}
                      </span>
                    </div>
                    <h3 className="text-2xl font-black italic tracking-tighter uppercase text-slate-900 mt-0.5">{selectedDeclaration.id}</h3>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedDeclaration(null)}
                  className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center hover:bg-tunisia-red hover:text-white transition-all group shadow-sm"
                >
                  <i className="fas fa-times text-slate-400 group-hover:text-white transition-colors"></i>
                </button>
              </div>

              {/* Content Bento Grid Style */}
              <div className="p-10 overflow-y-auto custom-scrollbar space-y-10">
                {/* Section 1: Informations Principales */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="md:col-span-2 space-y-6">
                    <div className="p-8 bg-white rounded-[2rem] border border-slate-100 shadow-sm space-y-4">
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-emerald-600 flex items-center gap-2">
                        <i className="fas fa-info-circle"></i> Identification du Produit
                      </h4>
                      <div className="space-y-1">
                        <p className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter leading-tight">{selectedDeclaration.product}</p>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-tight">{selectedDeclaration.category} • Code NGP {selectedDeclaration.ngp}</p>
                      </div>
                      <div className="flex flex-wrap gap-2 pt-2">
                        <span className="px-3 py-1.5 bg-emerald-50 rounded-xl text-[9px] font-black uppercase tracking-widest text-emerald-700 border border-emerald-100 flex items-center gap-2">
                          <i className="fas fa-earth-africa"></i> {selectedDeclaration.origin}
                        </span>
                        <span className="px-3 py-1.5 bg-slate-50 rounded-xl text-[9px] font-black uppercase tracking-widest text-slate-600 border border-slate-100 flex items-center gap-2">
                          <i className="fas fa-box text-slate-300"></i> {selectedDeclaration.productState || 'Standard'}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-6">
                    <div className="p-6 bg-slate-900 rounded-[2rem] text-white shadow-xl shadow-slate-200 h-full flex flex-col justify-between border-t-4 border-t-tunisia-red">
                      <h4 className="text-[9px] font-black uppercase tracking-widest text-tunisia-red">Volume Annuel</h4>
                      <div className="mt-4">
                        <p className="text-3xl font-black italic tracking-tighter text-white">{selectedDeclaration.annualQuantity || 'N/A'}</p>
                        <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-1">Capacité d'exportation</p>
                      </div>
                      <div className="mt-6 pt-6 border-t border-white/10">
                        <div className="flex justify-between items-center">
                          <span className="text-[8px] font-black uppercase tracking-widest text-slate-500">Date Dépôt</span>
                          <span className="text-[9px] font-bold text-tunisia-red">{selectedDeclaration.date}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section 2: Marque & Logistique */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Marque */}
                  <div className="p-8 bg-white rounded-[2rem] border border-slate-100 shadow-sm space-y-6">
                    <h5 className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                      <i className="fas fa-trademark"></i> Propriété de Marque
                    </h5>
                    {(selectedDeclaration.isLinkedToBrand || selectedDeclaration.commercialBrandName) ? (
                      <div className="space-y-4">
                        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                          <p className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-1">Nom Commercial</p>
                          <p className="text-sm font-black text-slate-900 uppercase italic">{selectedDeclaration.brandName || selectedDeclaration.commercialBrandName}</p>
                        </div>
                        {selectedDeclaration.type === 'alimentaire' && (
                          <div className="grid grid-cols-2 gap-3">
                            <div className={`p-3 rounded-xl border flex flex-col gap-1 ${selectedDeclaration.isBrandOwner ? 'bg-emerald-50/50 border-emerald-100' : 'bg-slate-50 border-slate-100'}`}>
                              <span className="text-[7px] font-black uppercase tracking-widest text-slate-400">Propriétaire</span>
                              <span className={`text-[9px] font-black uppercase ${selectedDeclaration.isBrandOwner ? 'text-emerald-600' : 'text-slate-400'}`}>{selectedDeclaration.isBrandOwner ? 'OUI' : 'NON'}</span>
                            </div>
                            <div className={`p-3 rounded-xl border flex flex-col gap-1 ${selectedDeclaration.hasBrandLicense ? 'bg-emerald-50/50 border-emerald-100' : 'bg-slate-50 border-slate-100'}`}>
                              <span className="text-[7px] font-black uppercase tracking-widest text-slate-400">Licence</span>
                              <span className={`text-[9px] font-black uppercase ${selectedDeclaration.hasBrandLicense ? 'text-emerald-600' : 'text-slate-400'}`}>{selectedDeclaration.hasBrandLicense ? 'VALIDE' : 'AUCUNE'}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="py-6 text-center">
                        <p className="text-[10px] font-bold text-slate-300 italic uppercase">Aucune marque associée</p>
                      </div>
                    )}
                  </div>

                  {/* Logistique */}
                  <div className="p-8 bg-white rounded-[2rem] border border-slate-100 shadow-sm space-y-6 border-r-4 border-r-tunisia-red">
                    <h5 className="text-[10px] font-black uppercase tracking-widest text-tunisia-red flex items-center gap-2">
                      <i className="fas fa-truck-fast"></i> Logistique & Valeur
                    </h5>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 bg-emerald-50/30 rounded-2xl border border-emerald-100">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-emerald-500 shadow-sm">
                            <i className="fas fa-weight-hanging text-xs"></i>
                          </div>
                          <span className="text-[9px] font-black uppercase tracking-widest text-emerald-600/60">Poids Net</span>
                        </div>
                        <span className="text-sm font-black text-emerald-700 uppercase italic tracking-tighter">{selectedDeclaration.weight}</span>
                      </div>
                      <div className="flex items-center justify-between p-4 bg-tunisia-red/5 rounded-2xl border border-tunisia-red/10">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-tunisia-red shadow-sm">
                            <i className="fas fa-coins text-xs"></i>
                          </div>
                          <span className="text-[9px] font-black uppercase tracking-widest text-tunisia-red/60">Valeur Douane</span>
                        </div>
                        <span className="text-sm font-black text-tunisia-red uppercase italic tracking-tighter">{selectedDeclaration.value}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section 3: Historique Timeline */}
                <div className="space-y-6">
                  <h5 className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                    <i className="fas fa-history"></i> Historique d'Instruction
                  </h5>
                  <div className="relative pl-8 space-y-8 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[1px] before:bg-slate-100">
                    {selectedDeclaration.history.length > 0 ? selectedDeclaration.history.map((h: any, i: number) => (
                      <div key={i} className="relative">
                        <div className="absolute -left-[25px] top-1 w-2.5 h-2.5 rounded-full bg-white border-2 border-tunisia-red z-10 shadow-sm"></div>
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-1">
                          <span className="text-[10px] font-black text-slate-900 uppercase tracking-tight">{h.status}</span>
                          <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50 px-2 py-0.5 rounded border border-slate-100">{h.date}</span>
                        </div>
                        <p className="text-[11px] font-medium text-slate-500 leading-relaxed">{h.comment}</p>
                      </div>
                    )) : (
                      <div className="py-4 text-center">
                        <p className="text-[10px] font-bold text-slate-300 italic uppercase">Aucun historique disponible</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Footer Premium */}
              <div className="px-10 py-8 bg-white border-t border-slate-100 shrink-0 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <i className="fas fa-shield-halved text-tunisia-red text-sm"></i>
                  <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">Document Officiel • République Tunisienne</span>
                </div>
                <button 
                  onClick={() => setSelectedDeclaration(null)}
                  className="px-10 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl hover:bg-black transition-all active:scale-95"
                >
                  Fermer
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default DeclarationsList;
