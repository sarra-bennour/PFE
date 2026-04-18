import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, Save, FileText, Package, Truck, 
  Trash2, Plus, Camera, Info, 
  Globe, Tags, Layers, ShoppingBag, FileCheck, Upload
} from 'lucide-react';
import { Product } from '@/types/Product';

interface EditDeclarationModalProps {
  declaration: any;
  onClose: () => void;
  onSave: (data: any) => Promise<void>;
}

const PRODUCT_STATES = [
  'Brut', 'Transformé', 'Congelé', 'Déshydraté', 'En conserve', 
  'Pasteurisé', 'Surgelé', 'Frais', 'En poudre', 'Confit', 'Etuvé', 'Autre'
];

const COUNTRIES = [
  "Tunisie", "France", "Turquie", "Italie", "Espagne", "Allemagne", 
  "Algérie", "Maroc", "Libye", "Égypte", "Arabie Saoudite", "Émirats Arabes Unis", 
  "États-Unis", "Chine", "Japon", "Canada", "Brésil", "Inde"
].sort();

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
  { id: 'SANITARY_APPROVAL', label: "Certificat d'agrément/enregistrement de sécurité sanitaire", required: false },
  { id: 'SANITARY_CERT', label: "Certificat sanitaire", required: false },
  { id: 'FREE_SALE_CERT', label: "Certificat de libre vente", required: false },
  { id: 'TECHNICAL_DATA_SHEET', label: "Fiche technique", required: false },
  { id: 'BACTERIO_ANALYSIS', label: "Rapport d'analyse bactériologique", required: false },
  { id: 'PHYSICO_CHEM_ANALYSIS', label: "Rapport d'analyse physico-chimique", required: false },
  { id: 'RADIOACTIVITY_ANALYSIS', label: "Rapport d'analyse de radioactivité", required: false },
  { id: 'FUMIGATION_CERT', label: "Fumigation (selon les produits)", required: false },
  { id: 'OFFICIAL_LETTER', label: "Lettre officielle", required: false },
  { id: 'QUALITY_CERT', label: "Certificat de qualité", required: false },
  { id: 'STORAGE_FACILITY_PLAN', label: "Plan des locaux de stockage", required: false },
  { id: 'PRODUCTION_FACILITY_PLAN', label: "Plan des locaux de production", required: false },
  { id: 'MONITORING_PLAN', label: "Plan de surveillance", required: false },
  { id: 'BRAND_LICENSE', label: "Licence pour exploiter la marque", required: false },
  { id: 'PRODUCT_SHEETS', label: "Fiches produits", required: false },
  { id: 'PRODUCT_LABELS', label: "Étiquettes", required: false },
  { id: 'COMMISSION_LETTER', label: "Lettre officielle de recommandation de l'autorité compétente", required: false },
];

