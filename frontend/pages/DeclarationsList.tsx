import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import axios from 'axios';

// Types basés sur vos DTOs backend
interface ProduitDTO {
  id: number;
  productType: string;
  category: string;
  hsCode: string;
  productName: string;
  isLinkedToBrand: boolean;
  brandName?: string;
  isBrandOwner?: boolean;
  hasBrandLicense?: boolean;
  productState: string;
  originCountry: string;
  annualQuantityValue: string;
  annualQuantityUnit: string;
  commercialBrandName?: string;
  processingType?: string;
  annualExportCapacity?: string;
}

interface DocumentDTO {
  id: number;
  fileName: string;
  filePath: string;
  fileType: string;
  fileSize: number;
  documentType: string;
  status: string;
  validationComment?: string;
  uploadedAt: string;
  validatedAt?: string;
  validatedBy?: string;
  downloadUrl: string;
}

interface DemandeHistoryDTO {
  id: number;
  action: string;
  comment: string;
  oldStatus: string;
  newStatus: string;
  performedBy: string;
  performedAt: string;
}

interface DemandeEnregistrementDTO {
  id: number;
  reference: string;
  status: string;
  submittedAt: string | null;
  paymentReference: string | null;
  paymentAmount: number | null;
  paymentStatus: string;
  assignedTo: number | null;
  decisionDate: string | null;
  decisionComment: string | null;
  numeroAgrement: string | null;
  dateAgrement: string | null;
  exportateur: any;
  products: ProduitDTO[];
  documents: DocumentDTO[];
  history: DemandeHistoryDTO[];
}

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080/api';

