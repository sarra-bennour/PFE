import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import ResetPasswordForm from '../../components/ResetPasswordForm';
import { useAuth } from '../../App';
import { User, UserRoleType } from '@/types/User';
import { getFormalAvatar } from '../../utils/avatarService';


// ✅ AJOUTER cette interface pour les activités
interface RecentActivity {
  id: number;
  reference: string;
  description: string;
  status: 'APPROUVÉ' | 'REJETÉ' | 'INFO_REQUISE';
  time: string;
  actionType: string;
  createdAt: Date; 
}

interface ProfileStat {
  label: string;
  value: string | number;
  icon: string;
  color: string;
  bg: string;
}


const ValidatorProfile: React.FC = () => {
  const { user: authUser, updateUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isChangingPwd, setIsChangingPwd] = useState(false);
  const [isDeclaringAbsence, setIsDeclaringAbsence] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(false);
  // ✅ AJOUTER ces states
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [loadingActivities, setLoadingActivities] = useState(false);
  
  const [profileData, setProfileData] = useState({
    nom: '',
    prenom: '',
    email: '',
    telephone: '',
    structureName: '',
    structureCode: '',
    structureType: '',
    slaTraitementJours: 0,
    poste: '',
    statut: ''
  });

  const [absenceData, setAbsenceData] = useState({
    startDate: '',
    endDate: '',
    reason: ''
  });

  // Fonction pour mapper les données backend vers frontend
  const mapBackendUserToFrontend = (backendUser: any): Partial<User> => {
  let role: UserRoleType = UserRoleType.EXPORTATEUR;
  
  switch (backendUser.role?.toUpperCase()) {
    case 'EXPORTATEUR':
    case 'EXPORTATEUR_ETRANGER':
      role = UserRoleType.EXPORTATEUR;
      break;
    case 'IMPORTATEUR':
      role = UserRoleType.IMPORTATEUR;
      break;
    case 'INSTANCE_VALIDATION':
      role = UserRoleType.INSTANCE_VALIDATION;
      break;
    case 'ADMIN':
      role = UserRoleType.ADMIN;
      break;
    default:
      role = UserRoleType.EXPORTATEUR;
  }
  
  return {
    id: backendUser.id,
    email: backendUser.email,
    role: role,
    nom: backendUser.nom || '',
    prenom: backendUser.prenom || '',
    telephone: backendUser.telephone || '',
    structureName: backendUser.structureName || '',
    structureCode: backendUser.structureCode || '',
    structureType: backendUser.structureType || '',
    slaTraitementJours: backendUser.slaTraitementJours || 0,
    statut: backendUser.statut || 'ACTIF',
    poste: backendUser.poste || '',
    isTwoFactorEnabled: backendUser.twoFactorEnabled || false,
    emailVerified: backendUser.emailVerified || false,
  };
};

  // Charger les données du profil
  useEffect(() => {
    const fetchProfileData = async () => {
      if (!authUser?.email) return;
      
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
        
        console.log('****Données du profil:', data);
        if (data.success && data.user) {
          const mappedUser = mapBackendUserToFrontend(data.user);
          
          setProfileData({
            nom: mappedUser.nom || '',
            prenom: mappedUser.prenom || '',
            email: mappedUser.email || '',
            telephone: mappedUser.telephone || '',
            structureName: mappedUser.structureName || '',
            structureCode: mappedUser.structureCode || '',
            structureType: mappedUser.structureType || '',
            slaTraitementJours: mappedUser.slaTraitementJours || 0,
            statut: mappedUser.statut || 'ACTIF',
            poste: mappedUser.poste || ''
          });
          
          console.log("***** profile", mappedUser);
          if (updateUser) {
            updateUser(mappedUser);
          }
        }
      } catch (err) {
        console.error('Erreur chargement profil:', err);
      } finally {
        setLoadingProfile(false);
      }
    };
    
    fetchProfileData();
  }, [authUser?.email]);