const EditDeclarationModal: React.FC<EditDeclarationModalProps> = ({ declaration, onClose, onSave }) => {
  const [activeTab, setActiveTab] = useState<'docs' | 'products'>('products');
  const [isSaving, setIsSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    products: (declaration.products || []).map((p: any) => ({
      id: p.id,
      productType: p.productType || p.type,
      category: p.category || '',
      hsCode: p.hsCode || p.ngp || '',
      productName: p.productName || '',
      productImage: p.productImage || p.image || null,
      productImageName: p.productImage ? p.productImage.split('/').pop() : null,
      isLinkedToBrand: p.isLinkedToBrand ?? false,
      brandName: p.brandName || '',
      isBrandOwner: p.isBrandOwner ?? false,
      hasBrandLicense: p.hasBrandLicense ?? false,
      productState: p.productState || 'Frais',
      originCountry: p.originCountry || 'Tunisie',
      annualQuantityValue: p.annualQuantityValue || '',
      annualQuantityUnit: p.annualQuantityUnit || 'Tonnes',
      commercialBrandName: p.commercialBrandName || '',
    })),
    newProductImages: {} as Record<number, File>,
    documents: {} as Record<string, File>
  });

  const updateProduct = (id: number, updates: Partial<Product>) => {
    setFormData(prev => ({
      ...prev,
      products: prev.products.map((p: any) => p.id === id ? { ...p, ...updates } : p)
    }));
  };

  const addProduct = (type: 'alimentaire' | 'industriel') => {
    const newProduct = {
      id: Date.now(),
      productType: type,
      category: '',
      hsCode: '',
      productName: '',
      productImage: null,
      productImageName: null,
      isLinkedToBrand: false,
      brandName: '',
      isBrandOwner: false,
      hasBrandLicense: false,
      productState: 'Frais',
      originCountry: 'Tunisie',
      annualQuantityValue: '',
      annualQuantityUnit: 'Tonnes',
      commercialBrandName: ''
    };
    setFormData(prev => ({ ...prev, products: [...prev.products, newProduct] }));
  };

  const removeProduct = (id: number) => {
    setFormData(prev => ({
      ...prev,
      products: prev.products.filter((p: any) => p.id !== id),
      newProductImages: (() => {
        const newImages = { ...prev.newProductImages };
        delete newImages[id];
        return newImages;
      })()
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const mapDocumentType = (docType: string): string => {
        const mapping: Record<string, string> = {
          'SANITARY_APPROVAL': 'SANITARY_APPROVAL',
          'SANITARY_CERT': 'SANITARY_CERT',
          'FREE_SALE_CERT': 'FREE_SALE_CERT',
          'TECHNICAL_DATA_SHEET': 'TECHNICAL_DATA_SHEET',
          'BACTERIO_ANALYSIS': 'BACTERIO_ANALYSIS',
          'PHYSICO_CHEM_ANALYSIS': 'PHYSICO_CHEM_ANALYSIS',
          'RADIOACTIVITY_ANALYSIS': 'RADIOACTIVITY_ANALYSIS',
          'FUMIGATION_CERT': 'FUMIGATION_CERT',
          'OFFICIAL_LETTER': 'OFFICIAL_LETTER',
          'QUALITY_CERT': 'QUALITY_CERT',
          'STORAGE_FACILITY_PLAN': 'STORAGE_FACILITY_PLAN',
          'PRODUCTION_FACILITY_PLAN': 'PRODUCTION_FACILITY_PLAN',
          'MONITORING_PLAN': 'MONITORING_PLAN',
          'BRAND_LICENSE': 'BRAND_LICENSE',
          'PRODUCT_SHEETS': 'PRODUCT_SHEETS',
          'PRODUCT_LABELS': 'PRODUCT_LABELS',
          'COMMISSION_LETTER': 'COMMISSION_LETTER',
          'CONFORMITY_CERT_ANALYSIS_REPORT': 'CONFORMITY_CERT_ANALYSIS_REPORT',
        };
        return mapping[docType] || docType;
      };

      const documentsWithContent = await Promise.all(
        Object.entries(formData.documents)
          .filter(([, value]) => value instanceof File)
          .map(async ([key, file]) => {
            const firstUnderscoreIndex = key.indexOf('_');
            const productId = key.substring(0, firstUnderscoreIndex);
            const docType = key.substring(firstUnderscoreIndex + 1);
            
            const mappedDocType = mapDocumentType(docType);
            
            const base64Content = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => {
                const base64 = (reader.result as string).split(',')[1];
                resolve(base64);
              };
              reader.onerror = reject;
              reader.readAsDataURL(file as File);
            });
            
            return {
              productId: parseInt(productId),
              documentType: mappedDocType,
              fileName: (file as File).name,
              fileContent: base64Content,
              fileType: (file as File).type
            };
          })
      );

      const updateData = {
        exportateurId: declaration.exportateurId || declaration.exportateur?.id,
        products: formData.products.map((p: any) => {
          const newImageFile = formData.newProductImages[p.id];
          return {
            id: p.id,
            productType: p.productType,
            category: p.category,
            hsCode: p.hsCode,
            productName: p.productName,
            isLinkedToBrand: p.isLinkedToBrand,
            brandName: p.brandName || null,
            isBrandOwner: p.isBrandOwner,
            hasBrandLicense: p.hasBrandLicense,
            productState: p.productState,
            originCountry: p.originCountry,
            annualQuantityValue: p.annualQuantityValue || null,
            annualQuantityUnit: p.annualQuantityUnit || null,
            commercialBrandName: p.commercialBrandName || null,
            productImage: p.productImage,
            productImageName: newImageFile ? newImageFile.name : p.productImageName
          };
        }),
        documents: documentsWithContent,
        paymentInfo: null
      };

      await onSave(updateData);
      onClose();
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // ✅ Fonction pour obtenir l'URL d'affichage de l'image
  // Fonction pour obtenir l'URL d'affichage de l'image
const getDisplayImageUrl = (product: any): string => {
    console.log('=== getDisplayImageUrl ===');
    console.log('Product ID:', product.id);
    console.log('Product image brut:', product.productImage);
    console.log('Type de productImage:', typeof product.productImage);
    
    // Si c'est une nouvelle image en Base64
    if (product.productImage && product.productImage.startsWith('data:image')) {
        console.log('✅ Image en Base64 détectée');
        return product.productImage;
    }
    
    // ✅ Si c'est une URL qui commence par /api (déjà complète)
    if (product.productImage && product.productImage.startsWith('/api')) {
        const fullUrl = `http://localhost:8080${product.productImage}`;
        console.log('✅ URL API détectée (commence par /api)');
        console.log('URL construite:', fullUrl);
        return fullUrl;
    }
    
    // Si c'est une URL existante qui commence par /uploads
    if (product.productImage && product.productImage.startsWith('/uploads')) {
        const fullUrl = `http://localhost:8080/api/produits${product.productImage}`;
        console.log('✅ URL existante (commence par /uploads)');
        console.log('URL construite:', fullUrl);
        return fullUrl;
    }
    
    // Si c'est une URL complète
    if (product.productImage && product.productImage.startsWith('http')) {
        console.log('✅ URL complète détectée:', product.productImage);
        return product.productImage;
    }
    
    // Image par défaut
    console.log('⚠️ Aucune image valide, utilisation image par défaut');
    return "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300'%3E%3Crect width='400' height='300' fill='%23f3f4f6'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' fill='%239ca3af' font-family='sans-serif' font-size='14'%3E📷 Image%3C/text%3E%3C/svg%3E";
};

  const handleImageChange = (id: number, file: File | null) => {
    if (!file) {
      updateProduct(id, { productImage: null, productImageName: null });
      setFormData(prev => {
        const newImages = { ...prev.newProductImages };
        delete newImages[id];
        return { ...prev, newProductImages: newImages };
      });
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      alert("L'image ne doit pas dépasser 2MB");
      return;
    }

    if (!file.type.startsWith('image/')) {
      alert("Veuillez sélectionner une image valide (JPG, PNG)");
      return;
    }

    setFormData(prev => ({
      ...prev,
      newProductImages: {
        ...prev.newProductImages,
        [id]: file
      }
    }));

    updateProduct(id, { productImageName: file.name });

    const reader = new FileReader();
    reader.onloadend = () => {
      updateProduct(id, { productImage: reader.result as string });
    };
    reader.readAsDataURL(file);
  };

  const handleDocumentFileChange = (docKey: string, file: File | null) => {
    if (!file) return;
    setFormData(prev => ({
      ...prev,
      documents: {
        ...prev.documents,
        [docKey]: file
      }
    }));
  };

  const handleRemoveDocument = (docKey: string) => {
    setFormData(prev => {
      const newDocs = { ...prev.documents };
      delete newDocs[docKey];
      return { ...prev, documents: newDocs };
    });
  };

  if (!declaration) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
      />
      
      <motion.div 
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.98 }}
        className="relative w-full max-w-5xl h-[90vh] bg-white rounded-[2rem] shadow-2xl overflow-hidden flex flex-col border border-slate-100"
      >
        {/* Header */}
        <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
          <div>
            <h2 className="text-xl font-black text-slate-900 uppercase italic tracking-tighter">Modification de Déclaration</h2>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">
              Référence: {declaration.reference || declaration.id}
            </p>
          </div>
          <button 
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-all"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="px-8 pt-6 flex gap-8 border-b border-slate-50 shrink-0">
          {[
            { id: 'products', label: 'Liste des Produits', icon: Package },
            { id: 'docs', label: 'Documents & Certificats', icon: FileCheck },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`pb-4 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 border-b-2 transition-all ${
                activeTab === tab.id 
                  ? 'border-tunisia-red text-tunisia-red' 
                  : 'border-transparent text-slate-300 hover:text-slate-500'
              }`}
            >
              <tab.icon size={14} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          <AnimatePresence mode="wait">
            {activeTab === 'products' ? (
              <motion.div 
                key="products-tab"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="space-y-8"
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Articles déclarés ({formData.products.length})</h3>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => addProduct('alimentaire')}
                      className="px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-lg text-[9px] font-black uppercase tracking-widest border border-emerald-100 hover:bg-emerald-100 transition-all"
                    >
                      + Alimentaire
                    </button>
                    <button 
                      onClick={() => addProduct('industriel')}
                      className="px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-[9px] font-black uppercase tracking-widest border border-blue-100 hover:bg-blue-100 transition-all"
                    >
                      + Industriel
                    </button>
                  </div>
                </div>

                <div className="space-y-6">
                  {formData.products.map((product: any) => (
                    <div key={product.id} className="p-8 rounded-[2rem] bg-slate-50/50 border border-slate-100 relative group">
                      <div className="absolute top-6 right-6 flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest ${
                          product.productType === 'alimentaire' ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'
                        }`}>
                          {product.productType === 'alimentaire' ? 'Alimentaire' : 'Industriel'}
                        </span>
                        <button 
                          onClick={() => removeProduct(product.id)}
                          className="w-8 h-8 rounded-lg bg-white border border-slate-200 text-red-500 hover:bg-red-50 transition-all flex items-center justify-center"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                        {/* Image Column */}
                        <div className="space-y-3">
                          <div className="aspect-square rounded-2xl bg-white border-2 border-dashed border-slate-200 flex items-center justify-center relative overflow-hidden group/img">
                            <img 
                              src={getDisplayImageUrl(product)} 
                              className="w-full h-full object-cover" 
                              alt="Product"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300'%3E%3Crect width='400' height='300' fill='%23f3f4f6'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' fill='%239ca3af' font-family='sans-serif' font-size='14'%3E📷 Image%3C/text%3E%3C/svg%3E";
                              }}
                            />
                            <input 
                              type="file" 
                              accept="image/*"
                              className="absolute inset-0 opacity-0 cursor-pointer z-10"
                              onChange={(e) => handleImageChange(product.id, e.target.files?.[0] || null)}
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 flex items-center justify-center transition-all">
                              <Plus size={20} className="text-white" />
                            </div>
                          </div>
                          <p className="text-[8px] font-bold text-slate-400 uppercase text-center tracking-widest truncate">
                            {product.productImageName || 'Image Produit'}
                          </p>
                        </div>

                        {/* Details */}
                        <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                              <Globe size={10} /> Nom Commercial
                            </label>
                            <input 
                              type="text" 
                              value={product.productName || ''}
                              onChange={(e) => updateProduct(product.id, { productName: e.target.value })}
                              className="w-full px-4 py-3 rounded-xl border border-slate-200 font-bold bg-white focus:border-tunisia-red outline-none transition-all text-sm"
                              placeholder="Nom du produit"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                              <Tags size={10} /> Catégorie
                            </label>
                            <select 
                              value={product.category || ''}
                              onChange={(e) => {
                                const list = product.productType === 'alimentaire' ? CATEGORIES_ALIMENTAIRES : CATEGORIES_INDUSTRIELS;
                                const cat = list.find(c => c.name === e.target.value);
                                updateProduct(product.id, { category: e.target.value, hsCode: cat?.codes[0] || '' });
                              }}
                              className="w-full px-4 py-3 rounded-xl border border-slate-200 font-bold bg-white focus:border-tunisia-red outline-none transition-all text-sm"
                            >
                              <option value="">Sélectionner...</option>
                              {(product.productType === 'alimentaire' ? CATEGORIES_ALIMENTAIRES : CATEGORIES_INDUSTRIELS).map(c => (
                                <option key={c.name} value={c.name}>{c.name}</option>
                              ))}
                            </select>
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                              <Layers size={10} /> Code NGP
                            </label>
                            <input 
                              type="text" 
                              value={product.hsCode || ''}
                              onChange={(e) => updateProduct(product.id, { hsCode: e.target.value })}
                              className="w-full px-4 py-3 rounded-xl border border-slate-200 font-mono font-bold bg-white focus:border-tunisia-red outline-none transition-all text-sm"
                              placeholder="ex: 0401"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                              <Globe size={10} /> Pays d'Origine
                            </label>
                            <select 
                              value={product.originCountry || ''}
                              onChange={(e) => updateProduct(product.id, { originCountry: e.target.value })}
                              className="w-full px-4 py-3 rounded-xl border border-slate-200 font-bold bg-white focus:border-tunisia-red outline-none transition-all text-sm"
                            >
                              {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                          </div>

                          {/* Champs spécifiques aux produits alimentaires uniquement */}
                          {product.productType === 'alimentaire' && (
                            <>
                              <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                                  <Layers size={10} /> État Physique
                                </label>
                                <select 
                                  value={product.productState || ''}
                                  onChange={(e) => updateProduct(product.id, { productState: e.target.value })}
                                  className="w-full px-4 py-3 rounded-xl border border-slate-200 font-bold bg-white focus:border-tunisia-red outline-none transition-all text-sm"
                                >
                                  {PRODUCT_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                              </div>

                              <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                                  <Package size={10} /> Quantité Annuelle
                                </label>
                                <div className="flex gap-2">
                                  <input 
                                    type="number" 
                                    value={product.annualQuantityValue || ''}
                                    onChange={(e) => updateProduct(product.id, { annualQuantityValue: e.target.value })}
                                    className="flex-1 px-4 py-3 rounded-xl border border-slate-200 font-bold bg-white focus:border-tunisia-red outline-none transition-all text-sm"
                                    placeholder="Quantité"
                                  />
                                  <select 
                                    value={product.annualQuantityUnit || ''}
                                    onChange={(e) => updateProduct(product.id, { annualQuantityUnit: e.target.value })}
                                    className="w-24 px-2 py-3 rounded-xl border border-slate-200 font-bold bg-white outline-none text-sm"
                                  >
                                    {QUANTITY_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                                  </select>
                                </div>
                              </div>
                            </>
                          )}

                          {/* Champs spécifiques selon le type */}
                          {product.productType === 'alimentaire' ? (
                            <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-white rounded-2xl border border-slate-100">
                              <div className="space-y-3">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Lié à une marque ?</p>
                                <div className="flex gap-6">
                                  {[true, false].map(v => (
                                    <label key={String(v)} className="flex items-center gap-2 cursor-pointer group">
                                      <input 
                                        type="radio" 
                                        checked={product.isLinkedToBrand === v}
                                        onChange={() => updateProduct(product.id, { isLinkedToBrand: v })}
                                        className="w-4 h-4 text-tunisia-red focus:ring-tunisia-red"
                                      />
                                      <span className="text-[10px] font-bold text-slate-600 group-hover:text-slate-900">{v ? 'Oui' : 'Non'}</span>
                                    </label>
                                  ))}
                                </div>
                              </div>
                              {product.isLinkedToBrand && (
                                <div className="space-y-1.5 animate-fade-in">
                                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nom de la marque</label>
                                  <input 
                                    type="text" 
                                    value={product.brandName || ''}
                                    onChange={(e) => updateProduct(product.id, { brandName: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 font-bold bg-slate-50 focus:border-tunisia-red outline-none text-sm"
                                  />
                                </div>
                              )}
                              {product.isLinkedToBrand && (
                                <div className="md:col-span-2 grid grid-cols-2 gap-8 mt-2 pt-4 border-t border-slate-50">
                                  <div className="space-y-3">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Propriétaire de la marque ? *</p>
                                    <div className="flex gap-6">
                                      {[
                                        { value: true, label: "Oui" },
                                        { value: false, label: "Non" }
                                      ].map(option => (
                                        <label key={String(option.value)} className="flex items-center gap-2 cursor-pointer group">
                                          <input
                                            type="radio"
                                            name={`isBrandOwner_${product.id}`}
                                            checked={product.isBrandOwner === option.value}
                                            onChange={() => updateProduct(product.id, { isBrandOwner: option.value })}
                                            className="w-4 h-4 text-tunisia-red focus:ring-tunisia-red"
                                          />
                                          <span className="text-[10px] font-bold text-slate-600 group-hover:text-slate-900">
                                            {option.label}
                                          </span>
                                        </label>
                                      ))}
                                    </div>
                                  </div>
                                  <div className="space-y-3">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Licence d'exploitation ? *</p>
                                    <div className="flex gap-6">
                                      {[
                                        { value: true, label: "Oui" },
                                        { value: false, label: "Non" }
                                      ].map(option => (
                                        <label key={String(option.value)} className="flex items-center gap-2 cursor-pointer group">
                                          <input
                                            type="radio"
                                            name={`hasBrandLicense_${product.id}`}
                                            checked={product.hasBrandLicense === option.value}
                                            onChange={() => updateProduct(product.id, { hasBrandLicense: option.value })}
                                            className="w-4 h-4 text-tunisia-red focus:ring-tunisia-red"
                                          />
                                          <span className="text-[10px] font-bold text-slate-600 group-hover:text-slate-900">
                                            {option.label}
                                          </span>
                                        </label>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="md:col-span-2 space-y-1.5">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                                <ShoppingBag size={10} /> Marque Commerciale
                              </label>
                              <input 
                                type="text" 
                                value={product.commercialBrandName || ''}
                                onChange={(e) => updateProduct(product.id, { commercialBrandName: e.target.value })}
                                className="w-full px-4 py-3 rounded-xl border border-slate-200 font-bold bg-white focus:border-tunisia-red outline-none transition-all text-sm"
                                placeholder="ex: Bosch, Samsung..."
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            ) : (
              <motion.div 
                key="docs-tab"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Documents Requis par l'Instance de Validation</h3>
                  <p className="text-[10px] text-amber-600 font-bold bg-amber-50 px-3 py-1 rounded-full border border-amber-100 uppercase tracking-tight">Vérifiez la validité de vos certificats par article</p>
                </div>

                <div className="space-y-8">
                  {formData.products.map((product: any) => (
                    <div key={product.id} className="space-y-4">
                      <div className="flex items-center gap-3 border-b border-slate-100 pb-2">
                        <div className={`w-2 h-2 rounded-full ${product.productType === 'alimentaire' ? 'bg-emerald-500' : 'bg-blue-500'}`} />
                        <h4 className="text-xs font-black text-slate-900 uppercase italic tracking-tighter">
                          {product.productName || 'Produit sans nom'} 
                          <span className="ml-2 text-[9px] font-bold text-slate-400">({product.productType === 'alimentaire' ? 'Alimentaire' : 'Industriel'})</span>
                        </h4>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {(product.productType === 'alimentaire' ? FOOD_DOCS : [
                          { id: 'CONFORMITY_CERT_ANALYSIS_REPORT', label: "Certificat de conformité ou rapport d’analyse", required: true }
                        ]).map((doc) => {
                          const docKey = `${product.id}_${doc.id}`;
                          const selectedFile = formData.documents[docKey];
                          
                          return (
                            <div key={doc.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-100 hover:border-tunisia-red/20 transition-all group/doc">
                              <div className="flex flex-col gap-3">
                                <div className="min-w-0">
                                  <p className="text-[9px] font-black text-slate-900 leading-tight mb-1 line-clamp-2 h-6">{doc.label}</p>
                                  <div className="flex items-center gap-2">
                                    <FileText size={10} className="text-slate-400" />
                                    <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">
                                      {doc.required ? 'Obligatoire' : 'Facultatif'}
                                    </span>
                                  </div>
                                </div>
                                
                                <div className="flex items-center justify-between gap-2">
                                  {selectedFile ? (
                                    <div className="flex-1 min-w-0 flex items-center gap-2 p-1.5 bg-emerald-50 rounded-lg border border-emerald-100">
                                      <FileCheck size={12} className="text-emerald-500 shrink-0" />
                                      <span className="text-[9px] font-bold text-emerald-700 truncate">
                                        {selectedFile.name}
                                      </span>
                                    </div>
                                  ) : (
                                    <div className="flex-1 text-[9px] font-bold text-slate-300 italic uppercase">
                                      Aucun fichier
                                    </div>
                                  )}

                                  <div className="shrink-0 flex gap-1">
                                    <label className="cursor-pointer">
                                      <input 
                                        type="file" 
                                        className="hidden"
                                        onChange={(e) => {
                                          const file = e.target.files?.[0];
                                          if (file) {
                                            handleDocumentFileChange(docKey, file);
                                          }
                                        }}
                                      />
                                      <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-tunisia-red hover:border-tunisia-red/20 transition-all shadow-sm">
                                        <Upload size={14} />
                                      </div>
                                    </label>
                                    {selectedFile && (
                                      <button 
                                        onClick={() => handleRemoveDocument(docKey)}
                                        className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-red-400 hover:bg-red-50 transition-all"
                                      >
                                        <Trash2 size={14} />
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="p-6 bg-slate-900 rounded-3xl border border-slate-800 text-white flex items-center gap-6">
                  <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center shrink-0">
                    <Info className="text-tunisia-red" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black uppercase tracking-tight italic">Note de conformité</h4>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-relaxed mt-1">
                      Les nouveaux documents remplacent les anciens. Assurez-vous que les copies sont lisibles et conformes aux originaux pour éviter tout retard dans la validation.
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer Actions */}
        <div className="px-8 py-6 border-t border-slate-100 bg-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Mode Édition Actif</p>
          </div>
          <div className="flex gap-4">
            <button 
              onClick={onClose}
              disabled={isSaving}
              className="px-8 py-3 bg-slate-50 text-slate-400 rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-slate-100 hover:text-slate-600 transition-all border border-slate-100"
            >
              Annuler
            </button>
            <button 
              onClick={handleSave}
              disabled={isSaving}
              className={`px-8 py-3 bg-slate-900 text-white rounded-xl font-black uppercase tracking-widest text-[10px] shadow-xl hover:bg-black transition-all flex items-center gap-2 group ${
                isSaving ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {isSaving ? (
                <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> Enregistrement...</>
              ) : (
                <><Save size={14} className="group-hover:rotate-12 transition-transform" /> Enregistrer les modifications</>
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default EditDeclarationModal;