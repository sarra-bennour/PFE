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
import UserHistory from './UserHistory';
import RiskManagement from './RiskManagement';
import CaseVerifier from '../../components/CaseVerifier';
import StripeTransactionHistory from '../../components/StripeTransactionHistory';

// Interface pour les statistiques du dashboard
interface DashboardStats {
  activeUsers: number;
  transactions24h: number;
  securityAlerts: number;
  pendingDemandes: number;
  uptimeSystem: number;
  networkLatencyMs: number;
  monthlyFluxData: { name: string; declarations: number; imports: number }[];
  systemHealth: { name: string; val: number; color: string }[];
}

const AdminPanel: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'user-history' | 'traffic' | 'structures' | 'requests' | 'case-verifier' | 'risk' | 'stripe-history'>('overview');

  // État pour les structures
  const [structures, setStructures] = useState<InternalStructure[]>([]);
  const [loadingStructures, setLoadingStructures] = useState(false);
  
  // État pour les statistiques du dashboard
  const [dashboardStats, setDashboardStats] = useState<DashboardStats>({
    activeUsers: 0,
    transactions24h: 0,
    securityAlerts: 0,
    pendingDemandes: 0,
    uptimeSystem: 99.98,
    networkLatencyMs: 14,   // ← ajoute cette ligne
    monthlyFluxData: [],
    systemHealth: []
  });
  const [loadingDashboard, setLoadingDashboard] = useState(true);

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

  // Fonction pour charger les statistiques du dashboard
  const fetchDashboardStats = async () => {
    try {
      setLoadingDashboard(true);
      const token = localStorage.getItem('token');
      
      // 1. Récupérer les utilisateurs pour compter les actifs
      const usersResponse = await axios.get('/api/admin/users', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // 2. Récupérer les demandes
      const demandesResponse = await axios.get('/api/admin/all-demandes', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // 3. Récupérer les exportateurs suspects (risque élevé)
      const riskResponse = await axios.get('/api/risk/exportateurs', {
        headers: { Authorization: `Bearer ${token}` }
      }).catch(() => ({ data: [] }));
      
      // 4. Récupérer les transactions Stripe des dernières 24h
      const transactionsResponse = await axios.get('/api/stripe-payment/all', {
        headers: { Authorization: `Bearer ${token}` },
        params: { limit: 1000 }
      }).catch(() => ({ data: { success: false, transactions: [] } }));
      
      // Calculer les statistiques
      let activeUsers = 0;
      if (usersResponse.data.success) {
        const userList = usersResponse.data.users || [];
        activeUsers = userList.filter((u: any) => u.statut === 'ACTIF').length;
      }
      
      // Calculer les transactions des dernières 24h
      let transactions24h = 0;
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      
      if (transactionsResponse.data.success && transactionsResponse.data.transactions) {
        transactions24h = transactionsResponse.data.transactions.filter((t: any) => {
          let txDate = null;
          if (t.created) txDate = new Date(t.created);
          else if (t.paidAt) txDate = new Date(t.paidAt);
          return txDate && txDate >= yesterday;
        }).length;
      }
      
      // Compter les exportateurs suspects (risque ÉLEVÉ)
      let securityAlerts = 0;
      if (riskResponse.data && Array.isArray(riskResponse.data)) {
        securityAlerts = riskResponse.data.filter((e: any) => e.riskLevel === 'ÉLEVÉ').length;
      }
      
      // Compter les demandes en attente
      let pendingDemandes = 0;
      if (demandesResponse.data.success) {
        const demandes = demandesResponse.data.data || [];
        pendingDemandes = demandes.filter((d: any) => 
          d.status === 'SOUMISE' || d.status === 'EN_ATTENTE' || d.status === 'PENDING'
        ).length;
      }
      
      // Générer les données mensuelles des flux
      const monthlyFluxData = generateMonthlyFluxData(demandesResponse.data.data || []);
      
      const healthResponse = await axios.get('/api/admin/system-health', {
        headers: { Authorization: `Bearer ${token}` }
      }).catch(() => ({ data: null }));

      let systemHealth = [
        { name: 'Base de Données', val: 99.9, color: 'bg-emerald-500' },
        { name: 'Mémoire JVM', val: 75.0, color: 'bg-emerald-500' },
        { name: 'Stockage Disque', val: 60.0, color: 'bg-emerald-500' },
        { name: 'API Services', val: 99.0, color: 'bg-emerald-500' },
        { name: 'Stripe Gateway', val: 99.5, color: 'bg-emerald-500' },
      ];

      let uptimeSystem = 99.98;
      let networkLatencyMs = 14;

      if (healthResponse.data) {
        systemHealth = healthResponse.data.components || systemHealth;
        uptimeSystem = healthResponse.data?.uptimePercent ?? uptimeSystem;
        networkLatencyMs = healthResponse.data.networkLatencyMs ?? networkLatencyMs;
      }
      
      setDashboardStats({
        activeUsers,
        transactions24h,
        securityAlerts,
        pendingDemandes,
        uptimeSystem: 99.98,
        monthlyFluxData,
        systemHealth,
        networkLatencyMs
      });
      
    } catch (error) {
      console.error('Erreur chargement dashboard:', error);
      // Données par défaut
      setDashboardStats({
        activeUsers: 0,
        transactions24h: 0,
        securityAlerts: 0,
        pendingDemandes: 0,
        uptimeSystem: 99.98,
        networkLatencyMs: 14,
        monthlyFluxData: generateMonthlyFluxData([]),
        systemHealth: [
          { name: 'Base de Données', val: 99.9, color: 'bg-emerald-500' },
          { name: 'Passerelle Mobile ID', val: 82, color: 'bg-amber-500' },
          { name: 'Stockage Cloud', val: 42, color: 'bg-emerald-500' },
          { name: 'API Services', val: 99, color: 'bg-emerald-500' },
        ]
      });
    } finally {
      setLoadingDashboard(false);
    }
  };
  
  // Fonction pour générer les données mensuelles des flux
  // REMPLACE dans AdminPanel.tsx
const generateMonthlyFluxData = (demandes: any[]) => {
  const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
  const currentYear = new Date().getFullYear();
  const monthlyData = months.map(month => ({ name: month, declarations: 0, imports: 0 }));

  demandes.forEach((demande: any) => {
    if (demande.submittedAt) {
      const date = new Date(demande.submittedAt);
      if (date.getFullYear() === currentYear) {
        const monthIndex = date.getMonth();
        // Demande déclaration produit (exportateur)
        if (demande.typeDemande === 'PRODUCT_DECLARATION') {
          monthlyData[monthIndex].declarations++;
        }
        // Demande importation (importateur tunisien)
        else if (demande.typeDemande === 'IMPORT') {
          monthlyData[monthIndex].imports++;
        }
      }
    }
  });

  return monthlyData;
};

  // Fonction pour charger tous les utilisateurs
  const loadUsers = async () => {
    try {
      setLoadingUsers(true);
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/admin/users', {
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

  // Charger les données du dashboard au montage
  useEffect(() => {
    fetchDashboardStats();
  }, []);

  // Rafraîchir les stats toutes les 30 secondes
  useEffect(() => {
    const interval = setInterval(() => {
      if (activeTab === 'overview') {
        fetchDashboardStats();
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [activeTab]);

  // Configuration API
  const API_URL = '/api/admin/structures';

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
  const handleCreateStructure = async (data: { type: StructureType; officialName: string; officialNameAr: string }) => {
    try {
      const response = await axios.post(API_URL, data, { headers: getAuthHeader() });

      if (response.data.success) {
        setStructures(prev => [response.data.data, ...prev]);
        setShowStructureForm(false);
        return;
      } else {
        throw new Error(response.data.error || 'Erreur lors de la création');
      }
    } catch (err: any) {
      console.error('Erreur création:', err);
      throw err;
    }
  };

  const handleUpdateStructure = async (id: number, data: { type: StructureType; officialName: string; officialNameAr: string }) => {
    try {
      const response = await axios.put(`${API_URL}/${id}`, data, { headers: getAuthHeader() });

      if (response.data.success) {
        setStructures(prev => prev.map(s => s.id === id ? response.data.data : s));
        setShowStructureForm(false);
        setSelectedStructure(null);
        return;
      } else {
        throw new Error(response.data.error || 'Erreur lors de la mise à jour');
      }
    } catch (err: any) {
      console.error('Erreur mise à jour:', err);
      throw err;
    }
  };
  
  // Supprimer une structure
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
    { id: 'user-history', label: 'Historique Users', icon: 'fa-clock-rotate-left' },
    { id: 'structures', label: 'Structures', icon: 'fa-sitemap' },
    { id: 'requests', label: 'Demandes', icon: 'fa-file-invoice' },
    { id: 'traffic', label: 'Flux Douanes', icon: 'fa-truck-moving' },
    { id: 'risk', label: 'Gestion Risques', icon: 'fa-shield-virus' },
    { id: 'case-verifier', label: 'Vérificateur de Cas', icon: 'fa-search' },
    { id: 'stripe-history', label: 'Transactions Stripe', icon: 'fa-credit-card' }
  ];

  // Statistiques dynamiques
  const stats = [
    { label: "Utilisateurs Actifs", value: dashboardStats.activeUsers.toLocaleString(), icon: "fa-users", color: "text-blue-500", bg: "bg-blue-50" },
    { label: "Transactions (24h)", value: dashboardStats.transactions24h.toLocaleString(), icon: "fa-exchange-alt", color: "text-emerald-500", bg: "bg-emerald-50" },
    { label: "Alertes Sécurité", value: dashboardStats.securityAlerts.toString(), icon: "fa-shield-virus", color: "text-tunisia-red", bg: "bg-red-50" },
    { label: "Dossiers en attente", value: dashboardStats.pendingDemandes.toLocaleString(), icon: "fa-folder-open", color: "text-amber-500", bg: "bg-amber-50" },
    { label: "Uptime Système", value: `${dashboardStats.uptimeSystem}%`, icon: "fa-bolt", color: "text-purple-500", bg: "bg-purple-50" },
  ];

  const borderNodes = [
    { id: 'rades', name: 'Port de Radès', type: 'Maritime', status: 'Intense', volume: 642, load: 88, lat: '20%', lon: '45%' },
    { id: 'goulette', name: 'La Goulette', type: 'Maritime/Passagers', status: 'Fluide', volume: 215, load: 34, lat: '15%', lon: '42%' },
    { id: 'carthage', name: 'Tunis-Carthage', type: 'Aérien', status: 'Optimal', volume: 185, load: 45, lat: '12%', lon: '46%' },
    { id: 'sfax', name: 'Port de Sfax', type: 'Maritime', status: 'Modéré', volume: 312, load: 62, lat: '55%', lon: '52%' },
    { id: 'melloula', name: 'Poste Melloula', type: 'Terrestre', status: 'Critique', volume: 92, load: 95, lat: '25%', lon: '15%' },
  ];

  const structureStats = [
    { label: "Entités Totales", value: structures.length, icon: "fa-sitemap", color: "text-slate-900", bg: "bg-slate-100" },
    { label: "Utilisateurs Assignés", value: dashboardStats.activeUsers.toLocaleString(), icon: "fa-users-gear", color: "text-indigo-600", bg: "bg-indigo-50" },
    { label: "Demandes en attente", value: dashboardStats.pendingDemandes.toLocaleString(), icon: "fa-clock", color: "text-amber-500", bg: "bg-amber-50" },
    { label: "Alertes Sécurité", value: dashboardStats.securityAlerts.toString(), icon: "fa-shield-virus", color: "text-red-500", bg: "bg-red-50" },
  ];

  // Fonction pour réinitialiser le mot de passe
  const handleResetPassword = async (u: any) => {
    const token = localStorage.getItem('token');

    if (u.role === 'IMPORTATEUR') {
      alert("Les importateurs n'utilisent pas de mot de passe.\nIls s'authentifient via Mobile ID.");
      return;
    }

    if (!window.confirm(`Êtes-vous sûr de vouloir réinitialiser le mot de passe de ${u.email} ?`)) {
      return;
    }

    setLoadingPassword(true);
    setSelectedUser(u);

    try {
      const response = await fetch(`/api/admin/users/${u.id}/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (response.ok && data.success) {
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

  if (loadingDashboard && dashboardStats.activeUsers === 0) {
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
        <main className="flex-1 p-10 flex items-center justify-center">
          <div className="text-center">
            <i className="fas fa-spinner fa-spin text-tunisia-red text-4xl mb-4"></i>
            <p className="text-sm font-bold text-slate-400">Chargement du tableau de bord...</p>
          </div>
        </main>
      </div>
    );
  }

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
                  structures={structures}
                  onSuccess={() => {
                    setShowCreateUser(false);
                    loadUsers();
                    fetchDashboardStats();
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
              onSuccess={async (data) => {
                try {
                  if (selectedStructure) {
                    await handleUpdateStructure(selectedStructure.id, data);
                  } else {
                    await handleCreateStructure(data);
                  }
                } catch (error) {
                  throw error;
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
              {activeTab === 'user-history' && "Historique et Audit Utilisateurs"}
              {activeTab === 'structures' && "Structures Internes"}
              {activeTab === 'requests' && "Suivi des Demandes"}
              {activeTab === 'traffic' && "Surveillance des Flux"}
              {activeTab === 'risk' && "Analyse des Risques Exportateurs"}
              {activeTab === 'case-verifier' && "Vérificateur de Cas"}
              {activeTab === 'stripe-history' && "Historique des Transactions Stripe"}
            </h2>
          </div>

          <div className="flex gap-4">
            <button 
              onClick={() => fetchDashboardStats()}
              className="px-6 py-3 bg-white border border-slate-200 rounded-xl text-[9px] font-black uppercase tracking-widest text-slate-600 shadow-sm hover:bg-slate-50 transition-all"
            >
              <i className="fas fa-sync-alt mr-2"></i> Rafraîchir
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

        {/* Stats Grid */}
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
                  <h3 className="text-lg font-black italic text-slate-900 uppercase tracking-tighter">Volume des Flux (Mensuel)</h3>
                  <div className="flex gap-4">
                    <div className="flex items-center gap-2 text-[8px] font-black uppercase text-emerald-500"><div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div> Déclarations Produit</div>
                    <div className="flex items-center gap-2 text-[8px] font-black uppercase text-tunisia-red"><div className="w-1.5 h-1.5 bg-tunisia-red rounded-full"></div> Demandes Importation</div>
                  </div>
                </div>
                <div className="h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={dashboardStats.monthlyFluxData}>
                      <defs>
                        <linearGradient id="colorDeclarations" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorImports" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#E70013" stopOpacity={0.1}/>
                          <stop offset="95%" stopColor="#E70013" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 800, fill: '#94a3b8' }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 800, fill: '#94a3b8' }} />
                      <Tooltip 
                        contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
                        formatter={(value: number | undefined) => {
                          if (value === undefined) return ['0', ''];
                          return [`${value} demande(s)`, ''];
                        }}
                      />
                      <Area type="monotone" dataKey="declarations" stroke="#10b981" strokeWidth={3} fill="url(#colorDeclarations)" name="Déclarations Produit" />
                      <Area type="monotone" dataKey="imports" stroke="#E70013" strokeWidth={3} fill="url(#colorImports)" name="Demandes Importation" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white p-10 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col justify-between">
                <div>
                  <h3 className="text-lg font-black italic text-slate-900 uppercase tracking-tighter mb-8">Santé du Système</h3>
                  <div className="space-y-6">
                    {dashboardStats.systemHealth.map((item, i) => (
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
                    <span className="text-xl font-black italic text-white tracking-tighter">
                      {dashboardStats.networkLatencyMs ?? 14}ms
                    </span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'users' && (
            <UserManagement onResetPassword={handleResetPassword} />
          )}

          {activeTab === 'user-history' && (
            <UserHistory />
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
          
          {activeTab === 'case-verifier' && (
            <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 p-8">
              <CaseVerifier compact />
            </div>
          )}
          
          {activeTab === 'risk' && (
            <RiskManagement />
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

          {activeTab === 'stripe-history' && <StripeTransactionHistory />}
        </div>
      </main>
    </div>
  );
};

export default AdminPanel;