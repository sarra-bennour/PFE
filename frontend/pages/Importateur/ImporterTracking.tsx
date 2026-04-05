import React, { useState, useEffect } from 'react';
import { RequestStatus } from '../../types';
import axios from 'axios';

interface Declaration {
  id: string;
  date: string;
  exporter: string;
  product: string;
  status: RequestStatus;
  ngp: string;
  value: string;
  weight?: string;
  origin?: string;
  transport?: string;
}

interface ImporterTrackingProps {
  onModalOpen?: (isOpen: boolean, content?: React.ReactNode) => void;
}

const ImporterTracking: React.FC<ImporterTrackingProps> = ({ onModalOpen }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDoc, setSelectedDoc] = useState<Declaration | null>(null);
  const [declarations, setDeclarations] = useState<Declaration[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Notifier le parent quand le modal s'ouvre/ferme et envoyer le contenu
  useEffect(() => {
    if (onModalOpen) {
      if (selectedDoc) {
        // Envoyer le contenu du modal au parent
        onModalOpen(true, getModalContent());
      } else {
        onModalOpen(false);
      }
    }
  }, [selectedDoc, onModalOpen]);
  
  // Récupérer les demandes de l'importateur connecté
  useEffect(() => {
    fetchDemandes();
  }, []);

  const fetchDemandes = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:8080/api/importateur/mes-demandes', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.success) {
        const demandes = response.data.demandes;
        
        const formattedDeclarations: Declaration[] = demandes.map((demande: any) => {
          return {
            id: demande.reference,
            date: demande.submittedAt ? new Date(demande.submittedAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
            exporter: demande.exportateurName || 'Exportateur inconnu',
            product: demande.productName || 'Produit inconnu',
            status: mapStatus(demande.status),
            ngp: demande.hsCode || 'N/A',
            value: `${demande.amount?.toLocaleString() || '0'} ${demande.currency || 'TND'}`,
            weight: demande.weight || 'N/A',
            origin: demande.exportateurCountry || 'N/A',
            transport: demande.transportMode || 'Non spécifié'
          };
        });
        
        setDeclarations(formattedDeclarations);
      }
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setLoading(false);
    }
  };

  const mapStatus = (status: string): RequestStatus => {
    switch (status) {
      case 'VALIDEE': return RequestStatus.APPROVED;
      case 'REJETEE': return RequestStatus.REJECTED;
      default: return RequestStatus.PENDING;
    }
  };

  const filteredDeclarations = declarations.filter(dec => 
    dec.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    dec.exporter.toLowerCase().includes(searchQuery.toLowerCase()) ||
    dec.product.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusStyles = (status: RequestStatus) => {
    switch (status) {
      case RequestStatus.APPROVED:
        return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.1)]';
      case RequestStatus.REJECTED:
        return 'bg-red-500/10 text-red-600 border-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.1)]';
      default:
        return 'bg-amber-500/10 text-amber-600 border-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.1)]';
    }
  };

  // Fonction pour générer le contenu du modal
  const getModalContent = () => {
    if (!selectedDoc) return null;
    
    return (
      <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden">
        <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Détails du Dossier</span>
            <h3 className="text-3xl font-black text-slate-900 uppercase italic tracking-tighter">{selectedDoc.id}</h3>
          </div>
          <button 
            onClick={() => setSelectedDoc(null)}
            className="w-12 h-12 flex items-center justify-center bg-white border border-slate-200 rounded-2xl text-slate-400 hover:text-tunisia-red hover:border-tunisia-red transition-all shadow-sm"
          >
            <i className="fas fa-times text-xl"></i>
          </button>
        </div>

        <div className="p-8 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Exportateur</span>
                <p className="text-lg font-bold text-slate-900">{selectedDoc.exporter}</p>
              </div>
              <div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Produit</span>
                <p className="text-lg font-black text-slate-900 uppercase italic tracking-tight">{selectedDoc.product}</p>
              </div>
              <div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Code NGP</span>
                <p className="text-sm font-mono font-bold text-tunisia-red">{selectedDoc.ngp}</p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Date</span>
                  <p className="text-sm font-mono font-bold text-slate-700">{selectedDoc.date}</p>
                </div>
                <div>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Statut</span>
                  <span className={`inline-block px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border ${getStatusStyles(selectedDoc.status)}`}>
                    {selectedDoc.status}
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Poids</span>
                  <p className="text-sm font-bold text-slate-700">{selectedDoc.weight}</p>
                </div>
                <div>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Origine</span>
                  <p className="text-sm font-bold text-slate-700">{selectedDoc.origin}</p>
                </div>
              </div>
              <div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Mode de Transport</span>
                <p className="text-sm font-bold text-slate-700">{selectedDoc.transport}</p>
              </div>
            </div>
          </div>

          <div className="pt-8 border-t border-slate-100 flex justify-between items-end">
            <div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Valeur Totale en Douane</span>
              <p className="text-4xl font-black text-slate-900 italic tracking-tighter">{selectedDoc.value}</p>
            </div>
            <div className="flex gap-4">
              <button className="px-8 py-4 bg-slate-100 text-slate-600 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all">
                Télécharger PDF
              </button>
              <button className="px-8 py-4 bg-tunisia-red text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-red-700 transition-all shadow-lg shadow-tunisia-red/20">
                Contacter Douane
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <i className="fas fa-spinner fa-spin text-3xl text-tunisia-red mb-4"></i>
          <p className="text-slate-500">Chargement de vos dossiers...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Header & Search */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h3 className="text-3xl font-black text-slate-900 uppercase italic tracking-tighter">Suivi des Dossiers</h3>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-1">Gestion en temps réel de vos importations</p>
        </div>
        
        <div className="relative w-full md:w-80 group">
          <input 
            type="text" 
            placeholder="Rechercher un dossier..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-4 bg-white border-2 border-slate-100 rounded-2xl text-xs font-bold focus:border-tunisia-red outline-none transition-all shadow-sm group-hover:border-slate-200" 
          />
          <i className="fas fa-search absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-tunisia-red transition-colors"></i>
        </div>
      </div>

      {/* Grid of Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredDeclarations.map((dec) => (
          <div 
            key={dec.id} 
            className="group bg-white rounded-[2rem] p-8 border border-slate-100 shadow-sm hover:shadow-xl hover:border-tunisia-red/20 transition-all duration-500 relative overflow-hidden"
          >
            {/* Background Accent */}
            <div className="absolute -right-12 -top-12 w-32 h-32 bg-slate-50 rounded-full group-hover:bg-tunisia-red/5 transition-colors duration-500"></div>
            
            <div className="relative z-10">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Référence Dossier</span>
                  <h4 className="text-2xl font-black text-slate-900 italic tracking-tighter uppercase">{dec.id}</h4>
                </div>
                <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border transition-all duration-500 ${getStatusStyles(dec.status)}`}>
                  {dec.status}
                </span>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Exportateur</span>
                    <p className="text-sm font-bold text-slate-800 leading-tight">{dec.exporter}</p>
                  </div>
                  <div>
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Date Dépôt</span>
                    <p className="text-sm font-mono font-bold text-slate-600">{dec.date}</p>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 group-hover:bg-white group-hover:border-slate-200 transition-all duration-500">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Produit & Code NGP</span>
                  <p className="text-sm font-black text-slate-900 uppercase italic tracking-tight">{dec.product}</p>
                  <p className="text-[10px] font-mono font-bold text-tunisia-red mt-1">{dec.ngp}</p>
                </div>

                <div className="flex justify-between items-center pt-4 border-t border-slate-50">
                  <div>
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Valeur Douane</span>
                    <p className="text-lg font-black text-slate-900 italic tracking-tighter">{dec.value}</p>
                  </div>
                  <button 
                    onClick={() => setSelectedDoc(dec)}
                    className="px-6 py-3 bg-slate-900 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-tunisia-red transition-all shadow-lg active:scale-95"
                  >
                    Détails <i className="fas fa-arrow-right ml-2 group-hover:translate-x-1 transition-transform"></i>
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}

        {filteredDeclarations.length === 0 && (
          <div className="col-span-full py-20 text-center bg-slate-50 rounded-[3rem] border-2 border-dashed border-slate-200">
            <i className="fas fa-folder-open text-4xl text-slate-200 mb-4"></i>
            <h4 className="text-xl font-black text-slate-400 uppercase italic tracking-tighter">Aucun dossier trouvé</h4>
            <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest mt-2">Essayez d'ajuster vos critères de recherche</p>
          </div>
        )}
      </div>
    </>
  );
};

export default ImporterTracking;