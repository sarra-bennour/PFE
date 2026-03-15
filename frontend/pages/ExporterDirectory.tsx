import React, { useState, useEffect } from 'react';

interface Product {
  id?: number;
  name: string;
  price?: string;
  image?: string;
  ngp?: string;
  productName?: string;
  hsCode?: string;
  annualQuantityValue?: string;
  annualQuantityUnit?: string;
  category?: string;
}

interface Exporter {
  id: string;
  name: string;
  companyName?: string;
  country: string;
  paysOrigine?: string;
  category: string;
  description: string;
  registration: string;
  numeroRegistreCommerce?: string;
  email: string;
  phone: string;
  telephone?: string;
  coverPhoto: string;
  profilePic: string;
  products: Product[];
  statutAgrement?: string;
  numeroAgrement?: string;
  siteType?: string;
  ville?: string;
  siteWeb?: string;
  representantLegal?: string;
}

interface ExporterDirectoryProps {
  externalSearchQuery?: string;
}

const ExporterDirectory: React.FC<ExporterDirectoryProps> = ({ externalSearchQuery }) => {
  const [selectedExporter, setSelectedExporter] = useState<Exporter | null>(null);
  const [internalSearchQuery, setInternalSearchQuery] = useState('');
  const [exporters, setExporters] = useState<Exporter[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchQuery = externalSearchQuery !== undefined ? externalSearchQuery : internalSearchQuery;
  const setSearchQuery = externalSearchQuery !== undefined ? () => {} : setInternalSearchQuery;

  // Récupérer le token d'authentification
  const getAuthToken = () => {
    return localStorage.getItem('token') || sessionStorage.getItem('token') || '';
  };

  // Fonction pour charger les exportateurs depuis l'API
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
      
      // Transformer les données du backend vers le format attendu par le composant
      const transformedData = data.map((item: any) => {
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
          // Gestion des produits - Vérification importante !
          products: Array.isArray(item.produits) ? item.produits.map((p: any) => ({
            id: p.id,
            name: p.productName || p.name || 'Produit sans nom',
            productName: p.productName || '',
            price: p.price || (p.annualQuantityValue ? `${p.annualQuantityValue} ${p.annualQuantityUnit || ''}` : 'Prix sur demande'),
            image: p.image || `https://picsum.photos/seed/product${p.id || Math.random()}/400/300`,
            ngp: p.hsCode || p.ngp || '',
            hsCode: p.hsCode || '',
            annualQuantityValue: p.annualQuantityValue,
            annualQuantityUnit: p.annualQuantityUnit,
            category: p.category
          })) : [] // Si produits n'est pas un tableau, mettre un tableau vide
        };
      });
      
      console.log('Données transformées:', transformedData);
      setExporters(transformedData);
      
    } catch (err: any) {
      console.error('Erreur lors du chargement des exportateurs:', err);
      setError(err.message || 'Erreur de chargement des données');
      
      // En cas d'erreur, utiliser les données mockées
      setExporters(mockExporters);
    } finally {
      setLoading(false);
    }
  };

  // Charger les données au montage du composant
  useEffect(() => {
    fetchExporters(searchQuery);
  }, [searchQuery]);

  // Données mockées en fallback
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
        { name: 'Huile d\'olive Extra Vierge', price: '12.50 €/L', image: 'https://picsum.photos/seed/olive_oil/400/300', ngp: '15091020' },
        { name: 'Vin Rouge Reserva', price: '18.00 €/Btl', image: 'https://picsum.photos/seed/wine/400/300', ngp: '22042100' },
        { name: 'Fromage Manchego', price: '22.00 €/Kg', image: 'https://picsum.photos/seed/cheese/400/300', ngp: '04069000' },
        { name: 'Amandes Grillées', price: '15.00 €/Kg', image: 'https://picsum.photos/seed/almonds/400/300', ngp: '08021200' },
      ]
    },
    { 
      id: 'EXP-002', 
      name: 'TechChina Ltd', 
      country: 'Chine', 
      category: 'Technologie',
      description: 'Spécialiste mondial des composants électroniques et solutions semi-conducteurs.',
      registration: 'CN-88990011',
      email: 'sales@techchina.cn',
      phone: '+86 21 6789 0123',
      coverPhoto: 'https://picsum.photos/seed/techchina_cover/1200/400',
      profilePic: 'https://picsum.photos/seed/techchina_logo/200/200',
      products: [
        { name: 'Microprocesseur A1', price: '45.00 $', image: 'https://picsum.photos/seed/cpu/400/300', ngp: '85423100' },
        { name: 'Écran OLED 4K', price: '120.00 $', image: 'https://picsum.photos/seed/screen/400/300', ngp: '85285900' },
        { name: 'Module RAM 16GB', price: '35.00 $', image: 'https://picsum.photos/seed/ram/400/300', ngp: '84733000' },
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
        { name: 'Soie Naturelle', price: '40.00 €/m', image: 'https://picsum.photos/seed/silk/400/300', ngp: '50072000' },
        { name: 'Coton Égyptien', price: '25.00 €/m', image: 'https://picsum.photos/seed/cotton/400/300', ngp: '52081100' },
        { name: 'Lin Bio', price: '30.00 €/m', image: 'https://picsum.photos/seed/linen/400/300', ngp: '53091100' },
      ]
    }
  ];

  // Utiliser les données de l'API ou les mockées
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
      <div className="animate-fade-in-scale space-y-6">
        {/* Facebook Style Profile Header */}
        <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-100 overflow-hidden">
          {/* Cover Photo */}
          <div className="h-64 md:h-80 bg-slate-200 relative">
            <img src={selectedExporter.coverPhoto} alt="Cover" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            <button 
              onClick={() => setSelectedExporter(null)}
              className="absolute top-6 left-6 w-10 h-10 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-white/40 transition-all"
            >
              <i className="fas fa-arrow-left"></i>
            </button>
          </div>

          {/* Profile Info Bar */}
          <div className="px-10 pb-6 relative">
            <div className="flex flex-col md:flex-row items-end gap-6 -mt-16 md:-mt-20 relative z-10">
              <div className="w-32 h-32 md:w-40 md:h-40 rounded-full border-[6px] border-white overflow-hidden shadow-2xl bg-white">
                <img src={selectedExporter.profilePic} alt="Logo" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              </div>
              <div className="flex-grow pb-4 text-center md:text-left">
                <div className="flex items-center justify-center md:justify-start gap-3">
                  <h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tighter uppercase italic">{selectedExporter.name}</h2>
                  <i className="fas fa-check-circle text-blue-500 text-xl"></i>
                </div>
                <p className="text-slate-500 font-bold mt-1">{selectedExporter.category} &bull; {selectedExporter.country}</p>
              </div>
            </div>

            {/* Profile Tabs */}
            <div className="mt-10 border-t border-slate-100 pt-2 flex gap-8">
              <button className="py-4 border-b-4 border-tunisia-red text-tunisia-red font-black uppercase tracking-widest text-[10px]">Produits</button>
              <button className="py-4 text-slate-400 font-black uppercase tracking-widest text-[10px] hover:text-slate-900 transition-colors">À propos</button>
              <button className="py-4 text-slate-400 font-black uppercase tracking-widest text-[10px] hover:text-slate-900 transition-colors">Avis</button>
              <button className="py-4 text-slate-400 font-black uppercase tracking-widest text-[10px] hover:text-slate-900 transition-colors">Photos</button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Sidebar - About */}
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

          {/* Main Content - Products Grid */}
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
                  {selectedExporter.products.map((product, idx) => (
                    <div key={idx} className="group border border-slate-50 rounded-2xl overflow-hidden hover:border-tunisia-red transition-all">
                      <div className="h-48 bg-slate-100 overflow-hidden">
                        <img 
                          src={product.image || `https://picsum.photos/seed/${product.ngp || product.id || Math.random()}/400/300`} 
                          alt={product.name} 
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" 
                          referrerPolicy="no-referrer" 
                          onError={(e) => {
                            // Si l'image ne charge pas, utiliser une image par défaut
                            (e.target as HTMLImageElement).src = 'https://picsum.photos/400/300';
                          }}
                        />
                      </div>
                      <div className="p-4">
                        <h5 className="font-black text-slate-900 uppercase tracking-tight mb-1">{product.name}</h5>
                        {product.ngp && (
                          <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-2">
                            NGP: {product.ngp}
                          </p>
                        )}
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-black text-tunisia-red italic">
                            {product.price || 'Prix sur demande'}
                          </span>
                          <button className="w-8 h-8 bg-slate-50 rounded-lg flex items-center justify-center text-slate-400 hover:bg-tunisia-red hover:text-white transition-all">
                            <i className="fas fa-cart-plus text-xs"></i>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
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
                <div className="w-16 h-16 rounded-2xl border-4 border-white overflow-hidden shadow-lg">
                  <img src={exporter.profilePic} alt="Logo" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
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
  );
};

export default ExporterDirectory;