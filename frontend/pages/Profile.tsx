import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../App';
import ResetPasswordForm from '../components/ResetPasswordForm';

const Profile: React.FC = () => {
  const { t } = useTranslation();
  const { user, updateUser } = useAuth();
  
  const [isEditing, setIsEditing] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isDeactivating, setIsDeactivating] = useState(false);
  const [deactivationReason, setDeactivationReason] = useState('');
  const [isUrgent, setIsUrgent] = useState(false);
  const [deactivationRequested, setDeactivationRequested] = useState(false); // NOUVEAU : état pour suivre si la demande a été envoyée
  const [showCertificate, setShowCertificate] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  
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

      // ✅ MARQUER LA DEMANDE COMME ENVOYÉE
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

  // Mock Data pour le certificat
  const certData = {
    enTete: "RÉPUBLIQUE TUNISIENNE - MINISTÈRE DU COMMERCE",
    titre: "CERTIFICAT D'ENREGISTREMENT D'EXPORTATEUR ÉTRANGER",
    infos: {
      numeroCertificat: user.numeroAgrement || "CERT-NEE-2024-001234",
      nee: user.numeroAgrement || "NEE-TUN-2024-05789-XD",
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
                    {/* SI LA DEMANDE A DÉJÀ ÉTÉ ENVOYÉE */}
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
                      /* SI LA DEMANDE N'A PAS ENCORE ÉTÉ ENVOYÉE */
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
        </div>
      </div>

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