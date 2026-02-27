import React, { useState, useEffect, ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axios from 'axios';

// ==================== TYPES ====================
type ProductType = 'alimentaire' | 'industriel';

interface ProductItem {
  id: string;
  backendId?: number;
  type: ProductType;
  category: string;
  ngpCode: string;
  productName: string;
  isLinkedToBrand: boolean;
  brandName: string;
  isBrandOwner: boolean;
  hasBrandLicense: boolean;
  productState: string;
  originCountry: string;
  annualQuantityValue: string;
  annualQuantityUnit: string;
  commercialBrandName?: string;
}

interface DeclarationFormData {
  products: ProductItem[];
  files: Record<string, File | null>;
}

interface User {
  id: number;
  email: string;
  role: string;
  nom?: string;
  prenom?: string;
}

interface ProductResponse {
  id: number;
  productType: string;
  category: string;
  hsCode: string;
  productName: string;
}

interface DemandeResponse {
  id: number;
  reference: string;
  status: string;
  products: ProductResponse[];
}

// ==================== CONSTANTS ====================
const PRODUCT_STATES = [
  'Brut', 'Transformé', 'Congelé', 'Déshydraté', 'En conserve', 
  'Pasteurisé', 'Surgelé', 'Frais', 'En poudre', 'Confit', 'Etuvé', 'Autre'
];

const COUNTRIES = [
  { name: "Tunisie", flag: "🇹🇳" },
  { name: "France", flag: "🇫🇷" },
  { name: "Turquie", flag: "🇹🇷" },
  { name: "Italie", flag: "🇮🇹" },
  { name: "Espagne", flag: "🇪🇸" },
  { name: "Allemagne", flag: "🇩🇪" },
  { name: "Algérie", flag: "🇩🇿" },
  { name: "Maroc", flag: "🇲🇦" },
  { name: "Libye", flag: "🇱🇾" },
  { name: "Égypte", flag: "🇪🇬" },
  { name: "Arabie Saoudite", flag: "🇸🇦" },
  { name: "Émirats Arabes Unis", flag: "🇦🇪" },
  { name: "États-Unis", flag: "🇺🇸" },
  { name: "Chine", flag: "🇨🇳" },
  { name: "Japon", flag: "🇯🇵" },
  { name: "Canada", flag: "🇨🇦" },
  { name: "Brésil", flag: "🇧🇷" },
  { name: "Inde", flag: "🇮🇳" }
].sort((a, b) => a.name.localeCompare(b.name));

const QUANTITY_UNITS = ["Tonnes", "Kilogrammes", "Unités", "Litres", "Palettes"];

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
];

const FOOD_DOCS = [
  { id: 'SANITARY_APPROVAL', label: "Certificat d’agrément/enregistrement de sécurité sanitaire", required: true },
  { id: 'SANITARY_CERT', label: "Certificat sanitaire", required: true },
  { id: 'FREE_SALE_CERT', label: "Certificat de libre vente", required: true },
  { id: 'TECHNICAL_DATA_SHEET', label: "Fiche technique", required: true },
  { id: 'BACTERIO_ANALYSIS', label: "Rapport d’analyse bactériologique", required: true },
  { id: 'PHYSICO_CHEM_ANALYSIS', label: "Rapport d’analyse physico-chimique", required: true },
  { id: 'RADIOACTIVITY_ANALYSIS', label: "Rapport d’analyse de radioactivité", required: true },
  { id: 'FUMIGATION_CERT', label: "Fumigation (selon les produits)", required: true },
  { id: 'OFFICIAL_LETTER', label: "Lettre officielle", required: true },
  { id: 'QUALITY_CERT', label: "Certificat de qualité", required: false },
  { id: 'STORAGE_FACILITY_PLAN', label: "Plan des locaux de stockage", required: false },
  { id: 'PRODUCTION_FACILITY_PLAN', label: "Plan des locaux de production", required: false },
  { id: 'MONITORING_PLAN', label: "Plan de surveillance", required: false },
  { id: 'BRAND_LICENSE', label: "Licence pour exploiter la marque", required: true },
  { id: 'PRODUCT_SHEETS', label: "Fiches produits", required: true },
  { id: 'PRODUCT_LABELS', label: "Étiquettes", required: false },
  { id: 'COMMISSION_LETTER', label: "Lettre officielle de recommandation de l’autorité compétente", required: false },
];

const INDUSTRIAL_DOCS = [
  { id: 'CONFORMITY_CERT_ANALYSIS_REPORT', label: "Certificat de conformité ou rapport d’analyse", required: true }
];

// ==================== API SETUP - SIMILAIRE À ExporterSpace ====================
const API_BASE_URL = 'http://localhost:8080/api';

// Créer une instance axios avec la configuration de base
const api = axios.create({
  baseURL: API_BASE_URL,
});

