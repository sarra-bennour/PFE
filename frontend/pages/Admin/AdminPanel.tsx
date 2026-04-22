import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useAuth } from '../../App';
import Sidebar from '../../components/Sidebar';
import CreateUserForm from './CreateUserForm';
import UserManagement from './UserManagement';
import { InternalStructure, StructureType } from '../../types/InternalStructure';
import InternalStructureList from './InternalStructureList';
import InternalStructureForm from './InternalStructureForm';
import AdminRequestList from './AdminRequestList';
import axios from 'axios';

const AdminPanel: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'traffic' | 'security' | 'structures' | 'requests'>('overview');
  
  // État pour les structures
  const [structures, setStructures] = useState<InternalStructure[]>([]);
  const [loadingStructures, setLoadingStructures] = useState(false);
  
  // Modals state
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [loadingPassword, setLoadingPassword] = useState(false);
  const [showStructureForm, setShowStructureForm] = useState(false);
  const [selectedStructure, setSelectedStructure] = useState<InternalStructure | null>(null);
  const [users, setUsers] = useState<any[]>([]);

  const [loadingUsers, setLoadingUsers] = useState(false);

  // Fonction pour charger tous les utilisateurs
  const loadUsers = async () => {
    try {
      setLoadingUsers(true);
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:8080/api/admin/users', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.success) {
        setUsers(response.data.users);
        console.log('✅ Utilisateurs chargés:', response.data.users.length);
      } else {
        console.error('Erreur chargement utilisateurs:', response.data.error);
      }
    } catch (error) {
      console.error('Erreur API:', error);
    } finally {
      setLoadingUsers(false);
    }
  };

  // Appeler loadUsers au montage du composant ou quand l'onglet users est activé
  useEffect(() => {
    if (activeTab === 'users') {
      loadUsers();
    }
  }, [activeTab]);

  // Configuration API
  const API_URL = 'http://localhost:8080/api/admin/structures';
  
  const getAuthHeader = () => {
    const token = localStorage.getItem('token');
    return { Authorization: `Bearer ${token}` };
  };

  // Charger les structures depuis le backend
  const loadStructures = async () => {
    try {
      setLoadingStructures(true);
      const response = await axios.get(API_URL, { headers: getAuthHeader() });
      if (response.data.success) {
        setStructures(response.data.structures);
      } else {
        console.error('Erreur:', response.data.error);
      }
    } catch (error) {
      console.error('Erreur chargement structures:', error);
    } finally {
      setLoadingStructures(false);
    }
  };

  // Charger les structures au montage du composant et quand l'onglet structures est activé
  useEffect(() => {
    if (activeTab === 'structures') {
      loadStructures();
    }
  }, [activeTab]);

  // Créer une structure
  const handleCreateStructure = async (data: { type: StructureType; officialName: string }) => {
    try {
      const response = await axios.post(API_URL, data, { headers: getAuthHeader() });
      if (response.data.success) {
        setStructures(prev => [response.data.data, ...prev]);
        setShowStructureForm(false);
      } else {
        alert(response.data.error || 'Erreur lors de la création');
      }
    } catch (err: any) {
      console.error('Erreur création:', err);
      alert(err.response?.data?.error || 'Erreur lors de la création');
    }
  };

  // Mettre à jour une structure
  const handleUpdateStructure = async (id: number, data: { type: StructureType; officialName: string }) => {
    try {
      const response = await axios.put(`${API_URL}/${id}`, data, { headers: getAuthHeader() });
      if (response.data.success) {
        setStructures(prev => prev.map(s => s.id === id ? response.data.data : s));
        setShowStructureForm(false);
        setSelectedStructure(null);
      } else {
        alert(response.data.error || 'Erreur lors de la mise à jour');
      }
    } catch (err: any) {
      console.error('Erreur mise à jour:', err);
      alert(err.response?.data?.error || 'Erreur lors de la mise à jour');
    }
  };

  // Supprimer une structure (sans confirmation, gérée par le modal du composant enfant)
  const handleDeleteStructure = async (id: number) => {
    try {
      const response = await axios.delete(`${API_URL}/${id}/hard`, { headers: getAuthHeader() });
      if (response.data.success) {
        setStructures(prev => prev.filter(s => s.id !== id));
      } else {
        alert(response.data.error || 'Erreur lors de la suppression');
      }
    } catch (err: any) {
      console.error('Erreur suppression:', err);
      alert(err.response?.data?.error || 'Erreur lors de la suppression');
    }
  };

  const sidebarItems = [
    { id: 'overview', label: 'Surveillance', icon: 'fa-chart-line' },
    { id: 'users', label: 'Utilisateurs', icon: 'fa-user-cog' },
    { id: 'structures', label: 'Structures', icon: 'fa-sitemap' },
    { id: 'requests', label: 'Demandes', icon: 'fa-file-invoice' },
    { id: 'traffic', label: 'Flux Douanes', icon: 'fa-truck-moving' },
    { id: 'security', label: 'Sécurité', icon: 'fa-lock' },
    { id: 'dashboard', label: 'Décisionnel', icon: 'fa-shield-halved', path: '/dashboard' },
  ];

  const stats = [
    { label: "Utilisateurs Actifs", value: "4,281", icon: "fa-users", color: "text-blue-500", bg: "bg-blue-50" },
    { label: "Transactions (24h)", value: "1,240", icon: "fa-exchange-alt", color: "text-emerald-500", bg: "bg-emerald-50" },
    { label: "Alertes Sécurité", value: "02", icon: "fa-shield-virus", color: "text-tunisia-red", bg: "bg-red-50" },
    { label: "Dossiers en attente", value: "128", icon: "fa-folder-open", color: "text-amber-500", bg: "bg-amber-50" },
    { label: "Uptime Système", value: "99.98%", icon: "fa-bolt", color: "text-purple-500", bg: "bg-purple-50" },
  ];

  const borderNodes = [
    { id: 'rades', name: 'Port de Radès', type: 'Maritime', status: 'Intense', volume: 642, load: 88, lat: '20%', lon: '45%' },
    { id: 'goulette', name: 'La Goulette', type: 'Maritime/Passagers', status: 'Fluide', volume: 215, load: 34, lat: '15%', lon: '42%' },
    { id: 'carthage', name: 'Tunis-Carthage', type: 'Aérien', status: 'Optimal', volume: 185, load: 45, lat: '12%', lon: '46%' },
    { id: 'sfax', name: 'Port de Sfax', type: 'Maritime', status: 'Modéré', volume: 312, load: 62, lat: '55%', lon: '52%' },
    { id: 'melloula', name: 'Poste Melloula', type: 'Terrestre', status: 'Critique', volume: 92, load: 95, lat: '25%', lon: '15%' },
  ];

  const trafficData = [
    { name: '00:00', in: 40, out: 20 },
    { name: '04:00', in: 120, out: 45 },
    { name: '08:00', in: 450, out: 310 },
    { name: '12:00', in: 680, out: 590 },
    { name: '16:00', in: 520, out: 610 },
    { name: '20:00', in: 280, out: 340 },
  ];

  const structureStats = [
    { label: "Entités Totales", value: structures.length, icon: "fa-sitemap", color: "text-slate-900", bg: "bg-slate-100" },
    { label: "Utilisateurs Assignés", value: "1,248", icon: "fa-users-gear", color: "text-indigo-600", bg: "bg-indigo-50" },
    { label: "Temps de Réponse", value: "4.2m", icon: "fa-bolt", color: "text-amber-500", bg: "bg-amber-50" },
    { label: "Conformité SLA", value: "99.2%", icon: "fa-check-double", color: "text-emerald-500", bg: "bg-emerald-50" },
  ];

  // Fonction pour réinitialiser le mot de passe via l'API backend
  const handleResetPassword = async (u: any) => {
    const token = localStorage.getItem('token');
    
    // Vérifier si c'est un importateur
    if (u.role === 'IMPORTATEUR') {
      alert("Les importateurs n'utilisent pas de mot de passe.\nIls s'authentifient via Mobile ID.");
      return;
    }
    
    // Confirmation avant réinitialisation
    if (!window.confirm(`Êtes-vous sûr de vouloir réinitialiser le mot de passe de ${u.email} ?`)) {
      return;
    }
    
    setLoadingPassword(true);
    setSelectedUser(u);
    
    try {
      const response = await fetch(`http://localhost:8080/api/admin/users/${u.id}/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        // Récupérer le mot de passe généré depuis la réponse
        const tempPassword = data.newPassword || "Vérifiez votre email";
        setGeneratedPassword(tempPassword);
        setShowResetPassword(true);
      } else {
        alert(data.error || 'Erreur lors de la réinitialisation');
      }
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur de connexion au serveur');
    } finally {
      setLoadingPassword(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar 
        activeTab={activeTab}
        onTabChange={(tab) => setActiveTab(tab as any)}
        items={sidebarItems}
        title="Admin Panel"
        subtitle="Contrôle Souverain"
        icon="fa-shield-halved"
      />

      {/* Main Content */}
      <main className="flex-1 p-10 space-y-10 overflow-y-auto relative">
        
        {/* Modals / Overlays */}
        {showCreateUser && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-white w-full max-w-xl rounded-[3rem] shadow-2xl overflow-hidden border border-slate-100">
              <div className="p-10 border-b border-slate-50 bg-slate-50/30 flex justify-between items-center">
                <div>
                  <h3 className="text-2xl font-black italic text-slate-900 uppercase tracking-tighter">Nouvel Utilisateur</h3>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Enregistrement Officiel</p>
                </div>
                <button onClick={() => setShowCreateUser(false)} className="w-10 h-10 rounded-full bg-white border border-slate-100 flex items-center justify-center text-slate-400 hover:text-tunisia-red transition-all shadow-sm">
                  <i className="fas fa-times"></i>
                </button>
              </div>
              <div className="p-10 max-h-[70vh] overflow-y-auto scrollbar-hide">
                <CreateUserForm 
                  structures={structures}  // Changé de InternalStructure à structures
                  onSuccess={() => {
                    setShowCreateUser(false);
                    // Rafraîchir la liste des utilisateurs si nécessaire
                    loadUsers(); // Si vous avez une fonction pour recharger les utilisateurs
                  }}
                  onCancel={() => setShowCreateUser(false)}
                />
              </div>
            </div>
          </div>
        )}

        {showResetPassword && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-white w-full max-w-md rounded-[3rem] shadow-2xl overflow-hidden border border-slate-100">
              <div className="p-10 border-b border-slate-50 bg-slate-50/30 flex justify-between items-center">
                <div>
                  <h3 className="text-2xl font-black italic text-slate-900 uppercase tracking-tighter">Réinitialisation</h3>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Utilisateur: {selectedUser?.name || selectedUser?.email}</p>
                </div>
                <button onClick={() => setShowResetPassword(false)} className="w-10 h-10 rounded-full bg-white border border-slate-100 flex items-center justify-center text-slate-400 hover:text-tunisia-red transition-all shadow-sm">
                  <i className="fas fa-times"></i>
                </button>
              </div>
              <div className="p-10">
                <div className="space-y-6 text-center">
                  <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-emerald-100">
                    <i className="fas fa-envelope-circle-check text-3xl"></i>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Nouveau Mot de Passe Généré</p>
                    <div className="bg-slate-50 p-6 rounded-2xl border-2 border-dashed border-slate-200 group relative overflow-hidden">
                      <span className="text-xl md:text-2xl font-black text-slate-900 tracking-[0.5em] font-mono italic">{generatedPassword}</span>
                      <button 
                        onClick={() => {
                          navigator.clipboard.writeText(generatedPassword || '');
                          setCopied(true);
                          setTimeout(() => setCopied(false), 2000);
                        }}
                        className={`absolute right-4 top-1/2 -translate-y-1/2 transition-all ${copied ? 'text-emerald-500' : 'text-slate-300 hover:text-tunisia-red'}`}
                        title={copied ? "Copié !" : "Copier"}
                      >
                        <i className={`fas ${copied ? 'fa-check' : 'fa-copy'}`}></i>
                      </button>
                    </div>
                  </div>
                  <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                    <p className="text-[10px] font-bold text-blue-600 uppercase tracking-tight">
                      <i className="fas fa-info-circle mr-2"></i>
                      Un e-mail contenant ces identifiants a été envoyé à l'utilisateur.
                    </p>
                  </div>
                  <button 
                    onClick={() => setShowResetPassword(false)}
                    className="w-full py-4 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl hover:bg-slate-800 transition-all"
                  >
                    Terminer
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal Structure Form */}
        {showStructureForm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
            <InternalStructureForm 
              initialData={selectedStructure || undefined}
              onCancel={() => {
                setShowStructureForm(false);
                setSelectedStructure(null);
              }}
              onSuccess={(data) => {
                if (selectedStructure) {
                  handleUpdateStructure(selectedStructure.id, data);
                } else {
                  handleCreateStructure(data);
                }
              }}
            />
          </div>
        )}

        {/* Header Content */}
        <div className="flex justify-between items-end">
          <div>
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
              <i className="fas fa-home"></i>
              <i className="fas fa-chevron-right text-[8px]"></i>
              <span>Administration</span>
              <i className="fas fa-chevron-right text-[8px]"></i>
              <span className="text-tunisia-red">{activeTab}</span>
            </div>
            <h2 className="text-4xl font-black text-slate-900 uppercase italic tracking-tighter">
              {activeTab === 'overview' && "Tableau de Bord Stratégique"}
              {activeTab === 'users' && "Gestion des Utilisateurs"}
              {activeTab === 'structures' && "Structures Internes"}
              {activeTab === 'requests' && "Suivi des Demandes"}
              {activeTab === 'traffic' && "Surveillance des Flux"}
              {activeTab === 'security' && "Centre de Sécurité"}
            </h2>
          </div>
          
          <div className="flex gap-4">
            <button className="px-6 py-3 bg-white border border-slate-200 rounded-xl text-[9px] font-black uppercase tracking-widest text-slate-600 shadow-sm hover:bg-slate-50 transition-all">
              <i className="fas fa-download mr-2"></i> Rapport
            </button>
            {activeTab === 'users' && (
            <button 
              onClick={() => setShowCreateUser(true)}
              className="px-6 py-3 bg-slate-900 text-white rounded-xl text-[9px] font-black uppercase tracking-widest shadow-xl hover:bg-slate-800 transition-all"
            >
              <i className="fas fa-user-plus mr-2"></i> Créer Utilisateur
            </button>
            )}
            {activeTab === 'structures' && (
              <button 
                onClick={() => {
                  setSelectedStructure(null);
                  setShowStructureForm(true);
                }}
                className="px-6 py-3 bg-slate-900 text-white rounded-xl text-[9px] font-black uppercase tracking-widest shadow-xl hover:bg-slate-800 transition-all"
              >
                <i className="fas fa-plus mr-2"></i> Ajouter Structure
              </button>
            )}
          </div>
        </div>

        {/* Stats Grid or Deactivation Requests Carousel */}
        {activeTab !== 'users' && activeTab !== 'structures' ? (
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
            {stats.map((stat, i) => (
              <div key={i} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 group hover:shadow-md transition-all">
                <div className={`w-10 h-10 ${stat.bg} ${stat.color} rounded-xl flex items-center justify-center mb-4`}>
                  <i className={`fas ${stat.icon}`}></i>
                </div>
                <div className="text-2xl font-black text-slate-900 tracking-tighter italic">{stat.value}</div>
                <div className="text-[8px] font-black uppercase tracking-widest text-slate-400 mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        ) : activeTab === 'structures' ? (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {structureStats.map((stat, i) => (
              <div key={i} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 group hover:shadow-md transition-all">
                <div className={`w-10 h-10 ${stat.bg} ${stat.color} rounded-xl flex items-center justify-center mb-4`}>
                  <i className={`fas ${stat.icon}`}></i>
                </div>
                <div className="text-2xl font-black text-slate-900 tracking-tighter italic">{stat.value}</div>
                <div className="text-[8px] font-black uppercase tracking-widest text-slate-400 mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        ) : null}

        {/* Tab Content */}
        <div className="animate-fade-in">
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 bg-white p-10 rounded-[2.5rem] shadow-sm border border-slate-100">
                <div className="flex items-center justify-between mb-10">
                  <h3 className="text-lg font-black italic text-slate-900 uppercase tracking-tighter">Volume des Flux (24h)</h3>
                  <div className="flex gap-4">
                    <div className="flex items-center gap-2 text-[8px] font-black uppercase text-emerald-500"><div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div> Import</div>
                    <div className="flex items-center gap-2 text-[8px] font-black uppercase text-tunisia-red"><div className="w-1.5 h-1.5 bg-tunisia-red rounded-full"></div> Export</div>
                  </div>
                </div>
                <div className="h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trafficData}>
                      <defs>
                        <linearGradient id="colorIn" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/><stop offset="95%" stopColor="#10b981" stopOpacity={0}/></linearGradient>
                        <linearGradient id="colorOut" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#E70013" stopOpacity={0.1}/><stop offset="95%" stopColor="#E70013" stopOpacity={0}/></linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 9, fontWeight: 800, fill: '#94a3b8'}} />
                      <YAxis axisLine={false} tickLine={false} tick={{fontSize: 9, fontWeight: 800, fill: '#94a3b8'}} />
                      <Tooltip contentStyle={{borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)'}} />
                      <Area type="monotone" dataKey="in" stroke="#10b981" strokeWidth={3} fill="url(#colorIn)" />
                      <Area type="monotone" dataKey="out" stroke="#E70013" strokeWidth={3} fill="url(#colorOut)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
              
              <div className="bg-white p-10 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col justify-between">
                <div>
                  <h3 className="text-lg font-black italic text-slate-900 uppercase tracking-tighter mb-8">Santé du Système</h3>
                  <div className="space-y-6">
                    {[
                      { name: 'Base de Données', val: 99.9, color: 'bg-emerald-500' },
                      { name: 'Passerelle Mobile ID', val: 82, color: 'bg-amber-500' },
                      { name: 'Stockage Cloud', val: 42, color: 'bg-emerald-500' },
                      { name: 'API Services', val: 99, color: 'bg-emerald-500' },
                    ].map((item, i) => (
                      <div key={i} className="space-y-2">
                        <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest text-slate-500">
                          <span>{item.name}</span>
                          <span className="text-slate-900">{item.val}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-50 rounded-full overflow-hidden">
                          <div className={`h-full ${item.color}`} style={{ width: `${item.val}%` }}></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="mt-10 p-6 bg-slate-900 rounded-2xl text-center">
                  <p className="text-[8px] font-black uppercase tracking-widest text-slate-500 mb-1">Latence Réseau</p>
                  <span className="text-xl font-black italic text-white tracking-tighter">14ms</span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'users' && (
            <UserManagement onResetPassword={handleResetPassword} />
          )}
          
          {activeTab === 'structures' && (
            loadingStructures ? (
              <div className="flex items-center justify-center py-20">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-tunisia-red"></div>
              </div>
            ) : (
              <InternalStructureList 
                structures={structures}
                onEdit={(s) => {
                  setSelectedStructure(s);
                  setShowStructureForm(true);
                }}
                onDelete={handleDeleteStructure}
              />
            )
          )}
          {activeTab === 'requests' && (
            <AdminRequestList />
          )}
          {activeTab === 'traffic' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-slate-900 p-10 rounded-[3rem] shadow-xl relative overflow-hidden border border-white/5">
                <div className="flex justify-between items-center mb-8 relative z-10">
                  <h3 className="text-xl font-black italic text-white uppercase tracking-tighter">Radar Tactique Frontières</h3>
                  <span className="px-3 py-1 bg-red-500/20 text-red-500 border border-red-500/30 rounded-full text-[8px] font-black uppercase tracking-widest animate-pulse">Live</span>
                </div>
                <div className="relative h-[400px] bg-slate-800/50 rounded-[2rem] border border-white/5 flex items-center justify-center overflow-hidden">
                  {borderNodes.map((node) => (
                    <div key={node.id} className="absolute cursor-pointer group/node" style={{ top: node.lat, left: node.lon }}>
                      <div className={`w-3 h-3 rounded-full ${node.load > 85 ? 'bg-tunisia-red' : 'bg-emerald-500'} animate-ping opacity-40 absolute inset-0`}></div>
                      <div className={`w-3 h-3 rounded-full ${node.load > 85 ? 'bg-tunisia-red' : 'bg-emerald-500'} border-2 border-white relative z-10`}></div>
                      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 bg-white text-slate-900 p-3 rounded-xl shadow-2xl opacity-0 group-hover/node:opacity-100 transition-all w-40 pointer-events-none z-20">
                        <h5 className="text-[9px] font-black uppercase mb-1">{node.name}</h5>
                        <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
                          <div className={`h-full ${node.load > 85 ? 'bg-tunisia-red' : 'bg-emerald-500'}`} style={{ width: `${node.load}%` }}></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-slate-100">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Performance des Nœuds</h4>
                <div className="space-y-4">
                  {borderNodes.map((node) => (
                    <div key={node.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <div className="flex items-center gap-4">
                        <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-slate-400 text-xs">
                          <i className={`fas ${node.type === 'Maritime' ? 'fa-ship' : node.type === 'Aérien' ? 'fa-plane' : 'fa-truck'}`}></i>
                        </div>
                        <div>
                          <h5 className="text-[10px] font-black text-slate-900 uppercase tracking-tight italic">{node.name}</h5>
                          <span className="text-[7px] font-bold text-slate-400 uppercase tracking-widest">{node.volume} Transit/h</span>
                        </div>
                      </div>
                      <span className={`text-xs font-black italic tracking-tighter ${node.load > 85 ? 'text-tunisia-red' : 'text-slate-900'}`}>{node.load}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 bg-white p-10 rounded-[2.5rem] shadow-sm border border-slate-100">
                <h3 className="text-lg font-black italic text-slate-900 uppercase tracking-tighter mb-8">Journal de Sécurité</h3>
                <div className="space-y-3">
                  {[
                    { time: "14:22:10", type: "ACCESS", desc: "Connexion administrateur Mobile ID", level: "info" },
                    { time: "11:05:45", type: "SECURITY", desc: "Tentatives erronées sur EXP-902", level: "warn" },
                    { time: "09:12:01", type: "SYSTEM", desc: "Mise à jour module Douane terminée", level: "info" },
                  ].map((log, i) => (
                    <div key={i} className="p-4 rounded-xl bg-slate-50 flex items-center gap-4 border border-slate-100">
                      <div className={`w-1 h-8 rounded-full ${log.level === 'warn' ? 'bg-tunisia-red' : 'bg-emerald-500'}`}></div>
                      <div className="flex-grow">
                        <div className="flex justify-between items-center">
                          <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{log.time} &bull; {log.type}</span>
                        </div>
                        <p className="text-[10px] font-bold text-slate-700">{log.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="bg-tunisia-red text-white p-10 rounded-[2.5rem] shadow-xl flex flex-col justify-between">
                <div className="text-center space-y-6">
                  <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto border-2 border-white/30">
                    <i className="fas fa-shield-alt text-3xl"></i>
                  </div>
                  <div className="text-2xl font-black italic tracking-tighter uppercase">Intégrité 100%</div>
                  <p className="text-[8px] font-black uppercase tracking-widest text-red-100">Protection AES-256 Active</p>
                </div>
                <button className="w-full py-4 bg-white text-tunisia-red rounded-xl font-black uppercase tracking-widest text-[8px] shadow-lg mt-8 hover:bg-red-50 transition-all">
                  Scan Système
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default AdminPanel;