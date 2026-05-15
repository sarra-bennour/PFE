import React, { useState, useEffect, ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion'; // ✅ AJOUTÉ
import PaymentForm from '../../components/PaymentForm';
import FormAlert from '../../components/FormAlert';
import { ProductType, Product } from '../../types/Product';
import { User } from '@/types/User';
import { PaymentResult } from '@/types/PaymentResult';
import { DemandeResponse } from '@/types/DemandeEnregistrement';
import { DeclarationFormData } from '@/types/DeclarationFormData';

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

// ==================== API SETUP ====================
const API_BASE_URL = '/api';

// Créer une instance axios avec la configuration de base
const api = axios.create({
  baseURL: API_BASE_URL,
});

// Intercepteur pour ajouter le token à chaque requête
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

  // Récupérer l'utilisateur du localStorage
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
  const [isPaid, setIsPaid] = useState(false);
  const [showDraftModal, setShowDraftModal] = useState(false); // ✅ AJOUTÉ

  // États pour les alertes de paiement
  const [paymentSuccess, setPaymentSuccess] = useState<PaymentResult | null>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [paymentLoading, setPaymentLoading] = useState(false);

  // État pour les alertes générales
  const [generalAlert, setGeneralAlert] = useState<{
    message: string;
    type: 'success' | 'error';
  } | null>(null);

  const [formData, setFormData] = useState<DeclarationFormData>({
    products: [],
    files: {},
    productImages: {}
  });

  const [productIdMap, setProductIdMap] = useState<Map<string, number>>(new Map());
  const [uploadedDocs, setUploadedDocs] = useState<Set<string>>(new Set());
  const [uploadErrors, setUploadErrors] = useState<Map<string, string>>(new Map());

  // Fonction pour afficher les alertes générales
  const showGeneralAlert = (message: string, type: 'success' | 'error' = 'error') => {
    setGeneralAlert({ message, type });
    setTimeout(() => {
      setGeneralAlert(null);
    }, 5000);
  };

  const closeGeneralAlert = () => {
    setGeneralAlert(null);
  };

  // Restaurer l'ID depuis localStorage au chargement
  useEffect(() => {
    const savedId = localStorage.getItem('currentDemandeId');
    if (savedId) {
      setDemandeId(parseInt(savedId));
    }
  }, []);

  // Vérifier le token au chargement
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      console.error('❌ Token manquant - redirection vers login');
      window.location.href = '/login';
      return;
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

  // SUPPRIMER l'effet de création automatique à l'étape 3
  // La création sera gérée dans handleNextStep

  // Fonction pour uploader tous les documents
  const uploadAllDocuments = async (demandeIdParam: number, productMap: Map<string, number>) => {
    console.log('📦 uploadAllDocuments appelé avec demandeId:', demandeIdParam);
    console.log('📦 productMap:', Array.from(productMap.entries()));
    console.log('📦 formData.files:', Object.keys(formData.files));

    const uploadPromises = [];
    let successCount = 0;
    let failCount = 0;

    for (const [key, file] of Object.entries(formData.files)) {
      if (file instanceof File) {
        const underscoreIndex = key.indexOf('_');
        const frontendProductId = key.substring(0, underscoreIndex);
        const docType = key.substring(underscoreIndex + 1);
        const backendProductId = productMap.get(frontendProductId);

        if (backendProductId) {
          console.log(`✅ Préparation upload pour ${docType} (${key}) vers produit ${backendProductId}`);
          uploadPromises.push(
            uploadDocument(frontendProductId, backendProductId, docType, file, demandeIdParam)
              .then(() => {
                successCount++;
                console.log(`✅ Upload réussi (${successCount}/${uploadPromises.length})`);
              })
              .catch((error) => {
                failCount++;
                console.error(`❌ Échec upload ${docType}:`, error);
              })
          );
        } else {
          console.warn(`⚠️ Aucun backendId pour le produit ${frontendProductId} (clé: ${key})`);
        }
      }
    }

    if (uploadPromises.length > 0) {
      console.log(`📤 Upload de ${uploadPromises.length} documents...`);
      await Promise.all(uploadPromises);
      console.log(`📊 Résultats: ${successCount} succès, ${failCount} échecs`);

      if (failCount === 0) {
        showGeneralAlert('Tous les documents ont été téléchargés avec succès!', 'success');
      } else if (successCount > 0) {
        showGeneralAlert(`${successCount} documents téléchargés, ${failCount} en échec`, 'error');
      }
    } else {
      console.log('📭 Aucun document à uploader');
    }
  };

  const addProduct = (type: ProductType) => {
    console.log('➕ ************Adding product of type:', type);
    setFormData(prev => ({
      ...prev,
      products: [
        ...prev.products,
        {
          id: Date.now(),
          productType : type,
          category: '',
          hsCode: '',
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

  const removeProduct = (id: number) => {
    if (formData.products.length > 1) {
      const updatedFiles = { ...formData.files };
      Object.keys(updatedFiles).forEach(key => {
        if (key.startsWith(String(id))) {
          delete updatedFiles[key];
        }
      });

      // Supprimer aussi l'image du produit
    const updatedProductImages = { ...formData.productImages };
    delete updatedProductImages[id];

      setFormData(prev => ({
        products: prev.products.filter(p => p.id !== id),
        files: updatedFiles,
        productImages: updatedProductImages
      }));
    }
  };

  const updateProduct = (id: number, updates: Partial<Product>) => {
    setFormData(prev => ({
      ...prev,
      products: prev.products.map(p => p.id === id ? { ...p, ...updates } : p)
    }));
  };

  const uploadDocument = async (frontendProductId: string, backendProductId: number, docType: string, file: File, demandeIdParam: number) => {
    if (!user) {
      console.error('❌ Missing user for upload');
      return;
    }

    console.log(`📤 Uploading document: ${docType} for product ${backendProductId} to demande ${demandeIdParam}`);
    console.log(`📄 File details:`, {
      name: file.name,
      size: file.size,
      type: file.type
    });

    const formData = new FormData();
    formData.append('file', file);
    formData.append('documentType', docType);
    formData.append('productId', backendProductId.toString());

    try {
      console.log(`🚀 Sending request to: /produits/${demandeIdParam}/documents/upload`);

      const response = await api.post(`/produits/${demandeIdParam}/documents/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      console.log(`✅ Document ${docType} uploaded successfully:`, response.data);

      const docKey = `${frontendProductId}_${docType}`;
      setUploadedDocs(prev => {
        const newSet = new Set(prev);
        newSet.add(docKey);
        console.log(`📝 uploadedDocs mis à jour:`, Array.from(newSet));
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

      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);
        console.error('Response headers:', error.response.headers);
      } else if (error.request) {
        console.error('No response received:', error.request);
      } else {
        console.error('Error message:', error.message);
      }

      if (error.response?.status === 401) {
        showGeneralAlert('Votre session a expiré. Veuillez vous reconnecter.', 'error');
        setTimeout(() => {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          window.location.href = '/login';
        }, 2000);
      } else if (error.response?.status === 404) {
        console.error('Endpoint non trouvé. Vérifiez l\'URL:', `/produits/${demandeIdParam}/documents/upload`);
        showGeneralAlert('L\'URL d\'upload n\'est pas correcte', 'error');
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

  const handleFileChange = (frontendProductId: number, docId: string) => async (e: ChangeEvent<HTMLInputElement>) => {
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

    // NE PAS UPLOADER IMMÉDIATEMENT - Attendre la création de la demande à l'étape 3
    console.log(`📦 Document ${docId} mis en attente (sera uploadé après création de la demande)`);
  };

const createDemande = async () => {
  if (!user) throw new Error('Utilisateur non authentifié');

  const token = localStorage.getItem('token');
  if (!token) {
    throw new Error('Token d\'authentification manquant');
  }

  const formDataToSend = new FormData();
  
  const demandeData = {
    exportateurId: user.id,
    products: formData.products.map(p => {
      const imageFile = formData.productImages[p.id];
      return {
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
      productImageName: imageFile ? imageFile.name : null
    };}),
    documents: [],
    paymentInfo: null
  };

  formDataToSend.append('demande', new Blob([JSON.stringify(demandeData)], {
    type: 'application/json'
  }));
  
  for (const product of formData.products) {
    const imageFile = formData.productImages[product.id];
    if (imageFile) {
      formDataToSend.append('images', imageFile);
    }
  }

  try {
    const response = await api.post('/produits', formDataToSend, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data as DemandeResponse;
  } catch (error: any) {
    // ✅ Récupérer le message d'erreur du backend
    const backendMessage = error.response?.data?.message;
    const backendError = error.response?.data?.error;
    
    console.error('❌ Erreur backend:', backendMessage);
    console.error('❌ Code erreur:', backendError);
    
    // ✅ Lancer l'erreur avec le message du backend
    throw new Error(backendMessage || 'Erreur lors de la création de la demande');
  }
};


const handleSubmit = async () => {
  setIsLoading(true);
  
  try {
    // Vérifier que tous les documents requis sont sélectionnés
    const missingDocs = checkRequiredDocuments();
    if (missingDocs.length > 0) {
      showGeneralAlert(`Documents manquants: ${missingDocs.join(', ')}`, 'error');
      setIsLoading(false);
      return;
    }
    
    // Vérifier que l'utilisateur a accepté les conditions
    if (!isAgreed) {
      showGeneralAlert('Vous devez accepter les conditions pour soumettre la demande', 'error');
      setIsLoading(false);
      return;
    }
    
    let demandeIdToSubmit = demandeId;
    
    // Si la demande n'existe pas encore, la créer d'abord
    if (!demandeIdToSubmit) {
      console.log('📝 Étape 1: Création de la demande...');
      const data = await createDemande();
      console.log('✅ Demande créée avec ID:', data.id);
      
      demandeIdToSubmit = data.id;
      setDemandeId(data.id);
      setDeclarationRef(data.reference);
      
      // Créer le mapping des produits
      const newProductIdMap = new Map<string, number>();
      formData.products.forEach((frontendProduct, index) => {
        if (data.products && data.products[index]) {
          newProductIdMap.set(String(frontendProduct.id), data.products[index].id);
          updateProduct(frontendProduct.id, { backendId: data.products[index].id });
        }
      });
      setProductIdMap(newProductIdMap);
      
      // Uploader les documents
      console.log('📤 Étape 2: Upload des documents...');
      await uploadAllDocuments(data.id, newProductIdMap);
      console.log('✅ Upload terminé');
    } else {
      // Si la demande existe déjà, uploader les documents manquants
      console.log('📤 Upload des documents pour la demande existante ID:', demandeIdToSubmit);
      await uploadAllDocuments(demandeIdToSubmit, productIdMap);
    }
    
    // Étape 3: Soumettre la demande (appel au backend /{id}/soumettre)
    console.log('📤 Étape 3: Soumission de la demande ID:', demandeIdToSubmit);
    const submittedDemande = await submitDemande(demandeIdToSubmit);
    console.log('✅ Demande soumise avec succès:', submittedDemande);
    
    // ✅ MODIFICATION: Ne pas rediriger, passer à l'étape 5 (paiement)
    // Nettoyer le localStorage
    localStorage.removeItem('productDeclarationDraft');
    localStorage.removeItem('currentDemandeId');
    
    // ✅ Passer à l'étape 5 (paiement) au lieu de setIsSubmitted(true)
    showGeneralAlert('Demande soumise avec succès! Veuillez procéder au paiement.', 'success');
    
    // ✅ Aller à l'étape 5
    setStep(5);
    
  } catch (error: any) {
    console.error('❌ Erreur lors de la soumission:', error);
    const errorMessage = error.response?.data?.message || error.message || 'Erreur lors de la soumission de la demande';
    showGeneralAlert(errorMessage, 'error');
  } finally {
    setIsLoading(false);
  }
};

// Modifier la fonction submitDemande pour qu'elle utilise l'ID passé en paramètre
const submitDemande = async (demandeIdToSubmit: number) => {
  console.log('📤 Soumission de la demande ID:', demandeIdToSubmit);

  try {
    const response = await api.post(`/produits/${demandeIdToSubmit}/soumettre`);
    console.log('✅ Demande soumise avec succès:', response.data);
    return response.data;
  } catch (error: any) {
    console.error('❌ Erreur lors de la soumission:', error);
    
    // Récupérer le message d'erreur du backend
    const errorMessage = error.response?.data?.message || error.message || 'Erreur lors de la soumission';
    const errorCode = error.response?.data?.error;
    
    if (error.response?.status === 401) {
      showGeneralAlert('Votre session a expiré. Veuillez vous reconnecter.', 'error');
      setTimeout(() => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }, 2000);
    }
    
    throw new Error(errorMessage);
  }
}

  
  const handleProductImageChange = (productId: number, file: File | null) => {
  if (!file) {
    // Supprimer l'image
    updateProduct(productId, { productImage: undefined });
    setFormData(prev => {
      const newProductImages = { ...prev.productImages };
      delete newProductImages[productId];
      return { ...prev, productImages: newProductImages };
    });
    return;
  }

  // Vérifier la taille (max 2MB)
  if (file.size > 2 * 1024 * 1024) {
    showGeneralAlert("L'image ne doit pas dépasser 2MB", 'error');
    return;
  }

  // Vérifier le type
  if (!file.type.startsWith('image/')) {
    showGeneralAlert("Veuillez sélectionner une image valide (JPG, PNG)", 'error');
    return;
  }

  // Stocker le fichier pour l'upload
  setFormData(prev => ({
    ...prev,
    productImages: {
      ...prev.productImages,
      [productId]: file
    }
  }));

  // Créer un aperçu temporaire en base64 pour l'affichage
  const reader = new FileReader();
  reader.onloadend = () => {
    updateProduct(productId, { productImage: reader.result as string });
  };
  reader.readAsDataURL(file);
};

  const checkRequiredDocuments = (): string[] => {
    const missing: string[] = [];

    formData.products.forEach(product => {
      console.log(`Checking documents for product: ${product.productName} (${product.id})`);

      const docs = product.productType === 'alimentaire'
        ? (product.hasBrandLicense ? FOOD_DOCS : FOOD_DOCS.filter(doc => doc.id !== 'BRAND_LICENSE'))
        : INDUSTRIAL_DOCS;

      docs.filter(doc => doc.required).forEach(doc => {
        const fileKey = `${product.id}_${doc.id}`;
        const hasFile = !!formData.files[fileKey];
        const isUploaded = uploadedDocs.has(fileKey);
        const hasError = uploadErrors.has(fileKey);

        console.log(`  Document ${doc.id}: hasFile=${hasFile}, isUploaded=${isUploaded}, hasError=${hasError}`);

        // À l'étape 3, on vérifie seulement hasFile (pas isUploaded)
        if (!hasFile || hasError) {
          missing.push(`${doc.label} (${product.productName || 'Produit'})`);
        }
      });
    });

    return missing;
  };

  const handleCreatePaymentIntent = async (demandeIdParam: number) => {
    const token = localStorage.getItem('token');

    const response = await axios.post(
      '/api/stripe-payment/create-intent',
      {
        demandeId: demandeIdParam,
        successUrl: window.location.origin + '/payment-success',
        cancelUrl: window.location.origin + '/payment-cancel'
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return response.data; // Retourne l'objet complet avec paymentIntentId et clientSecret
  };

  const handleProcessPayment = async (paymentIntentId: string, paymentDetails: any, demandeIdParam: number) => {
    const token = localStorage.getItem('token');

    // Modification importante: on envoie paymentMethodId au lieu des détails de la carte
    const paymentRequest = {
      paymentIntentId: paymentIntentId,
      demandeId: demandeIdParam,
      paymentMethodId: paymentDetails.paymentMethodId, // Reçu du PaymentForm
      cardHolderName: paymentDetails.cardHolder,
      receiptEmail: paymentDetails.receiptEmail
    };

    const response = await axios.post(
      '/api/stripe-payment/confirm-payment',
      paymentRequest,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return response.data;
  };


  const handlePaymentSubmit = async (paymentDetails: any) => {
  setPaymentLoading(true);
  setPaymentError(null);
  setPaymentSuccess(null);

  try {
    console.log('💰 Début du processus complet pour la demande');

    let demandeIdToSubmit = demandeId;
    
    // ✅ Étape 1: Créer la demande si elle n'existe pas encore
    if (!demandeIdToSubmit) {
      console.log('📝 Étape 1: Création de la demande...');
      const data = await createDemande();
      console.log('✅ Demande créée avec ID:', data.id);
      
      demandeIdToSubmit = data.id;
      setDemandeId(data.id);
      setDeclarationRef(data.reference);
      
      // Créer le mapping des produits
      const newProductIdMap = new Map<string, number>();
      formData.products.forEach((frontendProduct, index) => {
        if (data.products && data.products[index]) {
          newProductIdMap.set(String(frontendProduct.id), data.products[index].id);
          updateProduct(frontendProduct.id, { backendId: data.products[index].id });
        }
      });
      setProductIdMap(newProductIdMap);
      
      // Uploader les documents
      console.log('📤 Étape 1b: Upload des documents...');
      await uploadAllDocuments(data.id, newProductIdMap);
      console.log('✅ Upload terminé');
    } else {
      // Si la demande existe déjà, uploader les documents manquants
      console.log('📤 Upload des documents pour la demande existante ID:', demandeIdToSubmit);
      await uploadAllDocuments(demandeIdToSubmit, productIdMap);
    }
    
    // ✅ Étape 2: Soumettre la demande (changer statut de BROUILLON à SOUMISE)
    console.log('📤 Étape 2: Soumission de la demande ID:', demandeIdToSubmit);
    const submittedDemande = await submitDemande(demandeIdToSubmit);
    console.log('✅ Demande soumise avec succès:', submittedDemande);

    // ✅ Étape 3: Créer le PaymentIntent
    console.log('💰 Étape 3: Création du PaymentIntent...');
    const createIntentResponse = await handleCreatePaymentIntent(demandeIdToSubmit);
    const paymentIntentId = createIntentResponse.paymentIntentId;

    if (!paymentIntentId) {
      throw new Error('Impossible de créer le PaymentIntent');
    }

    console.log('✅ PaymentIntent créé:', paymentIntentId);

    // ✅ Étape 4: Confirmer le paiement
    console.log('💳 Étape 4: Confirmation du paiement...');
    const result = await handleProcessPayment(paymentIntentId, paymentDetails, demandeIdToSubmit);

    if (result.success) {
      setPaymentSuccess({
        success: true,
        message: 'Paiement effectué avec succès! Votre demande a été soumise.',
        amount: result.amount
      });

      setIsPaid(true);

      // Nettoyer le localStorage
      localStorage.removeItem('productDeclarationDraft');
      localStorage.removeItem('currentDemandeId');

      // Rediriger vers l'étape 6 (récapitulatif) après 2 secondes
      setTimeout(() => {
        setStep(6);
      }, 2000);
    } else {
      setPaymentError(result.message || 'Erreur de paiement');
    }

  } catch (error: any) {
    console.error('❌ Erreur:', error);
    
    if (error.response?.status === 401) {
      setPaymentError('Votre session a expiré. Veuillez vous reconnecter.');
      setTimeout(() => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }, 2000);
    } else {
      const errorData = error.response?.data;
      if (errorData && errorData.error) {
        const errorMessage = errorData.error;
        if (errorMessage.includes('card_declined')) {
          setPaymentError('Votre carte a été refusée. Veuillez vérifier vos informations ou utiliser une autre carte.');
        } else if (errorMessage.includes('insufficient_funds')) {
          setPaymentError('Fonds insuffisants sur cette carte. Veuillez utiliser une autre carte.');
        } else if (errorMessage.includes('expired_card')) {
          setPaymentError('Votre carte a expiré. Veuillez utiliser une carte valide.');
        } else if (errorMessage.includes('incorrect_cvc')) {
          setPaymentError('Le code de sécurité (CVV) est incorrect. Veuillez vérifier et réessayer.');
        } else {
          const cleanMessage = errorMessage.split(';')[0];
          setPaymentError(cleanMessage);
        }
      } else if (errorData && errorData.message) {
        setPaymentError(errorData.message);
      } else if (typeof errorData === 'string') {
        setPaymentError(errorData);
      } else {
        setPaymentError(error.message || 'Erreur lors du paiement');
      }
    }
  } finally {
    setPaymentLoading(false);
  }
};

  // ✅ AJOUTÉ - Fonction pour sauvegarder en brouillon
 const handleSaveDraft = async () => {
  setIsLoading(true);
  setShowDraftModal(false);
  
  try {
    // Vérifier d'abord que tous les documents requis sont sélectionnés
    const missingDocs = checkRequiredDocuments();
    if (missingDocs.length > 0) {
      showGeneralAlert(`Impossible de sauvegarder: documents manquants - ${missingDocs.join(', ')}`, 'error');
      setIsLoading(false);
      return;
    }
    
    // Si la demande n'existe pas encore, la créer
    if (!demandeId) {
      console.log('📝 Création de la demande avant sauvegarde...');
      const data = await createDemande();
      console.log('✅ Demande créée avec ID:', data.id);
      
      localStorage.setItem('currentDemandeId', data.id.toString());
      setDemandeId(data.id);
      setDeclarationRef(data.reference);
      
      // Créer le mapping des produits
      const newProductIdMap = new Map<string, number>();
      formData.products.forEach((frontendProduct, index) => {
        if (data.products && data.products[index]) {
          newProductIdMap.set(String(frontendProduct.id), data.products[index].id);
          updateProduct(frontendProduct.id, { backendId: data.products[index].id });
        }
      });
      setProductIdMap(newProductIdMap);
      
      // Uploader les documents
      console.log('📤 Upload des documents...');
      await uploadAllDocuments(data.id, newProductIdMap);
      console.log('✅ Upload terminé');
    } else {
      // Si la demande existe déjà, on upload juste les documents
      console.log('📤 Upload des documents pour la demande existante ID:', demandeId);
      await uploadAllDocuments(demandeId, productIdMap);
    }
    
    // Sauvegarder le brouillon dans localStorage
    localStorage.setItem('productDeclarationDraft', JSON.stringify(formData));
    localStorage.setItem('currentDemandeId', demandeId?.toString() || '');
    
    showGeneralAlert('Votre demande a été sauvegardée en tant que brouillon!', 'success');
    
    // Rediriger vers la page des demandes de l'exportateur
    setTimeout(() => {
      navigate('/exporter/mes-demandes');
    }, 2000);
    
  } catch (error: any) {
    console.error('❌ Erreur lors de la sauvegarde:', error);
    showGeneralAlert(error.message || 'Erreur lors de la sauvegarde du brouillon', 'error');
  } finally {
    setIsLoading(false);
  }
};

  // Gérer le clic sur Suivant
  const handleNextStep = async () => {
  // Étape 3: Documents - UNIQUEMENT VÉRIFIER LES DOCUMENTS, PAS CRÉER LA DEMANDE
  if (step === 3) {
    setIsLoading(true);
    try {
      // Vérifier que tous les documents requis sont sélectionnés
      const missingDocs = checkRequiredDocuments();
      if (missingDocs.length > 0) {
        showGeneralAlert(`Documents manquants: ${missingDocs.join(', ')}`, 'error');
        setIsLoading(false);
        return;
      }

      // ✅ SUPPRIMÉ: createDemande() n'est plus appelé ici
      // La demande sera créée uniquement lors de la sauvegarde en brouillon
      
      console.log('📝 Étape 3: Tous les documents sont sélectionnés, passage à l\'étape 4');
      showGeneralAlert('Documents validés, passez à l\'étape suivante', 'success');

      // Passer à l'étape 4 (Validation)
      setStep(step + 1);
    } catch (error: any) {
      console.error('❌ Erreur:', error);
      showGeneralAlert(error.message || 'Erreur lors de la vérification des documents', 'error');
    } finally {
      setIsLoading(false);
    }
  }
  // Étape 4: Validation - SOUMETTRE LA DEMANDE (SOUMISE) si elle existe déjà
  else if (step === 4) {
    if (!isAgreed) {
      showGeneralAlert('Vous devez cocher la case pour continuer', 'error');
      return;
    }
    
    setStep(step + 1);
  }
  // Étape 5: Paiement - juste vérifier que le paiement est effectué
  else if (step === 5) {
    if (!isPaid) {
      showGeneralAlert('Veuillez effectuer le paiement avant de continuer', 'error');
      return;
    }
    // Passer à l'écran final
    setStep(step + 1);
  }
  // Autres étapes: simple navigation
  else {
    setStep(step + 1);
  }
};

  
  const calculateFees = () => {
    const baseFee = 50;
    const perProductFee = 20;
    const stampDuty = 1;
    const subtotal = baseFee + (formData.products.length * perProductFee);
    return {
      subtotal,
      stampDuty,
      total: subtotal + stampDuty
    };
  };

  const fees = calculateFees();

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

  if (step === 6) {
    return (
      <div className="max-w-2xl mx-auto py-20 text-center animate-fade-in-scale">
        <div className="bg-white rounded-[3rem] p-12 shadow-2xl border border-emerald-100 mb-8">
          <div className="w-24 h-24 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-8">
            <i className="fas fa-check-circle text-5xl"></i>
          </div>
          <h2 className="text-3xl font-black text-slate-900 mb-4 uppercase italic tracking-tighter">Déclaration Transmise</h2>
          <p className="text-slate-500 font-medium leading-relaxed mb-8">
            Référence : <span className="font-black text-slate-900">{declarationRef}</span><br />
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
    <>
    <div className="max-w-5xl mx-auto py-8">
      <div className="flex items-center justify-between mb-12 px-8">
        {['Produits', 'Logistique', 'Documents', 'Validation', 'Paiement'].map((label, i) => (
          <div key={label} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-2">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-xs transition-all ${step >= i + 1 ? 'bg-tunisia-red text-white shadow-lg shadow-red-200' : 'bg-slate-100 text-slate-400'
                }`}>
                {i + 1}
              </div>
              <span className={`text-[8px] font-black uppercase tracking-widest ${step >= i + 1 ? 'text-slate-900' : 'text-slate-300'}`}>{label}</span>
            </div>
            {i < 4 && (
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

                {generalAlert && (
                  <div className="mt-4 w-full animate-slide-down">
                    <div className="max-w-sm" style={{ marginLeft: '500px' }}>
                      <FormAlert
                        type={generalAlert.type}
                        message={generalAlert.message}
                        onClose={closeGeneralAlert}
                      />
                    </div>
                  </div>
                )}
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
                      <div className={`absolute -top-5 -left-5 w-12 h-12 rounded-2xl flex items-center justify-center font-black italic shadow-xl ${product.productType === 'alimentaire' ? 'bg-emerald-500 text-white' : 'bg-blue-500 text-white'
                        }`}>
                        {index + 1}
                      </div>

                      <div className="absolute top-6 right-6 flex items-center gap-4">
                        <span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full border ${product.productType === 'alimentaire' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-blue-50 text-blue-600 border-blue-100'
                          }`}>
                          {product.productType}
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
                        <div className="space-y-2 md:col-span-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                            Image du produit
                          </label>
                          <div className="flex items-center gap-6">
                            <div className="w-24 h-24 rounded-2xl bg-white border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden relative group">
                              {product.productImage ? (
                                <img 
                                  src={product.productImage} 
                                  alt="Preview" 
                                  className="w-full h-full object-cover" 
                                  referrerPolicy="no-referrer" 
                                />
                              ) : (
                                <i className="fas fa-camera text-slate-300 text-xl"></i>
                              )}
                              <input 
                                type="file" 
                                accept="image/jpeg,image/png,image/jpg"
                                onChange={(e) => handleProductImageChange(product.id, e.target.files?.[0] || null)}
                                className="absolute inset-0 opacity-0 cursor-pointer z-10"
                                disabled={isLoading}
                              />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <i className="fas fa-cloud-arrow-up text-white text-sm"></i>
                              </div>
                            </div>
                            <div className="flex-1">
                              <p className="text-[10px] font-bold text-slate-500 leading-relaxed">
                                Ajoutez une photo claire de votre produit pour qu'il soit visible par les importateurs dans le catalogue.
                              </p>
                              <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest mt-1">
                                Format: JPG, PNG • Max: 2MB
                              </p>
                            </div>
                          </div>
                        </div>
                        <SearchableSelect
                          label="Catégorie"
                          value={product.category || ''}
                          options={(product.productType === 'alimentaire' ? CATEGORIES_ALIMENTAIRES : CATEGORIES_INDUSTRIELS).map(c => c.name)}
                          onChange={(val) => {
                            const cat = (product.productType === 'alimentaire' ? CATEGORIES_ALIMENTAIRES : CATEGORIES_INDUSTRIELS).find(c => c.name === val);
                            updateProduct(product.id, { category: val, hsCode: cat?.codes[0] || '' });
                          }}
                          placeholder="Choisir une catégorie..."
                          required
                        />

                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Code NGP *</label>
                          <select
                            value={product.hsCode}
                            onChange={(e) => updateProduct(product.id, { hsCode: e.target.value })}
                            className="w-full px-5 py-4 rounded-2xl border-2 border-slate-50 font-bold bg-white focus:border-tunisia-red transition-all outline-none"
                            disabled={isLoading}
                          >
                            <option value="">Sélectionner un code...</option>
                            {(product.productType === 'alimentaire' ? CATEGORIES_ALIMENTAIRES : CATEGORIES_INDUSTRIELS)
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
                          value={product.originCountry || ''}
                          options={COUNTRIES}
                          onChange={(val) => updateProduct(product.id, { originCountry: val })}
                          placeholder="Rechercher un pays..."
                          required
                          isCountry
                        />

                        {product.productType === 'alimentaire' ? (
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

                {generalAlert && (
                  <div className="mt-4 w-full animate-slide-down">
                    <div className="max-w-sm" style={{ marginLeft: '500px' }}>
                      <FormAlert
                        type={generalAlert.type}
                        message={generalAlert.message}
                        onClose={closeGeneralAlert}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 gap-8">
                <div className="p-8 bg-slate-50 rounded-[2rem] border border-slate-100">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-6">Résumé de la cargaison</h3>
                  <div className="space-y-3">
                    {formData.products.map((p, i) => (
                      <div key={p.id} className="flex justify-between items-center text-xs font-bold p-3 bg-white rounded-xl border border-slate-50">
                        <span className="text-slate-500">{i + 1}. {p.productName || 'Produit sans nom'}</span>
                        <span className={`px-2 py-0.5 rounded-md text-[8px] uppercase ${p.productType === 'alimentaire' ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'}`}>
                          {p.productType}
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

                {generalAlert && (
                  <div className="mt-4 w-full animate-slide-down">
                    <div className="max-w-sm" style={{ marginLeft: '500px' }}>
                      <FormAlert
                        type={generalAlert.type}
                        message={generalAlert.message}
                        onClose={closeGeneralAlert}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-16">
                {formData.products.map((product, pIdx) => (
                  <div key={product.id} className="space-y-6">
                    <div className="flex items-center gap-4">
                      <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center text-[10px] font-black italic">
                        {pIdx + 1}
                      </div>
                      <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight italic">
                        {product.productName || `Produit ${pIdx + 1}`} ({product.productType})
                        {product.backendId && <span className="ml-2 text-[8px] text-slate-400">ID: {product.backendId}</span>}
                      </h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {(product.productType === 'alimentaire' ?
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
                                disabled={isLoading}
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
            <div className="space-y-8 animate-fade-in">
              <div className="border-b border-slate-50 pb-6">
                <h2 className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter">Étape 4 : Validation Finale</h2>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1">Vérification et signature électronique</p>

                {generalAlert && (
                  <div className="mt-4 w-full animate-slide-down">
                    <div className="max-w-sm" style={{ marginLeft: '500px' }}>
                      <FormAlert
                        type={generalAlert.type}
                        message={generalAlert.message}
                        onClose={closeGeneralAlert}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Récapitulatif sur toute la largeur */}
              <div className="bg-slate-50 p-8 rounded-[2.5rem] border border-slate-100 space-y-6 shadow-sm w-full">
                <div className="flex justify-between items-center border-b border-slate-200 pb-4">
                  <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Récapitulatif du lot</h4>
                  <span className="text-xs font-black italic text-tunisia-red">{formData.products.length} Produit(s)</span>
                </div>
                <div className="grid grid-cols-2 gap-8 max-w-md">
                  <div className="space-y-4">
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Alimentaires</p>
                    <p className="text-2xl font-black italic tracking-tighter text-emerald-600">
                      {formData.products.filter(p => p.productType === 'alimentaire').length}
                    </p>
                  </div>
                  <div className="space-y-4">
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Industriels</p>
                    <p className="text-2xl font-black italic tracking-tighter text-blue-600">
                      {formData.products.filter(p => p.productType === 'industriel').length}
                    </p>
                  </div>
                </div>
              </div>
              {/* BOX D'ENGAGEMENT EN BAS - DÉPLACÉE ICI */}
              <div className="bg-amber-50 p-8 rounded-[2.5rem] border border-amber-100 space-y-6 shadow-sm mt-4">
                <div className="flex justify-between items-center border-b border-amber-200 pb-4">
                  <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-amber-600">Engagement</h4>
                  <i className="fas fa-file-signature text-amber-500"></i>
                </div>
                <div className="space-y-4">
                  <div className="flex items-start gap-4">
                    <input
                      type="checkbox"
                      id="certify"
                      checked={isAgreed}
                      onChange={(e) => setIsAgreed(e.target.checked)}
                      className="mt-1 w-5 h-5 rounded border-amber-300 text-tunisia-red focus:ring-tunisia-red cursor-pointer"
                      disabled={isLoading}
                    />
                    <label htmlFor="certify" className="text-xs font-bold text-amber-900 leading-relaxed cursor-pointer">
                      Je certifie sur l'honneur l'exactitude des informations fournies. Je reconnais que toute fausse déclaration m'expose aux sanctions prévues par le code des douanes et la réglementation du commerce extérieur de la République Tunisienne.
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="space-y-12 animate-fade-in">
              <div className="border-b border-slate-50 pb-6">
                <h2 className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter">Étape 5 : Paiement des frais</h2>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1">Règlement des frais de dossier multi-produits</p>

                {generalAlert && (
                  <div className="mt-4 w-full animate-slide-down">
                    <div className="max-w-sm" style={{ marginLeft: '500px' }}>
                      <FormAlert
                        type={generalAlert.type}
                        message={generalAlert.message}
                        onClose={closeGeneralAlert}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                <div className="bg-slate-50 rounded-[2.5rem] p-10 border border-slate-100 shadow-sm space-y-8">
                  <div className="flex justify-between items-center">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Détails de la Facture</h3>
                    <i className="fas fa-file-invoice text-slate-300"></i>
                  </div>

                  <div className="space-y-4">
                    <div className="flex justify-between items-center text-xs font-bold">
                      <span className="text-slate-500">Frais de dossier de base</span>
                      <span className="text-slate-900">50,000 TND</span>
                    </div>
                    <div className="flex justify-between items-center text-xs font-bold">
                      <span className="text-slate-500">Frais par produit ({formData.products.length} x 20 TND)</span>
                      <span className="text-slate-900">{(formData.products.length * 20).toFixed(3)} TND</span>
                    </div>
                    <div className="flex justify-between items-center text-xs font-bold">
                      <span className="text-slate-500">Droit de timbre</span>
                      <span className="text-slate-900">1,000 TND</span>
                    </div>
                  </div>

                  <div className="pt-6 border-t border-slate-200">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total à payer</span>
                      <span className="text-3xl font-black italic tracking-tighter text-tunisia-red">{fees.total.toFixed(3)} TND</span>
                    </div>
                  </div>

                  <div className="p-4 bg-white rounded-2xl border border-slate-100 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-500 flex items-center justify-center">
                      <i className="fas fa-shield-check"></i>
                    </div>
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-widest text-slate-900">Paiement Sécurisé</p>
                      <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Certifié par la Banque Centrale de Tunisie</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-8">
                  {!isPaid && (
                    <div className="animate-fade-in">
                      <PaymentForm
                        amount={fees.total}
                        onSubmit={handlePaymentSubmit}
                        onBack={() => { }}
                        isLoading={paymentLoading}
                        error={paymentError}
                        success={paymentSuccess ? {
                          message: paymentSuccess.message,
                          amount: paymentSuccess.amount
                        } : null}
                      />
                    </div>
                  )}

                  {isPaid && paymentSuccess && (
                    <div className="p-8 bg-emerald-50 rounded-[2.5rem] border-2 border-emerald-500 shadow-xl flex flex-col items-center text-center space-y-4 animate-fade-in">
                      <div className="w-16 h-16 bg-white text-emerald-500 rounded-full flex items-center justify-center shadow-sm">
                        <i className="fas fa-check text-2xl"></i>
                      </div>
                      <div>
                        <p className="text-lg font-black text-emerald-900 uppercase italic tracking-tighter">Paiement Confirmé</p>
                        <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mt-1">Transaction #{paymentSuccess.paymentReference?.substring(0, 8)}</p>
                      </div>
                    </div>
                  )}
                </div>
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
          
          {/* ✅ AJOUTÉ - Bouton Sauvegarder Brouillon UNIQUEMENT à l'étape 4 */}
          {step === 4 && (
            <button 
              onClick={() => setShowDraftModal(true)}
              className="px-8 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-slate-200 transition-all flex items-center gap-2 border border-slate-200"
              disabled={isLoading}
            >
              <i className="fas fa-save text-[12px]"></i> Sauvegarder Brouillon
            </button>
          )}
          
          <div className="flex-grow"></div>
          
          {step < 5 ? (
            <button
              onClick={handleNextStep}
              disabled={
                isLoading ||
                (step === 1 && formData.products.length === 0) ||
                (step === 4 && !isAgreed)
              }
              className={`px-12 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl transition-all ${
                isLoading ||
                (step === 1 && formData.products.length === 0) ||
                (step === 4 && !isAgreed)
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
              onClick={handleNextStep}
              disabled={!isAgreed || isLoading || !isPaid}
              className={`px-12 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl transition-all ${
                isAgreed && !isLoading && isPaid
                  ? 'bg-tunisia-red text-white hover:bg-red-700'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              {isLoading ? (
                <><i className="fas fa-spinner fa-spin mr-2"></i> Envoi...</>
              ) : (
                'Voir le récapitulatif'
              )}
            </button>
          )}
        </div>
      </div>
    </div>

    {/* ✅ AJOUTÉ - Draft Modal */}
    <AnimatePresence>
      {showDraftModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowDraftModal(false)}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-md"
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="relative w-full max-w-lg bg-white rounded-[2.5rem] shadow-2xl p-10 border border-slate-100 overflow-hidden"
          >
            <div className="w-16 h-16 bg-amber-50 text-amber-500 rounded-2xl flex items-center justify-center text-2xl mb-6">
              <i className="fas fa-save"></i>
            </div>
            <h3 className="text-xl font-black text-slate-900 uppercase italic tracking-tighter mb-4">Enregistrer en tant que brouillon ?</h3>
            <div className="space-y-4 text-slate-500 font-medium leading-relaxed mb-8">
              <p>
                En choisissant d'enregistrer cette demande comme brouillon, <span className="text-slate-900 font-black">elle ne sera pas encore soumise aux autorités</span> pour validation.
              </p>
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-[10px] space-y-2">
                <p className="flex items-center gap-2">
                  <i className="fas fa-eye-slash text-slate-400 w-4"></i>
                  <span>La demande ne sera pas visible par les instances de contrôle.</span>
                </p>
                <p className="flex items-center gap-2">
                  <i className="fas fa-credit-card text-slate-400 w-4"></i>
                  <span>Le paiement des frais ne sera pas effectué à ce stade.</span>
                </p>
                <p className="flex items-center gap-2">
                  <i className="fas fa-arrow-right text-tunisia-red w-4"></i>
                  <span className="text-slate-900">Vous devrez finaliser le paiement et soumettre officiellement la demande plus tard via votre liste de dossiers.</span>
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-3">
              <button 
                onClick={handleSaveDraft}
                className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-black transition-all shadow-xl"
              >
                Confirmer l'enregistrement
              </button>
              <button 
                onClick={() => setShowDraftModal(false)}
                className="w-full py-4 bg-white text-slate-400 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-slate-50 transition-all"
              >
                Annuler
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
    </>
  );
};

export default ProductDeclaration;