// Intercepteur pour ajouter le token à chaque requête (comme dans ExporterSpace)
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
    console.log('✅ Token ajouté à la requête:', config.method?.toUpperCase(), config.url);
  } else {
    console.error('❌ Token manquant pour la requête:', config.url);
  }
  return config;
});

// ==================== MAIN COMPONENT ====================
const ProductDeclaration: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  
  // Récupérer l'utilisateur du localStorage (comme dans ExporterSpace)
  const [user, setUser] = useState<User | null>(() => {
    const savedUser = localStorage.getItem('user');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  
  const [step, setStep] = useState(1);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [declarationRef, setDeclarationRef] = useState('');
  const [isAgreed, setIsAgreed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [demandeId, setDemandeId] = useState<number | null>(null);
  
  const [formData, setFormData] = useState<DeclarationFormData>({
    products: [],
    files: {}
  });

  const [productIdMap, setProductIdMap] = useState<Map<string, number>>(new Map());
  const [uploadedDocs, setUploadedDocs] = useState<Set<string>>(new Set());
  const [uploadErrors, setUploadErrors] = useState<Map<string, string>>(new Map());

  // Vérifier le token au chargement (comme dans ExporterSpace)
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      console.error('❌ Token manquant - redirection vers login');
      window.location.href = '/login';
      return;
    }
    console.log('🔑 Token récupéré:', token.substring(0, 20) + '...');
  }, []);

  // Charger le brouillon du localStorage
  useEffect(() => {
    const savedDraft = localStorage.getItem('productDeclarationDraft');
    if (savedDraft) {
      try {
        const parsed = JSON.parse(savedDraft);
        setFormData(parsed);
      } catch (e) {
        console.error('Error loading draft:', e);
      }
    }
  }, []);

  // Sauvegarder le brouillon dans localStorage
  useEffect(() => {
    if (formData.products.length > 0) {
      localStorage.setItem('productDeclarationDraft', JSON.stringify(formData));
    }
  }, [formData]);

  // Vérifier l'authentification
  useEffect(() => {
    if (!user) {
      window.location.href = '/login';
    }
  }, [user]);

  const addProduct = (type: ProductType) => {
    setFormData(prev => ({
      ...prev,
      products: [
        ...prev.products,
        {
          id: crypto.randomUUID(),
          type,
          category: '',
          ngpCode: '',
          productName: '',
          isLinkedToBrand: false,
          brandName: '',
          isBrandOwner: false,
          hasBrandLicense: false,
          productState: 'Frais',
          originCountry: 'Tunisie',
          annualQuantityValue: '',
          annualQuantityUnit: 'Tonnes',
          ...(type === 'industriel' ? { commercialBrandName: '' } : {})
        }
      ]
    }));
  };

  const removeProduct = (id: string) => {
    if (formData.products.length > 1) {
      const updatedFiles = { ...formData.files };
      Object.keys(updatedFiles).forEach(key => {
        if (key.startsWith(id)) {
          delete updatedFiles[key];
        }
      });
      
      setFormData(prev => ({
        products: prev.products.filter(p => p.id !== id),
        files: updatedFiles
      }));
    }
  };

  const updateProduct = (id: string, updates: Partial<ProductItem>) => {
    setFormData(prev => ({
      ...prev,
      products: prev.products.map(p => p.id === id ? { ...p, ...updates } : p)
    }));
  };

  const uploadDocument = async (frontendProductId: string, backendProductId: number, docType: string, file: File) => {
    if (!demandeId || !user) {
      console.error('❌ Missing demandeId or user for upload');
      return;
    }

    console.log(`📤 Uploading document: ${docType} for product ${backendProductId}`);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('documentType', docType);
    formData.append('productId', backendProductId.toString());

    try {
      // Utiliser l'instance api qui ajoute automatiquement le token
      const response = await api.post(`/produits/${demandeId}/documents/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      console.log(`✅ Document ${docType} uploaded successfully:`, response.data);
      
      const docKey = `${frontendProductId}_${docType}`;
      setUploadedDocs(prev => {
        const newSet = new Set(prev);
        newSet.add(docKey);
        return newSet;
      });
      
      setUploadErrors(prev => {
        const newMap = new Map(prev);
        newMap.delete(docKey);
        return newMap;
      });
      
      return true;
    } catch (error: any) {
      console.error('❌ Error uploading document:', error);
      
      // Gérer les erreurs 401 comme dans ExporterSpace
      if (error.response?.status === 401) {
        alert('Votre session a expiré. Veuillez vous reconnecter.');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
      
      const errorMessage = error.response?.data?.message || 'Erreur lors du téléchargement du document';
      
      setUploadErrors(prev => {
        const newMap = new Map(prev);
        newMap.set(`${frontendProductId}_${docType}`, errorMessage);
        return newMap;
      });
      
      throw new Error(errorMessage);
    }
  };

  const handleFileChange = (frontendProductId: string, docId: string) => async (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) {
      const fileKey = `${frontendProductId}_${docId}`;
      setFormData(prev => {
        const newFiles = { ...prev.files };
        delete newFiles[fileKey];
        return { ...prev, files: newFiles };
      });
      setUploadedDocs(prev => {
        const newSet = new Set(prev);
        newSet.delete(fileKey);
        return newSet;
      });
      setUploadErrors(prev => {
        const newMap = new Map(prev);
        newMap.delete(fileKey);
        return newMap;
      });
      return;
    }

    const file = files[0] as File;
    const fileKey = `${frontendProductId}_${docId}`;
    
    console.log(`📎 File selected for ${docId}:`, file.name);
    
    setFormData(prev => ({
      ...prev,
      files: { ...prev.files, [fileKey]: file }
    }));

    if (demandeId && file) {
      const backendProductId = productIdMap.get(frontendProductId);
      
      if (backendProductId) {
        setIsLoading(true);
        try {
          await uploadDocument(frontendProductId, backendProductId, docId, file);
        } catch (err: any) {
          setError(err.message);
        } finally {
          setIsLoading(false);
        }
      }
    }
  };

  const createDemande = async () => {
    if (!user) throw new Error('Utilisateur non authentifié');

    // Vérifier le token (comme dans ExporterSpace)
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('Token d\'authentification manquant');
    }

    const requestDTO = {
      exportateurId: user.id,
      products: formData.products.map(p => ({
        productType: p.type,
        category: p.category,
        hsCode: p.ngpCode,
        productName: p.productName,
        isLinkedToBrand: p.isLinkedToBrand,
        brandName: p.brandName || null,
        isBrandOwner: p.isBrandOwner,
        hasBrandLicense: p.hasBrandLicense,
        productState: p.productState,
        originCountry: p.originCountry,
        annualQuantityValue: p.annualQuantityValue || null,
        annualQuantityUnit: p.annualQuantityUnit || null,
        commercialBrandName: p.commercialBrandName || null
      })),
      documents: [],
      paymentInfo: null
    };

    console.log('📤 Creating demande with data:', requestDTO);

    // Utiliser l'instance api qui ajoute automatiquement le token
    const response = await api.post('/produits', requestDTO);
    console.log('✅ Demande created:', response.data);
    return response.data as DemandeResponse;
  };

  const submitDemande = async () => {
    if (!demandeId) throw new Error('Aucune demande trouvée');
    
    // Vérifier le token
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('Token d\'authentification manquant pour la soumission');
    }
    
    // Vérifier que tous les documents requis sont uploadés
    const missingDocs = checkRequiredDocuments();
    if (missingDocs.length > 0) {
      throw new Error(`Documents obligatoires manquants: ${missingDocs.join(', ')}`);
    }
    
    console.log('📤 Submitting demande:', demandeId);
    
    try {
      // Utiliser l'instance api qui ajoute automatiquement le token
      const response = await api.post(`/produits/${demandeId}/soumettre`);
      console.log('✅ Demande submitted successfully:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ Submit error:', error);
      
      // Gérer les erreurs 401 comme dans ExporterSpace
      if (error.response?.status === 401) {
        alert('Votre session a expiré. Veuillez vous reconnecter.');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
      
      throw error;
    }
  };

  const checkRequiredDocuments = (): string[] => {
    const missing: string[] = [];
    
    formData.products.forEach(product => {
      console.log(`Checking documents for product: ${product.productName} (${product.id})`);
      
      const docs = product.type === 'alimentaire' 
        ? (product.hasBrandLicense ? FOOD_DOCS : FOOD_DOCS.filter(doc => doc.id !== 'BRAND_LICENSE'))
        : INDUSTRIAL_DOCS;
      
      docs.filter(doc => doc.required).forEach(doc => {
        const fileKey = `${product.id}_${doc.id}`;
        const hasFile = !!formData.files[fileKey];
        const isUploaded = uploadedDocs.has(fileKey);
        const hasError = uploadErrors.has(fileKey);
        
        console.log(`  Document ${doc.id}: hasFile=${hasFile}, isUploaded=${isUploaded}, hasError=${hasError}`);
        
        if (!hasFile || !isUploaded || hasError) {
          missing.push(`${doc.label} (${product.productName || 'Produit'})`);
        }
      });
    });
    
    return missing;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // Vérifier le token avant toute opération
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Session expirée. Veuillez vous reconnecter.');
      }

      if (!demandeId) {
        // Étape 1: Créer la demande
        console.log('Step 1: Creating demande');
        const data = await createDemande();
        setDemandeId(data.id);
        setDeclarationRef(data.reference);
        
        // Créer le mapping entre UUID frontend et IDs backend
        const newProductIdMap = new Map<string, number>();
        
        formData.products.forEach((frontendProduct, index) => {
          if (data.products && data.products[index]) {
            console.log(`Mapping product ${frontendProduct.id} to backend ID ${data.products[index].id}`);
            newProductIdMap.set(frontendProduct.id, data.products[index].id);
            updateProduct(frontendProduct.id, { backendId: data.products[index].id });
          }
        });
        
        setProductIdMap(newProductIdMap);
        
        // Uploader tous les fichiers en attente
        const uploadPromises = [];
        for (const [key, file] of Object.entries(formData.files)) {
          if (file instanceof File) {
            const [frontendProductId, docType] = key.split('_');
            const backendProductId = newProductIdMap.get(frontendProductId);
            
            if (backendProductId) {
              console.log(`Queueing upload for ${docType} to product ${backendProductId}`);
              uploadPromises.push(uploadDocument(frontendProductId, backendProductId, docType, file));
            }
          }
        }
        
        if (uploadPromises.length > 0) {
          console.log(`Uploading ${uploadPromises.length} documents...`);
          await Promise.all(uploadPromises);
          console.log('All documents uploaded');
        }
        
        setStep(step + 1);
      } else if (step < 4) {
        setStep(step + 1);
      } else {
        console.log('Final step: Submitting demande');
        await submitDemande();
        localStorage.removeItem('productDeclarationDraft');
        setIsSubmitted(true);
      }
    } catch (err: any) {
      console.error('❌ Error in handleSubmit:', err);
      
      // Gérer les erreurs 401
      if (err.response?.status === 401) {
        setError('Session expirée. Veuillez vous reconnecter.');
        setTimeout(() => {
          window.location.href = '/login';
        }, 2000);
      } else {
        setError(err.response?.data?.message || err.message || 'Une erreur est survenue');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const SearchableSelect = ({ 
    label, 
    value, 
    options, 
    onChange, 
    placeholder,
    required = false,
    isCountry = false
  }: { 
    label: string; 
    value: string; 
    options: any[]; 
    onChange: (val: string) => void;
    placeholder: string;
    required?: boolean;
    isCountry?: boolean;
  }) => {
    const [search, setSearch] = useState('');
    const [isOpen, setIsOpen] = useState(false);

    const filtered = options.filter(o => {
      const name = typeof o === 'string' ? o : o.name;
      return name.toLowerCase().includes(search.toLowerCase());
    });

    const selectedOption = isCountry ? options.find(o => o.name === value) : value;

    return (
      <div className="space-y-2 relative">
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
          {label} {required && <span className="text-tunisia-red">*</span>}
        </label>
        <div 
          onClick={() => !isLoading && setIsOpen(!isOpen)}
          className="w-full px-5 py-4 rounded-2xl border-2 border-slate-50 font-bold bg-white focus-within:border-tunisia-red transition-all outline-none cursor-pointer flex justify-between items-center"
        >
          <span className={value ? 'text-slate-900' : 'text-slate-300'}>
            {isCountry && selectedOption ? `${selectedOption.flag} ${selectedOption.name}` : (value || placeholder)}
          </span>
          <i className={`fas fa-chevron-down text-[10px] transition-transform ${isOpen ? 'rotate-180' : ''}`}></i>
        </div>
        {isOpen && (
          <div className="absolute z-50 top-full left-0 w-full mt-2 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden animate-fade-in">
            <div className="p-3 border-b border-slate-50">
              <input 
                type="text" 
                autoFocus
                placeholder="Rechercher..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full px-4 py-2 bg-slate-50 rounded-xl text-xs font-bold outline-none border border-transparent focus:border-slate-200"
              />
            </div>
            <div className="max-h-60 overflow-y-auto">
              {filtered.length > 0 ? filtered.map(opt => {
                const name = typeof opt === 'string' ? opt : opt.name;
                const flag = typeof opt === 'string' ? null : opt.flag;
                return (
                  <div 
                    key={name}
                    onClick={() => { onChange(name); setIsOpen(false); setSearch(''); }}
                    className="px-5 py-3 text-xs font-bold text-slate-600 hover:bg-slate-50 hover:text-tunisia-red cursor-pointer transition-colors flex items-center gap-3"
                  >
                    {flag && <span>{flag}</span>}
                    {name}
                  </div>
                );
              }) : (
                <div className="px-5 py-3 text-xs text-slate-400 italic">Aucun résultat</div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  if (isSubmitted) {
    return (
      <div className="max-w-2xl mx-auto py-20 text-center animate-fade-in-scale">
        <div className="bg-white rounded-[3rem] p-12 shadow-2xl border border-emerald-100 mb-8">
          <div className="w-24 h-24 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-8">
            <i className="fas fa-check-circle text-5xl"></i>
          </div>
          <h2 className="text-3xl font-black text-slate-900 mb-4 uppercase italic tracking-tighter">Déclaration Transmise</h2>
          <p className="text-slate-500 font-medium leading-relaxed mb-8">
            Référence : <span className="font-black text-slate-900">{declarationRef}</span><br/>
            Votre dossier multi-produits a été envoyé aux autorités compétentes.
          </p>
          <button 
            onClick={() => navigate('/exporter')}
            className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl hover:bg-black transition-all"
          >
            Retour au tableau de bord
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto py-8">
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl text-red-600 text-sm font-bold">
          <i className="fas fa-exclamation-circle mr-2"></i>
          {error}
        </div>
      )}

      <div className="flex items-center justify-between mb-12 px-8">
        {['Produits', 'Logistique', 'Documents', 'Validation'].map((label, i) => (
          <div key={label} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-2">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-xs transition-all ${
                step >= i + 1 ? 'bg-tunisia-red text-white shadow-lg shadow-red-200' : 'bg-slate-100 text-slate-400'
              }`}>
                {i + 1}
              </div>
              <span className={`text-[8px] font-black uppercase tracking-widest ${step >= i + 1 ? 'text-slate-900' : 'text-slate-300'}`}>{label}</span>
            </div>
            {i < 3 && (
              <div className={`h-1 flex-grow mx-4 -mt-4 rounded-full ${step > i + 1 ? 'bg-tunisia-red' : 'bg-slate-100'}`}></div>
            )}
          </div>
        ))}
      </div>

      <div className="bg-white rounded-[3rem] shadow-2xl border border-slate-100 overflow-hidden animate-fade-in-scale">
        <div className="p-10">
          {step === 1 && (
            <div className="space-y-10">
              <div className="border-b border-slate-50 pb-6">
                <h2 className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter">Étape 1 : Liste des produits</h2>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1">Définissez vos articles alimentaires ou industriels</p>
              </div>
              
              <div className="space-y-16">
                {formData.products.length === 0 ? (
                  <div className="py-20 text-center bg-slate-50 rounded-[3rem] border-2 border-dashed border-slate-200">
                    <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
                      <i className="fas fa-box-open text-slate-300 text-3xl"></i>
                    </div>
                    <p className="text-slate-400 font-bold text-sm mb-2">Aucun produit ajouté pour le moment</p>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-300">Veuillez ajouter un produit pour commencer</p>
                  </div>
                ) : (
                  formData.products.map((product, index) => (
                    <div key={product.id} className="relative p-10 rounded-[2.5rem] bg-slate-50/30 border-2 border-slate-50">
                      <div className={`absolute -top-5 -left-5 w-12 h-12 rounded-2xl flex items-center justify-center font-black italic shadow-xl ${
                        product.type === 'alimentaire' ? 'bg-emerald-500 text-white' : 'bg-blue-500 text-white'
                      }`}>
                        {index + 1}
                      </div>
                      
                      <div className="absolute top-6 right-6 flex items-center gap-4">
                        <span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full border ${
                          product.type === 'alimentaire' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-blue-50 text-blue-600 border-blue-100'
                        }`}>
                          {product.type}
                        </span>
                        <button 
                          onClick={() => removeProduct(product.id)}
                          className="w-8 h-8 bg-white text-red-500 rounded-lg flex items-center justify-center shadow-md hover:bg-red-50 transition-all border border-red-100"
                          disabled={isLoading}
                        >
                          <i className="fas fa-trash-alt text-xs"></i>
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-4">
                        <SearchableSelect 
                          label="Catégorie"
                          value={product.category}
                          options={(product.type === 'alimentaire' ? CATEGORIES_ALIMENTAIRES : CATEGORIES_INDUSTRIELS).map(c => c.name)}
                          onChange={(val) => {
                            const cat = (product.type === 'alimentaire' ? CATEGORIES_ALIMENTAIRES : CATEGORIES_INDUSTRIELS).find(c => c.name === val);
                            updateProduct(product.id, { category: val, ngpCode: cat?.codes[0] || '' });
                          }}
                          placeholder="Choisir une catégorie..."
                          required
                        />
                        
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Code NGP *</label>
                          <select 
                            value={product.ngpCode}
                            onChange={(e) => updateProduct(product.id, { ngpCode: e.target.value })}
                            className="w-full px-5 py-4 rounded-2xl border-2 border-slate-50 font-bold bg-white focus:border-tunisia-red transition-all outline-none"
                            disabled={isLoading}
                          >
                            <option value="">Sélectionner un code...</option>
                            {(product.type === 'alimentaire' ? CATEGORIES_ALIMENTAIRES : CATEGORIES_INDUSTRIELS)
                              .find(c => c.name === product.category)?.codes.map(code => (
                                <option key={code} value={code}>{code}</option>
                              ))}
                          </select>
                        </div>

                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nom du produit *</label>
                          <input 
                            type="text" 
                            value={product.productName}
                            onChange={(e) => updateProduct(product.id, { productName: e.target.value })}
                            placeholder="ex: Camembert Président 250g"
                            className="w-full px-5 py-4 rounded-2xl border-2 border-slate-50 font-bold bg-white focus:border-tunisia-red transition-all outline-none"
                            disabled={isLoading}
                          />
                        </div>

                        <SearchableSelect 
                          label="Pays d'origine"
                          value={product.originCountry}
                          options={COUNTRIES}
                          onChange={(val) => updateProduct(product.id, { originCountry: val })}
                          placeholder="Rechercher un pays..."
                          required
                          isCountry
                        />

                        {product.type === 'alimentaire' ? (
                          <>
                            <div className="space-y-4 md:col-span-2 p-6 bg-white rounded-2xl border border-slate-50">
                              <div className="flex flex-col md:flex-row gap-8">
                                <div className="space-y-3 flex-1">
                                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Lié à une marque ? *</p>
                                  <div className="flex gap-6">
                                    {[true, false].map(v => (
                                      <label key={String(v)} className="flex items-center gap-2 cursor-pointer group">
                                        <input 
                                          type="radio" 
                                          checked={product.isLinkedToBrand === v}
                                          onChange={() => updateProduct(product.id, { isLinkedToBrand: v })}
                                          className="w-4 h-4 text-tunisia-red focus:ring-tunisia-red"
                                          disabled={isLoading}
                                        />
                                        <span className="text-xs font-bold text-slate-600 group-hover:text-slate-900">{v ? 'Oui' : 'Non'}</span>
                                      </label>
                                    ))}
                                  </div>
                                </div>
                                {product.isLinkedToBrand && (
                                  <div className="space-y-3 flex-[2] animate-fade-in">
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Nom de la marque *</label>
                                    <input 
                                      type="text" 
                                      value={product.brandName}
                                      onChange={(e) => updateProduct(product.id, { brandName: e.target.value })}
                                      className="w-full px-4 py-3 rounded-xl border border-slate-100 font-bold bg-slate-50 focus:border-tunisia-red outline-none"
                                      disabled={isLoading}
                                    />
                                  </div>
                                )}
                              </div>
                              
                              {product.isLinkedToBrand && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4 border-t border-slate-50 animate-fade-in">
                                  <div className="space-y-3">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Propriétaire de la marque ? *</p>
                                    <div className="flex gap-6">
                                      {[true, false].map(v => (
                                        <label key={String(v)} className="flex items-center gap-2 cursor-pointer">
                                          <input 
                                            type="radio" 
                                            checked={product.isBrandOwner === v}
                                            onChange={() => updateProduct(product.id, { isBrandOwner: v })}
                                            className="w-4 h-4 text-tunisia-red focus:ring-tunisia-red"
                                            disabled={isLoading}
                                          />
                                          <span className="text-xs font-bold text-slate-600">{v ? 'Oui' : 'Non'}</span>
                                        </label>
                                      ))}
                                    </div>
                                  </div>
                                  <div className="space-y-3">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Licence d'exploitation ? *</p>
                                    <div className="flex gap-6">
                                      {[true, false].map(v => (
                                        <label key={String(v)} className="flex items-center gap-2 cursor-pointer">
                                          <input 
                                            type="radio" 
                                            checked={product.hasBrandLicense === v}
                                            onChange={() => updateProduct(product.id, { hasBrandLicense: v })}
                                            className="w-4 h-4 text-tunisia-red focus:ring-tunisia-red"
                                            disabled={isLoading}
                                          />
                                          <span className="text-xs font-bold text-slate-600">{v ? 'Oui' : 'Non'}</span>
                                        </label>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>

                            <div className="space-y-2">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">État du produit</label>
                              <select 
                                value={product.productState}
                                onChange={(e) => updateProduct(product.id, { productState: e.target.value })}
                                className="w-full px-5 py-4 rounded-2xl border-2 border-slate-50 font-bold bg-white focus:border-tunisia-red transition-all outline-none"
                                disabled={isLoading}
                              >
                                {PRODUCT_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                              </select>
                            </div>

                            <div className="space-y-2">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Quantité annuelle exportée</label>
                              <div className="flex gap-2">
                                <input 
                                  type="number" 
                                  value={product.annualQuantityValue}
                                  onChange={(e) => updateProduct(product.id, { annualQuantityValue: e.target.value })}
                                  placeholder="Valeur"
                                  className="flex-1 px-5 py-4 rounded-2xl border-2 border-slate-50 font-bold bg-white focus:border-tunisia-red transition-all outline-none"
                                  disabled={isLoading}
                                />
                                <select 
                                  value={product.annualQuantityUnit}
                                  onChange={(e) => updateProduct(product.id, { annualQuantityUnit: e.target.value })}
                                  className="w-32 px-2 py-4 rounded-2xl border-2 border-slate-50 font-bold bg-white outline-none"
                                  disabled={isLoading}
                                >
                                  {QUANTITY_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                                </select>
                              </div>
                            </div>
                          </>
                        ) : (
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Marque commerciale</label>
                            <input 
                              type="text" 
                              value={product.commercialBrandName}
                              onChange={(e) => updateProduct(product.id, { commercialBrandName: e.target.value })}
                              placeholder="ex: Samsung, Bosch..."
                              className="w-full px-5 py-4 rounded-2xl border-2 border-slate-50 font-bold bg-white focus:border-tunisia-red transition-all outline-none"
                              disabled={isLoading}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="flex justify-center gap-6 pt-10 border-t border-slate-50">
                <button 
                  onClick={() => addProduct('alimentaire')}
                  className="px-8 py-4 bg-emerald-500 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl shadow-emerald-200 hover:bg-emerald-600 transition-all flex items-center gap-3"
                  disabled={isLoading}
                >
                  <i className="fas fa-apple-whole"></i> + Ajouter Alimentaire
                </button>
                <button 
                  onClick={() => addProduct('industriel')}
                  className="px-8 py-4 bg-blue-500 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl shadow-blue-200 hover:bg-blue-600 transition-all flex items-center gap-3"
                  disabled={isLoading}
                >
                  <i className="fas fa-gears"></i> + Ajouter Industriel
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-8">
              <div className="border-b border-slate-50 pb-6">
                <h2 className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter">Étape 2 : Informations Logistiques</h2>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1">Détails globaux de l'expédition</p>
              </div>
              
              <div className="grid grid-cols-1 gap-8">
                <div className="p-8 bg-slate-50 rounded-[2rem] border border-slate-100">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-6">Résumé de la cargaison</h3>
                  <div className="space-y-3">
                    {formData.products.map((p, i) => (
                      <div key={p.id} className="flex justify-between items-center text-xs font-bold p-3 bg-white rounded-xl border border-slate-50">
                        <span className="text-slate-500">{i+1}. {p.productName || 'Produit sans nom'}</span>
                        <span className={`px-2 py-0.5 rounded-md text-[8px] uppercase ${p.type === 'alimentaire' ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'}`}>
                          {p.type}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-12">
              <div className="border-b border-slate-50 pb-6">
                <h2 className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter">Étape 3 : Documents Justificatifs</h2>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1">Téléversement des pièces par produit</p>
              </div>
              
              <div className="space-y-16">
                {formData.products.map((product, pIdx) => (
                  <div key={product.id} className="space-y-6">
                    <div className="flex items-center gap-4">
                      <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center text-[10px] font-black italic">
                        {pIdx + 1}
                      </div>
                      <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight italic">
                        {product.productName || `Produit ${pIdx + 1}`} ({product.type})
                        {product.backendId && <span className="ml-2 text-[8px] text-slate-400">ID: {product.backendId}</span>}
                      </h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {(product.type === 'alimentaire' ? 
                        (product.hasBrandLicense ? FOOD_DOCS : FOOD_DOCS.filter(doc => doc.id !== 'BRAND_LICENSE')) 
                        : INDUSTRIAL_DOCS
                      ).map((doc) => {
                        const fileKey = `${product.id}_${doc.id}`;
                        const hasFile = !!formData.files[fileKey];
                        const isUploaded = uploadedDocs.has(fileKey);
                        const hasError = uploadErrors.has(fileKey);
                        const errorMessage = uploadErrors.get(fileKey);
                        
                        let borderColor = 'border-slate-100';
                        let bgColor = 'bg-slate-50/50';
                        let iconColor = 'bg-white text-slate-300';
                        
                        if (hasError) {
                          borderColor = 'border-red-500';
                          bgColor = 'bg-red-50/50';
                          iconColor = 'bg-red-500 text-white';
                        } else if (hasFile) {
                          if (isUploaded) {
                            borderColor = 'border-emerald-500';
                            bgColor = 'bg-emerald-50/50';
                            iconColor = 'bg-emerald-500 text-white';
                          } else {
                            borderColor = 'border-amber-500';
                            bgColor = 'bg-amber-50/50';
                            iconColor = 'bg-amber-500 text-white';
                          }
                        }
                        
                        return (
                          <div key={doc.id} className="relative group">
                            <div className={`p-4 rounded-2xl border-2 border-dashed transition-all flex flex-col items-center justify-center gap-2 text-center min-h-[120px] ${borderColor} ${bgColor}`}>
                              <input 
                                type="file" 
                                accept=".pdf,.jpg,.jpeg,.png"
                                onChange={handleFileChange(product.id, doc.id)}
                                className="absolute inset-0 opacity-0 cursor-pointer z-10"
                                disabled={isLoading || (demandeId && !productIdMap.has(product.id))}
                              />
                              <div className={`w-8 h-8 rounded-xl flex items-center justify-center shadow-sm transition-transform group-hover:scale-110 ${iconColor}`}>
                                <i className={`fas ${hasFile ? 'fa-check' : 'fa-cloud-arrow-up'} text-xs`}></i>
                              </div>
                              <span className="text-[8px] font-black uppercase tracking-tight text-slate-600 leading-tight px-2">
                                {doc.label} {doc.required && <span className="text-tunisia-red">*</span>}
                              </span>
                              {hasFile && formData.files[fileKey] instanceof File && (
                                <p className="text-[7px] font-bold text-emerald-600 italic truncate max-w-full px-2">
                                  {(formData.files[fileKey] as File).name}
                                </p>
                              )}
                              {hasError && errorMessage && (
                                <p className="text-[7px] font-bold text-red-600 italic px-2">
                                  {errorMessage}
                                </p>
                              )}
                              {hasFile && !isUploaded && !hasError && demandeId && (
                                <p className="text-[7px] font-bold text-amber-600 italic">
                                  En attente d'upload...
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-8">
              <div className="border-b border-slate-50 pb-6">
                <h2 className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter">Étape 4 : Validation Finale</h2>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1">Vérification et signature électronique</p>
              </div>
              
              <div className="bg-slate-50 p-8 rounded-[2.5rem] border border-slate-100 space-y-6 shadow-sm">
                <div className="flex justify-between items-center border-b border-slate-200 pb-4">
                  <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Récapitulatif du lot</h4>
                  <span className="text-xs font-black italic text-tunisia-red">{formData.products.length} Produit(s)</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Détails Alimentaires</p>
                    <p className="text-2xl font-black italic tracking-tighter text-emerald-600">
                      {formData.products.filter(p => p.type === 'alimentaire').length} <span className="text-sm uppercase not-italic text-slate-400">Articles</span>
                    </p>
                  </div>
                  <div className="space-y-4">
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Détails Industriels</p>
                    <p className="text-2xl font-black italic tracking-tighter text-blue-600">
                      {formData.products.filter(p => p.type === 'industriel').length} <span className="text-sm uppercase not-italic text-slate-400">Articles</span>
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-8 bg-amber-50 rounded-[2rem] border border-amber-100 flex items-start gap-6">
                <input 
                  type="checkbox" 
                  id="certify"
                  checked={isAgreed}
                  onChange={(e) => setIsAgreed(e.target.checked)}
                  className="mt-1 w-6 h-6 rounded-lg border-amber-300 text-tunisia-red focus:ring-tunisia-red cursor-pointer"
                  disabled={isLoading}
                />
                <label htmlFor="certify" className="text-xs font-bold text-amber-900 leading-relaxed cursor-pointer">
                  Je certifie sur l'honneur l'exactitude des informations fournies. Je reconnais que toute fausse déclaration m'expose aux sanctions prévues par le code des douanes et la réglementation du commerce extérieur de la République Tunisienne.
                </label>
              </div>
            </div>
          )}
        </div>

        <div className="p-8 bg-slate-50 border-t border-slate-100 flex justify-between gap-4">
          {step > 1 && (
            <button 
              onClick={() => setStep(step - 1)}
              className="px-8 py-4 bg-white border border-slate-200 text-slate-600 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-slate-100 transition-all"
              disabled={isLoading}
            >
              Précédent
            </button>
          )}
          <div className="flex-grow"></div>
          {step < 4 ? (
            <button 
              onClick={handleSubmit}
              disabled={isLoading || (step === 1 && formData.products.length === 0)}
              className={`px-12 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl transition-all ${
                isLoading || (step === 1 && formData.products.length === 0)
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  : 'bg-slate-900 text-white hover:bg-black'
              }`}
            >
              {isLoading ? (
                <><i className="fas fa-spinner fa-spin mr-2"></i> Chargement...</>
              ) : (
                'Suivant'
              )}
            </button>
          ) : (
            <button 
              onClick={handleSubmit}
              disabled={!isAgreed || isLoading}
              className={`px-12 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl transition-all ${
                isAgreed && !isLoading ? 'bg-tunisia-red text-white hover:bg-red-700' : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              {isLoading ? (
                <><i className="fas fa-spinner fa-spin mr-2"></i> Envoi...</>
              ) : (
                'Soumettre la déclaration'
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductDeclaration;