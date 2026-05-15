// src/components/CaseVerifier.tsx
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import axios from 'axios';

interface VerificationResult {
  type: string;
  name: string;
  manager: string;
  status: string;
  country: string;
  hsCode: string | null;
  products: string[];
  numeroAgrement: string;
  dateAgrement: string;
  submittedAt: string;
  decisionDate: string;
  decisionComment: string;
  raisonSociale: string;
  numeroRegistreCommerce: string;
  ville: string;
  adresseLegale: string;
  email: string;
  telephone: string;
  representantLegal: string;
}

interface CaseVerifierProps {
  onVerify?: (result: VerificationResult | null) => void;
  compact?: boolean;
}

const CaseVerifier: React.FC<CaseVerifierProps> = ({ onVerify, compact = false }) => {
  const [searchRef, setSearchRef] = useState('');
  const [searchResult, setSearchResult] = useState<VerificationResult | 'NOT_FOUND' | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchRef.trim()) return;
    
    setIsSearching(true);
    setSearchResult(null);
    setError(null);
    
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `/api/douane/verify/${encodeURIComponent(searchRef)}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      
      const data = response.data;
      console.log('Résultat vérification:', data);
      
      if (data.success && data.data) {
        const backendData = data.data;
        
        const formattedResult: VerificationResult = {
          type: backendData.typeDemande === 'REGISTRATION' ? 'Exportateur' : 'Déclaration Produit',
          name: backendData.exportateurRaisonSociale || 'N/A',
          manager: backendData.exportateurRepresentantLegal || backendData.exportateurNom + ' ' + backendData.exportateurPrenom || 'N/A',
          status: backendData.status === 'VALIDEE' ? 'VALIDÉ' : backendData.status,
          country: backendData.exportateurPaysOrigine || 'Tunisie',
          hsCode: backendData.products && backendData.products.length > 0 ? backendData.products[0].hsCode : null,
          products: backendData.products ? backendData.products.map((p: any) => p.productName) : [],
          numeroAgrement: backendData.numeroAgrement,
          dateAgrement: backendData.dateAgrement,
          submittedAt: backendData.submittedAt,
          decisionDate: backendData.decisionDate,
          decisionComment: backendData.decisionComment,
          raisonSociale: backendData.exportateurRaisonSociale,
          numeroRegistreCommerce: backendData.exportateurNumeroRegistreCommerce,
          ville: backendData.exportateurVille,
          adresseLegale: backendData.exportateurAdresseLegale,
          email: backendData.exportateurEmail,
          telephone: backendData.exportateurTelephone,
          representantLegal: backendData.exportateurRepresentantLegal
        };
        setSearchResult(formattedResult);
        onVerify?.(formattedResult);
      } else {
        setSearchResult('NOT_FOUND');
        onVerify?.(null);
      }
    } catch (error: any) {
      console.error('Erreur vérification:', error);
      setSearchResult('NOT_FOUND');
      onVerify?.(null);
      if (error.response?.status === 403) {
        setError('Accès non autorisé. Vous devez être agent douanier.');
      }
    } finally {
      setIsSearching(false);
    }
  };

  // Version compacte pour l'admin
  if (compact) {
    return (
      <div className="space-y-6">
        <form onSubmit={handleSearch} className="relative group">
          <input 
            type="text" 
            value={searchRef}
            onChange={(e) => setSearchRef(e.target.value.toUpperCase())}
            placeholder="EX: REF-EXP-2025-001"
            className="w-full pl-5 pr-28 py-5 bg-white border-2 border-slate-100 rounded-2xl text-sm font-black uppercase tracking-widest outline-none focus:border-tunisia-red transition-all"
          />
          <button 
            disabled={!searchRef || isSearching}
            className="absolute right-2 top-1/2 -translate-y-1/2 px-5 py-3 bg-slate-900 text-white rounded-xl font-black uppercase tracking-widest text-[9px] hover:bg-tunisia-red transition-all shadow-lg disabled:opacity-50"
          >
            {isSearching ? <i className="fas fa-spinner fa-spin"></i> : 'Vérifier'}
          </button>
        </form>

        <AnimatePresence mode="wait">
          {searchResult === 'NOT_FOUND' && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-red-50 border border-red-100 p-6 rounded-2xl text-center"
            >
              <i className="fas fa-search text-tunisia-red text-2xl mb-2 block"></i>
              <p className="text-xs font-bold text-red-600 uppercase tracking-widest">Référence non trouvée</p>
            </motion.div>
          )}

          {searchResult && searchResult !== 'NOT_FOUND' && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-white border border-slate-100 p-6 rounded-2xl space-y-4"
            >
              <div className="flex justify-between items-start">
                <div>
                  <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${
                    searchResult.status === 'VALIDÉ' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                  }`}>
                    <i className="fas fa-check-circle mr-1"></i> {searchResult.status}
                  </span>
                  <h4 className="text-base font-black italic text-slate-900 mt-2">{searchResult.name}</h4>
                  <p className="text-[9px] font-bold text-slate-400">{searchResult.type}</p>
                </div>
                <div className="text-right">
                  <p className="text-[8px] font-bold text-slate-400">Référence</p>
                  <p className="text-xs font-black text-slate-900">{searchRef}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-[9px]">
                <div>
                  <p className="font-bold text-slate-400">Responsable</p>
                  <p className="font-black text-slate-700">{searchResult.manager}</p>
                </div>
                {searchResult.country && (
                  <div>
                    <p className="font-bold text-slate-400">Pays d'origine</p>
                    <p className="font-black text-slate-700">{searchResult.country}</p>
                  </div>
                )}
                {searchResult.products.length > 0 && (
                  <div className="col-span-2">
                    <p className="font-bold text-slate-400 mb-1">Produits</p>
                    <div className="flex flex-wrap gap-1">
                      {searchResult.products.slice(0, 2).map((p, i) => (
                        <span key={i} className="px-2 py-1 bg-slate-100 rounded-lg text-[8px] font-bold">
                          {p}
                        </span>
                      ))}
                      {searchResult.products.length > 2 && (
                        <span className="px-2 py-1 bg-slate-100 rounded-lg text-[8px] font-bold">
                          +{searchResult.products.length - 2}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // Version complète (pour CustomsSpace)
  return (
    <div className="space-y-8 animate-fade-in max-w-4xl mx-auto py-10">
      <div className="text-center space-y-4 mb-12">
        <div className="w-20 h-20 bg-slate-900 border-4 border-slate-800 text-white rounded-[2rem] flex items-center justify-center mx-auto shadow-2xl mb-8">
          <i className="fas fa-microchip text-3xl"></i>
        </div>
        <h2 className="text-2xl font-black italic uppercase tracking-tighter text-slate-900">Vérificateur Central de Cas</h2>
        <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Saisissez une référence pour authentifier un dossier ou une déclaration</p>
      </div>

      <form onSubmit={handleSearch} className="relative group max-w-2xl mx-auto">
        <input 
          type="text" 
          value={searchRef}
          onChange={(e) => setSearchRef(e.target.value.toUpperCase())}
          placeholder="EX: REF-EXP-2025-001"
          className="w-full pl-8 pr-32 py-8 bg-white border-2 border-slate-100 rounded-[2rem] shadow-xl text-lg font-black uppercase tracking-widest outline-none focus:border-tunisia-red transition-all"
        />
        <button 
          disabled={!searchRef || isSearching}
          className="absolute right-3 top-1/2 -translate-y-1/2 px-8 py-5 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-tunisia-red transition-all shadow-lg disabled:opacity-50"
        >
          {isSearching ? <i className="fas fa-spinner fa-spin"></i> : 'Vérifier'}
        </button>
      </form>

      <AnimatePresence mode="wait">
        {searchResult === 'NOT_FOUND' && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-red-50 border-2 border-red-100 p-10 rounded-[3rem] text-center space-y-4"
          >
            <div className="text-4xl text-tunisia-red mb-4">🚫</div>
            <h4 className="text-lg font-black uppercase text-tunisia-red italic">Référence Inexistante</h4>
            <p className="text-xs font-bold text-red-400 uppercase tracking-widest">Aucun dossier correspondant dans la base douanière nationale</p>
          </motion.div>
        )}

        {searchResult && searchResult !== 'NOT_FOUND' && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-white border-2 border-slate-100 p-10 rounded-[3rem] shadow-2xl space-y-8"
          >
            <div className="flex justify-between items-start border-b border-slate-50 pb-8">
              <div>
                <span className="px-4 py-2 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-black uppercase tracking-widest mb-4 inline-block">
                  <i className="fas fa-check-circle mr-2"></i> {searchResult.status}
                </span>
                <h3 className="text-2xl font-black italic text-slate-900 uppercase tracking-tighter">{searchResult.name}</h3>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Type: {searchResult.type}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Référence Interne</p>
                <p className="text-xl font-black text-slate-900">{searchRef}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              <div className="space-y-6">
                <h5 className="text-[10px] font-black uppercase tracking-widest text-tunisia-red">Détails de l'Entité</h5>
                <div className="space-y-4">
                  <div className="flex justify-between p-3 bg-slate-50 rounded-xl">
                    <span className="text-[10px] font-bold text-slate-400 italic">Responsable</span>
                    <span className="text-[10px] font-black text-slate-900">{searchResult.manager}</span>
                  </div>
                  {searchResult.country && (
                    <div className="flex justify-between p-3 bg-slate-50 rounded-xl">
                      <span className="text-[10px] font-bold text-slate-400 italic">Pays d'Origine</span>
                      <span className="text-[10px] font-black text-slate-900">{searchResult.country}</span>
                    </div>
                  )}
                  {searchResult.hsCode && (
                    <div className="flex justify-between p-3 bg-slate-50 rounded-xl">
                      <span className="text-[10px] font-bold text-slate-400 italic">Code SH</span>
                      <span className="text-[10px] font-black text-slate-900">{searchResult.hsCode}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-6">
                <h5 className="text-[10px] font-black uppercase tracking-widest text-tunisia-red">Produits Associés</h5>
                <div className="flex flex-wrap gap-2">
                  {searchResult.products.map((p, i) => (
                    <span key={i} className="px-4 py-2 bg-slate-900 text-white rounded-xl text-[9px] font-black uppercase tracking-tight">
                      {p}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CaseVerifier;