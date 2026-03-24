import React, { useState, useEffect } from 'react';
import ProductDeclarationForm from './ProductDeclarationForm';
import  {Exporter}  from '../types/Exporter';
import  {Product}  from '../types/Product';


interface ExporterDirectoryProps {
  externalSearchQuery?: string;
}

const CATEGORIES_ALIMENTAIRES = [
  { name: "Produits laitiers", codes: ["0401", "0402", "0403", "0404", "0405", "0406"] },
  { name: "Fruits et Légumes", codes: ["0701", "0702", "0804", "0805"] },
  { name: "Huiles végétales", codes: ["1509", "1510", "1512"] },
  { name: "Préparations de viandes", codes: ["1601", "1602"] },
  { name: "Sucres et sucreries", codes: ["1701", "1702", "1704"] },
];

const CATEGORIES_INDUSTRIELS = [
  { name: "Machines et appareils", codes: ["8415", "8418", "8450"] },
  { name: "Appareils électriques", codes: ["8516", "8517", "8528"] },
  { name: "Jouets et modèles", codes: ["9503", "9504"] },
  { name: "Meubles", codes: ["9401", "9403"] },
];2

const ExporterDirectory: React.FC<ExporterDirectoryProps> = ({ externalSearchQuery }) => {
  const [selectedExporter, setSelectedExporter] = useState<Exporter | null>(null);
  const [internalSearchQuery, setInternalSearchQuery] = useState('');
  const [exporters, setExporters] = useState<Exporter[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDeclarationForm, setShowDeclarationForm] = useState(false);
  const [selectedProductForForm, setSelectedProductForForm] = useState<(Product & { exporter: Exporter }) | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<(Product & { exporter: Exporter }) | null>(null);

  const searchQuery = externalSearchQuery !== undefined ? externalSearchQuery : internalSearchQuery;

  const getProductPlaceholder = (category: string, ngp?: string) => {
    if (ngp) {
      const ngpPrefix = ngp.substring(0, 4);
      
      for (const cat of CATEGORIES_ALIMENTAIRES) {
        if (cat.codes.includes(ngpPrefix)) {
          switch (cat.name) {
            case "Produits laitiers":
              return { color: 'bg-sky-50 text-sky-400', icon: 'fa-cheese', label: 'Produits laitiers' };
            case "Fruits et Légumes":
              return { color: 'bg-emerald-50 text-emerald-400', icon: 'fa-apple-alt', label: 'Fruits & Légumes' };
            case "Huiles végétales":
              return { color: 'bg-amber-50 text-amber-400', icon: 'fa-oil-can', label: 'Huiles' };
            case "Préparations de viandes":
              return { color: 'bg-rose-50 text-rose-400', icon: 'fa-drumstick-bite', label: 'Viandes' };
            case "Sucres et sucreries":
              return { color: 'bg-pink-50 text-pink-400', icon: 'fa-candy-cane', label: 'Sucreries' };
            default:
              return { color: 'bg-emerald-50 text-emerald-400', icon: 'fa-utensils', label: 'Alimentaire' };
          }
        }
      }
      
      for (const cat of CATEGORIES_INDUSTRIELS) {
        if (cat.codes.includes(ngpPrefix)) {
          switch (cat.name) {
            case "Machines et appareils":
              return { color: 'bg-slate-50 text-slate-400', icon: 'fa-cogs', label: 'Machines' };
            case "Appareils électriques":
              return { color: 'bg-indigo-50 text-indigo-400', icon: 'fa-bolt', label: 'Électrique' };
            case "Jouets et modèles":
              return { color: 'bg-purple-50 text-purple-400', icon: 'fa-puzzle-piece', label: 'Jouets' };
            case "Meubles":
              return { color: 'bg-orange-50 text-orange-400', icon: 'fa-couch', label: 'Meubles' };
            default:
              return { color: 'bg-slate-50 text-slate-400', icon: 'fa-industry', label: 'Industriel' };
          }
        }
      }
    }
  };

  const getFlagUrl = (country: string) => {
    const code = country || 'UN';
    return `https://flagcdn.com/w160/${code.toLowerCase()}.png`;
  };

  const getAuthToken = () => {
    return localStorage.getItem('token') || sessionStorage.getItem('token') || '';
  };

  const fetchExporters = async (query: string = '') => {
    setLoading(true);
    setError(null);
    
    try {
      const token = getAuthToken();
      
      let baseUrl = 'http://localhost:8080';
      let apiPath = '/api/importateur/exportateurs';
      
      let url = baseUrl + apiPath;
      
      if (query && query.trim() !== '') {
        url = `${baseUrl}${apiPath}/recherche?q=${encodeURIComponent(query)}`;
      }
      
      console.log('Appel API:', url);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }

      const data = await response.json();
      console.log('Données brutes reçues:', data);
      
      const transformedData: Exporter[] = data.map((item: any) => {
        console.log('Traitement exportateur:', item.raisonSociale, 'Produits:', item.produits);
        
        return {
          id: item.id?.toString() || '',
          name: item.raisonSociale || item.companyName || '',
          companyName: item.raisonSociale || item.companyName || '',
          country: item.paysOrigine || item.country || '',
          paysOrigine: item.paysOrigine || item.country || '',
          category: item.siteType || item.category || 'Non spécifié',
          description: item.description || `${item.raisonSociale || ''} - Exportateur basé en ${item.paysOrigine || ''}`,
          registration: item.numeroRegistreCommerce || item.registration || '',
          numeroRegistreCommerce: item.numeroRegistreCommerce || '',
          email: item.email || '',
          phone: item.telephone || item.phone || '',
          telephone: item.telephone || '',
          coverPhoto: item.coverPhoto || `https://picsum.photos/seed/${item.id}/1200/400`,
          profilePic: item.profilePic || `https://picsum.photos/seed/logo${item.id}/200/200`,
          statutAgrement: item.statutAgrement || '',
          numeroAgrement: item.numeroAgrement || '',
          siteType: item.siteType || '',
          ville: item.ville || '',
          siteWeb: item.siteWeb || '',
          representantLegal: item.representantLegal || '',
          products: Array.isArray(item.produits) ? item.produits.map((p: any) => ({
            id: p.id,
            name: p.productName || p.name || 'Produit sans nom',
            productName: p.productName || '',
            price: p.price || (p.annualQuantityValue ? `${p.annualQuantityValue} ${p.annualQuantityUnit || ''}` : 'Prix sur demande'),
            image: p.image || null,
            ngp: p.hsCode || p.ngp || '',
            hsCode: p.hsCode || '',
            annualQuantityValue: p.annualQuantityValue,
            annualQuantityUnit: p.annualQuantityUnit,
            category: p.category || item.siteType || 'Non spécifié'
          })) : []
        };
      });
      
      console.log('Données transformées:', transformedData);
      setExporters(transformedData);
      
    } catch (err: any) {
      console.error('Erreur lors du chargement des exportateurs:', err);
      setError(err.message || 'Erreur de chargement des données');
      setExporters(mockExporters);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExporters(searchQuery);
  }, [searchQuery]);

  const getFilteredProducts = (): (Product & { exporter: Exporter })[] => {
    if (!searchQuery || searchQuery.trim() === '') return [];
    
    const query = searchQuery.toLowerCase().trim();
    const allProducts: (Product & { exporter: Exporter })[] = [];
    
    exporters.forEach(exporter => {
      exporter.products.forEach(product => {
        const productName = (product.name || product.productName || '').toLowerCase();
        const productNgp = (product.ngp || product.hsCode || '').toLowerCase();
        
        if (productName.includes(query) || productNgp.includes(query)) {
          allProducts.push({
            ...product,
            exporter: exporter
          });
        }
      });
    });
    
    return allProducts;
  };

  const filteredProducts = getFilteredProducts();

  const mockExporters: Exporter[] = [
    { 
      id: 'EXP-001', 
      name: 'AgroEuro SA', 
      country: 'Espagne', 
      category: 'Alimentaire',
      description: 'Leader européen dans l\'exportation de produits agricoles de haute qualité.',
      registration: 'ES-12345678',
      email: 'contact@agroeuro.es',
      phone: '+34 912 345 678',
      coverPhoto: 'https://picsum.photos/seed/agroeuro_cover/1200/400',
      profilePic: 'https://picsum.photos/seed/agroeuro_logo/200/200',
      products: [
        { name: 'Fromage Manchego', price: '22.00 €/Kg', category: 'Alimentaire', image: 'https://picsum.photos/seed/cheese/400/300', ngp: '04069000' },
        { name: 'Huile d\'olive Extra Vierge', price: '12.50 €/L', category: 'Alimentaire', image: 'https://picsum.photos/seed/olive_oil/400/300', ngp: '15091020' },
        { name: 'Vin Rouge Reserva', price: '18.00 €/Btl', category: 'Alimentaire', image: null, ngp: '22042100' },
        { name: 'Amandes Grillées', price: '15.00 €/Kg', category: 'Alimentaire', image: null, ngp: '08021200' },
      ]
    },
    { 
      id: 'EXP-002', 
      name: 'TechChina Ltd', 
      country: 'Chine', 
      category: 'Industriel',
      description: 'Spécialiste mondial des composants électroniques et solutions semi-conducteurs.',
      registration: 'CN-88990011',
      email: 'sales@techchina.cn',
      phone: '+86 21 6789 0123',
      coverPhoto: 'https://picsum.photos/seed/techchina_cover/1200/400',
      profilePic: 'https://picsum.photos/seed/techchina_logo/200/200',
      products: [
        { name: 'Microprocesseur A1', price: '45.00 $', category: 'Industriel', image: 'https://picsum.photos/seed/cpu/400/300', ngp: '85423100' },
        { name: 'Écran OLED 4K', price: '120.00 $', category: 'Industriel', image: null, ngp: '85285900' },
        { name: 'Module RAM 16GB', price: '35.00 $', category: 'Industriel', image: 'https://picsum.photos/seed/ram/400/300', ngp: '84733000' },
      ]
    },
    { 
      id: 'EXP-003', 
      name: 'Global Fabrics', 
      country: 'France', 
      category: 'Textile',
      description: 'Maison de textile traditionnelle proposant des tissus premium pour la haute couture.',
      registration: 'FR-55443322',
      email: 'info@globalfabrics.fr',
      phone: '+33 1 45 67 89 00',
      coverPhoto: 'https://picsum.photos/seed/fabrics_cover/1200/400',
      profilePic: 'https://picsum.photos/seed/fabrics_logo/200/200',
      products: [
        { name: 'Soie Naturelle', price: '40.00 €/m', category: 'Textile', image: 'https://picsum.photos/seed/silk/400/300', ngp: '50072000' },
        { name: 'Coton Égyptien', price: '25.00 €/m', category: 'Textile', image: null, ngp: '52081100' },
        { name: 'Lin Bio', price: '30.00 €/m', category: 'Textile', image: 'https://picsum.photos/seed/linen/400/300', ngp: '53091100' },
      ]
    }
  ];

  // Add exporter reference to products in mock data
  mockExporters.forEach(exporter => {
    exporter.products.forEach(product => {
      (product as any).exporter = exporter;
    });
  });

  const filteredExporters = exporters.length > 0 ? exporters : mockExporters;

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-tunisia-red"></div>
      </div>
    );
  }

  if (error && exporters.length === 0) {
    return (
      <div className="bg-red-50 p-8 rounded-[2rem] text-center">
        <i className="fas fa-exclamation-triangle text-red-500 text-4xl mb-4"></i>
        <p className="text-red-600 font-bold">Erreur de chargement: {error}</p>
        <button 
          onClick={() => fetchExporters(searchQuery)}
          className="mt-4 px-6 py-3 bg-red-600 text-white rounded-xl text-sm font-bold hover:bg-red-700 transition-colors"
        >
          Réessayer
        </button>
      </div>
    );
  }

  if (selectedExporter) {
    return (
      <>
        <div className="animate-fade-in-scale space-y-6">
          <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-100 overflow-hidden">
            <div className="h-64 md:h-80 bg-slate-200 relative">
              <img src={selectedExporter.coverPhoto} alt="Cover" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              <button 
                onClick={() => setSelectedExporter(null)}
                className="absolute top-6 left-6 w-10 h-10 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-white/40 transition-all"
              >
                <i className="fas fa-arrow-left"></i>
              </button>
            </div>

            <div className="px-10 pb-6 relative">
              <div className="flex flex-col md:flex-row items-end gap-6 -mt-16 md:-mt-20 relative z-10">
                <div className="w-32 h-32 md:w-40 md:h-40 rounded-full border-[6px] border-white overflow-hidden shadow-2xl bg-white">
                  <img 
                    src={getFlagUrl(selectedExporter.country)} 
                    alt="Flag" 
                    className="w-full h-full object-cover" 
                    referrerPolicy="no-referrer" 
                  />
                </div>
                <div className="flex-grow pb-4 text-center md:text-left">
                  <div className="flex items-center justify-center md:justify-start gap-3">
                    <h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tighter uppercase italic">{selectedExporter.name}</h2>
                    <i className="fas fa-check-circle text-blue-500 text-xl"></i>
                  </div>
                  <p className="text-slate-500 font-bold mt-1">{selectedExporter.category} &bull; {selectedExporter.country}</p>
                </div>
              </div>

              <div className="mt-10 border-t border-slate-100 pt-2 flex gap-8">
                <button className="py-4 border-b-4 border-tunisia-red text-tunisia-red font-black uppercase tracking-widest text-[10px]">Produits</button>
                <button className="py-4 text-slate-400 font-black uppercase tracking-widest text-[10px] hover:text-slate-900 transition-colors">À propos</button>
                <button className="py-4 text-slate-400 font-black uppercase tracking-widest text-[10px] hover:text-slate-900 transition-colors">Avis</button>
                <button className="py-4 text-slate-400 font-black uppercase tracking-widest text-[10px] hover:text-slate-900 transition-colors">Photos</button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="space-y-6">
              <div className="bg-white p-8 rounded-[2rem] shadow-xl border border-slate-100">
                <h3 className="text-lg font-black text-slate-900 uppercase italic tracking-tighter mb-6">Intro</h3>
                <p className="text-sm text-slate-600 font-medium leading-relaxed mb-6">{selectedExporter.description}</p>
                <div className="space-y-4">
                  <div className="flex items-center gap-4 text-slate-500">
                    <i className="fas fa-briefcase w-5 text-slate-400"></i>
                    <span className="text-xs font-bold uppercase tracking-tight">Enregistrement: <span className="text-slate-900">{selectedExporter.registration}</span></span>
                  </div>
                  <div className="flex items-center gap-4 text-slate-500">
                    <i className="fas fa-location-dot w-5 text-slate-400"></i>
                    <span className="text-xs font-bold uppercase tracking-tight">Basé en <span className="text-slate-900">{selectedExporter.country}</span></span>
                  </div>
                  <div className="flex items-center gap-4 text-slate-500">
                    <i className="fas fa-envelope w-5 text-slate-400"></i>
                    <span className="text-xs font-bold text-slate-900">{selectedExporter.email}</span>
                  </div>
                  <div className="flex items-center gap-4 text-slate-500">
                    <i className="fas fa-phone w-5 text-slate-400"></i>
                    <span className="text-xs font-bold text-slate-900">{selectedExporter.phone}</span>
                  </div>
                </div>
              </div>

              <div className="bg-slate-900 text-white p-8 rounded-[2rem] shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-6 opacity-10">
                  <i className="fas fa-certificate text-6xl"></i>
                </div>
                <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-4">Statut de Conformité</h4>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center text-white">
                    <i className="fas fa-shield-check"></i>
                  </div>
                  <div>
                    <span className="block text-xs font-black uppercase tracking-tight">Exportateur Agréé</span>
                    <span className="text-[9px] text-slate-400 uppercase font-bold">Vérifié par le Ministère</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white p-8 rounded-[2rem] shadow-xl border border-slate-100">
                <div className="flex justify-between items-center mb-8">
                  <h3 className="text-lg font-black text-slate-900 uppercase italic tracking-tighter">
                    Catalogue Produits ({selectedExporter.products.length})
                  </h3>
                  <button className="text-tunisia-red font-black uppercase text-[10px] tracking-widest">Voir tout</button>
                </div>
                
                {selectedExporter.products.length === 0 ? (
                  <div className="text-center py-12 bg-slate-50 rounded-2xl">
                    <i className="fas fa-box-open text-slate-300 text-5xl mb-4"></i>
                    <p className="text-slate-400 font-bold">Aucun produit disponible</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {selectedExporter.products.map((product, idx) => {
                      const placeholder = getProductPlaceholder(product.category || selectedExporter.category, product.ngp);
                      return (
                        <div 
                          key={idx} 
                          className="group border border-slate-50 rounded-2xl overflow-hidden hover:border-tunisia-red transition-all flex flex-col cursor-pointer"
                          onClick={() => setSelectedProduct({ ...product, exporter: selectedExporter })}
                        >
                          <div className="h-48 bg-slate-100 overflow-hidden relative flex items-center justify-center">
                            {product.image ? (
                              <img 
                                src={product.image} 
                                alt={product.name} 
                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" 
                                referrerPolicy="no-referrer" 
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display = 'none';
                                  (e.target as HTMLImageElement).parentElement?.classList.add('flex', 'items-center', 'justify-center');
                                }}
                              />
                            ) : (
                              <div className={`w-full h-full flex flex-col items-center justify-center ${placeholder.color}`}>
                                <i className={`fas ${placeholder.icon} text-4xl mb-2`}></i>
                                <span className="text-[10px] font-black uppercase tracking-widest">{placeholder.label}</span>
                              </div>
                            )}
                          </div>
                          <div className="p-4 flex-grow flex flex-col">
                            <h5 className="font-black text-slate-900 uppercase tracking-tight mb-1">{product.name}</h5>
                            {product.ngp && (
                              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-2">
                                NGP: {product.ngp}
                              </p>
                            )}
                            <div className="flex justify-between items-center mb-4">
                              <span className="text-xs font-black text-tunisia-red italic">
                                {product.price || 'Prix sur demande'}
                              </span>
                            </div>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                setShowDeclarationForm(true);
                                setSelectedProductForForm({ ...product, exporter: selectedExporter });
                              }}
                              className="w-full py-2 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-tunisia-red transition-all flex items-center justify-center gap-2"
                            >
                              <i className="fas fa-plus"></i> Ajouter
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Product Detail Modal */}
        {selectedProduct && (
          <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
            <div className="bg-white w-full max-w-4xl rounded-[3rem] shadow-2xl overflow-hidden flex flex-col md:flex-row max-h-[90vh] animate-fade-in-scale">
              <div className="md:w-1/2 h-64 md:h-auto bg-slate-100 relative flex items-center justify-center">
                {selectedProduct.image ? (
                  <img src={selectedProduct.image} alt={selectedProduct.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <div className={`w-full h-full flex flex-col items-center justify-center ${getProductPlaceholder(selectedProduct.category || selectedProduct.exporter?.category || '', selectedProduct.ngp).color}`}>
                    <i className={`fas ${getProductPlaceholder(selectedProduct.category || selectedProduct.exporter?.category || '', selectedProduct.ngp).icon} text-6xl mb-4`}></i>
                    <span className="text-xs font-black uppercase tracking-widest">{getProductPlaceholder(selectedProduct.category || selectedProduct.exporter?.category || '', selectedProduct.ngp).label}</span>
                  </div>
                )}
                <button 
                  onClick={() => setSelectedProduct(null)}
                  className="absolute top-6 left-6 w-10 h-10 bg-white shadow-lg rounded-full flex items-center justify-center text-slate-400 hover:text-tunisia-red transition-all"
                >
                  <i className="fas fa-times"></i>
                </button>
              </div>
              <div className="md:w-1/2 p-8 md:p-12 space-y-6 overflow-y-auto">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 bg-slate-100 rounded-lg text-[8px] font-black uppercase tracking-widest text-slate-500">
                      NGP: {selectedProduct.ngp}
                    </span>
                    <span className="px-3 py-1 bg-tunisia-red/10 rounded-lg text-[8px] font-black uppercase tracking-widest text-tunisia-red">
                      En Stock
                    </span>
                  </div>
                  <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic">{selectedProduct.name}</h2>
                  <p className="text-xl font-black text-tunisia-red italic">{selectedProduct.price}</p>
                </div>

                <div className="pt-6 border-t border-slate-100">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">Vendu par</h4>
                  <div 
                    className="flex items-center gap-4 cursor-pointer group"
                    onClick={() => {
                      setSelectedExporter(selectedProduct.exporter);
                      setSelectedProduct(null);
                    }}
                  >
                    <div className="w-12 h-12 rounded-xl overflow-hidden shadow-md bg-white">
                      <img 
                        src={getFlagUrl(selectedProduct.exporter.country)} 
                        alt="Flag" 
                        className="w-full h-full object-cover" 
                        referrerPolicy="no-referrer" 
                      />
                    </div>
                    <div>
                      <h5 className="font-black text-slate-900 uppercase tracking-tight group-hover:text-tunisia-red transition-colors">{selectedProduct.exporter.name}</h5>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{selectedProduct.exporter.country}</p>
                    </div>
                  </div>
                </div>

                <div className="pt-8 space-y-4">
                  <button 
                    onClick={() => {
                      setSelectedProduct(null);
                      setShowDeclarationForm(true);
                      setSelectedProductForForm(selectedProduct);
                    }}
                    className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-slate-200 active:scale-95 transition-all flex items-center justify-center gap-3"
                  >
                    <i className="fas fa-plus"></i> Ajouter à ma déclaration
                  </button>
                  <button className="w-full py-4 bg-white border-2 border-slate-100 text-slate-600 rounded-2xl font-black uppercase tracking-widest hover:border-tunisia-red hover:text-tunisia-red transition-all">
                    Contacter l'exportateur
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Product Declaration Form Modal */}
        {showDeclarationForm && selectedProductForForm && (
          <ProductDeclarationForm
            product={{
              name: selectedProductForForm.name,
              price: selectedProductForForm.price || 'Prix sur demande',
              category: selectedProductForForm.category || selectedProductForForm.exporter?.category || 'Autre',
              image: selectedProductForForm.image || undefined,
              ngp: selectedProductForForm.ngp
            }}
            exporter={{
              name: selectedProductForForm.exporter.name,
              profilePic: selectedProductForForm.exporter.profilePic,
              country: selectedProductForForm.exporter.country
            }}
            onClose={() => {
              setShowDeclarationForm(false);
              setSelectedProductForForm(null);
            }}
            onSuccess={() => {
              setShowDeclarationForm(false);
              setSelectedProductForForm(null);
              alert('Déclaration soumise avec succès !');
            }}
          />
        )}
      </>
    );
  }

  return (
    <>
      <div className="space-y-6 animate-fade-in-scale">
        {!externalSearchQuery && (
          <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100">
            <div className="flex flex-col md:flex-row gap-4 items-center">
              <div className="relative flex-grow">
                <input 
                  type="text" 
                  placeholder="Rechercher par Pays, Nom d'entreprise, Produit ou Code NGP..." 
                  value={internalSearchQuery}
                  onChange={(e) => setInternalSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-tunisia-red outline-none transition-all" 
                />
                <i className="fas fa-search absolute left-5 top-1/2 -translate-y-1/2 text-slate-300"></i>
              </div>
              <div className="flex gap-2">
                <button className="px-6 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg">Filtres</button>
              </div>
            </div>
          </div>
        )}

        {/* Product Search Results Section */}
        {searchQuery && filteredProducts.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-xl font-black text-slate-900 uppercase italic tracking-tighter px-4">Produits correspondants</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {filteredProducts.map((product, idx) => {
                const placeholder = getProductPlaceholder(product.category || product.exporter?.category || '', product.ngp);
                return (
                  <div 
                    key={idx} 
                    className="group border border-slate-50 rounded-2xl overflow-hidden hover:border-tunisia-red transition-all cursor-pointer flex flex-col"
                    onClick={() => setSelectedProduct(product)}
                  >
                    <div className="h-40 bg-slate-100 overflow-hidden relative flex items-center justify-center">
                      {product.image ? (
                        <img 
                          src={product.image} 
                          alt={product.name} 
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" 
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                            (e.target as HTMLImageElement).parentElement?.classList.add('flex', 'items-center', 'justify-center');
                          }}
                        />
                      ) : (
                        <div className={`w-full h-full flex flex-col items-center justify-center ${placeholder.color}`}>
                          <i className={`fas ${placeholder.icon} text-3xl mb-1`}></i>
                          <span className="text-[8px] font-black uppercase tracking-widest">{placeholder.label}</span>
                        </div>
                      )}
                      <div className="absolute top-2 right-2 px-2 py-1 bg-white/90 backdrop-blur-sm rounded-lg text-[8px] font-black uppercase tracking-widest text-slate-500">
                        {product.exporter?.name}
                      </div>
                    </div>
                    <div className="p-4 flex-grow flex flex-col">
                      <h5 className="font-black text-slate-900 uppercase tracking-tight mb-1">
                        {product.name}
                      </h5>
                      <div className="flex justify-between items-center mb-4">
                        <span className="text-xs font-black text-tunisia-red italic">{product.price || 'Prix sur demande'}</span>
                        {product.ngp && (
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{product.ngp}</span>
                        )}
                      </div>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowDeclarationForm(true);
                          setSelectedProductForForm(product);
                        }}
                        className="w-full py-2 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-tunisia-red transition-all flex items-center justify-center gap-2"
                      >
                        <i className="fas fa-plus"></i> Ajouter
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Exporters Grid */}
        <div className="space-y-4">
          <h3 className="text-xl font-black text-slate-900 uppercase italic tracking-tighter px-4">Exportateurs correspondants</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredExporters.map(exporter => (
              <div 
                key={exporter.id}
                onClick={() => setSelectedExporter(exporter)}
                className="bg-white rounded-[2rem] shadow-lg border border-slate-100 overflow-hidden group cursor-pointer hover:shadow-2xl transition-all hover:-translate-y-1"
              >
                <div className="h-32 bg-slate-200 relative overflow-hidden">
                  <img src={exporter.coverPhoto} alt="Cover" className="w-full h-full object-cover opacity-80 group-hover:scale-110 transition-transform duration-700" referrerPolicy="no-referrer" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
                </div>
                <div className="p-6 relative">
                  <div className="absolute -top-10 left-6">
                    <div className="w-16 h-16 rounded-2xl border-4 border-white overflow-hidden shadow-lg bg-white">
                      <img 
                        src={getFlagUrl(exporter.country)} 
                        alt="Flag" 
                        className="w-full h-full object-cover" 
                        referrerPolicy="no-referrer" 
                      />
                    </div>
                  </div>
                  <div className="mt-8">
                    <div className="flex items-center gap-2">
                      <h4 className="text-lg font-black text-slate-900 tracking-tighter uppercase italic">{exporter.name}</h4>
                      <i className="fas fa-check-circle text-blue-500 text-xs"></i>
                    </div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">{exporter.category} &bull; {exporter.country}</p>
                    <p className="text-xs text-slate-500 line-clamp-2 font-medium leading-relaxed">{exporter.description}</p>
                  </div>
                  <div className="mt-6 pt-6 border-t border-slate-50 flex justify-between items-center">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                      {exporter.products?.length || 0} Produits
                    </span>
                    <button className="text-tunisia-red font-black uppercase text-[10px] tracking-widest">Voir Profil</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Product Detail Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white w-full max-w-4xl rounded-[3rem] shadow-2xl overflow-hidden flex flex-col md:flex-row max-h-[90vh] animate-fade-in-scale">
            <div className="md:w-1/2 h-64 md:h-auto bg-slate-100 relative flex items-center justify-center">
              {selectedProduct.image ? (
                <img src={selectedProduct.image} alt={selectedProduct.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <div className={`w-full h-full flex flex-col items-center justify-center ${getProductPlaceholder(selectedProduct.category || selectedProduct.exporter?.category || '', selectedProduct.ngp).color}`}>
                  <i className={`fas ${getProductPlaceholder(selectedProduct.category || selectedProduct.exporter?.category || '', selectedProduct.ngp).icon} text-6xl mb-4`}></i>
                  <span className="text-xs font-black uppercase tracking-widest">{getProductPlaceholder(selectedProduct.category || selectedProduct.exporter?.category || '', selectedProduct.ngp).label}</span>
                </div>
              )}
              <button 
                onClick={() => setSelectedProduct(null)}
                className="absolute top-6 left-6 w-10 h-10 bg-white shadow-lg rounded-full flex items-center justify-center text-slate-400 hover:text-tunisia-red transition-all"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="md:w-1/2 p-8 md:p-12 space-y-6 overflow-y-auto">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 bg-slate-100 rounded-lg text-[8px] font-black uppercase tracking-widest text-slate-500">
                    NGP: {selectedProduct.ngp}
                  </span>
                  <span className="px-3 py-1 bg-tunisia-red/10 rounded-lg text-[8px] font-black uppercase tracking-widest text-tunisia-red">
                    En Stock
                  </span>
                </div>
                <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic">{selectedProduct.name}</h2>
                <p className="text-xl font-black text-tunisia-red italic">{selectedProduct.price}</p>
              </div>

              <div className="pt-6 border-t border-slate-100">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">Vendu par</h4>
                <div 
                  className="flex items-center gap-4 cursor-pointer group"
                  onClick={() => {
                    setSelectedExporter(selectedProduct.exporter);
                    setSelectedProduct(null);
                  }}
                >
                  <div className="w-12 h-12 rounded-xl overflow-hidden shadow-md bg-white">
                    <img 
                      src={getFlagUrl(selectedProduct.exporter.country)} 
                      alt="Flag" 
                      className="w-full h-full object-cover" 
                      referrerPolicy="no-referrer" 
                    />
                  </div>
                  <div>
                    <h5 className="font-black text-slate-900 uppercase tracking-tight group-hover:text-tunisia-red transition-colors">{selectedProduct.exporter.name}</h5>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{selectedProduct.exporter.country}</p>
                  </div>
                </div>
              </div>

              <div className="pt-8 space-y-4">
                <button 
                  onClick={() => {
                    setSelectedProduct(null);
                    setShowDeclarationForm(true);
                    setSelectedProductForForm(selectedProduct);
                  }}
                  className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-slate-200 active:scale-95 transition-all flex items-center justify-center gap-3"
                >
                  <i className="fas fa-plus"></i> Ajouter à ma déclaration
                </button>
                <button className="w-full py-4 bg-white border-2 border-slate-100 text-slate-600 rounded-2xl font-black uppercase tracking-widest hover:border-tunisia-red hover:text-tunisia-red transition-all">
                  Contacter l'exportateur
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Product Declaration Form Modal */}
      {showDeclarationForm && selectedProductForForm && (
        <ProductDeclarationForm
          product={{
            name: selectedProductForForm.name,
            price: selectedProductForForm.price || 'Prix sur demande',
            category: selectedProductForForm.category || selectedProductForForm.exporter?.category || 'Autre',
            image: selectedProductForForm.image || undefined,
            ngp: selectedProductForForm.ngp
          }}
          exporter={{
            name: selectedProductForForm.exporter.name,
            profilePic: selectedProductForForm.exporter.profilePic,
            country: selectedProductForForm.exporter.country
          }}
          onClose={() => {
            setShowDeclarationForm(false);
            setSelectedProductForForm(null);
          }}
          onSuccess={() => {
            setShowDeclarationForm(false);
            setSelectedProductForForm(null);
            alert('Déclaration soumise avec succès !');
          }}
        />
      )}
    </>
  );
};

export default ExporterDirectory;