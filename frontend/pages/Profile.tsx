import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../App';
import ResetPasswordForm from '../components/ResetPasswordForm';
import { useNavigate } from 'react-router-dom';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { UserRole } from '@/types/User';
import { Document } from '@/types/Document';
import { DemandeEnregistrement } from '@/types/DemandeEnregistrement';
import { User } from '@/types/User';

// Liste des pays
const countries = [
  { code: 'FR', name: 'France', dial: '+33' },
  { code: 'IT', name: 'Italie', dial: '+39' },
  { code: 'TR', name: 'Turquie', dial: '+90' },
  { code: 'CN', name: 'Chine', dial: '+86' },
  { code: 'ES', name: 'Espagne', dial: '+34' },
  { code: 'DE', name: 'Allemagne', dial: '+49' },
  { code: 'US', name: 'États-Unis', dial: '+1' },
  { code: 'AE', name: 'Émirats Arabes Unis', dial: '+971' },
  { code: 'DZ', name: 'Algérie', dial: '+213' },
  { code: 'LY', name: 'Libye', dial: '+218' },
  { code: 'SA', name: 'Arabie Saoudite', dial: '+966' },
  { code: 'MA', name: 'Maroc', dial: '+212' },
  { code: 'BE', name: 'Belgique', dial: '+32' },
  { code: 'CH', name: 'Suisse', dial: '+41' },
  { code: 'UK', name: 'Royaume-Uni', dial: '+44' },
];

// Fonction pour obtenir le nom du pays à partir du code
const getCountryName = (countryCode: string | null | undefined): string => {
  if (!countryCode) return 'Non défini';
  const country = countries.find(c => c.code === countryCode);
  return country ? country.name : countryCode;
};

// Fonction pour obtenir l'URL du drapeau
const getFlagUrl = (countryCode: string): string => {
  if (!countryCode) return '';
  return `https://flagcdn.com/w160/${countryCode.toLowerCase()}.png`;
};

// Fonction pour mapper les données du backend vers l'interface User
const mapBackendUserToFrontendUser = (backendUser: any): User => {
  return {
    id: backendUser.id,
    email: backendUser.email,
    role: backendUser.role as UserRole,
    
    nom: backendUser.nom,
    prenom: backendUser.prenom,
    telephone: backendUser.telephone,
    statut: backendUser.statut,
    
    raisonSociale: backendUser.raisonSociale,
    companyName: backendUser.raisonSociale,
    paysOrigine: backendUser.paysOrigine,
    numeroRegistreCommerce: backendUser.numeroRegistreCommerce,
    adresseLegale: backendUser.adresseLegale,
    ville: backendUser.ville,
    siteWeb: backendUser.siteWeb,
    representantLegal: backendUser.representantLegal,
    numeroTVA: backendUser.numeroTVA,

    statutAgrement: backendUser.statutAgrement,
    dateAgrement: backendUser.dateAgrement,
    numeroAgrement: backendUser.numeroAgrement,
    numeroOfficielEnregistrement: backendUser.numeroOfficielEnregistrement,
    
    dateCreation: backendUser.dateCreation,
    lastLogin: backendUser.lastLogin,
    updatedAt: backendUser.updatedAt,
    
    twoFactorEnabled: backendUser.twoFactorEnabled,
    isTwoFactorEnabled: backendUser.twoFactorEnabled,
    emailVerified: backendUser.emailVerified,
    
    documentsCount: backendUser.documentsCount,
    preKycCompleted: backendUser.preKycCompleted,
    preKycCompletedAt: backendUser.preKycCompletedAt,
    
    submissionDate: backendUser.dateCreation,
    userStatut: backendUser.statut === 'ACTIF' ? 'ACTIF' : 
                backendUser.statut === 'INACTIF' ? 'INACTIF' : 'EN_ATTENTE',
    
    nomOfficiel: backendUser.nomOfficiel,
    codeMinistere: backendUser.codeMinistere,
    typeAutorite: backendUser.typeAutorite,
    slaTraitementJours: backendUser.slaTraitementJours,
    
    mobileIdMatricule: backendUser.mobileIdMatricule,
    mobileIdPin: backendUser.mobileIdPin,
    
    capaciteAnnuelle: backendUser.capaciteAnnuelle,
    produits: backendUser.produits,
    siteType: backendUser.siteType,
    representantEmail: backendUser.representantEmail,
    representantRole: backendUser.representantRole,
    username: backendUser.username,
    verificationToken: backendUser.verificationToken,
    verificationTokenExpiry: backendUser.verificationTokenExpiry,
    
  };
};

