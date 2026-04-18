import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Package, Search, Filter, ArrowLeft, 
  ChevronRight, Globe, Info, Tags, 
  Layers, ShoppingBag, Camera, ExternalLink,
  Apple, Factory, Plus, Loader2
} from 'lucide-react';
import { useAuth } from '../App';
import { Product } from '../types/Product';
import axios from 'axios';

const API_URL = 'http://localhost:8080/api';

// Image par défaut en base64 (pas besoin de fichier externe)
const DEFAULT_IMAGE = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300'%3E%3Crect width='400' height='300' fill='%23f3f4f6'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' fill='%239ca3af' font-family='sans-serif' font-size='14'%3E📷 Image non disponible%3C/text%3E%3C/svg%3E";

const ProductsCatalog: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'alimentaire' | 'industriel'>('all');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Configuration axios
  const axiosInstance = axios.create({
    baseURL: API_URL,
  });

  axiosInstance.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  // Charger les produits
  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const response = await axiosInstance.get('/produits/mes-produits');
      console.log('Produits reçus:', response.data);
      setProducts(response.data.products || []);
      setError(null);
    } catch (err: any) {
      console.error('Erreur:', err);
      setError(err.response?.data?.message || 'Erreur lors du chargement des produits');
    } finally {
      setLoading(false);
    }
  };

  const getImageUrl = (imagePath: string | undefined | null): string => {
    if (!imagePath) return DEFAULT_IMAGE;
    if (imagePath.startsWith('http')) return imagePath;
    if (imagePath.startsWith('/api')) {
        return `http://localhost:8080${imagePath}`;
    }
    if (imagePath.startsWith('/uploads')) {
        return `http://localhost:8080/api/produits${imagePath}`;
    }
    return DEFAULT_IMAGE;
};

  const formatDate = (dateString: string | null | undefined): string => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('fr-FR');
  };

  const filteredProducts = products.filter(p => {
    const matchesSearch = (p.productName || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                         (p.hsCode || '').includes(searchTerm) ||
                         (p.category || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || p.productType === filterType;
    return matchesSearch && matchesType;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="animate-spin text-tunisia-red mx-auto mb-4" size={48} />
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Chargement du catalogue...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8 bg-white rounded-3xl shadow-xl">
          <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <i className="fas fa-exclamation-triangle text-3xl"></i>
          </div>
          <h3 className="text-xl font-black text-slate-900 mb-2">Erreur de chargement</h3>
          <p className="text-slate-500 text-sm mb-6">{error}</p>
          <button 
            onClick={fetchProducts}
            className="px-6 py-3 bg-tunisia-red text-white rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-red-700 transition-all"
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-20">
      {/* Header Section */}
      <div className="bg-white border-b border-slate-100 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 h-24 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <button 
              onClick={() => navigate('/exporter')}
              className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 hover:text-tunisia-red hover:bg-red-50 transition-all border border-slate-100"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tighter uppercase italic leading-none">Catalogue Produits</h1>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-1.5 flex items-center gap-2">
                <Package size={10} className="text-tunisia-red" />
                Référentiel Master Data - {products.length} article(s)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
              <input 
                type="text" 
                placeholder="Rechercher par nom, catégorie ou NGP..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-12 pr-6 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-[11px] font-bold w-64 md:w-80 outline-none focus:border-tunisia-red transition-all shadow-inner"
              />
            </div>
            
            <button 
              className="bg-tunisia-red text-white p-3.5 rounded-2xl shadow-lg shadow-red-500/20 hover:scale-105 active:scale-95 transition-all flex items-center justify-center group"
              title="Ajouter un produit au référentiel"
              onClick={() => navigate('/declare-product')}
            >
              <Plus size={20} />
            </button>

            <div className="flex bg-slate-50 p-1 rounded-2xl border border-slate-100">
              {[
                { id: 'all', label: 'Tout', icon: Layers },
                { id: 'alimentaire', label: 'Alimentaire', icon: Apple },
                { id: 'industriel', label: 'Industriel', icon: Factory },
              ].map(type => (
                <button
                  key={type.id}
                  onClick={() => setFilterType(type.id as any)}
                  className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center gap-2 transition-all ${
                    filterType === type.id 
                      ? 'bg-white text-tunisia-red shadow-sm border border-slate-100' 
                      : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  <type.icon size={12} />
                  <span className="hidden sm:inline">{type.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 pt-10">
        {/* Statistics Bar */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
          {[
            { label: 'Référentiel Global', value: products.length, color: 'slate', icon: Package },
            { label: 'Articles Alimentaires', value: products.filter(p => p.productType === 'alimentaire').length, color: 'emerald', icon: Apple },
            { label: 'Articles Industriels', value: products.filter(p => p.productType === 'industriel').length, color: 'blue', icon: Factory },
            { label: 'Catégories NGP', value: new Set(products.map(p => p.hsCode)).size, color: 'tunisia-red', icon: Tags },
          ].map((stat, i) => (
            <div key={i} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col justify-between h-32 relative overflow-hidden group hover:scale-[1.02] transition-all">
              <div className={`absolute top-0 right-0 w-24 h-24 bg-${stat.color === 'tunisia-red' ? 'red' : stat.color}-50 rounded-bl-full -mr-8 -mt-8 opacity-50 group-hover:scale-110 transition-transform`} />
              <div className="flex justify-between items-start relative z-10">
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">{stat.label}</span>
                <stat.icon size={14} className="text-slate-200" />
              </div>
              <div className={`text-4xl font-black italic tracking-tighter text-${stat.color === 'tunisia-red' ? 'tunisia-red' : stat.color + '-600'} relative z-10`}>
                {stat.value.toString().padStart(2, '0')}
              </div>
            </div>
          ))}
        </div>

        {/* Product Grid */}
        {filteredProducts.length === 0 ? (
          <div className="py-32 text-center">
            <div className="w-20 h-20 bg-slate-50 text-slate-200 rounded-full flex items-center justify-center mx-auto mb-6">
              <Search size={32} />
            </div>
            <h3 className="text-xl font-black text-slate-900 uppercase italic tracking-tighter">Aucun produit dans le référentiel</h3>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">Essayez d'ajuster vos critères de recherche</p>
            <button 
              onClick={() => navigate('/declare-product')}
              className="mt-6 px-6 py-3 bg-tunisia-red text-white rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-red-700 transition-all"
            >
              Ajouter votre premier produit
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <AnimatePresence mode="popLayout">
              {filteredProducts.map((product) => (
                <motion.div
                  layout
                  key={product.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  onClick={() => setSelectedProduct(product)}
                  className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl hover:border-tunisia-red/20 transition-all cursor-pointer group flex flex-col overflow-hidden h-[480px]"
                >
                  {/* Product Image */}
                  <div className="h-56 relative overflow-hidden shrink-0">
                    <img 
                        src={getImageUrl(product.productImage)} 
                        alt={product.productName} 
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                            (e.target as HTMLImageElement).src = DEFAULT_IMAGE;
                        }}
                    />
                    <div className="absolute top-4 right-4 flex gap-2">
                      <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest shadow-lg ${
                        product.productType === 'alimentaire' ? 'bg-emerald-500 text-white' : 'bg-blue-500 text-white'
                      }`}>
                        {product.productType}
                      </span>
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-6">
                       <p className="text-white text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                         <ChevronRight size={14} className="text-tunisia-red" /> Consulter la Fiche Technique
                       </p>
                    </div>
                  </div>

                  {/* Product Info */}
                  <div className="p-8 flex-1 flex flex-col">
                    <div className="mb-4">
                      <span className="text-[10px] font-mono font-bold text-tunisia-red bg-red-50 px-2 py-0.5 rounded italic whitespace-nowrap overflow-hidden text-ellipsis block">
                        NGP: {product.hsCode}
                      </span>
                    </div>
                    <h3 className="text-xl font-black text-slate-900 tracking-tighter uppercase italic leading-tight mb-2 group-hover:text-tunisia-red transition-colors line-clamp-2">
                      {product.productName}
                    </h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-6">
                      <Tags size={12} /> {product.category}
                    </p>

                    <div className="mt-auto pt-6 border-t border-slate-50 grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">Origine</span>
                        <p className="text-[10px] font-bold text-slate-700 uppercase flex items-center gap-1.5">
                          <Globe size={10} className="text-slate-300" /> {product.originCountry}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">Marque</span>
                        <p className="text-[10px] font-bold text-slate-700 uppercase flex items-center gap-1.5">
                          <ShoppingBag size={10} className="text-slate-300" /> {product.brandName || 'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Product Detail Modal */}
      <AnimatePresence>
        {selectedProduct && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedProduct(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-xl"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-5xl h-[85vh] bg-white rounded-[3rem] shadow-2xl overflow-hidden flex flex-col md:flex-row border border-white/20"
            >
              <button 
                onClick={() => setSelectedProduct(null)}
                className="absolute top-6 right-6 z-20 w-12 h-12 rounded-full bg-white/10 backdrop-blur-md text-white hover:bg-white hover:text-slate-900 transition-all flex items-center justify-center border border-white/10"
              >
                <ArrowLeft size={20} className="rotate-135" />
              </button>

              {/* Modal Left: Image Portfolio */}
              <div className="md:w-5/12 bg-slate-900 relative">
                <img 
                  src={getImageUrl(selectedProduct.productImage)} 
                  alt={selectedProduct.productName}
                  className="w-full h-full object-cover opacity-80"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://via.placeholder.com/600x800?text=Image+non+disponible';
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent flex flex-col justify-end p-10">
                   <div className="flex gap-4 mb-4">
                      <div className="p-3 bg-white/10 backdrop-blur-md rounded-2xl border border-white/10 text-white">
                         <Camera size={20} />
                      </div>
                      <div className="p-3 bg-white/10 backdrop-blur-md rounded-2xl border border-white/10 text-white">
                         <ExternalLink size={20} />
                      </div>
                   </div>
                   <h2 className="text-4xl font-black text-white italic tracking-tighter uppercase leading-tight">
                     {selectedProduct.productName}
                   </h2>
                </div>
              </div>

              {/* Modal Right: Technical Specs */}
              <div className="md:w-7/12 overflow-y-auto p-12 custom-scrollbar space-y-12 bg-[#FDFDFD]">
                <div className="flex items-center gap-4">
                   <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                     selectedProduct.productType === 'alimentaire' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-blue-50 text-blue-600 border-blue-100'
                   }`}>
                     {selectedProduct.productType === 'alimentaire' ? 'Alimentaire' : 'Industriel'}
                   </span>
                </div>

                <div className="grid grid-cols-2 gap-12">
                   <div className="space-y-8">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-300 uppercase tracking-widest flex items-center gap-2">
                          <Layers size={10} /> Classification Douanière
                        </label>
                        <p className="text-xl font-black text-slate-900 tracking-tight italic font-mono">Code NGP: {selectedProduct.hsCode}</p>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-300 uppercase tracking-widest flex items-center gap-2">
                          <Tags size={10} /> Catégorie Article
                        </label>
                        <p className="text-base font-black text-slate-700 uppercase italic tracking-tight">{selectedProduct.category}</p>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-300 uppercase tracking-widest flex items-center gap-2">
                          <Globe size={10} /> Origine Géographique
                        </label>
                        <p className="text-base font-black text-slate-700 uppercase italic tracking-tight">{selectedProduct.originCountry}</p>
                      </div>
                   </div>

                   <div className="space-y-8">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-300 uppercase tracking-widest flex items-center gap-2">
                          <ShoppingBag size={10} /> Marque & Branding
                        </label>
                        <p className="text-base font-black text-slate-700 uppercase italic tracking-tight underline decoration-tunisia-red decoration-4 underline-offset-4">
                          {selectedProduct.brandName || 'SANS MARQUE'}
                        </p>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-300 uppercase tracking-widest flex items-center gap-2">
                          <Info size={10} /> État Physique / Type
                        </label>
                        <p className="text-base font-black text-slate-700 uppercase italic tracking-tight">{selectedProduct.productState || 'Non spécifié'}</p>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-300 uppercase tracking-widest flex items-center gap-2">
                          <ChevronRight size={10} /> Volume Annuel
                        </label>
                        <p className="text-base font-black text-slate-700 uppercase italic tracking-tight">
                          {selectedProduct.annualQuantityValue} {selectedProduct.annualQuantityUnit || 'N/A'}
                        </p>
                      </div>
                   </div>
                </div>

                {selectedProduct.productType === 'alimentaire' && (
                  <div className="p-8 bg-slate-900 rounded-[2rem] border border-slate-800 space-y-6 shadow-2xl">
                     <h4 className="text-white font-black italic uppercase tracking-tighter text-sm flex items-center gap-3">
                        <Apple className="text-emerald-500" size={18} /> Spécifications Alimentaires
                     </h4>
                     <div className="grid grid-cols-2 gap-6">
                        <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                           <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest block mb-1">Propriétaire de marque</span>
                           <span className={`text-[10px] font-black uppercase ${selectedProduct.isBrandOwner ? 'text-emerald-400' : 'text-amber-400'}`}>
                              {selectedProduct.isBrandOwner ? 'OUI (DÉCLARÉ)' : 'NON (EXPLOITANT)'}
                           </span>
                        </div>
                        <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                           <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest block mb-1">Licence d'exploitation</span>
                           <span className={`text-[10px] font-black uppercase ${selectedProduct.hasBrandLicense ? 'text-emerald-400' : 'text-slate-500'}`}>
                              {selectedProduct.hasBrandLicense ? 'VALIDE' : 'NON REQUIS'}
                           </span>
                        </div>
                     </div>
                  </div>
                )}

                <div className="flex justify-between items-center pt-8 border-t border-slate-100">
                   <div className="flex flex-col">
                     <span className="text-[9px] font-black text-slate-300 uppercase tracking-[0.3em] block mb-1">Historique Opérationnel</span>
                     <span className="text-sm font-black text-slate-900 italic tracking-tighter uppercase">
                       Dernière mise à jour: {formatDate(selectedProduct.updatedAt)}
                     </span>
                   </div>
                   <div className="flex gap-4">
                     <button 
                       onClick={() => {
                         setSelectedProduct(null);
                         navigate('/declare-product');
                       }}
                       className="px-8 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl hover:bg-black transition-all flex items-center gap-3 group"
                     >
                       <ExternalLink size={14} />
                       Réutiliser les données
                     </button>
                     <button 
                       onClick={() => setSelectedProduct(null)}
                       className="px-8 py-4 bg-slate-50 text-slate-400 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-slate-100 transition-all border border-slate-100"
                     >
                       Fermer
                     </button>
                   </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ProductsCatalog;