const DeclarationsList: React.FC = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  const [selectedDeclaration, setSelectedDeclaration] = useState<DemandeEnregistrementDTO | null>(null);
  const [declarations, setDeclarations] = useState<DemandeEnregistrementDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Configuration axios avec token
  const axiosInstance = axios.create({
    baseURL: API_URL,
  });

  axiosInstance.interceptors.request.use(
    (config) => {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => Promise.reject(error)
  );

  useEffect(() => {
    fetchDemandes();
  }, []);

  const fetchDemandes = async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.get('/produits/mes-demandes');
      setDeclarations(response.data);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur lors du chargement des demandes');
      console.error('Erreur:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusStyle = (status: string) => {
    const statusMap: { [key: string]: string } = {
      'VALIDEE': 'bg-emerald-50 text-emerald-600 border-emerald-100',
      'REJETEE': 'bg-red-50 text-red-600 border-red-100',
      'SOUMISE': 'bg-blue-50 text-blue-600 border-blue-100',
      'EN_ATTENTE': 'bg-amber-50 text-amber-600 border-amber-100',
      'BROUILLON': 'bg-slate-50 text-slate-600 border-slate-100'
    };
    return statusMap[status] || 'bg-slate-50 text-slate-600 border-slate-100';
  };

  const getStatusText = (status: string) => {
    const statusMap: { [key: string]: string } = {
      'BROUILLON': 'Brouillon',
      'SOUMISE': 'Soumise',
      'EN_ATTENTE': 'En attente',
      'VALIDEE': 'Validée',
      'REJETEE': 'Rejetée'
    };
    return statusMap[status] || status;
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('fr-FR');
  };

  const formatProductList = (products: ProduitDTO[]) => {
    if (products.length === 0) return 'Aucun produit';
    if (products.length === 1) return products[0].productName;
    return `${products[0].productName} et ${products.length - 1} autre(s)`;
  };

  const getProductWeight = (product: ProduitDTO) => {
    if (product.annualQuantityValue && product.annualQuantityUnit) {
      return `${product.annualQuantityValue} ${product.annualQuantityUnit}`;
    }
    return 'N/A';
  };

  const getProductValue = (product: ProduitDTO) => {
    // Valeur par défaut ou calculée si disponible
    return 'N/A';
  };

  const filteredDeclarations = declarations.filter(dec => 
    dec.products.some(p => 
      p.productName.toLowerCase().includes(searchTerm.toLowerCase())
    ) || 
    dec.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
    dec.products.some(p => p.hsCode.includes(searchTerm))
  );

  const totalPages = Math.ceil(filteredDeclarations.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentDeclarations = filteredDeclarations.slice(startIndex, startIndex + itemsPerPage);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-tunisia-red"></div>
      </div>
    );
  }

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
              placeholder="Rechercher par produit, référence ou NGP..." 
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

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-6 py-4 rounded-2xl text-sm font-bold">
          {error}
        </div>
      )}

      <div className="bg-white rounded-[3rem] shadow-xl border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Référence</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Produit(s)</th>
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
                      <span className="text-[10px] font-mono font-bold bg-slate-900 text-white px-3 py-1 rounded-full">{dec.reference}</span>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-2">
                        {formatDate(dec.submittedAt)}
                      </p>
                    </td>
                    <td className="px-8 py-6">
                      <h4 className="font-black text-slate-900 text-sm tracking-tight uppercase italic">
                        {formatProductList(dec.products)}
                      </h4>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                        {dec.products.length} produit(s) • {dec.documents.length} document(s)
                      </p>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex flex-col gap-1">
                        {dec.numeroAgrement && (
                          <span className="text-[9px] font-bold text-emerald-600 uppercase tracking-tight flex items-center gap-2">
                            <i className="fas fa-certificate text-emerald-300 w-3"></i> {dec.numeroAgrement}
                          </span>
                        )}
                        <span className="text-[9px] font-bold text-slate-600 uppercase tracking-tight flex items-center gap-2">
                          <i className="fas fa-credit-card text-slate-300 w-3"></i> {dec.paymentStatus}
                        </span>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border flex items-center gap-2 w-fit ${getStatusStyle(dec.status)}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          dec.status === 'VALIDEE' ? 'bg-emerald-500' : 
                          dec.status === 'REJETEE' ? 'bg-red-500' : 
                          dec.status === 'SOUMISE' ? 'bg-blue-500 animate-pulse' :
                          'bg-amber-500 animate-pulse'
                        }`}></span>
                        {getStatusText(dec.status)}
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
              className="relative w-full max-w-4xl bg-[#FDFDFD] rounded-[2.5rem] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.25)] overflow-hidden max-h-[90vh] flex flex-col border border-white border-t-4 border-t-tunisia-red"
            >
              {/* Header Premium */}
              <div className="px-10 py-8 border-b border-slate-100 flex justify-between items-center shrink-0 bg-white/50 backdrop-blur-sm">
                <div className="flex items-center gap-5">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-xl shadow-inner bg-slate-100 text-slate-600">
                    <i className="fas fa-file-alt"></i>
                  </div>
                  <div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5">
                        <span className="w-1 h-1 rounded-full bg-tunisia-red animate-pulse"></span>
                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Dossier de Déclaration</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest border ${getStatusStyle(selectedDeclaration.status)}`}>
                        {getStatusText(selectedDeclaration.status)}
                      </span>
                    </div>
                    <h3 className="text-2xl font-black italic tracking-tighter uppercase text-slate-900 mt-0.5">{selectedDeclaration.reference}</h3>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedDeclaration(null)}
                  className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center hover:bg-tunisia-red hover:text-white transition-all group shadow-sm"
                >
                  <i className="fas fa-times text-slate-400 group-hover:text-white transition-colors"></i>
                </button>
              </div>

              {/* Content avec liste des produits */}
              <div className="p-10 overflow-y-auto custom-scrollbar space-y-10">
                {/* Informations de la demande */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="md:col-span-2 p-8 bg-white rounded-[2rem] border border-slate-100 shadow-sm">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-emerald-600 flex items-center gap-2 mb-4">
                      <i className="fas fa-info-circle"></i> Informations Générales
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">Date de soumission</p>
                        <p className="text-sm font-bold text-slate-900">{formatDate(selectedDeclaration.submittedAt)}</p>
                      </div>
                      <div>
                        <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">Statut de paiement</p>
                        <p className="text-sm font-bold text-slate-900">{selectedDeclaration.paymentStatus}</p>
                      </div>
                      {selectedDeclaration.numeroAgrement && (
                        <>
                          <div>
                            <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">N° Agrément</p>
                            <p className="text-sm font-bold text-emerald-600">{selectedDeclaration.numeroAgrement}</p>
                          </div>
                          <div>
                            <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">Date d'agrément</p>
                            <p className="text-sm font-bold text-slate-900">{formatDate(selectedDeclaration.dateAgrement)}</p>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                  
                  <div className="p-8 bg-slate-900 rounded-[2rem] text-white shadow-xl border-t-4 border-t-tunisia-red">
                    <h4 className="text-[9px] font-black uppercase tracking-widest text-tunisia-red mb-4">Documents</h4>
                    <p className="text-3xl font-black italic tracking-tighter text-white">{selectedDeclaration.documents.length}</p>
                    <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-1">Documents fournis</p>
                  </div>
                </div>

                {/* Liste des produits */}
                <div className="space-y-6">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                    <i className="fas fa-boxes"></i> Produits déclarés ({selectedDeclaration.products.length})
                  </h4>
                  
                  {selectedDeclaration.products.map((product, index) => (
                    <div key={product.id} className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
                      <div className="p-6 border-b border-slate-100 bg-slate-50/30">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm ${
                            product.productType === 'alimentaire' ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'
                          }`}>
                            <i className={`fas ${product.productType === 'alimentaire' ? 'fa-apple-whole' : 'fa-gears'}`}></i>
                          </div>
                          <div>
                            <h5 className="text-base font-black text-slate-900 uppercase italic">{product.productName}</h5>
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                              NGP: {product.hsCode} • {product.category} • {product.originCountry}
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">Type</p>
                          <p className="text-xs font-bold text-slate-900 mt-1 capitalize">{product.productType}</p>
                        </div>
                        <div>
                          <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">État</p>
                          <p className="text-xs font-bold text-slate-900 mt-1">{product.productState || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">Quantité annuelle</p>
                          <p className="text-xs font-bold text-slate-900 mt-1">{getProductWeight(product)}</p>
                        </div>
                        
                        {product.isLinkedToBrand && (
                          <div className="md:col-span-3 pt-4 border-t border-slate-100">
                            <p className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-2">Marque</p>
                            <div className="flex flex-wrap gap-2">
                              <span className="px-3 py-1.5 bg-slate-50 rounded-xl text-[9px] font-bold text-slate-700">
                                {product.brandName || product.commercialBrandName}
                              </span>
                              {product.isBrandOwner && (
                                <span className="px-3 py-1.5 bg-emerald-50 rounded-xl text-[9px] font-bold text-emerald-700">
                                  Propriétaire
                                </span>
                              )}
                              {product.hasBrandLicense && (
                                <span className="px-3 py-1.5 bg-blue-50 rounded-xl text-[9px] font-bold text-blue-700">
                                  Licence
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                      
                      {/* Documents du produit */}
                      {selectedDeclaration.documents.filter(d => d.documentType.includes(product.productType)).length > 0 && (
                        <div className="px-6 pb-6">
                          <p className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-2">Documents associés</p>
                          <div className="flex flex-wrap gap-2">
                            {selectedDeclaration.documents
                              .filter(d => d.documentType.includes(product.productType))
                              .map(doc => (
                                <a
                                  key={doc.id}
                                  href={doc.downloadUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-xl text-[9px] font-bold text-slate-700 hover:bg-tunisia-red hover:text-white transition-all"
                                >
                                  <i className="fas fa-file-pdf"></i>
                                  {doc.fileName.length > 20 ? doc.fileName.substring(0, 20) + '...' : doc.fileName}
                                </a>
                              ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Historique */}
                {selectedDeclaration.history.length > 0 && (
                  <div className="space-y-6">
                    <h5 className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                      <i className="fas fa-history"></i> Historique d'instruction
                    </h5>
                    <div className="relative pl-8 space-y-8 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[1px] before:bg-slate-100">
                      {selectedDeclaration.history.map((h, i) => (
                        <div key={i} className="relative">
                          <div className="absolute -left-[25px] top-1 w-2.5 h-2.5 rounded-full bg-white border-2 border-tunisia-red z-10 shadow-sm"></div>
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-1">
                            <span className="text-[10px] font-black text-slate-900 uppercase tracking-tight">{h.action}</span>
                            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                              {formatDate(h.performedAt)}
                            </span>
                          </div>
                          <p className="text-[11px] font-medium text-slate-500 leading-relaxed">{h.comment}</p>
                          <p className="text-[8px] font-bold text-slate-400 mt-1">Par: {h.performedBy}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
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