const Profile: React.FC = () => {
  const { t } = useTranslation();
  const { user, updateUser, dossierStatus } = useAuth();
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
  
  const [dossierStatusLocal, setDossierStatusLocal] = useState<any>(null);
  const [demandeInfo, setDemandeInfo] = useState<DemandeEnregistrement | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loadingDossier, setLoadingDossier] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<{ name: string, url: string, type: 'pdf' | 'image' } | null>(null);

  const [show2FASetup, setShow2FASetup] = useState(false);
  const [show2FADisable, setShow2FADisable] = useState(false);
  const [twoFactorSecret, setTwoFactorSecret] = useState('');
  const [twoFactorQrCode, setTwoFactorQrCode] = useState('');
  const [twoFactorCode, setTwoFactorCode] = useState(['', '', '', '', '', '']);

  const [loadingProfile, setLoadingProfile] = useState(false);
  
  const [hasPendingRequest, setHasPendingRequest] = useState(false);
  const [pendingRequestInfo, setPendingRequestInfo] = useState<{
    requestId: number;
    requestDate: string;
    isUrgent: boolean;
    status: string;
  } | null>(null);

  const [formData, setFormData] = useState({
    // Champs communs
    companyName: user?.companyName || user?.raisonSociale || '',
    phone: user?.telephone || '',
    address: user?.adresseLegale || '',
    city: user?.ville || '',
    legalRep: user?.representantLegal || `${user?.prenom || ''} ${user?.nom || ''}`.trim() || '',
    
    // Champs exportateur
    country: user?.paysOrigine || '',
    tinNumber: user?.numeroRegistreCommerce || '',
    website: user?.siteWeb || '',
    numeroOfficielEnregistrement: user?.numeroOfficielEnregistrement || '',
    capaciteAnnuelle: user?.capaciteAnnuelle ? String(user.capaciteAnnuelle) : '',
    siteType: user?.siteType || '',
    representantRole: user?.representantRole || '',
    numeroTVA: user?.numeroTVA || '',
    
    // Champs importateur
    nom: user?.nom || '',
    prenom: user?.prenom || ''
  });

  useEffect(() => {
    return () => {
      if (previewDoc?.url && previewDoc.url.startsWith('blob:')) {
        URL.revokeObjectURL(previewDoc.url);
      }
    };
  }, [previewDoc]);

  useEffect(() => {
    if (user && (user.role === 'EXPORTATEUR')) {
      fetchDossierStatus();
    }
  }, [user]);

  useEffect(() => {
    const fetchProfileData = async () => {
      if (!user?.email) return;
      
      setLoadingProfile(true);
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`http://localhost:8080/api/auth/profile`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        const data = await response.json();
        
        if (data.success && data.user) {
          const mappedUser = mapBackendUserToFrontendUser(data.user);
          
          setFormData({
            companyName: mappedUser.companyName || '',
            phone: mappedUser.telephone || '',
            address: mappedUser.adresseLegale || '',
            city: mappedUser.ville || '',
            legalRep: mappedUser.representantLegal || `${mappedUser.prenom || ''} ${mappedUser.nom || ''}`.trim() || '',
            country: mappedUser.paysOrigine || '',
            tinNumber: mappedUser.numeroRegistreCommerce || '',
            website: mappedUser.siteWeb || '',
            numeroOfficielEnregistrement: mappedUser.numeroOfficielEnregistrement || '',
            capaciteAnnuelle: mappedUser.capaciteAnnuelle ? String(mappedUser.capaciteAnnuelle) : '',
            siteType: mappedUser.siteType || '',
            representantRole: mappedUser.representantRole || '',
            numeroTVA: mappedUser.numeroTVA || '',
            nom: mappedUser.nom || '',
            prenom: mappedUser.prenom || ''
          });
          
          updateUser(mappedUser);
        }
      } catch (err) {
        console.error('Erreur chargement profil:', err);
      } finally {
        setLoadingProfile(false);
      }
    };
    
    fetchProfileData();
  }, [user?.email]);

  useEffect(() => {
    const check2FAStatus = async () => {
      if (user?.email && (user.role === 'EXPORTATEUR')) {
        try {
          const token = localStorage.getItem('token');
          const response = await fetch(`http://localhost:8080/api/auth/2fa/status/${user.email}`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });

          if (response.status === 400) {
            console.warn('Statut 2FA non disponible pour:', user.email);
            return;
          }
          
          const data = await response.json();
          if (data.success && data.enabled !== user.isTwoFactorEnabled) {
            updateUser({ isTwoFactorEnabled: data.enabled });
          }
        } catch (err) {
          console.error('Erreur vérification statut 2FA:', err);
        }
      }
    };
    
    check2FAStatus();
  }, [user?.email]);

  const checkDeactivationRequestStatus = async () => {
    if (!user || (user.role !== 'EXPORTATEUR')) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:8080/api/auth/deactivation-request/status', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const data = await response.json();
      
      if (data.success) {
        setHasPendingRequest(data.hasPendingRequest);
        if (data.hasPendingRequest && data.requestId) {
          setPendingRequestInfo({
            requestId: data.requestId,
            requestDate: data.requestDate,
            isUrgent: data.isUrgent,
            status: data.status
          });
          setDeactivationRequested(true);
        } else {
          setDeactivationRequested(false);
          setPendingRequestInfo(null);
        }
      }
    } catch (err) {
      console.error('Erreur lors de la vérification de la demande:', err);
    }
  };

  useEffect(() => {
    if (user && (user.role === 'EXPORTATEUR')) {
      checkDeactivationRequestStatus();
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
        const formattedDocuments = data.documents.map((doc: any, index: number) => ({
          id: doc.id || index + 1,
          fileName: doc.fileName || 'Document',
          documentType: doc.documentType || 'UNKNOWN',
          status: doc.status || 'EN_ATTENTE',
          uploadedAt: doc.uploadedAt || new Date().toISOString(),
          validatedAt: doc.validatedAt,
          fileType: doc.fileType || 'application/pdf'
        }));
        setDocuments(formattedDocuments);
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
        setDossierStatusLocal(data);
        
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
        
        let mimeType = 'application/octet-stream';
        if (fileType.toLowerCase().includes('pdf')) {
          mimeType = 'application/pdf';
        } else if (fileType.toLowerCase().includes('jpg') || fileType.toLowerCase().includes('jpeg')) {
          mimeType = 'image/jpeg';
        } else if (fileType.toLowerCase().includes('png')) {
          mimeType = 'image/png';
        }
        
        const correctBlob = new Blob([blob], { type: mimeType });
        const url = URL.createObjectURL(correctBlob);
        
        setPreviewDoc({
          name: fileName,
          url: url,
          type: fileType.toLowerCase().includes('pdf') ? 'pdf' : 'image'
        });
      } else {
        setError('Impossible de charger le document');
      }
    } catch (err) {
      console.error('Erreur prévisualisation:', err);
      setError('Erreur lors de la prévisualisation du document');
    }
  };

  const getDocumentDisplayName = (docType: string, defaultName: string): string => {
    switch(docType) {
      case 'RC_CERT':
        return 'Registre du commerce';
      case 'RC_TRANSLATION':
        return 'Traduction du registre de commerce';
      case 'RC_LEGALIZATION':
        return 'Légalisation du registre de commerce';
      case 'STATUTES':
        return 'Statuts de la société';
      case 'STATUTES_TRANSLATION':
        return 'Traduction des statuts';
      case 'TIN_CERT':
        return 'Attestation fiscale';
      case 'PASSPORT':
        return 'Passeport du gérant';
      case 'DESIGNATION_PV':
        return 'PV de désignation du gérant';
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

  const getDisplayDocuments = () => {
    if (documents.length > 0) {
      const mainDocTypes = ['RC_CERT', 'STATUTES', 'TIN_CERT', 'PASSPORT'];
      const mainDocs = documents.filter(doc => mainDocTypes.includes(doc.documentType));
      const docsToShow = mainDocs.length > 0 ? mainDocs : documents.slice(0, 4);
      
      return docsToShow.map(doc => ({
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
    
    if (dossierStatusLocal?.status === 'VALIDEE') {
      return [
        { id: 1, name: "Statuts de la société", status: "Validé", date: "12/01/2024", icon: "fa-file-contract", fileType: "pdf", fileName: "statuts.pdf" },
        { id: 2, name: "Registre du commerce", status: "Validé", date: "12/01/2024", icon: "fa-building", fileType: "pdf", fileName: "registre.pdf" },
        { id: 3, name: "Attestation fiscale", status: "Validé", date: "12/01/2024", icon: "fa-file-invoice-dollar", fileType: "pdf", fileName: "fiscale.pdf" },
        { id: 4, name: "Passeport du gérant", status: "Validé", date: "12/01/2024", icon: "fa-passport", fileType: "jpg", fileName: "passeport.jpg" }
      ];
    } else if (dossierStatusLocal?.status === 'EN_COURS_VALIDATION' || dossierStatusLocal?.status === 'SOUMISE') {
      return [
        { id: 1, name: "Statuts de la société", status: "En cours", date: "15/02/2024", icon: "fa-file-contract", fileType: "pdf", fileName: "statuts.pdf" },
        { id: 2, name: "Registre du commerce", status: "Validé", date: "12/01/2024", icon: "fa-building", fileType: "pdf", fileName: "registre.pdf" },
        { id: 3, name: "Attestation fiscale", status: "En cours", date: "15/02/2024", icon: "fa-file-invoice-dollar", fileType: "pdf", fileName: "fiscale.pdf" },
        { id: 4, name: "Passeport du gérant", status: "Validé", date: "12/01/2024", icon: "fa-passport", fileType: "jpg", fileName: "passeport.jpg" }
      ];
    } else {
      return [
        { id: 1, name: "Statuts de la société", status: "En cours", date: "15/02/2024", icon: "fa-file-contract", fileType: "pdf", fileName: "statuts.pdf" },
        { id: 2, name: "Registre du commerce", status: "En cours", date: "15/02/2024", icon: "fa-building", fileType: "pdf", fileName: "registre.pdf" },
        { id: 3, name: "Attestation fiscale", status: "En cours", date: "15/02/2024", icon: "fa-file-invoice-dollar", fileType: "pdf", fileName: "fiscale.pdf" },
        { id: 4, name: "Passeport du gérant", status: "En cours", date: "15/02/2024", icon: "fa-passport", fileType: "jpg", fileName: "passeport.jpg" }
      ];
    }
  };

  const getFullDossierData = () => {
    if (documents.length > 0) {
      const identiteDocs = documents.filter(doc => 
        ['RC_CERT', 'RC_TRANSLATION', 'RC_LEGALIZATION', 'STATUTES', 'STATUTES_TRANSLATION', 'PASSPORT', 'DESIGNATION_PV'].includes(doc.documentType)
      );
      
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
            fileName: doc.fileName,
            onClick: () => handlePreviewDocument(doc.id, doc.fileName, doc.fileType)
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
            fileName: doc.fileName,
            onClick: () => handlePreviewDocument(doc.id, doc.fileName, doc.fileType)
          }))
        });
      }
      
      return result.length > 0 ? result : mockFullDossierData;
    }
    
    return mockFullDossierData;
  };

  const mockFullDossierData = [
    { section: "Identité", docs: [
      { id: 101, name: "Registre du commerce", status: "En cours", icon: "fa-building", fileType: "pdf", fileName: "registre.pdf", onClick: () => alert("Document mock - pas de prévisualisation") },
      { id: 102, name: "Traduction du registre", status: "En cours", icon: "fa-language", fileType: "pdf", fileName: "traduction.pdf", onClick: () => alert("Document mock - pas de prévisualisation") },
      { id: 103, name: "Légalisation registre", status: "En cours", icon: "fa-stamp", fileType: "pdf", fileName: "legalisation.pdf", onClick: () => alert("Document mock - pas de prévisualisation") },
      { id: 104, name: "Statuts de la société", status: "En cours", icon: "fa-file-contract", fileType: "pdf", fileName: "statuts.pdf", onClick: () => alert("Document mock - pas de prévisualisation") },
      { id: 105, name: "Traduction des statuts", status: "En cours", icon: "fa-language", fileType: "pdf", fileName: "statuts_traduction.pdf", onClick: () => alert("Document mock - pas de prévisualisation") },
      { id: 106, name: "Passeport du gérant", status: "En cours", icon: "fa-passport", fileType: "jpg", fileName: "passeport.jpg", onClick: () => alert("Document mock - pas de prévisualisation") },
      { id: 107, name: "PV de désignation", status: "En cours", icon: "fa-file-signature", fileType: "pdf", fileName: "pv.pdf", onClick: () => alert("Document mock - pas de prévisualisation") }
    ]},
    { section: "Fiscalité & Finance", docs: [
      { id: 108, name: "Attestation fiscale", status: "En cours", icon: "fa-file-invoice-dollar", fileType: "pdf", fileName: "fiscale.pdf", onClick: () => alert("Document mock - pas de prévisualisation") },
      { id: 109, name: "Certificat de solvabilité", status: "En cours", icon: "fa-university", fileType: "pdf", fileName: "solvabilite.pdf", onClick: () => alert("Document mock - pas de prévisualisation") },
      { id: 110, name: "Comptes annuels", status: "En cours", icon: "fa-chart-pie", fileType: "pdf", fileName: "comptes.pdf", onClick: () => alert("Document mock - pas de prévisualisation") },
      { id: 111, name: "Rapport d'audit externe", status: "En cours", icon: "fa-chart-line", fileType: "pdf", fileName: "audit.pdf", onClick: () => alert("Document mock - pas de prévisualisation") }
    ]}
  ];

  if (!user) return null;

  // ========== HANDLE SAVE ==========
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      const token = localStorage.getItem('token');
      
      let requestBody: any = {
        phone: formData.phone,
        city: formData.city,
      };
      
      if (user.role === 'EXPORTATEUR') {
        requestBody = {
          ...requestBody,
          companyName: formData.companyName,
          address: formData.address,
          country: formData.country,
          tinNumber: formData.tinNumber,
          website: formData.website,
          legalRep: formData.legalRep,
          siteType: formData.siteType,
          capaciteAnnuelle: formData.capaciteAnnuelle ? parseFloat(formData.capaciteAnnuelle) : null,
          numeroOfficielEnregistrement: formData.numeroOfficielEnregistrement,
          numeroTVA: formData.numeroTVA,
          representantRole: formData.representantRole
        };
      } else if (user.role === 'IMPORTATEUR') {
        const nameParts = formData.legalRep.trim().split(/\s+/, 2);
        requestBody = {
          ...requestBody,
          companyName: formData.companyName,
          address: formData.address,
          nom: formData.nom,
        prenom: formData.prenom,
          legalRep: formData.legalRep
        };
      }

      const response = await fetch('http://localhost:8080/api/auth/update-profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(requestBody)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de la mise à jour');
      }

      if (data.user) {
        const mappedUser = mapBackendUserToFrontendUser(data.user);
        updateUser(mappedUser);
        
        if (user.role === 'EXPORTATEUR') {
          setFormData({
            ...formData,
            companyName: mappedUser.companyName || '',
            phone: mappedUser.telephone || '',
            address: mappedUser.adresseLegale || '',
            city: mappedUser.ville || '',
            legalRep: mappedUser.representantLegal || '',
            country: mappedUser.paysOrigine || '',
            tinNumber: mappedUser.numeroRegistreCommerce || '',
            website: mappedUser.siteWeb || '',
            numeroOfficielEnregistrement: mappedUser.numeroOfficielEnregistrement || '',
            capaciteAnnuelle: mappedUser.capaciteAnnuelle ? String(mappedUser.capaciteAnnuelle) : '',
            siteType: mappedUser.siteType || '',
            representantRole: mappedUser.representantRole || '',
            numeroTVA: mappedUser.numeroTVA || ''
          });
        } else if (user.role === 'IMPORTATEUR') {
          setFormData({
            ...formData,
            companyName: mappedUser.raisonSociale || '',
            phone: mappedUser.telephone || '',
            address: mappedUser.adresseLegale || '',
            city: mappedUser.ville || '',
            legalRep: `${mappedUser.prenom || ''} ${mappedUser.nom || ''}`.trim(),
            nom: mappedUser.nom || '',
            prenom: mappedUser.prenom || ''
          });
        }
      }

      setSuccessMessage('Profil mis à jour avec succès');
      setIsEditing(false);
      
      setTimeout(() => setSuccessMessage(''), 3000);
      
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la mise à jour');
    } finally {
      setIsLoading(false);
    }
  };

  // ========== FONCTIONS 2FA ==========
  const toggle2FA = async () => {
    if (isLoading) return;
    
    setIsLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      const token = localStorage.getItem('token');
      
      if (!user.isTwoFactorEnabled) {
        const setupResponse = await fetch('http://localhost:8080/api/auth/2fa/setup', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        const setupData = await setupResponse.json();

        if (!setupResponse.ok) {
          throw new Error(setupData.error || 'Erreur lors de la configuration 2FA');
        }

        if (setupData.data.alreadyEnabled) {
          updateUser({ isTwoFactorEnabled: true });
          setSuccessMessage('2FA déjà activé');
          return;
        }

        setTwoFactorSecret(setupData.data.secret);
        setTwoFactorQrCode(setupData.data.qrCodeBase64);
        setShow2FASetup(true);

      } else {
        setShow2FADisable(true);
      }
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la modification du 2FA');
    } finally {
      setIsLoading(false);
    }
  };

  const verifyAndEnable2FA = async (code: string) => {
    setIsLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      const cleanCode = code.replace(/\s/g, '');
      
      const response = await fetch('http://localhost:8080/api/auth/2fa/enable', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: user.email,
          code: cleanCode
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Code de vérification invalide');
      }

      updateUser({ isTwoFactorEnabled: true });
      localStorage.setItem(`2fa_${user.email}`, 'true');
      
      setSuccessMessage('2FA activé avec succès !');
      setShow2FASetup(false);
      setTwoFactorCode(['', '', '', '', '', '']);
      
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const verifyAndDisable2FA = async (code: string) => {
    setIsLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      
      const response = await fetch('http://localhost:8080/api/auth/2fa/disable', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: user.email,
          code: code
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Code de vérification invalide');
      }

      updateUser({ isTwoFactorEnabled: false });
      localStorage.removeItem(`2fa_${user.email}`);
      
      setSuccessMessage('2FA désactivé avec succès !');
      setShow2FADisable(false);
      setTwoFactorCode(['', '', '', '', '', '']);
      
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const reset2FACode = () => {
    setTwoFactorCode(['', '', '', '', '', '']);
  };

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
      
      await checkDeactivationRequestStatus();
      
      setTimeout(() => setSuccessMessage(''), 5000);
      
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la demande de désactivation');
    } finally {
      setIsLoading(false);
    }
  };

  const cancelDeactivation = () => {
    setIsDeactivating(false);
    setDeactivationReason('');
    setIsUrgent(false);
    setError('');
  };

  const getRemainingDays = () => {
    if (!user?.submissionDate) return 15;
    const start = new Date(user.submissionDate).getTime();
    const now = new Date().getTime();
    const diff = Math.ceil((start + 15 * 24 * 60 * 60 * 1000 - now) / (1000 * 60 * 60 * 24));
    return Math.max(0, diff);
  };

  const roleColors = {
    EXPORTATEUR: 'bg-tunisia-red',
    IMPORTATEUR: 'bg-emerald-600',
    INSTANCE_VALIDATION: 'bg-blue-600',
    ADMIN: 'bg-slate-900',
  };

  const userStatusBadge = () => {
    if (user.role === 'EXPORTATEUR') {
      const demandeStatus = dossierStatus?.demandeStatus || dossierStatusLocal?.status;
      const paymentStatus = dossierStatus?.paymentStatus || dossierStatusLocal?.paymentStatus;
      
      if (demandeStatus === 'SOUMISE' && paymentStatus === 'EN_ATTENTE') {
        return (
          <span className="px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-amber-100 text-amber-700 border border-amber-200 shadow-sm">
            ATTENTE PAIEMENT
          </span>
        );
      }
      
      if (demandeStatus === 'SOUMISE' && paymentStatus === 'REUSSI') {
        return (
          <span className="px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-blue-100 text-blue-700 border border-blue-200 shadow-sm">
            EN ATTENTE DE VALIDATION
          </span>
        );
      }
      
      if (demandeStatus === 'VALIDEE' && paymentStatus === 'REUSSI') {
        return (
          <span className="px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-emerald-100 text-emerald-700 border border-emerald-200 shadow-sm">
            COMPTE VÉRIFIÉ
          </span>
        );
      }
      
      if (demandeStatus === 'REJETEE') {
        return (
          <span className="px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-red-100 text-red-700 border border-red-200 shadow-sm">
            DOSSIER REJETÉ
          </span>
        );
      }
      
      if (demandeStatus === 'SUSPENDUE') {
        return (
          <span className="px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-slate-100 text-slate-700 border border-slate-200 shadow-sm">
            COMPTE SUSPENDU
          </span>
        );
      }
      
      if (demandeStatus === 'EN_ATTENTE_INFO') {
        return (
          <span className="px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-orange-100 text-orange-700 border border-orange-200 shadow-sm">
            INFO REQUISE
          </span>
        );
      }
      
      const status = user.userStatut;
      if (status === 'INACTIF' || status === 'EN_ATTENTE') {
        return (
          <span className="px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-amber-50 text-amber-600 border border-amber-200">
            EN ATTENTE
          </span>
        );
      }
      
      return (
        <span className={`px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${
          status === 'ACTIF' || status === 'VERIFIED' ? 'bg-green-50 text-green-600 border-green-200' : 
          status === 'INACTIF' || status === 'PENDING_VERIFICATION' ? 'bg-amber-50 text-amber-600 border-amber-200' :
          'bg-red-50 text-red-600 border-red-200'
        }`}>
          {status || 'EN ATTENTE'}
        </span>
      );
    } else if (user.role === 'IMPORTATEUR') {
      return (
        <span className="px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-emerald-50 text-emerald-600 border border-emerald-200">
          MOBILE ID VÉRIFIÉ
        </span>
      );
    }
    
    return (
      <span className="px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-slate-50 text-slate-600 border border-slate-200">
        AGENT OFFICIEL
      </span>
    );
  };

  const shouldShowPaymentBanner = 
    (user.role === 'EXPORTATEUR') &&
    (dossierStatus?.demandeStatus === 'SOUMISE' || dossierStatusLocal?.status === 'SOUMISE') && 
    (dossierStatus?.paymentStatus === 'EN_ATTENTE' || dossierStatusLocal?.paymentStatus === 'EN_ATTENTE');

  const isVerifiedExporter = (user.role === 'EXPORTATEUR') && 
                            (user.userStatut === 'ACTIF' || user.emailVerified === true);
  const remainingDays = getRemainingDays();

  const certData = {
    enTete: "RÉPUBLIQUE TUNISIENNE - MINISTÈRE DU COMMERCE",
    titre: "CERTIFICAT D'ENREGISTREMENT D'EXPORTATEUR ÉTRANGER",
    infos: {
      numeroCertificat: demandeInfo?.reference || "CERT-NEE-2024-001234",
      nee: demandeInfo?.reference || "NEE-TUN-2024-05789-XD",
      societe: user.companyName || user.raisonSociale || "ABC Electronics GmbH",
      pays: user.paysOrigine || "Allemagne",
      representant: user.representantLegal || "Hans Müller",
      dateEmission: user.dateAgrement || "15/03/2024",
      dateExpiration: "14/03/2027",
      qrCode: "https://verify.gov.tn/nee/NEE-TUN-2024-05789-XD"
    },
    signature: "Signature numérique Ministère du Commerce",
    cachet: "Cachet électronique officiel"
  };

  const handleDownloadCert = () => {
    if (!showCertificate) {
      setError('Veuillez d\'abord ouvrir le certificat');
      return;
    }

    let certificateElement = document.getElementById('certificat-nee') as HTMLElement;
    
    if (!certificateElement) {
      certificateElement = document.querySelector('.certificate-content') as HTMLElement;
    }
    
    if (!certificateElement) {
      const modal = document.querySelector('.fixed.inset-0.z-\\[120\\]');
      if (modal) {
        certificateElement = modal.querySelector('.border-\\[12px\\]') as HTMLElement;
      }
    }

    if (!certificateElement) {
      setError('Certificat non trouvé');
      return;
    }

    const options = {
      scale: 2,
      backgroundColor: '#ffffff',
      logging: false,
      allowTaint: false,
      useCORS: true
    };

    html2canvas(certificateElement, options)
      .then((canvas: HTMLCanvasElement) => {
        try {
          const pdf = new jsPDF({
            orientation: 'landscape',
            unit: 'px',
            format: [canvas.width, canvas.height]
          });
          
          const imgData = canvas.toDataURL('image/png');
          pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
          
          const fileName = `certificat_nee_${user?.id || 'exportateur'}_${Date.now()}.pdf`;
          pdf.save(fileName);
          
        } catch (pdfError) {
          try {
            const link = document.createElement('a');
            link.download = `certificat_nee_${user?.id || 'exportateur'}_${Date.now()}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
            setError('PDF non disponible, téléchargement en PNG effectué');
          } catch (pngError) {
            setError('Erreur lors de la création du fichier');
          }
        }
      })
      .catch((err: Error) => {
        setError('Erreur lors de la capture du certificat: ' + err.message);
      });
  };

  const getRoleColor = () => {
    const role = (user.role?.toUpperCase() || 'EXPORTATEUR') as UserRole;
    return roleColors[role] || roleColors['EXPORTATEUR'];
  };

  const displayDocuments = getDisplayDocuments();
  const fullDossierData = getFullDossierData();

  return (
    <div className="max-w-5xl mx-auto py-8">
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

      {/* MODAL CERTIFICAT NEE - inchangé */}
      {showCertificate && (
        // ... contenu du modal certificat inchangé ...
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          {/* ... */}
        </div>
      )}

      {/* ALERTE PAIEMENT PERSISTANTE */}
      {shouldShowPaymentBanner && (
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
              {(user.role === 'IMPORTATEUR') && user.mobileIdMatricule && (
                <p className="text-emerald-600 font-bold text-xs tracking-widest mt-1">
                  <i className="fas fa-mobile-alt mr-2"></i>
                  Matricule Mobile ID: {user.mobileIdMatricule}
                </p>
              )}
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
           {(user.role === 'EXPORTATEUR') && isVerifiedExporter && (
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

           {(user.role === 'IMPORTATEUR') && (
             <div className="bg-emerald-600 text-white p-8 rounded-[2.5rem] shadow-xl relative overflow-hidden">
               <div className="absolute -top-10 -right-10 opacity-10">
                 <i className="fas fa-mobile-alt text-9xl"></i>
               </div>
               <h3 className="text-[10px] font-black uppercase tracking-widest text-emerald-100 mb-6">Authentification</h3>
               <div className="space-y-4">
                 <div>
                   <span className="block text-xs font-black uppercase tracking-tight mb-1">Mobile ID</span>
                   <span className="block text-sm font-bold text-emerald-100">Vérifié le {new Date().toLocaleDateString()}</span>
                 </div>
                 <div className="pt-4 border-t border-emerald-500/30">
                   <div className="flex items-center gap-3">
                     <i className="fas fa-check-circle text-emerald-300"></i>
                     <span className="text-xs font-bold">Identité certifiée</span>
                   </div>
                 </div>
               </div>
             </div>
           )}

           <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Sécurité & Compte</h3>
              <div className="space-y-4">
                 {(user.role === 'EXPORTATEUR' || user.role === 'ADMIN') && (
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
                 )}
                 
                 {(user.role === 'EXPORTATEUR') && (
                   <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                     <div className="flex items-center gap-3">
                       <i className="fas fa-shield-alt text-slate-400"></i>
                       <div>
                         <span className="text-sm font-bold text-slate-700">Connexion 2FA</span>
                         {user.isTwoFactorEnabled && (
                           <p className="text-[8px] text-emerald-600 font-black uppercase tracking-widest">
                             Sécurité renforcée
                           </p>
                         )}
                       </div>
                     </div>
                     <button 
                       onClick={toggle2FA}
                       disabled={isLoading}
                       className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors focus:outline-none ${
                         user.isTwoFactorEnabled ? 'bg-emerald-500' : 'bg-slate-300'
                       } ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                     >
                       <span
                         className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform shadow-lg ${
                           user.isTwoFactorEnabled ? 'translate-x-7' : 'translate-x-1'
                         }`}
                       />
                     </button>
                   </div>
                 )}

                 <div className="pt-4 border-t border-slate-50">
                    {deactivationRequested || hasPendingRequest ? (
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
                        {pendingRequestInfo && (
                          <p className="text-[7px] text-green-400 mt-1">
                            Demande du {new Date(pendingRequestInfo.requestDate).toLocaleDateString('fr-FR')}
                            {pendingRequestInfo.isUrgent && " (Urgent)"}
                          </p>
                        )}
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
                {user.role === 'EXPORTATEUR' ? (
                  // Formulaire EXPORTATEUR
                  <>
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
                        Email
                      </label>
                      <input 
                        type="email" 
                        value={user.email || ''} 
                        disabled={true}
                        className="w-full px-5 py-4 rounded-2xl border-2 border-slate-50 font-bold bg-slate-100 cursor-not-allowed opacity-70" 
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                        Adresse du siège
                      </label>
                      <input 
                        type="text" 
                        value={formData.address} 
                        onChange={(e) => setFormData({...formData, address: e.target.value})}
                        disabled={isLoading}
                        className="w-full px-5 py-4 rounded-2xl border-2 border-slate-50 font-bold bg-slate-50/50 focus:border-tunisia-red transition-all outline-none disabled:opacity-50 disabled:cursor-not-allowed" 
                        placeholder="ex: 123 rue de l'entreprise, 75001 Paris"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                          {t('country')}
                        </label>
                        <select
                          value={formData.country}
                          onChange={(e) => setFormData({...formData, country: e.target.value})}
                          disabled={isLoading}
                          className="w-full px-5 py-4 rounded-2xl border-2 border-slate-50 font-bold bg-slate-50/50 focus:border-tunisia-red transition-all outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <option value="">Sélectionner un pays</option>
                          {countries.map(country => (
                            <option key={country.code} value={country.code}>
                              {country.name}
                            </option>
                          ))}
                        </select>
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
                          N° TVA
                        </label>
                        <input 
                          type="text" 
                          value={formData.numeroTVA} 
                          onChange={(e) => setFormData({...formData, numeroTVA: e.target.value})}
                          disabled={isLoading}
                          className="w-full px-5 py-4 rounded-2xl border-2 border-slate-50 font-bold bg-slate-50/50 focus:border-tunisia-red transition-all outline-none disabled:opacity-50 disabled:cursor-not-allowed" 
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                          N° Officiel d'Enregistrement
                        </label>
                        <input 
                          type="text" 
                          value={formData.numeroOfficielEnregistrement} 
                          onChange={(e) => setFormData({...formData, numeroOfficielEnregistrement: e.target.value})}
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

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                          Capacité Annuelle
                        </label>
                        <input 
                          type="text" 
                          value={formData.capaciteAnnuelle} 
                          onChange={(e) => setFormData({...formData, capaciteAnnuelle: e.target.value})}
                          disabled={isLoading}
                          className="w-full px-5 py-4 rounded-2xl border-2 border-slate-50 font-bold bg-slate-50/50 focus:border-tunisia-red transition-all outline-none disabled:opacity-50 disabled:cursor-not-allowed" 
                          placeholder="ex: 500 Tonnes/an"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                          Type de Site
                        </label>
                        <select
                          value={formData.siteType}
                          onChange={(e) => setFormData({...formData, siteType: e.target.value})}
                          disabled={isLoading}
                          className="w-full px-5 py-4 rounded-2xl border-2 border-slate-50 font-bold bg-slate-50/50 focus:border-tunisia-red transition-all outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <option value="">Sélectionner un type...</option>
                          <option value="SIEGE">Siège Social</option>
                          <option value="USINE">Usine de Production</option>
                          <option value="ENTREPOT">Entrepôt Logistique</option>
                          <option value="DISTRIBUTEUR">Centre de Distribution</option>
                        </select>
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

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                        Rôle du Représentant
                      </label>
                      <input 
                        type="text" 
                        value={formData.representantRole} 
                        onChange={(e) => setFormData({...formData, representantRole: e.target.value})}
                        disabled={isLoading}
                        className="w-full px-5 py-4 rounded-2xl border-2 border-slate-50 font-bold bg-slate-50/50 focus:border-tunisia-red transition-all outline-none disabled:opacity-50 disabled:cursor-not-allowed" 
                        placeholder="Ex: Gérant, Directeur Général..."
                      />
                    </div>
                  </>
                ) : user.role === 'IMPORTATEUR' ? (
                  // Formulaire IMPORTATEUR
                  <>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                        Raison Sociale / Nom de l'entreprise
                      </label>
                      <input 
                        type="text" 
                        value={formData.companyName} 
                        onChange={(e) => setFormData({...formData, companyName: e.target.value})}
                        disabled={isLoading}
                        className="w-full px-5 py-4 rounded-2xl border-2 border-slate-50 font-bold bg-slate-50/50 focus:border-tunisia-red transition-all outline-none disabled:opacity-50 disabled:cursor-not-allowed" 
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                          Prénom
                        </label>
                        <input 
                          type="text" 
                          value={formData.prenom} 
                          onChange={(e) => {
                            const newPrenom = e.target.value;
                            setFormData(prev => ({
                              ...prev,
                              prenom: newPrenom,
                              legalRep: `${newPrenom} ${prev.nom}`.trim()
                            }));
                          }}
                          disabled={isLoading}
                          className="w-full px-5 py-4 rounded-2xl border-2 border-slate-50 font-bold bg-slate-50/50 focus:border-tunisia-red transition-all outline-none disabled:opacity-50 disabled:cursor-not-allowed" 
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                          Nom
                        </label>
                        <input 
                          type="text" 
                          value={formData.nom} 
                          onChange={(e) => {
                            const newNom = e.target.value;
                            setFormData(prev => ({
                              ...prev,
                              nom: newNom,
                              legalRep: `${prev.prenom} ${newNom}`.trim()
                            }));
                          }}
                          disabled={isLoading}
                          className="w-full px-5 py-4 rounded-2xl border-2 border-slate-50 font-bold bg-slate-50/50 focus:border-tunisia-red transition-all outline-none disabled:opacity-50 disabled:cursor-not-allowed" 
                        />
                      </div>
                    </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                          Téléphone
                        </label>
                        <input 
                          type="tel" 
                          value={formData.phone} 
                          onChange={(e) => setFormData({...formData, phone: e.target.value})}
                          disabled={isLoading}
                          className="w-full px-5 py-4 rounded-2xl border-2 border-slate-50 font-bold bg-slate-50/50 focus:border-tunisia-red transition-all outline-none disabled:opacity-50 disabled:cursor-not-allowed" 
                        />
                      </div>
                    

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                        Email
                      </label>
                      <input 
                        type="email" 
                        value={user.email || ''} 
                        disabled={true}
                        className="w-full px-5 py-4 rounded-2xl border-2 border-slate-50 font-bold bg-slate-100 cursor-not-allowed opacity-70" 
                      />
                    </div>
                  </>
                ) : null}

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
              loadingProfile ? (
                <div className="flex justify-center items-center py-8">
                  <i className="fas fa-spinner fa-spin text-tunisia-red text-2xl"></i>
                  <span className="ml-3 text-sm font-bold text-slate-400">Chargement du profil...</span>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-y-10 gap-x-12">
                  {user.role === 'EXPORTATEUR' ? (
                    // Affichage EXPORTATEUR
                    <>
                      <div>
                        <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-2">
                          {t('company_name')}
                        </span>
                        <span className="text-lg font-black text-slate-800">
                          {user.companyName || user.raisonSociale || 'Non défini'}
                        </span>
                      </div>
                      
                      {user.numeroOfficielEnregistrement && (
                        <div>
                          <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-2">
                            N° Officiel d'Enregistrement
                          </span>
                          <span className="text-lg font-black text-slate-800">
                            {user.numeroOfficielEnregistrement}
                          </span>
                        </div>
                      )}
                      
                      {user.numeroTVA && (
                        <div>
                          <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-2">
                            N° TVA
                          </span>
                          <span className="text-lg font-black text-slate-800">
                            {user.numeroTVA}
                          </span>
                        </div>
                      )}
                      
                      {user.capaciteAnnuelle && (
                        <div>
                          <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-2">
                            Capacité Annuelle
                          </span>
                          <span className="text-lg font-black text-slate-800">
                            {user.capaciteAnnuelle.toLocaleString()} tonnes
                          </span>
                        </div>
                      )}
                      
                      {user.siteType && (
                        <div>
                          <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-2">
                            Type de Site
                          </span>
                          <span className="text-lg font-black text-slate-800">
                            {user.siteType}
                          </span>
                        </div>
                      )}
                      
                      <div>
                        <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-2">
                          {t('phone_number')}
                        </span>
                        <span className="text-lg font-black text-slate-800">
                          {user.telephone || '+216 -- --- ---'}
                        </span>
                      </div>
                      
                      <div className="md:col-span-2">
                        <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-2">
                          Email
                        </span>
                        <span className="text-lg font-black text-slate-800">
                          {user.email || 'Non défini'}
                        </span>
                      </div>
                      
                      <div>
                        <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-2">
                          {t('tin_number')}
                        </span>
                        <span className="text-lg font-black text-slate-800 tracking-tighter">
                          {user.numeroRegistreCommerce || 'Non défini'}
                        </span>
                      </div>
                      <div>
                        <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-2">
                          {t('country')}
                        </span>
                        <div className="flex items-center gap-3">
                          {user.paysOrigine && (
                            <img 
                              src={getFlagUrl(user.paysOrigine)} 
                              alt={getCountryName(user.paysOrigine)}
                              className="w-6 h-4 rounded-sm object-cover shadow-sm border border-slate-200"
                              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                            />
                          )}
                          <span className="text-lg font-black text-slate-800">
                            {getCountryName(user.paysOrigine)}
                          </span>
                        </div>
                      </div>
                      <div>
                        <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-2">
                          Ville
                        </span>
                        <span className="text-lg font-black text-slate-800">
                          {user.ville || 'Non défini'}
                        </span>
                      </div>
                      <div>
                        <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-2">
                          Site Web
                        </span>
                        <span className="text-lg font-black text-slate-800">
                          {user.siteWeb || 'Non défini'}
                        </span>
                      </div>
                      <div className="md:col-span-2">
                        <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-2">
                          Représentant Légal
                        </span>
                        <span className="text-lg font-black text-slate-800">
                          {user.representantLegal || 'Non défini'}
                        </span>
                      </div>
                      
                      <div className="md:col-span-2 pt-6 border-t border-slate-50">
                        <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-2">
                          Adresse du siège
                        </span>
                        <span className="text-sm font-bold text-slate-600 italic">
                          {user.adresseLegale || 'Non défini'}
                        </span>
                      </div>
                    </>
                  ) : user.role === 'IMPORTATEUR' ? (
                    // Affichage IMPORTATEUR
                    <>
                      <div>
                        <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-2">
                          Raison Sociale
                        </span>
                        <span className="text-lg font-black text-slate-800">
                          {user.raisonSociale || 'Non défini'}
                        </span>
                      </div>
                      <div>
                        <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-2">
                          Nom complet
                        </span>
                        <span className="text-lg font-black text-slate-800">
                          {`${user.prenom || ''} ${user.nom || ''}`.trim() || 'Non défini'}
                        </span>
                      </div>
                      <div>
                        <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-2">
                          Téléphone
                        </span>
                        <span className="text-lg font-black text-slate-800">
                          {user.telephone || 'Non défini'}
                        </span>
                      </div>
                      <div className="md:col-span-2">
                        <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-2">
                          Email
                        </span>
                        <span className="text-lg font-black text-slate-800">
                          {user.email || 'Non défini'}
                        </span>
                      </div>
                      
                    </>
                  ) : null}
                </div>
              )
            )}
          </div>

          {(user.role === 'EXPORTATEUR') && (
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
                      demandeInfo.status === 'SOUMISE' ? 'bg-blue-50 text-blue-600' :
                      demandeInfo.status === 'EN_COURS_VALIDATION' ? 'bg-purple-50 text-purple-600' :
                      demandeInfo.status === 'REJETEE' ? 'bg-red-50 text-red-600' :
                      demandeInfo.status === 'EN_ATTENTE_INFO' ? 'bg-orange-50 text-orange-600' :
                      'bg-amber-50 text-amber-600'
                    }`}>
                      {demandeInfo.status === 'VALIDEE' ? 'VALIDÉ' :
                       demandeInfo.status === 'SOUMISE' ? 'SOUMIS' :
                       demandeInfo.status === 'EN_COURS_VALIDATION' ? 'EN COURS' :
                       demandeInfo.status === 'REJETEE' ? 'REJETÉ' :
                       demandeInfo.status === 'EN_ATTENTE_INFO' ? 'INFO REQUISE' :
                       demandeInfo.status || 'BROUILLON'}
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
                          className={`flex items-center justify-between p-4 bg-slate-50/50 rounded-2xl border border-slate-50 hover:border-slate-200 transition-all ${doc.onClick !== undefined ? 'cursor-pointer' : 'cursor-default'}`}
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
                            {doc.onClick !== undefined && (
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

      {/* MODAL CONFIGURATION 2FA - ACTIVATION */}
      {show2FASetup && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-xl" onClick={() => {
            setShow2FASetup(false);
            reset2FACode();
          }}></div>
          <div className="relative bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-fade-in-scale">
            <div className="p-8">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-black text-slate-900 uppercase italic tracking-tighter">
                  Activer la 2FA
                </h3>
                <button 
                  onClick={() => {
                    setShow2FASetup(false);
                    reset2FACode();
                  }} 
                  className="text-slate-400 hover:text-tunisia-red transition-colors"
                >
                  <i className="fas fa-times"></i>
                </button>
              </div>

              <div className="space-y-6">
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                  <p className="text-xs font-bold text-blue-800">
                    1. Scannez ce QR code avec Google Authenticator ou une application compatible
                  </p>
                </div>

                {twoFactorQrCode && (
                  <div className="flex justify-center p-6 bg-white rounded-2xl border-2 border-dashed border-slate-200">
                    <img 
                      src={`data:image/png;base64,${twoFactorQrCode}`} 
                      alt="QR Code 2FA"
                      className="w-48 h-48"
                    />
                  </div>
                )}

                {twoFactorSecret && (
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                      Ou saisissez manuellement cette clé
                    </label>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 p-3 bg-slate-50 rounded-xl text-xs font-mono font-bold border border-slate-200">
                        {twoFactorSecret}
                      </code>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(twoFactorSecret);
                          setSuccessMessage('Clé copiée !');
                          setTimeout(() => setSuccessMessage(''), 2000);
                        }}
                        className="p-3 bg-slate-100 rounded-xl text-slate-600 hover:bg-slate-200 transition-colors"
                        title="Copier la clé"
                      >
                        <i className="fas fa-copy"></i>
                      </button>
                    </div>
                  </div>
                )}

                <div className="space-y-4">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                    Entrez le code à 6 chiffres
                  </label>
                  <div className="flex justify-center gap-2">
                    {twoFactorCode.map((digit, idx) => (
                      <input
                        key={idx}
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => {
                          const newCode = [...twoFactorCode];
                          newCode[idx] = e.target.value.replace(/\D/g, '');
                          setTwoFactorCode(newCode);
                          
                          if (e.target.value && idx < 5) {
                            const nextInput = document.getElementById(`2fa-input-${idx + 1}`);
                            nextInput?.focus();
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Backspace' && !twoFactorCode[idx] && idx > 0) {
                            const prevInput = document.getElementById(`2fa-input-${idx - 1}`);
                            prevInput?.focus();
                          }
                        }}
                        id={`2fa-input-${idx}`}
                        className="w-12 h-14 text-center text-2xl font-black bg-slate-50 border-2 border-slate-100 rounded-xl focus:border-tunisia-red focus:bg-white outline-none transition-all"
                        disabled={isLoading}
                      />
                    ))}
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => verifyAndEnable2FA(twoFactorCode.join(''))}
                    disabled={isLoading || twoFactorCode.join('').length !== 6}
                    className="flex-1 py-4 bg-tunisia-red text-white rounded-xl font-black uppercase tracking-widest text-xs shadow-lg hover:bg-red-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? (
                      <i className="fas fa-spinner fa-spin"></i>
                    ) : (
                      'Activer'
                    )}
                  </button>
                  <button
                    onClick={() => {
                      setShow2FASetup(false);
                      reset2FACode();
                    }}
                    disabled={isLoading}
                    className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-xl font-black uppercase tracking-widest text-xs hover:bg-slate-200 transition-all disabled:opacity-50"
                  >
                    Annuler
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DÉSACTIVATION 2FA */}
      {show2FADisable && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-xl" onClick={() => {
            setShow2FADisable(false);
            reset2FACode();
          }}></div>
          <div className="relative bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-fade-in-scale">
            <div className="p-8">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-black text-slate-900 uppercase italic tracking-tighter">
                  Désactiver la 2FA
                </h3>
                <button 
                  onClick={() => {
                    setShow2FADisable(false);
                    reset2FACode();
                  }} 
                  className="text-slate-400 hover:text-tunisia-red transition-colors"
                >
                  <i className="fas fa-times"></i>
                </button>
              </div>

              <div className="space-y-6">
                <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
                  <p className="text-xs font-bold text-amber-800 flex items-center gap-2">
                    <i className="fas fa-exclamation-triangle"></i>
                    Pour désactiver la 2FA, veuillez entrer votre code de vérification actuel
                  </p>
                </div>

                <div className="space-y-4">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                    Code à 6 chiffres
                  </label>
                  <div className="flex justify-center gap-2">
                    {twoFactorCode.map((digit, idx) => (
                      <input
                        key={idx}
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => {
                          const newCode = [...twoFactorCode];
                          newCode[idx] = e.target.value.replace(/\D/g, '');
                          setTwoFactorCode(newCode);
                          
                          if (e.target.value && idx < 5) {
                            const nextInput = document.getElementById(`2fa-disable-input-${idx + 1}`);
                            nextInput?.focus();
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Backspace' && !twoFactorCode[idx] && idx > 0) {
                            const prevInput = document.getElementById(`2fa-disable-input-${idx - 1}`);
                            prevInput?.focus();
                          }
                        }}
                        id={`2fa-disable-input-${idx}`}
                        className="w-12 h-14 text-center text-2xl font-black bg-slate-50 border-2 border-slate-100 rounded-xl focus:border-tunisia-red focus:bg-white outline-none transition-all"
                        disabled={isLoading}
                      />
                    ))}
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => verifyAndDisable2FA(twoFactorCode.join(''))}
                    disabled={isLoading || twoFactorCode.join('').length !== 6}
                    className="flex-1 py-4 bg-red-600 text-white rounded-xl font-black uppercase tracking-widest text-xs shadow-lg hover:bg-red-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? (
                      <i className="fas fa-spinner fa-spin"></i>
                    ) : (
                      'Désactiver'
                    )}
                  </button>
                  <button
                    onClick={() => {
                      setShow2FADisable(false);
                      reset2FACode();
                    }}
                    disabled={isLoading}
                    className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-xl font-black uppercase tracking-widest text-xs hover:bg-slate-200 transition-all disabled:opacity-50"
                  >
                    Annuler
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;