// Charger TOUT l'historique des demandes traitées
const fetchRecentActivities = async () => {
  setLoadingActivities(true);
  try {
    const token = localStorage.getItem('token');
    const response = await fetch(`http://localhost:8080/api/audit-logs/my-logs?offset=0&limit=1000`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const data = await response.json();
    
    if (data.success && data.data && data.data.length > 0) {
      // Log tous les logs de validation pour inspecter
      const allValidationLogs = data.data.filter((log: any) => 
        log.action === 'VALIDATION_APPROVE_DEMANDE' ||
        log.action === 'VALIDATION_REJECT_DEMANDE' || 
        log.action === 'VALIDATION_REQUEST_INFO'
      );
      
      console.log('📋 Logs de validation trouvés:', allValidationLogs.length);
      allValidationLogs.forEach((log: any, index: number) => {
        console.log(`📋 Validation log ${index + 1}:`, {
          action: log.action,
          entityReference: log.entityReference,
          entityId: log.entityId,
          description: log.description,
          details: log.details
        });
      });
      
      const validationActions = ['VALIDATION_APPROVE_DEMANDE', 'VALIDATION_REJECT_DEMANDE', 'VALIDATION_REQUEST_INFO'];
      
      const validationLogs = data.data.filter((log: any) => 
        validationActions.includes(log.action)
      );
      
      const activities: RecentActivity[] = validationLogs.map((log: any) => {
        let status: 'APPROUVÉ' | 'REJETÉ' | 'INFO_REQUISE' = 'APPROUVÉ';
        
        if (log.action === 'VALIDATION_APPROVE_DEMANDE') status = 'APPROUVÉ';
        else if (log.action === 'VALIDATION_REJECT_DEMANDE') status = 'REJETÉ';
        else if (log.action === 'VALIDATION_REQUEST_INFO') status = 'INFO_REQUISE';
        
        // 🔥 RÉCUPÉRER LA RÉFÉRENCE - Plusieurs tentatives
        let reference = '';
        
        // 1. Essayer entityReference directement
        if (log.entityReference && log.entityReference !== '') {
          reference = log.entityReference;
        }
        // 2. Essayer depuis details.reference
        else if (log.details?.reference && log.details.reference !== '') {
          reference = log.details.reference;
        }
        // 3. Essayer depuis details.demandeReference
        else if (log.details?.demandeReference && log.details.demandeReference !== '') {
          reference = log.details.demandeReference;
        }
        // 4. Extraire depuis la description
        else if (log.description) {
          const match = log.description.match(/(?:DEM|DOS|IMP)-\d+-\w+/);
          if (match) reference = match[0];
        }
        
        // 🔥 Si pas de référence, utiliser entityId comme fallback
        if (!reference && log.entityId) {
          reference = `ID:${log.entityId}`;
        }
        
        const createdAt = new Date(log.performedAt);
        const formattedDate = createdAt.toLocaleDateString('fr-FR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
        
        return {
          id: log.id,
          reference: reference,
          description: log.description || '',
          status: status,
          time: formattedDate,
          actionType: log.action,
          createdAt: createdAt
        };
      });
      
      // 🔥 Afficher uniquement les activités qui ont une référence
      const activitiesWithRef = activities.filter(act => act.reference && act.reference !== '');
      const activitiesWithoutRef = activities.filter(act => !act.reference || act.reference === '');
      
      console.log(`📊 Activités avec référence: ${activitiesWithRef.length}`);
      console.log(`⚠️ Activités sans référence: ${activitiesWithoutRef.length}`);
      
      if (activitiesWithoutRef.length > 0) {
        console.log('Détails des activités sans référence:', activitiesWithoutRef);
      }
      
      // Trier par date
      const sortedActivities = activitiesWithRef.sort((a: RecentActivity, b: RecentActivity) => 
        b.createdAt.getTime() - a.createdAt.getTime()
      );
      
      setRecentActivities(sortedActivities);
      
    } else {
      setRecentActivities([]);
    }
  } catch (err) {
    console.error('Erreur chargement historique:', err);
    setRecentActivities([]);
  } finally {
    setLoadingActivities(false);
  }
};

  // ✅ AJOUTER: Appeler au chargement
  useEffect(() => {
    fetchRecentActivities();
  }, []);

  const profileStats: ProfileStat[] = [
    { label: 'Dossiers Traités', value: recentActivities.length.toString(), icon: 'fa-box-archive', color: 'text-emerald-500', bg: 'bg-emerald-50' },
    { label: 'Temps Moyen', value: '18m', icon: 'fa-bolt', color: 'text-amber-500', bg: 'bg-amber-50' },
    { label: 'Taux Approbation', value: recentActivities.length > 0 ? `${Math.round((recentActivities.filter(a => a.status === 'APPROUVÉ').length / recentActivities.length) * 100)}%` : '0%', icon: 'fa-check-double', color: 'text-blue-500', bg: 'bg-blue-50' },
    { label: 'Score Qualité', value: '4.9/5', icon: 'fa-star', color: 'text-purple-500', bg: 'bg-purple-50' },
  ];

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingProfile(true);
    
    try {
      const token = localStorage.getItem('token');
      const requestBody = {
        nom: profileData.nom,
        prenom: profileData.prenom,
        telephone: profileData.telephone,
      };

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
        const mappedUser = mapBackendUserToFrontend(data.user);
        setProfileData({
          nom: mappedUser.nom || '',
          prenom: mappedUser.prenom || '',
          email: mappedUser.email || '',
          telephone: mappedUser.telephone || '',
          structureName: mappedUser.structureName || '',
          structureCode: mappedUser.structureCode || '',
          structureType: mappedUser.structureType || '',
          slaTraitementJours: mappedUser.slaTraitementJours || 0,
          statut: mappedUser.statut || 'ACTIF',
          poste: mappedUser.poste || ''
        });
        
        if (updateUser) {
          updateUser(mappedUser);
        }
      }
      
      setIsEditing(false);
    } catch (err: any) {
      console.error('Erreur mise à jour:', err);
    } finally {
      setLoadingProfile(false);
    }
  };

  const handleDeclareAbsence = async () => {
    if (!absenceData.startDate || !absenceData.endDate) {
      console.error('Dates requises');
      return;
    }
    
    setLoadingProfile(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:8080/api/auth/declare-absence', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(absenceData)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de la déclaration');
      }

      setIsDeclaringAbsence(false);
      setAbsenceData({ startDate: '', endDate: '', reason: '' });
    } catch (err: any) {
      console.error('Erreur déclaration absence:', err);
    } finally {
      setLoadingProfile(false);
    }
  };

  const getStatusClass = (status: string): string => {
    switch (status) {
      case 'APPROUVÉ': return 'bg-emerald-50/50 text-emerald-600/80 border-emerald-100/50';
      case 'REJETÉ': return 'bg-red-50/50 text-red-600/80 border-red-100/50';
      case 'INFO_REQUISE': return 'bg-amber-50/50 text-amber-600/80 border-amber-100/50';
      default: return 'bg-slate-50 text-slate-500 border-slate-100';
    }
  };

  if (loadingProfile && !profileData.email) {
    return (
      <div className="flex justify-center items-center h-64">
        <i className="fas fa-spinner fa-spin text-tunisia-red text-3xl"></i>
        <span className="ml-3 text-sm font-bold text-slate-400">Chargement du profil...</span>
      </div>
    );
  }

  return (
    <div className="space-y-10 animate-fade-in pb-20">
      
      {/* Modals - inchangé */}
      <AnimatePresence>
        {isEditing && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white w-full max-w-xl rounded-[3rem] shadow-2xl overflow-hidden border border-slate-100"
            >
              <div className="p-10 border-b border-slate-50 bg-slate-50/30 flex justify-between items-center">
                <h3 className="text-2xl font-black italic text-slate-900 uppercase tracking-tighter">Modifier Profil</h3>
                <button onClick={() => setIsEditing(false)} className="w-10 h-10 rounded-full bg-white border border-slate-100 flex items-center justify-center text-slate-400 hover:text-tunisia-red transition-all">
                  <i className="fas fa-times"></i>
                </button>
              </div>
              <form onSubmit={handleUpdateProfile} className="p-10 space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Prénom</label>
                    <input 
                      type="text" 
                      value={profileData.prenom}
                      onChange={(e) => setProfileData({...profileData, prenom: e.target.value})}
                      className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-50 rounded-2xl text-xs font-bold outline-none focus:border-tunisia-red transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Nom</label>
                    <input 
                      type="text" 
                      value={profileData.nom}
                      onChange={(e) => setProfileData({...profileData, nom: e.target.value})}
                      className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-50 rounded-2xl text-xs font-bold outline-none focus:border-tunisia-red transition-all"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Nom Officiel de l'Autorité</label>
                  <input 
                    type="text" 
                    value={profileData.structureName}
                    disabled
                    className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-50 rounded-2xl text-xs font-bold outline-none cursor-not-allowed"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Code Ministère</label>
                    <input 
                      type="text" 
                      value={profileData.structureCode}
                      disabled
                      className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-50 rounded-2xl text-xs font-bold outline-none cursor-not-allowed"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Téléphone</label>
                  <input 
                    type="tel" 
                    value={profileData.telephone}
                    onChange={(e) => setProfileData({...profileData, telephone: e.target.value})}
                    className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-50 rounded-2xl text-xs font-bold outline-none focus:border-tunisia-red transition-all"
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">E-mail Professionnel</label>
                  <input 
                    type="email" 
                    value={profileData.email}
                    disabled
                    className="w-full px-6 py-4 bg-slate-100 border-2 border-slate-50 rounded-2xl text-xs font-bold cursor-not-allowed opacity-70"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4 pt-4">
                  <button type="button" onClick={() => setIsEditing(false)} className="py-4 bg-slate-100 text-slate-400 rounded-2xl text-[10px] font-black uppercase tracking-widest">Annuler</button>
                  <button type="submit" disabled={loadingProfile} className="py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl disabled:opacity-50">
                    {loadingProfile ? <i className="fas fa-spinner fa-spin"></i> : 'Enregistrer'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {isChangingPwd && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white w-full max-w-lg rounded-[3rem] shadow-2xl overflow-hidden border border-slate-100"
            >
              <div className="p-10 border-b border-slate-50 bg-slate-50/30 flex justify-between items-center">
                <h3 className="text-2xl font-black italic text-slate-900 uppercase tracking-tighter">Sécurité</h3>
                <button onClick={() => setIsChangingPwd(false)} className="w-10 h-10 rounded-full bg-white border border-slate-100 flex items-center justify-center text-slate-400 hover:text-tunisia-red transition-all">
                  <i className="fas fa-times"></i>
                </button>
              </div>
              <div className="p-10">
                <ResetPasswordForm 
                  requireCurrentPassword={true}
                  onSuccess={() => setIsChangingPwd(false)}
                  onCancel={() => setIsChangingPwd(false)}
                />
              </div>
            </motion.div>
          </div>
        )}

        {isDeclaringAbsence && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 50, opacity: 0 }}
              className="bg-white w-full max-w-lg rounded-[3rem] shadow-2xl overflow-hidden border border-slate-100"
            >
              <div className="p-10 border-b border-slate-50 bg-slate-50/30 flex justify-between items-center">
                <h3 className="text-2xl font-black italic text-slate-900 uppercase tracking-tighter">Déclarer Absence</h3>
                <button onClick={() => setIsDeclaringAbsence(false)} className="w-10 h-10 rounded-full bg-white border border-slate-100 flex items-center justify-center text-slate-400 hover:text-tunisia-red transition-all">
                  <i className="fas fa-times"></i>
                </button>
              </div>
              <div className="p-10 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Date de début</label>
                    <input 
                      type="date" 
                      value={absenceData.startDate}
                      onChange={(e) => setAbsenceData({...absenceData, startDate: e.target.value})}
                      className="w-full px-6 py-4 bg-slate-50 rounded-2xl text-xs font-bold outline-none border-2 border-slate-50 focus:border-tunisia-red transition-all" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Date de fin</label>
                    <input 
                      type="date" 
                      value={absenceData.endDate}
                      onChange={(e) => setAbsenceData({...absenceData, endDate: e.target.value})}
                      className="w-full px-6 py-4 bg-slate-50 rounded-2xl text-xs font-bold outline-none border-2 border-slate-50 focus:border-tunisia-red transition-all" 
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Motif</label>
                  <select 
                    value={absenceData.reason}
                    onChange={(e) => setAbsenceData({...absenceData, reason: e.target.value})}
                    className="w-full px-6 py-4 bg-slate-50 rounded-2xl text-xs font-bold outline-none border-2 border-slate-50 focus:border-tunisia-red transition-all appearance-none"
                  >
                    <option value="">Sélectionner un motif</option>
                    <option value="CONGE_ANNUEL">Congé Annuel</option>
                    <option value="MALADIE">Maladie</option>
                    <option value="FORMATION">Formation</option>
                    <option value="AUTRE">Autre</option>
                  </select>
                </div>
                <button 
                  onClick={handleDeclareAbsence} 
                  disabled={loadingProfile}
                  className="w-full py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl disabled:opacity-50"
                >
                  {loadingProfile ? <i className="fas fa-spinner fa-spin"></i> : 'Confirmer Absence'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Profile Header Card - inchangé */}
      <div className="bg-white rounded-[3rem] shadow-sm border border-slate-100 overflow-hidden relative">
        <div className="h-48 bg-slate-50/80 relative">
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-blue-400 via-transparent to-transparent"></div>
          <div className="absolute inset-0 opacity-5 bg-[radial-gradient(circle_at_bottom_left,_var(--tw-gradient-stops))] from-tunisia-red via-transparent to-transparent"></div>
          <div className="absolute bottom-0 left-0 w-full h-24 bg-gradient-to-t from-white to-transparent"></div>
        </div>
        
        <div className="px-12 pb-12 relative -mt-20">
          <div className="flex flex-col md:flex-row items-end gap-8 mb-8">
            <div className="relative">
              <div className="w-40 h-40 rounded-[2.5rem] bg-white p-2 shadow-xl shadow-blue-900/5">
                <div className="w-full h-full rounded-[2rem] bg-white flex items-center justify-center overflow-hidden border-4 border-white">
                  <img 
                    src={getFormalAvatar(profileData.prenom, profileData.nom)} 
                    alt={`Avatar ${profileData.prenom} ${profileData.nom}`}
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
              <div className="absolute bottom-4 right-4 w-8 h-8 rounded-full bg-emerald-400 border-4 border-white shadow-lg flex items-center justify-center">
                 <div className="w-2 h-2 rounded-full bg-white animate-pulse"></div>
              </div>
            </div>
            
            <div className="flex-1 space-y-2 mb-4">
              <div className="flex items-center gap-3">
                <h2 className="text-3xl font-black text-slate-800 uppercase italic tracking-tighter">
                  {profileData.prenom} {profileData.nom}
                </h2>
                <span className="px-3 py-1 bg-blue-50 text-blue-600/70 border border-blue-100 rounded-full text-[8px] font-black uppercase tracking-widest">
                  {profileData.structureType || 'Validateur Senior'}
                </span>
              </div>
              <p className="text-sm font-bold text-slate-400 flex items-center gap-2 uppercase tracking-wide">
                <i className="fas fa-building text-blue-200"></i> {profileData.structureName || profileData.structureCode || 'Ministère du Commerce'}
              </p>
              <div className="flex gap-4 pt-2 flex-wrap">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                   <i className="fas fa-code-branch text-blue-100"></i> Code: {profileData.structureCode || 'N/A'}
                </span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                   <i className="fas fa-tachometer-alt text-blue-100"></i> SLA: {profileData.slaTraitementJours} jours
                </span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                   <i className="fas fa-envelope text-blue-100"></i> {profileData.email}
                </span>
              </div>
            </div>

            <div className="flex gap-3 mb-4">
              <button 
                onClick={() => setIsEditing(true)}
                className="px-6 py-3 bg-white border border-blue-100 text-blue-600 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-sm hover:bg-blue-50 transition-all font-sans"
              >
                Modifier Profil
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-8 border-t border-slate-50">
             {profileStats.map((stat, i) => (
                <div key={i} className="space-y-1">
                   <div className="flex items-center gap-2">
                      <div className={`w-6 h-6 rounded-lg ${stat.bg} ${stat.color} flex items-center justify-center text-[10px]`}>
                         <i className={`fas ${stat.icon}`}></i>
                      </div>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</span>
                   </div>
                   <div className="text-2xl font-black text-slate-700 italic tracking-tighter pl-8">{stat.value}</div>
                </div>
             ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Left: Professional Info - inchangé */}
        <div className="lg:col-span-2 space-y-10">
          <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-slate-100">
            <h3 className="text-lg font-black italic text-slate-700 uppercase tracking-tighter mb-8 flex items-center gap-3">
               <i className="fas fa-briefcase text-blue-300"></i> Informations Professionnelles
            </h3>
            <div className="space-y-4 text-[11px]">
                <div className="flex justify-between border-b border-slate-50 pb-3">
                  <span className="text-slate-400 font-black uppercase tracking-widest">Autorité</span>
                  <span className="font-black text-slate-600 uppercase italic tracking-tight">{profileData.structureName || profileData.structureType || 'Non défini'}</span>
                </div>
                <div className="flex justify-between border-b border-slate-50 pb-3">
                  <span className="text-slate-400 font-black uppercase tracking-widest">Code Ministère</span>
                  <span className="font-black text-slate-600 uppercase italic tracking-tight">{profileData.structureCode || 'Non défini'}</span>
                </div>
                <div className="flex justify-between border-b border-slate-50 pb-3">
                  <span className="text-slate-400 font-black uppercase tracking-widest">Type d'Autorité</span>
                  <span className="font-black text-slate-600 uppercase italic tracking-tight">{profileData.structureType || 'Non défini'}</span>
                </div>
                <div className="flex justify-between border-b border-slate-50 pb-3">
                  <span className="text-slate-400 font-black uppercase tracking-widest">Délai SLA (jours)</span>
                  <span className="font-black text-blue-500/70 uppercase tracking-widest">{profileData.slaTraitementJours} jours</span>
                </div>
                <div className="flex justify-between border-b border-slate-50 pb-3">
                  <span className="text-slate-400 font-black uppercase tracking-widest">Poste</span>
                  <span className="font-black text-slate-600 uppercase italic tracking-tight">{profileData.poste || 'Non défini'}</span>
                </div>
                <div className="flex justify-between border-b border-slate-50 pb-3">
                  <span className="text-slate-400 font-black uppercase tracking-widest">Statut du Compte</span>
                  <span className={`font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${
                    profileData.statut === 'ACTIF' ? 'text-emerald-600 bg-emerald-50' : 'text-amber-600 bg-amber-50'
                  }`}>
                    {profileData.statut === 'ACTIF' ? 'ACTIF' : 'INACTIF'}
                  </span>
                </div>
                <div className="flex justify-between border-b border-slate-50 pb-3">
                  <span className="text-slate-400 font-black uppercase tracking-widest">Téléphone</span>
                  <span className="font-black text-slate-600">{profileData.telephone || 'Non défini'}</span>
                </div>
            </div>
          </div>

          {/* ✅ SECTION ACTIVITÉ RÉCENTE - SEULE PARTIE MODIFIÉE */}
          <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-slate-100">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-lg font-black italic text-slate-700 uppercase tracking-tighter flex items-center gap-3">
                <i className="fas fa-shield-halved text-blue-300"></i> Activité Récente de Validation
              </h3>
              <button 
                onClick={fetchRecentActivities}
                className="text-[8px] font-black uppercase tracking-widest text-slate-400 hover:text-tunisia-red transition-all"
              >
                <i className="fas fa-sync-alt mr-1"></i> Rafraîchir
              </button>
            </div>
            
            {loadingActivities ? (
              <div className="flex justify-center items-center py-12">
                <i className="fas fa-spinner fa-spin text-tunisia-red text-xl"></i>
              </div>
            ) : recentActivities.length > 0 ? (
              <div className="space-y-4">
                {recentActivities.map((act, i) => (
                  <div key={i} className="flex items-center justify-between p-5 bg-slate-50/30 hover:bg-blue-50/20 transition-all rounded-3xl border border-slate-50">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center ${
                        act.status === 'APPROUVÉ' ? 'text-emerald-500' : 
                        act.status === 'REJETÉ' ? 'text-red-500' : 'text-amber-500'
                      }`}>
                        <i className={`fas ${
                          act.status === 'APPROUVÉ' ? 'fa-check-circle' : 
                          act.status === 'REJETÉ' ? 'fa-times-circle' : 'fa-question-circle'
                        }`}></i>
                      </div>
                      <div>
                        <p className="text-xs font-black text-slate-700 italic tracking-tight uppercase">{act.reference || 'N/A'}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{act.description}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`text-[8px] font-black uppercase tracking-widest px-3 py-1 rounded-full border mb-1 block ${getStatusClass(act.status)}`}>
                        {act.status === 'APPROUVÉ' ? 'Approuvé' : act.status === 'REJETÉ' ? 'Rejeté' : 'Info requise'}
                      </span>
                      <span className="text-[8px] font-black uppercase tracking-widest text-slate-300 italic">{act.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <i className="fas fa-inbox text-2xl text-slate-300"></i>
                </div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Aucune activité récente
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Security & Settings - inchangé */}
        <div className="space-y-10">
          <div className="bg-blue-50/30 border border-blue-100/50 p-10 rounded-[3rem] relative overflow-hidden">
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-blue-400/5 rounded-full blur-3xl"></div>
            <h3 className="text-lg font-black italic text-slate-700 uppercase tracking-tighter mb-8 flex items-center gap-3">
               <i className="fas fa-key text-blue-300"></i> Sécurité & Accès
            </h3>
            <div className="space-y-6">
               <button 
                onClick={() => setIsChangingPwd(true)}
                className="w-full p-6 bg-white border border-blue-50 rounded-[2rem] flex items-center justify-between hover:bg-blue-50/50 transition-all group shadow-sm"
               >
                  <div className="flex items-center gap-4 text-left">
                     <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-400 flex items-center justify-center">
                        <i className="fas fa-lock text-sm"></i>
                     </div>
                     <div>
                        <p className="text-xs font-black text-slate-700 uppercase tracking-tight italic">Mot de passe</p>
                        <p className="text-[8px] font-black text-blue-400/60 uppercase tracking-widest">Changer le mdp</p>
                     </div>
                  </div>
                  <i className="fas fa-chevron-right text-[10px] text-blue-200 group-hover:text-blue-400 transition-all"></i>
               </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ValidatorProfile;