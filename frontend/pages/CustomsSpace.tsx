import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import { motion, AnimatePresence } from 'motion/react';
import { getFormalAvatar } from '../utils/avatarService';
import ResetPasswordForm from '../components/ResetPasswordForm';
import axios from 'axios';

interface CustomsUserProfile {
  id: number;
  email: string;
  role: string;
  nom: string;
  prenom: string;
  telephone: string;
  poste: string;
  structureName: string;
  structureCode: string;
  structureType: string;
  statut: string;
  lastLogin: string;
  dateCreation: string;
}

interface ProfileStat {
  label: string;
  value: string | number;
  icon: string;
  color: string;
  bg: string;
}

const CustomsSpace: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [searchRef, setSearchRef] = useState('');
  const [searchResult, setSearchResult] = useState<any>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  
  // Profile states
  const [profileData, setProfileData] = useState<CustomsUserProfile>({
    id: 0,
    email: '',
    role: '',
    nom: '',
    prenom: '',
    telephone: '',
    poste: '',
    structureName: '',
    structureCode: '',
    structureType: '',
    statut: '',
    lastLogin: '',
    dateCreation: ''
  });
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isChangingPwd, setIsChangingPwd] = useState(false);

  const sidebarItems = [
    { id: 'dashboard', label: 'Tableau de Bord', icon: 'fa-chart-line' },
    { id: 'verifier', label: 'Vérificateur de Cas', icon: 'fa-shield-check' },
    { id: 'profile', label: 'Mon Profil', icon: 'fa-user-circle' },
  ];

  // Charger le profil
  useEffect(() => {
    fetchProfileData();
  }, []);

  const fetchProfileData = async () => {
    try {
      setLoadingProfile(true);
      const token = localStorage.getItem('token');
      
      if (!token) {
        console.error('Token non trouvé');
        setLoadingProfile(false);
        return;
      }

      const response = await axios.get('http://localhost:8080/api/auth/profile', {
        headers: { Authorization: `Bearer ${token}` }
      });

      const data = response.data;
      console.log('******Données de profil reçues:', data);
      
      if (data.success && data.user) {
        setProfileData({
          id: data.user.id || 0,
          email: data.user.email || '',
          role: data.user.role || 'DOUANE',
          nom: data.user.nom || '',
          prenom: data.user.prenom || '',
          telephone: data.user.telephone || '',
          poste: data.user.poste || 'Officier de Douane',
          structureName: data.user.structureName || 'Direction Générale des Douanes',
          structureCode: data.user.structureCode || 'DC',
          structureType: data.user.structureType || 'CUSTOMS',
          statut: data.user.statut || 'ACTIF',
          lastLogin: data.user.lastLogin || '',
          dateCreation: data.user.dateCreation || ''
        });
      }
    } catch (error) {
      console.error('Erreur chargement profil:', error);
    } finally {
      setLoadingProfile(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingProfile(true);
    
    try {
      const token = localStorage.getItem('token');
      const requestBody = {
        nom: profileData.nom,
        prenom: profileData.prenom,
        telephone: profileData.telephone,
        poste: profileData.poste
      };

      const response = await axios.put('http://localhost:8080/api/auth/update-profile', requestBody, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.data.user) {
        setProfileData({
          ...profileData,
          nom: response.data.user.nom || profileData.nom,
          prenom: response.data.user.prenom || profileData.prenom,
          telephone: response.data.user.telephone || profileData.telephone,
          poste: response.data.user.poste || profileData.poste
        });
      }
      
      setIsEditing(false);
    } catch (err: any) {
      console.error('Erreur mise à jour:', err);
    } finally {
      setLoadingProfile(false);
    }
  };

  const profileStats: ProfileStat[] = [
    { label: 'Vérifications', value: '1,245', icon: 'fa-shield-check', color: 'text-emerald-500', bg: 'bg-emerald-50' },
    { label: 'Temps Moyen', value: '4m 30s', icon: 'fa-bolt', color: 'text-amber-500', bg: 'bg-amber-50' },
    { label: 'Signalements', value: '45', icon: 'fa-flag', color: 'text-blue-500', bg: 'bg-blue-50' },
    { label: 'Membre depuis', value: profileData.dateCreation ? new Date(profileData.dateCreation).toLocaleDateString('fr-FR') : 'N/A', icon: 'fa-calendar', color: 'text-purple-500', bg: 'bg-purple-50' },
  ];



  const handleSearch = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!searchRef.trim()) return;
  
  setIsSearching(true);
  setSearchResult(null);
  setError(null);
  
  try {
    const token = localStorage.getItem('token');
    const response = await axios.get(
      `http://localhost:8080/api/douane/verify/${encodeURIComponent(searchRef)}`,
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );
    
    const data = response.data;
    console.log('Résultat vérification:', data);
    
    if (data.success && data.data) {
      const backendData = data.data;
      
      // Transformer les données backend au format attendu par le frontend
      const formattedResult = {
        type: backendData.typeDemande === 'REGISTRATION' ? 'Exportateur' : 'Déclaration Produit',
        name: backendData.exportateurRaisonSociale || 'N/A',
        manager: backendData.exportateurRepresentantLegal || backendData.exportateurNom + ' ' + backendData.exportateurPrenom || 'N/A',
        status: backendData.status === 'VALIDEE' ? 'VALIDÉ' : backendData.status,
        country: backendData.exportateurPaysOrigine || 'Tunisie',
        hsCode: backendData.products && backendData.products.length > 0 ? backendData.products[0].hsCode : null,
        products: backendData.products ? backendData.products.map((p: any) => p.productName) : [],
        numeroAgrement: backendData.numeroAgrement,
        dateAgrement: backendData.dateAgrement,
        submittedAt: backendData.submittedAt,
        decisionDate: backendData.decisionDate,
        decisionComment: backendData.decisionComment,
        // Informations complètes exportateur
        raisonSociale: backendData.exportateurRaisonSociale,
        numeroRegistreCommerce: backendData.exportateurNumeroRegistreCommerce,
        ville: backendData.exportateurVille,
        adresseLegale: backendData.exportateurAdresseLegale,
        email: backendData.exportateurEmail,
        telephone: backendData.exportateurTelephone,
        representantLegal: backendData.exportateurRepresentantLegal
      };
      setSearchResult(formattedResult);
    } else {
      setSearchResult('NOT_FOUND');
    }
  } catch (error: any) {
    console.error('Erreur vérification:', error);
    setSearchResult('NOT_FOUND');
    if (error.response?.status === 403) {
      setError('Accès non autorisé. Vous devez être agent douanier.');
    }
  } finally {
    setIsSearching(false);
  }
};

  const renderDashboard = () => (
    <div className="space-y-8 animate-fade-in">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: 'Dossiers Vérifiés', value: '1,245', icon: 'fa-folder-check', color: 'emerald' },
          { label: 'Anomalies Détectées', value: '34', icon: 'fa-triangle-exclamation', color: 'tunisia-red' },
          { label: 'Contrôles en Cours', value: '18', icon: 'fa-clock', color: 'amber' }
        ].map((stat, i) => (
          <div key={i} className="p-8 bg-white rounded-[2.5rem] shadow-sm border border-slate-100 relative overflow-hidden group">
            <div className={`absolute top-0 right-0 w-24 h-24 bg-${stat.color}-500 opacity-5 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl group-hover:scale-150 transition-transform`}></div>
            <div className="flex items-center gap-4 mb-4">
              <div className={`w-12 h-12 rounded-2xl bg-${stat.color}-50 flex items-center justify-center text-${stat.color === 'tunisia-red' ? 'tunisia-red' : stat.color + '-600'}`}>
                <i className={`fas ${stat.icon} text-xl`}></i>
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{stat.label}</span>
            </div>
            <p className="text-3xl font-black italic text-slate-900">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
        <h3 className="text-sm font-black uppercase italic mb-8 flex items-center gap-2">
          <i className="fas fa-activity text-tunisia-red"></i> Activité Récente de la Douane
        </h3>
        <div className="space-y-4">
          {[
            { time: 'Il y a 5 min', action: 'Vérification terminée', ref: 'REF-EXP-2025-001', status: 'OK' },
            { time: 'Il y a 12 min', action: 'Scan IA effectué', ref: 'INV-449', status: 'WARN' },
            { time: 'Il y a 45 min', action: 'Nouveau dossier soumis', ref: 'DEC-887', status: 'NEW' }
          ].map((log, i) => (
            <div key={i} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 group hover:border-tunisia-red/20 transition-all">
              <div className="flex items-center gap-4">
                <span className="text-[8px] font-black uppercase text-slate-400 w-20">{log.time}</span>
                <div>
                  <p className="text-[10px] font-black text-slate-900 uppercase">{log.action}</p>
                  <p className="text-[8px] font-bold text-slate-400">{log.ref}</p>
                </div>
              </div>
              <div className={`px-3 py-1 rounded-full text-[8px] font-black uppercase ${
                log.status === 'OK' ? 'bg-emerald-100 text-emerald-600' : 
                log.status === 'WARN' ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600'
              }`}>
                {log.status}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderVerifier = () => (
    <div className="space-y-8 animate-fade-in max-w-4xl mx-auto py-10">
      <div className="text-center space-y-4 mb-12">
        <div className="w-20 h-20 bg-slate-900 border-4 border-slate-800 text-white rounded-[2rem] flex items-center justify-center mx-auto shadow-2xl mb-8">
          <i className="fas fa-microchip text-3xl"></i>
        </div>
        <h2 className="text-2xl font-black italic uppercase tracking-tighter text-slate-900">Vérificateur Central de Cas</h2>
        <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Saisissez une référence pour authentifier un dossier ou une déclaration</p>
      </div>

      <form onSubmit={handleSearch} className="relative group max-w-2xl mx-auto">
        <input 
          type="text" 
          value={searchRef}
          onChange={(e) => setSearchRef(e.target.value.toUpperCase())}
          placeholder="EX: REF-EXP-2025-001"
          className="w-full pl-8 pr-32 py-8 bg-white border-2 border-slate-100 rounded-[2rem] shadow-xl text-lg font-black uppercase tracking-widest outline-none focus:border-tunisia-red transition-all"
        />
        <button 
           disabled={!searchRef || isSearching}
           className="absolute right-3 top-1/2 -translate-y-1/2 px-8 py-5 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-tunisia-red transition-all shadow-lg disabled:opacity-50"
        >
          {isSearching ? <i className="fas fa-spinner fa-spin"></i> : 'Vérifier'}
        </button>
      </form>

      <AnimatePresence mode="wait">
        {searchResult === 'NOT_FOUND' && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-red-50 border-2 border-red-100 p-10 rounded-[3rem] text-center space-y-4"
          >
            <div className="text-4xl text-tunisia-red mb-4">🚫</div>
            <h4 className="text-lg font-black uppercase text-tunisia-red italic">Référence Inexistante</h4>
            <p className="text-xs font-bold text-red-400 uppercase tracking-widest">Aucun dossier correspondant dans la base douanière nationale</p>
          </motion.div>
        )}

        {searchResult && searchResult !== 'NOT_FOUND' && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-white border-2 border-slate-100 p-10 rounded-[3rem] shadow-2xl space-y-8"
          >
            <div className="flex justify-between items-start border-b border-slate-50 pb-8">
              <div>
                <span className="px-4 py-2 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-black uppercase tracking-widest mb-4 inline-block">
                  <i className="fas fa-check-circle mr-2"></i> {searchResult.status}
                </span>
                <h3 className="text-2xl font-black italic text-slate-900 uppercase tracking-tighter">{searchResult.name}</h3>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Type: {searchResult.type}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Référence Interne</p>
                <p className="text-xl font-black text-slate-900">{searchRef}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              <div className="space-y-6">
                <h5 className="text-[10px] font-black uppercase tracking-widest text-tunisia-red">Détails de l'Entité</h5>
                <div className="space-y-4">
                  <div className="flex justify-between p-3 bg-slate-50 rounded-xl">
                    <span className="text-[10px] font-bold text-slate-400 italic">Responsable</span>
                    <span className="text-[10px] font-black text-slate-900">{searchResult.manager || searchResult.exporter}</span>
                  </div>
                  {searchResult.country && (
                    <div className="flex justify-between p-3 bg-slate-50 rounded-xl">
                      <span className="text-[10px] font-bold text-slate-400 italic">Pays d'Origine</span>
                      <span className="text-[10px] font-black text-slate-900">{searchResult.country}</span>
                    </div>
                  )}
                  {searchResult.hsCode && (
                    <div className="flex justify-between p-3 bg-slate-50 rounded-xl">
                      <span className="text-[10px] font-bold text-slate-400 italic">Code SH</span>
                      <span className="text-[10px] font-black text-slate-900">{searchResult.hsCode}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-6">
                <h5 className="text-[10px] font-black uppercase tracking-widest text-tunisia-red">Produits Associés</h5>
                <div className="flex flex-wrap gap-2">
                  {searchResult.products.map((p: string, i: number) => (
                    <span key={i} className="px-4 py-2 bg-slate-900 text-white rounded-xl text-[9px] font-black uppercase tracking-tight">
                      {p}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  const renderProfile = () => {
    if (loadingProfile && !profileData.email) {
      return (
        <div className="flex justify-center items-center h-64">
          <i className="fas fa-spinner fa-spin text-tunisia-red text-3xl"></i>
          <span className="ml-3 text-sm font-bold text-slate-400">Chargement du profil...</span>
        </div>
      );
    }

    return (
      <div className="space-y-8 animate-fade-in pb-20">
        {/* Modal d'édition */}
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
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Poste / Fonction</label>
                    <input 
                      type="text" 
                      value={profileData.poste}
                      onChange={(e) => setProfileData({...profileData, poste: e.target.value})}
                      className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-50 rounded-2xl text-xs font-bold outline-none focus:border-tunisia-red transition-all"
                      placeholder="Ex: Officier de Douane"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Nom Officiel de la Structure</label>
                    <input 
                      type="text" 
                      value={profileData.structureName}
                      disabled
                      className="w-full px-6 py-4 bg-slate-100 border-2 border-slate-50 rounded-2xl text-xs font-bold cursor-not-allowed opacity-70"
                    />
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

          {/* Modal changement mot de passe */}
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
        </AnimatePresence>

        {/* Carte d'identité */}
        <div className="bg-white rounded-[3rem] shadow-sm border border-slate-100 overflow-hidden relative">
          <div className="h-48 bg-gradient-to-r from-slate-800 to-slate-900 relative">
            <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-blue-400 via-transparent to-transparent"></div>
            <div className="absolute bottom-0 left-0 w-full h-24 bg-gradient-to-t from-white to-transparent"></div>
          </div>
          
          <div className="px-12 pb-12 relative -mt-20">
            <div className="flex flex-col md:flex-row items-end gap-8 mb-8">
              <div className="relative">
                <div className="w-40 h-40 rounded-[2.5rem] bg-white p-2 shadow-xl shadow-blue-900/5">
                  <div className="w-full h-full rounded-[2rem] bg-white flex items-center justify-center overflow-hidden border-4 border-white">
                    <img 
                      src={getFormalAvatar(profileData.prenom, profileData.nom, 'douane')} 
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
                <div className="flex items-center gap-3 flex-wrap">
                  <h2 className="text-3xl font-black text-slate-800 uppercase italic tracking-tighter">
                    {profileData.prenom} {profileData.nom}
                  </h2>
                  <span className="px-3 py-1 bg-tunisia-red/10 text-tunisia-red border border-tunisia-red/10 rounded-full text-[8px] font-black uppercase tracking-widest">
                    {profileData.poste || 'Officier de Douane'}
                  </span>
                </div>
                <p className="text-sm font-bold text-slate-400 flex items-center gap-2 uppercase tracking-wide">
                  <i className="fas fa-building text-slate-200"></i> 
                  {profileData.structureName} &bull; Code: {profileData.structureCode}
                </p>
                <div className="flex gap-4 pt-2 flex-wrap">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <i className="fas fa-code-branch text-slate-200"></i> Code: {profileData.structureCode}
                  </span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <i className="fas fa-envelope text-slate-200"></i> {profileData.email}
                  </span>
                </div>
              </div>

              <div className="flex gap-3 mb-4">
                <button 
                  onClick={() => setIsEditing(true)}
                  className="px-6 py-3 bg-white border border-slate-200 text-slate-600 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-sm hover:bg-slate-50 transition-all"
                >
                  <i className="fas fa-edit mr-2"></i> Modifier Profil
                </button>
              </div>
            </div>

            {/* Statistiques */}
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

        {/* Informations détaillées */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Informations professionnelles */}
          <div className="lg:col-span-2 bg-white p-10 rounded-[3rem] shadow-sm border border-slate-100">
            <h3 className="text-lg font-black italic text-slate-700 uppercase tracking-tighter mb-8 flex items-center gap-3">
              <i className="fas fa-briefcase text-tunisia-red"></i> Informations Professionnelles
            </h3>
            <div className="space-y-4 text-[11px]">
              <div className="flex justify-between border-b border-slate-50 pb-3">
                <span className="text-slate-400 font-black uppercase tracking-widest">Structure</span>
                <span className="font-black text-slate-600 uppercase italic tracking-tight">{profileData.structureName}</span>
              </div>
              <div className="flex justify-between border-b border-slate-50 pb-3">
                <span className="text-slate-400 font-black uppercase tracking-widest">Code Structure</span>
                <span className="font-black text-slate-600 uppercase italic tracking-tight">{profileData.structureCode}</span>
              </div>
              <div className="flex justify-between border-b border-slate-50 pb-3">
                <span className="text-slate-400 font-black uppercase tracking-widest">Type d'Autorité</span>
                <span className="font-black text-slate-600 uppercase italic tracking-tight">Douane Tunisienne</span>
              </div>
              <div className="flex justify-between border-b border-slate-50 pb-3">
                <span className="text-slate-400 font-black uppercase tracking-widest">Poste</span>
                <span className="font-black text-slate-600 uppercase italic tracking-tight">{profileData.poste || 'Officier de Douane'}</span>
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
                <span className="font-black text-slate-600">{profileData.telephone || 'Non renseigné'}</span>
              </div>
              <div className="flex justify-between border-b border-slate-50 pb-3">
                <span className="text-slate-400 font-black uppercase tracking-widest">Dernière connexion</span>
                <span className="font-black text-slate-600">
                  {profileData.lastLogin ? new Date(profileData.lastLogin).toLocaleString('fr-FR') : 'Première connexion'}
                </span>
              </div>
            </div>
          </div>

          {/* Sécurité */}
          <div className="space-y-8">
            <div className="bg-slate-50/50 border border-slate-100 p-10 rounded-[3rem] relative overflow-hidden">
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-tunisia-red/5 rounded-full blur-3xl"></div>
              <h3 className="text-lg font-black italic text-slate-700 uppercase tracking-tighter mb-8 flex items-center gap-3">
                <i className="fas fa-key text-tunisia-red"></i> Sécurité & Accès
              </h3>
              <div className="space-y-6">
                <button 
                  onClick={() => setIsChangingPwd(true)}
                  className="w-full p-6 bg-white border border-slate-100 rounded-[2rem] flex items-center justify-between hover:bg-slate-50 transition-all group shadow-sm"
                >
                  <div className="flex items-center gap-4 text-left">
                    <div className="w-10 h-10 rounded-xl bg-tunisia-red/10 text-tunisia-red flex items-center justify-center">
                      <i className="fas fa-lock text-sm"></i>
                    </div>
                    <div>
                      <p className="text-xs font-black text-slate-700 uppercase tracking-tight italic">Mot de passe</p>
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Changer le mot de passe</p>
                    </div>
                  </div>
                  <i className="fas fa-chevron-right text-[10px] text-slate-300 group-hover:text-tunisia-red transition-all"></i>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar 
        activeTab={activeTab} 
        onTabChange={setActiveTab} 
        items={sidebarItems} 
        title="Douane Tunisienne" 
        subtitle="Espace Vérificateur Central" 
        icon="fa-shield-halved"
      />
      
      <main className="flex-1 p-12 overflow-y-auto">
        <header className="flex justify-between items-center mb-12 bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
          <div>
            <h2 className="text-xl font-black uppercase italic tracking-tighter text-slate-900">
              Bonjour, <span className="text-tunisia-red">{profileData.prenom || 'Officier'}</span>
            </h2>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1">
              {profileData.structureName}
            </p>
          </div>
          <div className="flex gap-4">
            <button className="w-12 h-12 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center hover:text-tunisia-red transition-colors border border-slate-100">
              <i className="fas fa-bell"></i>
            </button>
            <div className="w-12 h-12 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center border border-slate-100 overflow-hidden">
              <img 
                src={getFormalAvatar(profileData.prenom, profileData.nom, 'douane')} 
                alt="Avatar"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </header>

        {activeTab === 'dashboard' && renderDashboard()}
        {activeTab === 'verifier' && renderVerifier()}
        {activeTab === 'profile' && renderProfile()}
      </main>
    </div>
  );
};

export default CustomsSpace;