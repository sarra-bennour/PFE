import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import ResetPasswordForm from '../../components/ResetPasswordForm';

interface ProfileStat {
  label: string;
  value: string | number;
  icon: string;
  color: string;
  bg: string;
}

const ValidatorProfile: React.FC = () => {
  const [isEditing, setIsEditing] = useState(false);
  const [isChangingPwd, setIsChangingPwd] = useState(false);
  const [isDeclaringAbsence, setIsDeclaringAbsence] = useState(false);
  
  const [profileData, setProfileData] = useState({
    name: 'Ahmed Trabelsi',
    email: 'a.trabelsi@commerce.gov.tn',
    phone: '+216 71 888 222',
    currentPost: 'Chef de service Validation',
    institution: 'Ministère du Commerce',
    direction: 'Direction des Agrégats',
    id: 'VAL-TUN-88229'
  });

  const [absenceData, setAbsenceData] = useState({
    startDate: '',
    endDate: '',
    reason: ''
  });

  const profileStats: ProfileStat[] = [
    { label: 'Dossiers Traités', value: '1,428', icon: 'fa-box-archive', color: 'text-emerald-500', bg: 'bg-emerald-50' },
    { label: 'Temps Moyen', value: '18m', icon: 'fa-bolt', color: 'text-amber-500', bg: 'bg-amber-50' },
    { label: 'Taux Approbation', value: '84%', icon: 'fa-check-double', color: 'text-blue-500', bg: 'bg-blue-50' },
    { label: 'Score Qualité', value: '4.9/5', icon: 'fa-star', color: 'text-purple-500', bg: 'bg-purple-50' },
  ];

  const handleUpdateProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setIsEditing(false);
  };

  return (
    <div className="space-y-10 animate-fade-in pb-20">
      
      {/* Modals */}
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
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Nom Complet</label>
                    <input 
                      type="text" 
                      value={profileData.name}
                      onChange={(e) => setProfileData({...profileData, name: e.target.value})}
                      className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-50 rounded-2xl text-xs font-bold outline-none focus:border-tunisia-red transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Poste</label>
                    <input 
                      type="text" 
                      value={profileData.currentPost}
                      onChange={(e) => setProfileData({...profileData, currentPost: e.target.value})}
                      className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-50 rounded-2xl text-xs font-bold outline-none focus:border-tunisia-red transition-all"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">E-mail Professionnel</label>
                  <input 
                    type="email" 
                    value={profileData.email}
                    onChange={(e) => setProfileData({...profileData, email: e.target.value})}
                    className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-50 rounded-2xl text-xs font-bold outline-none focus:border-tunisia-red transition-all"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4 pt-4">
                  <button type="button" onClick={() => setIsEditing(false)} className="py-4 bg-slate-100 text-slate-400 rounded-2xl text-[10px] font-black uppercase tracking-widest">Annuler</button>
                  <button type="submit" className="py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl">Enregistrer</button>
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
                    <input type="date" className="w-full px-6 py-4 bg-slate-50 rounded-2xl text-xs font-bold outline-none border-2 border-slate-50 focus:border-tunisia-red transition-all" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Date de fin</label>
                    <input type="date" className="w-full px-6 py-4 bg-slate-50 rounded-2xl text-xs font-bold outline-none border-2 border-slate-50 focus:border-tunisia-red transition-all" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Motif</label>
                  <select className="w-full px-6 py-4 bg-slate-50 rounded-2xl text-xs font-bold outline-none border-2 border-slate-50 focus:border-tunisia-red transition-all appearance-none">
                    <option>Congé Annuel</option>
                    <option>Maladie</option>
                    <option>Formation</option>
                    <option>Autre</option>
                  </select>
                </div>
                <button onClick={() => setIsDeclaringAbsence(false)} className="w-full py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl">Confirmer Absence</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Profile Header Card */}
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
                <div className="w-full h-full rounded-[2rem] bg-blue-50/30 flex items-center justify-center overflow-hidden border-4 border-white">
                  <i className="fas fa-user-tie text-6xl text-blue-200"></i>
                </div>
              </div>
              <div className="absolute bottom-4 right-4 w-8 h-8 rounded-full bg-emerald-400 border-4 border-white shadow-lg flex items-center justify-center">
                 <div className="w-2 h-2 rounded-full bg-white animate-pulse"></div>
              </div>
            </div>
            
            <div className="flex-1 space-y-2 mb-4">
              <div className="flex items-center gap-3">
                <h2 className="text-3xl font-black text-slate-800 uppercase italic tracking-tighter">{profileData.name}</h2>
                <span className="px-3 py-1 bg-blue-50 text-blue-600/70 border border-blue-100 rounded-full text-[8px] font-black uppercase tracking-widest">Validateur Senior</span>
              </div>
              <p className="text-sm font-bold text-slate-400 flex items-center gap-2 uppercase tracking-wide">
                <i className="fas fa-building text-blue-200"></i> {profileData.institution} &bull; {profileData.direction}
              </p>
              <div className="flex gap-4 pt-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                   <i className="fas fa-id-card text-blue-100"></i> ID: {profileData.id}
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
        {/* Left: Professional Info */}
        <div className="lg:col-span-2 space-y-10">
          <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-slate-100">
            <h3 className="text-lg font-black italic text-slate-700 uppercase tracking-tighter mb-8 flex items-center gap-3">
               <i className="fas fa-briefcase text-blue-300"></i> Informations Professionnelles
            </h3>
            <div className="space-y-4 text-[11px]">
                <div className="flex justify-between border-b border-slate-50 pb-3">
                  <span className="text-slate-400 font-black uppercase tracking-widest">Poste Actuel</span>
                  <span className="font-black text-slate-600 uppercase italic tracking-tight">{profileData.currentPost}</span>
                </div>
                <div className="flex justify-between border-b border-slate-50 pb-3">
                  <span className="text-slate-400 font-black uppercase tracking-widest">Niveau d'Accès</span>
                  <span className="font-black text-blue-500/70 uppercase tracking-widest bg-blue-50/50 px-2 py-0.5 rounded-md border border-blue-100/50">Niveau 3 - Souverain</span>
                </div>
                <div className="flex justify-between border-b border-slate-50 pb-3">
                  <span className="text-slate-400 font-black uppercase tracking-widest">Mobile ID (TunTrust)</span>
                  <span className="font-black text-emerald-500/80 uppercase tracking-widest flex items-center gap-2">
                      <i className="fas fa-lock text-blue-200"></i> LIÉ
                  </span>
                </div>
            </div>
          </div>

          <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-slate-100">
            <h3 className="text-lg font-black italic text-slate-700 uppercase tracking-tighter mb-8 flex items-center gap-3">
               <i className="fas fa-shield-halved text-blue-300"></i> Activité Récente de Validation
            </h3>
            <div className="space-y-4">
               {[
                 { ref: 'IMP-2024-991', desc: 'Importation Sucre', status: 'APPROUVÉ', time: 'Il y a 2h' },
                 { ref: 'REG-2024-105', desc: 'Enregistrement Exportateur', status: 'EN ATTENTE INFO', time: 'Il y a 4h' },
                 { ref: 'IMP-2024-882', desc: 'Produits Industriels', status: 'REJETÉ', time: 'Hier' },
               ].map((act, i) => (
                 <div key={i} className="flex items-center justify-between p-5 bg-slate-50/30 hover:bg-blue-50/20 transition-all rounded-3xl border border-slate-50">
                   <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-blue-200">
                         <i className="fas fa-file-contract"></i>
                      </div>
                      <div>
                         <p className="text-xs font-black text-slate-700 italic tracking-tight uppercase">{act.ref}</p>
                         <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{act.desc}</p>
                      </div>
                   </div>
                   <div className="text-right">
                      <span className={`text-[8px] font-black uppercase tracking-widest px-3 py-1 rounded-full border mb-1 block ${
                        act.status === 'APPROUVÉ' ? 'bg-emerald-50/50 text-emerald-600/80 border-emerald-100/50' :
                        act.status === 'REJETÉ' ? 'bg-red-50/50 text-red-600/80 border-red-100/50' :
                        'bg-amber-50/50 text-amber-600/80 border-amber-100/50'
                      }`}>
                         {act.status}
                      </span>
                      <span className="text-[8px] font-black uppercase tracking-widest text-slate-300 italic">{act.time}</span>
                   </div>
                 </div>
               ))}
            </div>
          </div>
        </div>

        {/* Right Column: Security & Settings */}
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

          <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-slate-100">
            <h3 className="text-lg font-black italic text-slate-700 uppercase tracking-tighter mb-8">Disponibilité</h3>
            <div className="space-y-6">
               <div className="flex items-center justify-between p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100/50">
                  <div className="flex items-center gap-3">
                     <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
                     <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600/80">En Poste</span>
                  </div>
                  <div className="text-[10px] font-bold text-emerald-500/80 italic">Présent</div>
               </div>
               
               <button 
                onClick={() => setIsDeclaringAbsence(true)}
                className="w-full py-5 bg-white border border-blue-100 text-blue-600 rounded-2xl text-[9px] font-black uppercase tracking-widest shadow-sm hover:bg-blue-50 transition-all font-sans"
               >
                 Déclarer une absence <i className="fas fa-calendar-alt ml-2 text-blue-200"></i>
               </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ValidatorProfile;
