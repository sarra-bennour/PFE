import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Package, Search, Filter, ArrowLeft, 
  ChevronRight, Globe, Info, Tags, 
  Layers, ShoppingBag, Camera, ExternalLink,
  Apple, Factory, Plus, Loader2, ChevronLeft, ShoppingCart
} from 'lucide-react';
import { useAuth } from '../App';
import { Product } from '../types/Product';
import axios from 'axios';

const API_URL = 'http://localhost:8080/api';

// Image par défaut en base64
const DEFAULT_IMAGE = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300'%3E%3Crect width='400' height='300' fill='%23f3f4f6'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' fill='%239ca3af' font-family='sans-serif' font-size='14'%3E📷 Image non disponible%3C/text%3E%3C/svg%3E";

const ProductsCatalog: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'alimentaire' | 'industriel'>('all');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;
  const [addingProductId, setAddingProductId] = useState<number | null>(null);
  const [showAddSuccess, setShowAddSuccess] = useState<number | null>(null);

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

  // Debounce pour la recherche
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchTerm !== undefined) {
        fetchProducts();
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Recharger quand le filtre change
  useEffect(() => {
    fetchProducts();
  }, [filterType, user?.role]);

  const fetchProducts = async () => {
    setLoading(true);
    setIsSearching(true);
    try {
      let url;
      const hasSearch = searchTerm && searchTerm.trim() !== '';
      
      if (user?.role === 'IMPORTATEUR') {
        url = hasSearch 
          ? '/produits/catalogue-produits/recherche'
          : '/produits/catalogue-produits';
      } else {
        url = hasSearch 
          ? '/produits/mes-produits/recherche'
          : '/produits/mes-produits';
      }
      
      const params = new URLSearchParams();
      if (searchTerm && searchTerm.trim() !== '') {
        params.append('keyword', searchTerm.trim());
      }
      if (filterType !== 'all') {
        params.append('productType', filterType);
      }
      
      const finalUrl = params.toString() ? `${url}?${params.toString()}` : url;
      console.log('📦 Appel API:', finalUrl);
      
      const response = await axiosInstance.get(finalUrl);
      
      console.log('Produits reçus:', response.data);
      setProducts(response.data.products || []);
      setError(null);
      setCurrentPage(1);
    } catch (err: any) {
      console.error('Erreur:', err);
      setError(err.response?.data?.message || 'Erreur lors du chargement des produits');
    } finally {
      setLoading(false);
      setIsSearching(false);
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

  const totalPages = Math.ceil(products.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedProducts = products.slice(startIndex, startIndex + itemsPerPage);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  const handleFilterChange = (type: 'all' | 'alimentaire' | 'industriel') => {
    setFilterType(type);
    setCurrentPage(1);
  };

  const handleAddToCart = async (product: Product) => {
    setAddingProductId(product.id);
    try {
      // Appel API pour ajouter au panier ou créer une demande
      console.log('Ajout du produit:', product);
      // Simulation d'appel API
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setShowAddSuccess(product.id);
      setTimeout(() => setShowAddSuccess(null), 2000);
    } catch (err) {
      console.error('Erreur lors de l\'ajout:', err);
    } finally {
      setAddingProductId(null);
    }
  };

  // Bouton de retour selon le rôle
  const getBackButtonPath = () => {
    if (user?.role === 'IMPORTATEUR') {
      return '/importer';
    }
    return '/exporter';
  };

  // Statistiques pour exportateur uniquement
  const statsCards = [
    { label: 'Référentiel Global', value: products.length, color: 'slate', icon: Package },
    { label: 'Articles Alimentaires', value: products.filter(p => p.productType === 'alimentaire').length, color: 'emerald', icon: Apple },
    { label: 'Articles Industriels', value: products.filter(p => p.productType === 'industriel').length, color: 'blue', icon: Factory },
    { label: 'Catégories NGP', value: new Set(products.map(p => p.hsCode)).size, color: 'tunisia-red', icon: Tags },
  ];

  if (loading && !isSearching) {
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
      <br /> <br />
      {/* Header Section */}
      <div className="bg-white border-b border-slate-100 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 h-24 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <button 
              onClick={() => navigate(getBackButtonPath())}
              className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 hover:text-tunisia-red hover:bg-red-50 transition-all border border-slate-100"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tighter uppercase italic leading-none">
                {user?.role === 'IMPORTATEUR' ? 'Catalogue Importateur' : 'Catalogue Produits'}
              </h1>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-1.5 flex items-center gap-2">
                <Package size={10} className="text-tunisia-red" />
                {user?.role === 'IMPORTATEUR' 
                  ? `Catalogue complet - ${products.length} produit(s) disponible(s)`
                  : `Référentiel Master Data - ${products.length} article(s)`}
                {searchTerm && (
                  <span className="text-tunisia-red">
                    • Résultats pour "{searchTerm}"
                  </span>
                )}
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
                onChange={handleSearchChange}
                className="pl-12 pr-6 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-[11px] font-bold w-64 md:w-80 outline-none focus:border-tunisia-red transition-all shadow-inner"
              />
              {isSearching && (
                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                  <Loader2 className="animate-spin text-tunisia-red" size={16} />
                </div>
              )}
            </div>
            
            {user?.role === 'EXPORTATEUR' && (
              <button 
                className="bg-tunisia-red text-white p-3.5 rounded-2xl shadow-lg shadow-red-500/20 hover:scale-105 active:scale-95 transition-all flex items-center justify-center group"
                title="Ajouter un produit au référentiel"
                onClick={() => navigate('/declare-product')}
              >
                <Plus size={20} />
              </button>
            )}

            <div className="flex bg-slate-50 p-1 rounded-2xl border border-slate-100">
              {[
                { id: 'all', label: 'Tout', icon: Layers },
                { id: 'alimentaire', label: 'Alimentaire', icon: Apple },
                { id: 'industriel', label: 'Industriel', icon: Factory },
              ].map(type => (
                <button
                  key={type.id}
                  onClick={() => handleFilterChange(type.id as any)}
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
        {/* Statistics Bar - UNIQUEMENT POUR EXPORTATEUR */}
        {user?.role !== 'IMPORTATEUR' && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
            {statsCards.map((stat, i) => (
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
        )}

        {/* Product Grid */}
        {paginatedProducts.length === 0 && !loading ? (
          <div className="py-32 text-center">
            <div className="w-20 h-20 bg-slate-50 text-slate-200 rounded-full flex items-center justify-center mx-auto mb-6">
              <Search size={32} />
            </div>
            <h3 className="text-xl font-black text-slate-900 uppercase italic tracking-tighter">
              {searchTerm 
                ? 'Aucun résultat pour votre recherche'
                : (user?.role === 'IMPORTATEUR' ? 'Aucun produit disponible' : 'Aucun produit dans le référentiel')}
            </h3>
            {searchTerm && (
              <p className="text-slate-400 text-sm mt-2">
                Aucun produit ne correspond à "<span className="font-bold">{searchTerm}</span>"
              </p>
            )}
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">
              Essayez d'ajuster vos critères de recherche
            </p>
            {user?.role === 'EXPORTATEUR' && !searchTerm && (
              <button 
                onClick={() => navigate('/declare-product')}
                className="mt-6 px-6 py-3 bg-tunisia-red text-white rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-red-700 transition-all"
              >
                Ajouter votre premier produit
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <AnimatePresence mode="popLayout">
                {paginatedProducts.map((product) => (
                  <motion.div
                    layout
                    key={product.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl hover:border-tunisia-red/20 transition-all group flex flex-col overflow-hidden h-[480px]"
                  >
                    {/* Product Image - cliquable pour voir les détails */}
                    <div 
                      className="h-56 relative overflow-hidden shrink-0 cursor-pointer"
                      onClick={() => setSelectedProduct(product)}
                    >
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
                    <div className="p-6 flex-1 flex flex-col">  {/* Réduit de p-8 à p-6 */}
                      <div className="mb-3">  {/* Réduit de mb-4 à mb-3 */}
                        <span className="text-[10px] font-mono font-bold text-tunisia-red bg-red-50 px-2 py-0.5 rounded italic whitespace-nowrap overflow-hidden text-ellipsis block">
                          NGP: {product.hsCode}
                        </span>
                      </div>
                      <h3 
                        className="text-xl font-black text-slate-900 tracking-tighter uppercase italic leading-tight mb-2 group-hover:text-tunisia-red transition-colors line-clamp-2 cursor-pointer"
                        onClick={() => setSelectedProduct(product)}
                      >
                        {product.productName}
                      </h3>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-4">  {/* Réduit de mb-6 à mb-4 */}
                        <Tags size={12} /> {product.category}
                      </p>

                      <div className="mt-auto pt-4 border-t border-slate-50 grid grid-cols-2 gap-4">  {/* Réduit de pt-6 à pt-4 */}
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

                      {/* Bouton Ajouter - UNIQUEMENT POUR IMPORTATEUR */}
                      {user?.role === 'IMPORTATEUR' && (
                        <button
                          onClick={() => handleAddToCart(product)}
                          disabled={addingProductId === product.id}
                          className="mt-4 w-full py-2.5 bg-emerald-500 text-white rounded-xl font-black uppercase tracking-widest text-[10px] shadow-md hover:bg-emerald-600 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {addingProductId === product.id ? (
                            <Loader2 className="animate-spin" size={14} />
                          ) : showAddSuccess === product.id ? (
                            <>
                              <i className="fas fa-check-circle text-xs"></i>
                              Ajouté !
                            </>
                          ) : (
                            <>
                              <ShoppingCart size={14} />
                              Ajouter à ma commande
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {/* Pagination */}
            {products.length > itemsPerPage && (
              <div className="mt-16 flex items-center justify-center gap-4">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center border transition-all ${
                    currentPage === 1 
                      ? 'bg-slate-50 text-slate-200 border-slate-100 cursor-not-allowed' 
                      : 'bg-white text-slate-600 border-slate-100 hover:border-tunisia-red hover:text-tunisia-red shadow-sm'
                  }`}
                >
                  <ChevronLeft size={20} />
                </button>

                <div className="flex items-center gap-2">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`w-12 h-12 rounded-2xl text-[10px] font-black transition-all border ${
                        currentPage === page
                          ? 'bg-tunisia-red text-white border-tunisia-red shadow-lg shadow-red-500/20 scale-110'
                          : 'bg-white text-slate-400 border-slate-100 hover:border-slate-200'
                      }`}
                    >
                      {page.toString().padStart(2, '0')}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center border transition-all ${
                    currentPage === totalPages
                      ? 'bg-slate-50 text-slate-200 border-slate-100 cursor-not-allowed' 
                      : 'bg-white text-slate-600 border-slate-100 hover:border-tunisia-red hover:text-tunisia-red shadow-sm'
                  }`}
                >
                  <ChevronRight size={20} />
                </button>
              </div>
            )}
          </>
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
                    (e.target as HTMLImageElement).src = DEFAULT_IMAGE;
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

                {/* Bouton Ajouter dans le modal pour importateur */}
                {user?.role === 'IMPORTATEUR' && (
                  <div className="pt-4">
                    <button
                      onClick={() => handleAddToCart(selectedProduct)}
                      disabled={addingProductId === selectedProduct.id}
                      className="w-full py-4 bg-emerald-500 text-white rounded-2xl font-black uppercase tracking-widest text-[12px] shadow-lg hover:bg-emerald-600 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                    >
                      {addingProductId === selectedProduct.id ? (
                        <Loader2 className="animate-spin" size={20} />
                      ) : showAddSuccess === selectedProduct.id ? (
                        <>
                          <i className="fas fa-check-circle"></i>
                          Produit ajouté avec succès !
                        </>
                      ) : (
                        <>
                          <ShoppingCart size={18} />
                          Ajouter ce produit à ma commande
                        </>
                      )}
                    </button>
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
                     {user?.role === 'EXPORTATEUR' && (
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
                     )}
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