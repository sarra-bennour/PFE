import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../App';
import ResetPasswordForm from '../components/ResetPasswordForm';
import { useNavigate } from 'react-router-dom';

// Types pour les données du dossier
interface Document {
  id: number;
  fileName: string;
  documentType: string;
  status: string;
  uploadedAt: string;
  validatedAt?: string;
  fileType: string;
}

interface DemandeInfo {
  id: number;
  reference: string;
  status: string;
  submittedAt?: string;
}

const Profile: React.FC = () => {
  const { t } = useTranslation();
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  
  const [isEditing, setIsEditing] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isDeactivating, setIsDeactivating] = useState(false);
  const [deactivationReason, setDeactivationReason] = useState('');
  const [isUrgent, setIsUrgent] = useState(false);
  const [deactivationRequested, setDeactivationRequested] = useState(false);
  const [showFullDossier, setShowFullDossier] = useState(false);
  const [showCertificate, setShowCertificate] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  
  // États pour les données du dossier
  const [dossierStatus, setDossierStatus] = useState<any>(null);
  const [demandeInfo, setDemandeInfo] = useState<DemandeInfo | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loadingDossier, setLoadingDossier] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<{ name: string, url: string, type: 'pdf' | 'image' } | null>(null);

  const [formData, setFormData] = useState({
    companyName: user?.companyName || user?.raisonSociale || '',
    phone: user?.telephone || user?.phone || '',
    address: user?.address || user?.adresseLegale || '',
    country: user?.country || user?.paysOrigine || '',
    city: user?.city || user?.ville || '',
    tinNumber: user?.tinNumber || user?.numeroRegistreCommerce || '',
    website: user?.website || user?.siteWeb || '',
    legalRep: user?.legalRep || user?.representantLegal || ''
  });

  // Nettoyage des URLs Blob
  useEffect(() => {
    return () => {
      if (previewDoc?.url && previewDoc.url.startsWith('blob:')) {
        URL.revokeObjectURL(previewDoc.url);
      }
    };
  }, [previewDoc]);

  // ========== CHARGEMENT DES DONNÉES DU DOSSIER ==========
  useEffect(() => {
    if (user && (user.role === 'EXPORTATEUR' || user.role === 'exporter')) {
      fetchDossierStatus();
    }
  }, [user]);

  const fetchAllDocuments = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:8080/api/exportateur/documents', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      
      if (data.success) {
        setDocuments(data.documents);
      }
    } catch (err) {
      console.error('Erreur chargement documents:', err);
    }
  };

  const fetchDossierStatus = async () => {
    setLoadingDossier(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:8080/api/exportateur/dossier/statut', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      
      if (data.success) {
        setDossierStatus(data);
        
        if (data.hasDossier && data.demandeId) {
          setDemandeInfo({
            id: data.demandeId,
            reference: data.reference || 'N/A',
            status: data.status,
            submittedAt: data.submittedAt
          });
          
          await fetchAllDocuments();
        }
      }
    } catch (err) {
      console.error('Erreur chargement dossier:', err);
    } finally {
      setLoadingDossier(false);
    }
  };

  // Fonction pour prévisualiser un document
  const handlePreviewDocument = async (documentId: number, fileName: string, fileType: string) => {
    try {
      const token = localStorage.getItem('token');
      const fileUrl = `http://localhost:8080/api/exportateur/documents/${documentId}/file`;
      
      const response = await fetch(fileUrl, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        
        setPreviewDoc({
          name: fileName,
          url: url,
          type: fileType.toLowerCase() === 'pdf' ? 'pdf' : 'image'
        });
      } else {
        setError('Impossible de charger le document');
      }
    } catch (err) {
      console.error('Erreur prévisualisation:', err);
      setError('Erreur lors de la prévisualisation du document');
    }
  };

  // Fonction pour obtenir le nom d'affichage d'un document selon son type
  const getDocumentDisplayName = (docType: string, defaultName: string): string => {
    switch(docType) {
      // Documents registre de commerce
      case 'RC_CERT':
        return 'Registre du commerce';
      case 'RC_TRANSLATION':
        return 'Traduction du registre de commerce';
      case 'RC_LEGALIZATION':
        return 'Légalisation du registre de commerce';
      
      // Documents statuts
      case 'STATUTES':
        return 'Statuts de la société';
      case 'STATUTES_TRANSLATION':
        return 'Traduction des statuts';
      
      // Documents fiscaux
      case 'TIN_CERT':
        return 'Attestation fiscale';
      
      // Documents représentant
      case 'PASSPORT':
        return 'Passeport du gérant';
      case 'DESIGNATION_PV':
        return 'PV de désignation du gérant';
      
      // Documents financiers
      case 'SOLVENCY_CERT':
        return 'Certificat de solvabilité';
      case 'ANNUAL_ACCOUNTS':
        return 'Comptes annuels';
      case 'EXTERNAL_AUDIT':
        return 'Rapport d\'audit externe';
      
      default:
        return defaultName;
    }
  };

  // Fonction pour obtenir l'icône selon le type de document
  const getDocumentIcon = (docType: string): string => {
    switch(docType) {
      case 'RC_CERT':
      case 'RC_TRANSLATION':
      case 'RC_LEGALIZATION':
        return 'fa-building';
      
      case 'STATUTES':
      case 'STATUTES_TRANSLATION':
        return 'fa-file-contract';
      
      case 'TIN_CERT':
        return 'fa-file-invoice-dollar';
      
      case 'PASSPORT':
        return 'fa-passport';
      
      case 'DESIGNATION_PV':
        return 'fa-file-signature';
      
      case 'SOLVENCY_CERT':
        return 'fa-university';
      
      case 'ANNUAL_ACCOUNTS':
        return 'fa-chart-pie';
      
      case 'EXTERNAL_AUDIT':
        return 'fa-chart-line';
      
      default:
        return 'fa-file';
    }
  };

  // ========== MAPPER LES DOCUMENTS RÉELS VERS LE FORMAT AFFICHAGE ==========
  const getDisplayDocuments = () => {
    if (documents.length > 0) {
      // On filtre pour n'afficher que les 4 documents principaux
      const mainDocs = documents.filter(doc => 
        ['RC_CERT', 'STATUTES', 'TIN_CERT', 'PASSPORT'].includes(doc.documentType)
      );
      
      return mainDocs.map(doc => ({
        id: doc.id,
        name: getDocumentDisplayName(doc.documentType, doc.fileName),
        status: doc.status === 'VALIDE' ? 'Validé' : 
                doc.status === 'REJETE' ? 'Rejeté' : 'En cours',
        date: new Date(doc.uploadedAt).toLocaleDateString('fr-FR'),
        icon: getDocumentIcon(doc.documentType),
        fileType: doc.fileType,
        fileName: doc.fileName
      }));
    }
    
    // Sinon, données mock basées sur le statut de la demande
    if (dossierStatus?.status === 'VALIDEE') {
      return [
        { id: null, name: "Statuts de la société", status: "Validé", date: "12/01/2024", icon: "fa-file-contract", fileType: "pdf" },
        { id: null, name: "Registre du commerce", status: "Validé", date: "12/01/2024", icon: "fa-building", fileType: "pdf" },
        { id: null, name: "Attestation fiscale", status: "Validé", date: "12/01/2024", icon: "fa-file-invoice-dollar", fileType: "pdf" },
        { id: null, name: "Passeport du gérant", status: "Validé", date: "12/01/2024", icon: "fa-passport", fileType: "jpg" }
      ];
    } else if (dossierStatus?.status === 'EN_COURS_VALIDATION' || dossierStatus?.status === 'SOUMISE') {
      return [
        { id: null, name: "Statuts de la société", status: "En cours", date: "15/02/2024", icon: "fa-file-contract", fileType: "pdf" },
        { id: null, name: "Registre du commerce", status: "Validé", date: "12/01/2024", icon: "fa-building", fileType: "pdf" },
        { id: null, name: "Attestation fiscale", status: "En cours", date: "15/02/2024", icon: "fa-file-invoice-dollar", fileType: "pdf" },
        { id: null, name: "Passeport du gérant", status: "Validé", date: "12/01/2024", icon: "fa-passport", fileType: "jpg" }
      ];
    } else {
      // Données par défaut
      return [
        { id: null, name: "Statuts de la société", status: "En cours", date: "15/02/2024", icon: "fa-file-contract", fileType: "pdf" },
        { id: null, name: "Registre du commerce", status: "En cours", date: "15/02/2024", icon: "fa-building", fileType: "pdf" },
        { id: null, name: "Attestation fiscale", status: "En cours", date: "15/02/2024", icon: "fa-file-invoice-dollar", fileType: "pdf" },
        { id: null, name: "Passeport du gérant", status: "En cours", date: "15/02/2024", icon: "fa-passport", fileType: "jpg" }
      ];
    }
  };

  // ========== MAPPER POUR LE DOSSIER COMPLET ==========
  const getFullDossierData = () => {
    if (documents.length > 0) {
      // Catégorie Identité
      const identiteDocs = documents.filter(doc => 
        ['RC_CERT', 'RC_TRANSLATION', 'RC_LEGALIZATION', 'STATUTES', 'STATUTES_TRANSLATION', 'PASSPORT', 'DESIGNATION_PV'].includes(doc.documentType)
      );
      
      // Catégorie Fiscalité & Finance
      const fiscaliteDocs = documents.filter(doc => 
        ['TIN_CERT', 'SOLVENCY_CERT', 'ANNUAL_ACCOUNTS', 'EXTERNAL_AUDIT'].includes(doc.documentType)
      );
      
      const result = [];
      
      if (identiteDocs.length > 0) {
        result.push({
          section: "Identité",
          docs: identiteDocs.map(doc => ({
            id: doc.id,
            name: getDocumentDisplayName(doc.documentType, doc.fileName),
            status: doc.status === 'VALIDE' ? 'Validé' : 
                    doc.status === 'REJETE' ? 'Rejeté' : 'En cours',
            icon: getDocumentIcon(doc.documentType),
            fileType: doc.fileType,
            onClick: () => handlePreviewDocument(doc.id, getDocumentDisplayName(doc.documentType, doc.fileName), doc.fileType)
          }))
        });
      }
      
      if (fiscaliteDocs.length > 0) {
        result.push({
          section: "Fiscalité & Finance",
          docs: fiscaliteDocs.map(doc => ({
            id: doc.id,
            name: getDocumentDisplayName(doc.documentType, doc.fileName),
            status: doc.status === 'VALIDE' ? 'Validé' : 
                    doc.status === 'REJETE' ? 'Rejeté' : 'En cours',
            icon: getDocumentIcon(doc.documentType),
            fileType: doc.fileType,
            onClick: () => handlePreviewDocument(doc.id, getDocumentDisplayName(doc.documentType, doc.fileName), doc.fileType)
          }))
        });
      }
      
      return result.length > 0 ? result : mockFullDossierData;
    }
    
    return mockFullDossierData;
  };

  const mockFullDossierData = [
    { section: "Identité", docs: [
      { name: "Registre du commerce", status: "En cours", icon: "fa-building", onClick: () => alert("Document mock - pas de prévisualisation") },
      { name: "Traduction du registre", status: "En cours", icon: "fa-language", onClick: () => alert("Document mock - pas de prévisualisation") },
      { name: "Légalisation registre", status: "En cours", icon: "fa-stamp", onClick: () => alert("Document mock - pas de prévisualisation") },
      { name: "Statuts de la société", status: "En cours", icon: "fa-file-contract", onClick: () => alert("Document mock - pas de prévisualisation") },
      { name: "Traduction des statuts", status: "En cours", icon: "fa-language", onClick: () => alert("Document mock - pas de prévisualisation") },
      { name: "Passeport du gérant", status: "En cours", icon: "fa-passport", onClick: () => alert("Document mock - pas de prévisualisation") },
      { name: "PV de désignation", status: "En cours", icon: "fa-file-signature", onClick: () => alert("Document mock - pas de prévisualisation") }
    ]},
    { section: "Fiscalité & Finance", docs: [
      { name: "Attestation fiscale", status: "En cours", icon: "fa-file-invoice-dollar", onClick: () => alert("Document mock - pas de prévisualisation") },
      { name: "Certificat de solvabilité", status: "En cours", icon: "fa-university", onClick: () => alert("Document mock - pas de prévisualisation") },
      { name: "Comptes annuels", status: "En cours", icon: "fa-chart-pie", onClick: () => alert("Document mock - pas de prévisualisation") },
      { name: "Rapport d'audit externe", status: "En cours", icon: "fa-chart-line", onClick: () => alert("Document mock - pas de prévisualisation") }
    ]}
  ];

  if (!user) return null;

  // ========== MISE À JOUR DU PROFIL ==========
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:8080/api/auth/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          companyName: formData.companyName,
          phone: formData.phone,
          address: formData.address,
          country: formData.country,
          city: formData.city,
          tinNumber: formData.tinNumber,
          website: formData.website,
          legalRep: formData.legalRep
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de la mise à jour');
      }

      // Mettre à jour le contexte utilisateur
      updateUser({
        ...user,
        companyName: formData.companyName,
        raisonSociale: formData.companyName,
        telephone: formData.phone,
        phone: formData.phone,
        address: formData.address,
        adresseLegale: formData.address,
        country: formData.country,
        paysOrigine: formData.country,
        city: formData.city,
        ville: formData.city,
        tinNumber: formData.tinNumber,
        numeroRegistreCommerce: formData.tinNumber,
        website: formData.website,
        siteWeb: formData.website,
        legalRep: formData.legalRep,
        representantLegal: formData.legalRep
      });

      setSuccessMessage('Profil mis à jour avec succès');
      setIsEditing(false);
      
      setTimeout(() => setSuccessMessage(''), 3000);
      
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la mise à jour');
    } finally {
      setIsLoading(false);
    }
  };

  // ========== DEMANDE DE DÉSACTIVATION ==========
  const handleDeactivationRequest = async () => {
    if (!deactivationReason.trim()) {
      setError('Veuillez indiquer une raison pour la désactivation');
      return;
    }

    setIsLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:8080/api/auth/deactivation-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          reason: deactivationReason,
          urgent: isUrgent
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de la demande de désactivation');
      }

      setDeactivationRequested(true);
      setSuccessMessage('Demande de désactivation envoyée avec succès. Un administrateur va traiter votre demande.');
      setIsDeactivating(false);
      setDeactivationReason('');
      setIsUrgent(false);
      
      setTimeout(() => setSuccessMessage(''), 5000);
      
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la demande de désactivation');
    } finally {
      setIsLoading(false);
    }
  };

  // ========== ANNULATION DE LA DEMANDE ==========
  const cancelDeactivation = () => {
    setIsDeactivating(false);
    setDeactivationReason('');
    setIsUrgent(false);
    setError('');
  };

  const toggle2FA = () => {
    const newState = !user.twoFactorEnabled;
    updateUser({ isTwoFactorEnabled: newState });
    localStorage.setItem(`2fa_${user.email}`, newState.toString());
    
    fetch(`http://localhost:8080/api/auth/2fa/enable/${user.email}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    }).catch(err => console.error('Erreur 2FA:', err));
  };

  const getRemainingDays = () => {
    if (!user?.dateCreation) return 15;
    const start = new Date(user.dateCreation).getTime();
    const now = new Date().getTime();
    const diff = Math.ceil((start + 15 * 24 * 60 * 60 * 1000 - now) / (1000 * 60 * 60 * 24));
    return Math.max(0, diff);
  };

  const roleColors = {
    EXPORTATEUR: 'bg-tunisia-red',
    IMPORTATEUR: 'bg-emerald-600',
    VALIDATOR: 'bg-blue-600',
    ADMIN: 'bg-slate-900',
    exporter: 'bg-tunisia-red',
    importer: 'bg-emerald-600',
    validator: 'bg-blue-600',
    admin: 'bg-slate-900'
  };

  const userStatusBadge = () => {
    if (user.role === 'EXPORTATEUR' || user.role === 'exporter') {
      const status = user.statut || user.status;
      return (
        <span className={`px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${
          status === 'ACTIF' || status === 'VERIFIED' ? 'bg-green-50 text-green-600 border-green-200' : 
          status === 'INACTIF' || status === 'PENDING_VERIFICATION' ? 'bg-amber-50 text-amber-600 border-amber-200' :
          'bg-red-50 text-red-600 border-red-200'
        }`}>
          {status || 'EN ATTENTE'}
        </span>
      );
    }
    return (
      <span className="px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-slate-50 text-slate-600 border border-slate-200">
        Agent Officiel
      </span>
    );
  };

  const isPaymentPending = false;
  const isVerifiedExporter = (user.role === 'EXPORTATEUR' || user.role === 'exporter') && 
                            (user.statut === 'ACTIF' || user.emailVerified === true);
  const remainingDays = getRemainingDays();

  // Mock Data pour le certificat (à remplacer par les vraies données)
  const certData = {
    enTete: "RÉPUBLIQUE TUNISIENNE - MINISTÈRE DU COMMERCE",
    titre: "CERTIFICAT D'ENREGISTREMENT D'EXPORTATEUR ÉTRANGER",
    infos: {
      numeroCertificat: user.numeroAgrement || demandeInfo?.reference || "CERT-NEE-2024-001234",
      nee: user.numeroAgrement || demandeInfo?.reference || "NEE-TUN-2024-05789-XD",
      societe: user.companyName || user.raisonSociale || "ABC Electronics GmbH",
      pays: user.country || user.paysOrigine || "Allemagne",
      representant: user.legalRep || user.representantLegal || "Hans Müller",
      dateEmission: user.dateAgrement || "15/03/2024",
      dateExpiration: "14/03/2027",
      qrCode: "https://verify.gov.tn/nee/NEE-TUN-2024-05789-XD"
    },
    signature: "Signature numérique Ministère du Commerce",
    cachet: "Cachet électronique officiel"
  };

  const handleDownloadCert = () => {
    alert("Téléchargement du certificat PDF haute résolution en cours...");
  };

  const getRoleColor = () => {
    const role = user.role?.toUpperCase() || 'EXPORTATEUR';
    return roleColors[role] || roleColors['EXPORTATEUR'];
  };

  // Obtenir les documents à afficher
  const displayDocuments = getDisplayDocuments();
  const fullDossierData = getFullDossierData();

  return (
    <div className="max-w-5xl mx-auto py-8">
      {/* Messages de notification */}
      {error && (
        <div className="fixed top-20 right-8 z-50 bg-red-50 border border-red-200 text-red-600 px-6 py-4 rounded-2xl shadow-xl animate-fade-in-scale flex items-center gap-3">
          <i className="fas fa-exclamation-circle"></i>
          <span className="text-sm font-bold">{error}</span>
          <button onClick={() => setError('')} className="ml-4 text-red-400 hover:text-red-600">
            <i className="fas fa-times"></i>
          </button>
        </div>
      )}

      {successMessage && (
        <div className="fixed top-20 right-8 z-50 bg-green-50 border border-green-200 text-green-600 px-6 py-4 rounded-2xl shadow-xl animate-fade-in-scale flex items-center gap-3">
          <i className="fas fa-check-circle"></i>
          <span className="text-sm font-bold">{successMessage}</span>
          <button onClick={() => setSuccessMessage('')} className="ml-4 text-green-400 hover:text-green-600">
            <i className="fas fa-times"></i>
          </button>
        </div>
      )}

      {/* MODAL CERTIFICAT NEE */}
      {showCertificate && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-xl" onClick={() => setShowCertificate(false)}></div>
          <div className="relative bg-white w-full max-w-4xl rounded-[3rem] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.3)] overflow-hidden animate-fade-in-scale">
            
            <div className="p-10 bg-white border-[12px] border-double border-slate-50 m-3 rounded-[2rem] relative shadow-inner">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.02] pointer-events-none">
                <img src="https://upload.wikimedia.org/wikipedia/commons/c/ce/Coat_of_arms_of_Tunisia.svg" alt="Tunisia Arms" className="w-[450px]" />
              </div>
              
              <div className="text-center mb-8 relative z-10">
                <div className="flex flex-col items-center mb-2">
                   <img src="https://upload.wikimedia.org/wikipedia/commons/c/ce/Coat_of_arms_of_Tunisia.svg" alt="Arms" className="w-10 grayscale mb-2 opacity-60" />
                   <h4 className="text-[8px] font-black uppercase tracking-[0.3em] text-slate-400">{certData.enTete}</h4>
                   <div className="flex items-center gap-3 w-full justify-center mt-4">
                      <div className="h-[1px] flex-grow max-w-[80px] bg-slate-200"></div>
                      <h3 className="text-xl font-black italic tracking-tighter uppercase text-slate-900 py-1.5 px-6 border-x-2 border-slate-900">
                        {certData.titre}
                      </h3>
                      <div className="h-[1px] flex-grow max-w-[80px] bg-slate-200"></div>
                   </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-10 text-[11px] relative z-10 mb-8">
                <div className="space-y-6">
                  <div className="pb-3 border-b border-slate-100">
                    <h5 className="text-[7px] font-black uppercase tracking-[0.2em] text-tunisia-red mb-3">Identité Bénéficiaire</h5>
                    <div className="space-y-3">
                       <div>
                         <span className="block text-[7px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Dénomination Sociale</span>
                         <span className="text-base font-black text-slate-900 leading-none block">{certData.infos.societe}</span>
                       </div>
                       <div className="grid grid-cols-2 gap-2">
                         <div>
                           <span className="block text-[7px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Pays</span>
                           <span className="font-bold text-slate-800">{certData.infos.pays}</span>
                         </div>
                         <div>
                           <span className="block text-[7px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Représentant</span>
                           <span className="font-bold text-slate-800">{certData.infos.representant}</span>
                         </div>
                       </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="bg-slate-50 p-5 rounded-[1.5rem] border border-slate-100 shadow-inner text-center">
                    <h5 className="text-[7px] font-black uppercase tracking-[0.2em] text-slate-400 mb-4">Données Réglementaires</h5>
                    <div className="space-y-1">
                       <span className="block text-[6px] font-bold text-slate-400 uppercase tracking-widest">Identifiant NEE</span>
                       <span className="font-black text-tunisia-red text-xl italic tracking-tighter block leading-none py-1.5">{certData.infos.nee}</span>
                    </div>
                    <div className="mt-6 pt-4 border-t border-slate-200/50 flex flex-col gap-3">
                      <div className="flex justify-between items-center px-2">
                        <span className="text-[7px] font-black uppercase text-slate-400">Émission</span>
                        <span className="font-bold text-slate-800">{certData.infos.dateEmission}</span>
                      </div>
                      <div className="flex justify-between items-center px-2">
                        <span className="text-[7px] font-black uppercase text-slate-400">Expiration</span>
                        <span className="font-bold text-slate-800">{certData.infos.dateExpiration}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col justify-between items-center">
                   <div className="w-full h-full flex flex-col items-center justify-center border-l border-slate-100 pl-10">
                      <div className="w-24 h-24 bg-white border border-slate-50 rounded-2xl flex items-center justify-center p-3 mb-3 shadow-lg shadow-slate-100/50">
                        <i className="fas fa-qrcode text-5xl opacity-[0.05]"></i>
                      </div>
                      <div className="text-center space-y-1">
                        <span className="block text-[7px] font-black uppercase text-slate-400 tracking-[0.2em]">Code Certification</span>
                        <span className="text-[9px] font-mono font-bold text-slate-900 bg-slate-50 px-3 py-0.5 rounded-full border border-slate-100">{certData.infos.numeroCertificat}</span>
                      </div>
                   </div>
                </div>
              </div>

              <div className="mt-8 flex justify-between items-end border-t border-slate-200 pt-6 relative z-10">
                <div className="flex items-center gap-4">
                   <div className="w-10 h-10 rounded-2xl bg-slate-50 flex items-center justify-center border border-slate-100">
                      <i className="fas fa-fingerprint text-slate-200 text-xl"></i>
                   </div>
                   <div className="space-y-0.5">
                     <p className="text-[8px] text-slate-400 font-black uppercase tracking-[0.1em] max-w-[220px] leading-relaxed">
                       Certifié dématérialisé. Vérifiable sur verify.gov.tn
                     </p>
                   </div>
                </div>
                
                <div className="text-right">
                  <div className="italic text-[9px] font-black text-slate-300 mb-4 uppercase tracking-widest">{certData.signature}</div>
                  <div className="flex items-center gap-3 justify-end">
                    <div className="flex items-center justify-center w-12 h-12 rounded-full border border-slate-100">
                       <i className="fas fa-stamp text-slate-200"></i>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="px-12 pb-10 flex gap-4">
               <button 
                 onClick={handleDownloadCert}
                 className="flex-[2] py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-[0.15em] text-[10px] shadow-xl hover:bg-black transition-all flex items-center justify-center gap-3 active:scale-[0.98]"
               >
                 <i className="fas fa-file-pdf text-red-500"></i> Enregistrer (PDF)
               </button>
               <button 
                 onClick={() => setShowCertificate(false)}
                 className="flex-1 py-4 bg-white border border-slate-100 text-slate-400 rounded-2xl font-black uppercase tracking-[0.15em] text-[10px] hover:text-slate-900 transition-all"
               >
                 Fermer
               </button>
            </div>
          </div>
        </div>
      )}

      {/* ALERTE PAIEMENT PERSISTANTE */}
      {isPaymentPending && (
        <div className="bg-slate-900 text-white p-6 rounded-[2.5rem] shadow-2xl mb-10 flex items-center justify-between border-4 border-tunisia-red/20 animate-fade-in-scale">
           <div className="flex items-center gap-6">
              <div className="w-16 h-16 bg-tunisia-red rounded-2xl flex items-center justify-center text-3xl font-black italic shadow-lg shadow-red-500/20">
                {remainingDays}
              </div>
              <div className="flex flex-col">
                <p className="text-sm font-black uppercase italic tracking-tighter">Action administrative requise</p>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Régularisation des frais (500 DT) sous {remainingDays} jours.</p>
              </div>
           </div>
           <i className="fas fa-exclamation-triangle text-tunisia-red text-2xl animate-pulse"></i>
        </div>
      )}

      {/* Header Profil */}
      <div className="bg-white rounded-[3rem] shadow-2xl overflow-hidden border border-slate-100 mb-8 animate-fade-in-scale">
        <div className={`h-40 ${getRoleColor()} relative`}>
          <div className="absolute inset-0 opacity-10 flex flex-wrap gap-4 p-4 overflow-hidden">
             {[...Array(20)].map((_, i) => (
               <i key={i} className={`fas fa-globe text-6xl transform rotate-${i * 15}`}></i>
             ))}
          </div>
        </div>
        <div className="px-12 pb-12 relative">
          <div className="flex flex-col md:flex-row md:items-end -mt-16 gap-6">
            <div className="w-32 h-32 rounded-[2.5rem] bg-white p-2 shadow-2xl relative border border-slate-50">
              <img 
                src={`https://ui-avatars.com/api/?name=${user.companyName || user.raisonSociale || user.email}&background=random&size=200`} 
                alt="Avatar" 
                className="w-full h-full rounded-[2.2rem] object-cover"
              />
              <div className="absolute bottom-1 right-1 w-8 h-8 bg-green-500 border-4 border-white rounded-full"></div>
            </div>
            <div className="flex-grow">
              <div className="flex items-center gap-4 mb-1">
                <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic">
                  {user.companyName || user.raisonSociale || user.email.split('@')[0]}
                </h1>
                {userStatusBadge()}
              </div>
              <p className="text-slate-400 font-bold uppercase text-xs tracking-widest">{user.email}</p>
            </div>
            <div className="flex gap-4">
              <button 
                onClick={() => setIsEditing(!isEditing)}
                disabled={isLoading}
                className="bg-slate-50 hover:bg-slate-100 text-slate-600 px-6 py-3 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all border border-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isEditing ? "Annuler" : "Modifier le profil"}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="space-y-8">
           {isVerifiedExporter && (
              <div className="bg-emerald-600 text-white p-8 rounded-[2.5rem] shadow-xl relative overflow-hidden group">
                 <div className="absolute -top-10 -right-10 opacity-10 group-hover:scale-110 transition-transform">
                    <i className="fas fa-award text-9xl"></i>
                 </div>
                 <h3 className="text-[10px] font-black uppercase tracking-widest text-emerald-100 mb-6">Document Agréé</h3>
                 <div className="space-y-2 mb-8">
                    <span className="block text-2xl font-black italic tracking-tighter uppercase leading-none">Certificat NEE</span>
                    <span className="block text-[10px] font-bold text-emerald-50">Valide jusqu'en Mars 2027</span>
                 </div>
                 <button 
                   onClick={() => setShowCertificate(true)}
                   className="w-full py-4 bg-white text-emerald-600 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg hover:bg-emerald-50 transition-all flex items-center justify-center gap-2"
                 >
                   <i className="fas fa-eye"></i> Voir le certificat
                 </button>
              </div>
           )}

           <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Sécurité & Compte</h3>
              <div className="space-y-4">
                 <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                    <div className="flex items-center gap-3">
                       <i className="fas fa-key text-slate-400"></i>
                       <span className="text-sm font-bold text-slate-700">Mot de passe</span>
                    </div>
                    <button 
                      onClick={() => setIsChangingPassword(true)}
                      className="text-[10px] font-black text-tunisia-red uppercase tracking-widest hover:underline"
                    >
                      Modifier
                    </button>
                 </div>
                 
                 <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                    <div className="flex items-center gap-3">
                       <i className="fas fa-shield-alt text-slate-400"></i>
                       <span className="text-sm font-bold text-slate-700">Connexion 2FA</span>
                    </div>
                    <button 
                      onClick={toggle2FA}
                      disabled={isLoading}
                      className={`text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg transition-all ${
                        user.twoFactorEnabled 
                        ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200' 
                        : 'bg-slate-200 text-slate-500'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      {user.twoFactorEnabled ? 'Activé' : 'Désactivé'}
                    </button>
                 </div>

                 <div className="pt-4 border-t border-slate-50">
                    {deactivationRequested ? (
                      <div className="text-center py-4 bg-green-50 rounded-xl border border-green-100">
                        <div className="flex items-center justify-center gap-2 text-green-600 mb-1">
                          <i className="fas fa-check-circle"></i>
                          <span className="text-xs font-black uppercase tracking-widest">
                            Demande envoyée
                          </span>
                        </div>
                        <p className="text-[8px] text-green-500">
                          En attente de traitement par l'administrateur
                        </p>
                      </div>
                    ) : (
                      !isDeactivating ? (
                        <button 
                          onClick={() => setIsDeactivating(true)}
                          disabled={isLoading}
                          className="w-full py-3 bg-red-50 text-red-600 rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-red-100 transition-all border border-red-100 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Désactiver le compte
                        </button>
                      ) : (
                        <div className="space-y-4 animate-fade-in-scale">
                          <div className="space-y-2">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">
                              Raison de la désactivation
                            </label>
                            <textarea 
                              value={deactivationReason}
                              onChange={(e) => setDeactivationReason(e.target.value)}
                              placeholder="Veuillez indiquer la raison..."
                              disabled={isLoading}
                              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-xs font-bold bg-slate-50 focus:border-red-500 transition-all outline-none min-h-[80px] resize-none disabled:opacity-50 disabled:cursor-not-allowed"
                            />
                          </div>

                          <div className="flex items-center gap-2 px-1">
                          <input 
                            type="checkbox" 
                            id="urgent-deactivation"
                            checked={isUrgent}
                            onChange={(e) => setIsUrgent(e.target.checked)}
                            className="w-4 h-4 rounded border-slate-300 text-tunisia-red focus:ring-tunisia-red"
                          />
                          <label htmlFor="urgent-deactivation" className="text-[10px] font-bold text-slate-600 uppercase tracking-wide cursor-pointer">
                            Marquer comme urgent
                          </label>
                        </div>

                          <div className="flex gap-2">
                            <button 
                              onClick={handleDeactivationRequest}
                              disabled={isLoading || !deactivationReason.trim()}
                              className="flex-1 py-2.5 bg-red-600 text-white rounded-xl font-black uppercase tracking-widest text-[9px] shadow-lg shadow-red-200 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-red-700 transition-all"
                            >
                              {isLoading ? (
                                <i className="fas fa-spinner fa-spin"></i>
                              ) : (
                                'Confirmer'
                              )}
                            </button>
                            <button 
                              onClick={cancelDeactivation}
                              disabled={isLoading}
                              className="flex-1 py-2.5 bg-slate-100 text-slate-500 rounded-xl font-black uppercase tracking-widest text-[9px] disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-200 transition-all"
                            >
                              Annuler
                            </button>
                          </div>

                          <p className="text-[8px] text-slate-400 text-center">
                            Une fois confirmée, votre demande sera traitée par un administrateur.
                          </p>
                        </div>
                      )
                    )}
                 </div>
              </div>
           </div>
        </div>

        <div className="lg:col-span-2">
          <div className="bg-white p-10 rounded-[3rem] shadow-xl border border-slate-100">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-8 pb-4 border-b border-slate-50">
              {isEditing ? 'Modifier les informations' : 'Informations Générales'}
            </h3>
            
            {isEditing ? (
              <form onSubmit={handleSave} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                      {t('company_name')}
                    </label>
                    <input 
                      type="text" 
                      value={formData.companyName} 
                      onChange={(e) => setFormData({...formData, companyName: e.target.value})}
                      disabled={isLoading}
                      className="w-full px-5 py-4 rounded-2xl border-2 border-slate-50 font-bold bg-slate-50/50 focus:border-tunisia-red transition-all outline-none disabled:opacity-50 disabled:cursor-not-allowed" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                      {t('phone_number')}
                    </label>
                    <input 
                      type="tel" 
                      value={formData.phone} 
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                      disabled={isLoading}
                      className="w-full px-5 py-4 rounded-2xl border-2 border-slate-50 font-bold bg-slate-50/50 focus:border-tunisia-red transition-all outline-none disabled:opacity-50 disabled:cursor-not-allowed" 
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                    Adresse
                  </label>
                  <input 
                    type="text" 
                    value={formData.address} 
                    onChange={(e) => setFormData({...formData, address: e.target.value})}
                    disabled={isLoading}
                    className="w-full px-5 py-4 rounded-2xl border-2 border-slate-50 font-bold bg-slate-50/50 focus:border-tunisia-red transition-all outline-none disabled:opacity-50 disabled:cursor-not-allowed" 
                  />
                </div>

                {(user.role === 'EXPORTATEUR' || user.role === 'exporter') && (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                          Pays
                        </label>
                        <input 
                          type="text" 
                          value={formData.country} 
                          onChange={(e) => setFormData({...formData, country: e.target.value})}
                          disabled={isLoading}
                          className="w-full px-5 py-4 rounded-2xl border-2 border-slate-50 font-bold bg-slate-50/50 focus:border-tunisia-red transition-all outline-none disabled:opacity-50 disabled:cursor-not-allowed" 
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                          Ville
                        </label>
                        <input 
                          type="text" 
                          value={formData.city} 
                          onChange={(e) => setFormData({...formData, city: e.target.value})}
                          disabled={isLoading}
                          className="w-full px-5 py-4 rounded-2xl border-2 border-slate-50 font-bold bg-slate-50/50 focus:border-tunisia-red transition-all outline-none disabled:opacity-50 disabled:cursor-not-allowed" 
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                          N° Registre de Commerce
                        </label>
                        <input 
                          type="text" 
                          value={formData.tinNumber} 
                          onChange={(e) => setFormData({...formData, tinNumber: e.target.value})}
                          disabled={isLoading}
                          className="w-full px-5 py-4 rounded-2xl border-2 border-slate-50 font-bold bg-slate-50/50 focus:border-tunisia-red transition-all outline-none disabled:opacity-50 disabled:cursor-not-allowed" 
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                          Site Web
                        </label>
                        <input 
                          type="url" 
                          value={formData.website} 
                          onChange={(e) => setFormData({...formData, website: e.target.value})}
                          disabled={isLoading}
                          className="w-full px-5 py-4 rounded-2xl border-2 border-slate-50 font-bold bg-slate-50/50 focus:border-tunisia-red transition-all outline-none disabled:opacity-50 disabled:cursor-not-allowed" 
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                        Représentant Légal
                      </label>
                      <input 
                        type="text" 
                        value={formData.legalRep} 
                        onChange={(e) => setFormData({...formData, legalRep: e.target.value})}
                        disabled={isLoading}
                        className="w-full px-5 py-4 rounded-2xl border-2 border-slate-50 font-bold bg-slate-50/50 focus:border-tunisia-red transition-all outline-none disabled:opacity-50 disabled:cursor-not-allowed" 
                      />
                    </div>
                  </>
                )}

                <button 
                  type="submit" 
                  disabled={isLoading}
                  className="w-full py-5 bg-tunisia-red text-white rounded-2xl font-black uppercase tracking-widest shadow-xl hover:bg-red-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <i className="fas fa-spinner fa-spin"></i>
                      <span>Sauvegarde en cours...</span>
                    </>
                  ) : (
                    'Sauvegarder'
                  )}
                </button>
              </form>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-y-10 gap-x-12">
                <div>
                  <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-2">
                    {t('company_name')}
                  </span>
                  <span className="text-lg font-black text-slate-800">
                    {user.companyName || user.raisonSociale || 'Non défini'}
                  </span>
                </div>
                <div>
                  <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-2">
                    {t('phone_number')}
                  </span>
                  <span className="text-lg font-black text-slate-800">
                    {user.telephone || user.phone || '+216 -- --- ---'}
                  </span>
                </div>
                
                {(user.role === 'EXPORTATEUR' || user.role === 'exporter') && (
                  <>
                    <div>
                      <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-2">
                        {t('tin_number')}
                      </span>
                      <span className="text-lg font-black text-slate-800 tracking-tighter">
                        {user.tinNumber || user.numeroRegistreCommerce || 'Non défini'}
                      </span>
                    </div>
                    <div>
                      <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-2">
                        {t('country')}
                      </span>
                      <span className="text-lg font-black text-slate-800">
                        {user.country || user.paysOrigine || 'Non défini'}
                      </span>
                    </div>
                    <div>
                      <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-2">
                        Ville
                      </span>
                      <span className="text-lg font-black text-slate-800">
                        {user.city || user.ville || 'Non défini'}
                      </span>
                    </div>
                    <div>
                      <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-2">
                        Site Web
                      </span>
                      <span className="text-lg font-black text-slate-800">
                        {user.website || user.siteWeb || 'Non défini'}
                      </span>
                    </div>
                    <div className="md:col-span-2">
                      <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-2">
                        Représentant Légal
                      </span>
                      <span className="text-lg font-black text-slate-800">
                        {user.legalRep || user.representantLegal || 'Non défini'}
                      </span>
                    </div>
                  </>
                )}

                <div className="md:col-span-2 pt-6 border-t border-slate-50">
                   <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-2">
                     Adresse du siège
                   </span>
                   <span className="text-sm font-bold text-slate-600 italic">
                     {formData.address || user.address || user.adresseLegale || 'Non défini'}
                   </span>
                </div>
              </div>
            )}
          </div>

          {/* DOSSIER DE CONFORMITÉ - AVEC DONNÉES RÉELLES */}
          {(user.role === 'EXPORTATEUR' || user.role === 'exporter') && (
            <div className="mt-8 bg-white p-10 rounded-[3rem] shadow-xl border border-slate-100">
              <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-50">
                <div className="flex items-center gap-3">
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Dossier de Conformité
                  </h3>
                  {loadingDossier && (
                    <i className="fas fa-spinner fa-spin text-slate-300 text-xs"></i>
                  )}
                </div>
                {demandeInfo && (
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 bg-slate-50 text-slate-400 text-[8px] font-black uppercase rounded-full border border-slate-100">
                      {demandeInfo.reference}
                    </span>
                    <span className={`px-3 py-1 text-[8px] font-black uppercase rounded-full ${
                      demandeInfo.status === 'VALIDEE' ? 'bg-emerald-50 text-emerald-600' :
                      demandeInfo.status === 'SOUMISE' || demandeInfo.status === 'EN_COURS_VALIDATION' ? 'bg-blue-50 text-blue-600' :
                      'bg-amber-50 text-amber-600'
                    }`}>
                      {demandeInfo.status === 'VALIDEE' ? 'Validé' :
                       demandeInfo.status === 'SOUMISE' ? 'Soumis' :
                       demandeInfo.status === 'EN_COURS_VALIDATION' ? 'En cours' :
                       demandeInfo.status === 'EN_ATTENTE_INFO' ? 'Info requise' :
                       demandeInfo.status || 'Brouillon'}
                    </span>
                  </div>
                )}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {displayDocuments.map((doc, i) => (
                  <div 
                    key={i} 
                    onClick={() => doc.id && handlePreviewDocument(doc.id, doc.fileName, doc.fileType)}
                    className={`flex items-center justify-between p-4 bg-slate-50/50 rounded-2xl border border-slate-50 hover:border-slate-200 transition-all group ${doc.id ? 'cursor-pointer' : 'cursor-default'}`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm border border-slate-100 group-hover:scale-110 transition-transform">
                        <i className={`fas ${doc.icon} text-slate-400`}></i>
                      </div>
                      <div>
                        <p className="text-xs font-black text-slate-800 uppercase tracking-tight">{doc.name}</p>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Mis à jour le {doc.date}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-md ${
                        doc.status === 'Validé' ? 'text-emerald-600 bg-emerald-50' : 
                        doc.status === 'Rejeté' ? 'text-red-600 bg-red-50' :
                        'text-amber-600 bg-amber-50'
                      }`}>
                        {doc.status}
                      </span>
                      {doc.id && (
                        <div className="mt-1 text-[8px] text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">
                          <i className="fas fa-eye mr-1"></i> Cliquer pour voir
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              
              <div 
                onClick={() => setShowFullDossier(true)} 
                className="mt-8 p-6 bg-slate-900 rounded-[2rem] flex items-center justify-between group cursor-pointer overflow-hidden relative"
              >
                <div className="absolute inset-0 bg-tunisia-red translate-x-[-100%] group-hover:translate-x-0 transition-transform duration-500 opacity-10"></div>
                <div className="flex items-center gap-4 relative z-10">
                  <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center border border-white/10">
                    <i className="fas fa-folder-open text-white"></i>
                  </div>
                  <div>
                    <p className="text-sm font-black text-white uppercase italic tracking-tighter">Accéder au dossier complet</p>
                    <p className="text-[9px] font-bold text-white/40 uppercase tracking-widest">Gérer vos documents et certifications</p>
                  </div>
                </div>
                <i className="fas fa-chevron-right text-white/20 group-hover:text-white transition-colors relative z-10"></i>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* MODAL DOSSIER COMPLET */}
      {showFullDossier && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-xl" onClick={() => setShowFullDossier(false)}></div>
          <div className="relative bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden animate-fade-in-scale">
            <div className="p-10">
              <div className="flex justify-between items-center mb-10 pb-6 border-b border-slate-50">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center text-xl shadow-lg">
                    <i className="fas fa-folder-open"></i>
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-900 uppercase italic tracking-tighter">Dossier de Conformité Complet</h3>
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                      {demandeInfo?.reference || 'NEE-TUN-2024-05789-XD'}
                    </p>
                  </div>
                </div>
                <button onClick={() => setShowFullDossier(false)} className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:text-tunisia-red transition-colors">
                  <i className="fas fa-times"></i>
                </button>
              </div>

              <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
                {fullDossierData.map((group, i) => (
                  <div key={i} className="space-y-3">
                    <h4 className="text-[8px] font-black uppercase tracking-[0.3em] text-slate-300 ml-2">{group.section}</h4>
                    <div className="grid grid-cols-1 gap-2">
                      {group.docs.map((doc, j) => (
                        <div 
                          key={j} 
                          onClick={doc.onClick || (() => {})}
                          className={`flex items-center justify-between p-4 bg-slate-50/50 rounded-2xl border border-slate-50 hover:border-slate-200 transition-all ${doc.onClick ? 'cursor-pointer' : 'cursor-default'}`}
                        >
                          <div className="flex items-center gap-3">
                            <i className={`fas ${doc.icon} text-slate-400 w-5 text-center`}></i>
                            <span className="text-xs font-bold text-slate-700">{doc.name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`text-[7px] font-black uppercase tracking-widest px-2 py-1 rounded-md ${
                              doc.status === 'Validé' ? 'text-emerald-600 bg-emerald-50' : 'text-amber-600 bg-amber-50'
                            }`}>
                              {doc.status}
                            </span>
                            {doc.onClick && (
                              <i className="fas fa-eye text-slate-300 text-[10px] opacity-0 group-hover:opacity-100 transition-opacity"></i>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-10 pt-8 border-t border-slate-50 flex gap-4">
                <button 
                  onClick={() => {
                    setShowFullDossier(false);
                    navigate('/exporter');
                  }}
                  className="flex-1 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl hover:bg-black transition-all flex items-center justify-center gap-2"
                >
                  <i className="fas fa-external-link-alt"></i> Espace Gestion
                </button>
                <button 
                  onClick={() => setShowFullDossier(false)}
                  className="flex-1 py-4 bg-slate-50 text-slate-400 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:text-slate-900 transition-all border border-slate-100"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL PREVIEW DOCUMENT */}
      {previewDoc && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/95 backdrop-blur-sm" onClick={() => setPreviewDoc(null)}></div>
          <div className="relative bg-white w-full max-w-4xl h-[85vh] rounded-[3rem] shadow-2xl overflow-hidden animate-fade-in-scale flex flex-col">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400">
                  <i className={`fas ${previewDoc.type === 'pdf' ? 'fa-file-pdf text-red-500' : 'fa-file-image text-blue-500'}`}></i>
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 uppercase italic tracking-tighter">{previewDoc.name}</h3>
                  <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">Aperçu du document officiel</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => window.open(previewDoc.url, '_blank')}
                  className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:text-slate-900 transition-all"
                  title="Ouvrir dans un nouvel onglet"
                >
                  <i className="fas fa-external-link-alt text-xs"></i>
                </button>
                <button 
                  onClick={() => {
                    if (previewDoc?.url && previewDoc.url.startsWith('blob:')) {
                      URL.revokeObjectURL(previewDoc.url);
                    }
                    setPreviewDoc(null);
                  }} 
                  className="w-10 h-10 rounded-full bg-slate-900 text-white flex items-center justify-center hover:bg-black transition-all"
                >
                  <i className="fas fa-times"></i>
                </button>
              </div>
            </div>
            
            <div className="flex-grow bg-slate-100 overflow-hidden relative">
              {previewDoc.type === 'pdf' ? (
                <iframe 
                  src={`${previewDoc.url}#toolbar=0`} 
                  className="w-full h-full border-none"
                  title={previewDoc.name}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center p-8 overflow-auto">
                  <img 
                    src={previewDoc.url} 
                    alt={previewDoc.name} 
                    className="max-w-full max-h-full object-contain shadow-2xl rounded-lg"
                    referrerPolicy="no-referrer"
                  />
                </div>
              )}
            </div>
            
            <div className="p-4 bg-white border-t border-slate-100 flex justify-center">
              <p className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-300">
                Document sécurisé par le Ministère du Commerce - République Tunisienne
              </p>
            </div>
          </div>
        </div>
      )}
      
      {/* MODAL CHANGEMENT DE MOT DE PASSE */}
      {isChangingPassword && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setIsChangingPassword(false)}></div>
          <div className="relative bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-fade-in-scale">
            <div className="p-10">
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-xl font-black text-slate-900 uppercase italic tracking-tighter">
                  {t('update_password_btn')}
                </h3>
                <button 
                  onClick={() => setIsChangingPassword(false)} 
                  className="text-slate-400 hover:text-tunisia-red transition-colors"
                >
                  <i className="fas fa-times"></i>
                </button>
              </div>

              <ResetPasswordForm 
                requireCurrentPassword={true}
                onSuccess={() => {
                  setSuccessMessage('Mot de passe modifié avec succès');
                  setTimeout(() => {
                    setIsChangingPassword(false);
                    setSuccessMessage('');
                  }, 2000);
                }}
                onCancel={() => setIsChangingPassword(false)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;