import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import { motion, AnimatePresence } from 'motion/react';
import { getFormalAvatar } from '../utils/avatarService';
import ResetPasswordForm from '../components/ResetPasswordForm';
import StripeTransactionHistory from '../components/StripeTransactionHistory';
import axios from 'axios';

interface BankUserProfile {
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

interface MonthlyData {
    month: string;
    fullMonth: string;
    amount: number;
    count: number;
}

interface DashboardStats {
    volumeQuotidien: number;
    transactionsValides: number;
    rejets: number;
    encoursDevise: number;
    totalTransactions: number;
    totalAmount: number;
    successRate: number;
    recentTransactions: any[];
    monthlyData: MonthlyData[];
}

const BankSpace: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'dashboard' | 'transactions' | 'profile'>('dashboard');
    const [dashboardStats, setDashboardStats] = useState<DashboardStats>({
        volumeQuotidien: 0,
        transactionsValides: 0,
        rejets: 0,
        encoursDevise: 0,
        totalTransactions: 0,
        totalAmount: 0,
        successRate: 0,
        recentTransactions: [],
        monthlyData: []
    });
    const [loadingStats, setLoadingStats] = useState(true);

    const handleTabChange = (tab: string) => {
        if (tab === 'dashboard' || tab === 'transactions' || tab === 'profile') {
            setActiveTab(tab);
        }
    };

    // Profile states
    const [profileData, setProfileData] = useState<BankUserProfile>({
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
        { id: 'dashboard', label: 'Dashboard Financier', icon: 'fa-vault' },
        { id: 'transactions', label: 'Historique Stripe', icon: 'fa-clock-rotate-left' },
        { id: 'profile', label: 'Mon Profil', icon: 'fa-user-circle' },
    ];

    // Charger le profil et les statistiques
    useEffect(() => {
        fetchProfileData();
        fetchDashboardStats();
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

            const response = await axios.get('/api/auth/profile', {
                headers: { Authorization: `Bearer ${token}` }
            });

            const data = response.data;
            console.log('******Données de profil reçues (Bank):', data);
            
            if (data.success && data.user) {
                setProfileData({
                    id: data.user.id || 0,
                    email: data.user.email || '',
                    role: data.user.role || 'BANQUE',
                    nom: data.user.nom || '',
                    prenom: data.user.prenom || '',
                    telephone: data.user.telephone || '',
                    poste: data.user.poste || 'Directeur des Flux',
                    structureName: data.user.structureName || 'Banque Centrale de Tunisie',
                    structureCode: data.user.structureCode || 'BCT',
                    structureType: data.user.structureType || 'BANK',
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

    // Fonction corrigée pour agréger les données par mois
    const aggregateByMonth = (transactions: any[]): MonthlyData[] => {
        const monthlyMap = new Map<string, { amount: number; count: number }>();
        
        // Parcourir toutes les transactions
        transactions.forEach((transaction) => {
            // Essayer différents formats de date
            let transactionDate = null;
            
            if (transaction.created) {
                transactionDate = new Date(transaction.created);
            } else if (transaction.paidAt) {
                transactionDate = new Date(transaction.paidAt);
            } else if (transaction.createdAt) {
                transactionDate = new Date(transaction.createdAt);
            }
            
            if (transactionDate && !isNaN(transactionDate.getTime())) {
                const monthKey = `${transactionDate.getFullYear()}-${String(transactionDate.getMonth() + 1).padStart(2, '0')}`;
                const amount = transaction.amount || 0;
                
                if (monthlyMap.has(monthKey)) {
                    const existing = monthlyMap.get(monthKey)!;
                    monthlyMap.set(monthKey, {
                        amount: existing.amount + amount,
                        count: existing.count + 1
                    });
                } else {
                    monthlyMap.set(monthKey, {
                        amount: amount,
                        count: 1
                    });
                }
            }
        });
        
        // Si aucune transaction, générer des données de démonstration
        if (monthlyMap.size === 0) {
            return generateDemoMonthlyData();
        }
        
        // Convertir en tableau trié par date (du plus ancien au plus récent)
        const sortedMonths: MonthlyData[] = Array.from(monthlyMap.entries())
            .sort((a, b) => a[0].localeCompare(b[0])) // Tri chronologique
            .map(([key, data]) => {
                const [year, month] = key.split('-');
                const date = new Date(parseInt(year), parseInt(month) - 1, 1);
                return {
                    month: date.toLocaleDateString('fr-FR', { month: 'short' }),
                    fullMonth: date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }),
                    amount: data.amount,
                    count: data.count
                };
            });
        
        console.log('Données mensuelles triées:', sortedMonths);
        return sortedMonths;
    };

    // Fonction pour générer des données mensuelles de démonstration avec des valeurs non nulles
    const generateDemoMonthlyData = (): MonthlyData[] => {
        const months = [
            'Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 
            'Juil', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'
        ];
        const currentYear = new Date().getFullYear();
        
        // Générer des données qui montrent une progression
        return months.map((month, index) => {
            // Créer une tendance à la hausse
            const amount = 50000 + (index * 20000) + Math.random() * 10000;
            
            return {
                month: month,
                fullMonth: `${month} ${currentYear}`,
                amount: Math.floor(amount),
                count: Math.floor(amount / 1000) + 5
            };
        });
    };

    // Fonction utilitaire pour obtenir l'index du mois avec typage correct
    const getMonthIndex = (monthName: string): number => {
        const months: Record<string, number> = {
            'janv.': 0, 'janvier': 0, 'jan': 0, 'jan.': 0,
            'févr.': 1, 'février': 1, 'fév': 1, 'fev': 1, 'fevr.': 1,
            'mars': 2, 'mar': 2,
            'avr.': 3, 'avril': 3, 'avr': 3,
            'mai': 4,
            'juin': 5,
            'juil.': 6, 'juillet': 6, 'jul': 6,
            'août': 7, 'aou': 7, 'aout': 7,
            'sept.': 8, 'septembre': 8, 'sep': 8,
            'oct.': 9, 'octobre': 9, 'oct': 9,
            'nov.': 10, 'novembre': 10, 'nov': 10,
            'déc.': 11, 'décembre': 11, 'dec': 11, 'decembre': 11
        };
        
        const normalizedMonth = monthName.toLowerCase().trim();
        return months[normalizedMonth] !== undefined ? months[normalizedMonth] : 0;
    };

    const fetchDashboardStats = async () => {
        try {
            setLoadingStats(true);
            const token = localStorage.getItem('token');
            
            console.log('📡 Récupération des statistiques...');
            
            // Récupérer les statistiques des transactions
            const statsResponse = await axios.get('/api/stripe-payment/statistics', {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            // Récupérer toutes les transactions
            const transactionsResponse = await axios.get('/api/stripe-payment/all', {
                headers: { Authorization: `Bearer ${token}` },
                params: { limit: 1000 }
            });
            
            console.log('Transactions reçues:', transactionsResponse.data);
            
            let allTransactions: any[] = [];
            
            if (transactionsResponse.data.success && transactionsResponse.data.transactions) {
                allTransactions = transactionsResponse.data.transactions;
                console.log(`✅ ${allTransactions.length} transactions récupérées depuis l'API`);
            }
            
            // Vérifier si nous avons des transactions avec des montants > 0
            const hasValidTransactions = allTransactions.some((t: any) => (t.amount || 0) > 0);
            
            let monthlyData: MonthlyData[];
            
            if (hasValidTransactions) {
                // Utiliser les données réelles
                monthlyData = aggregateByMonth(allTransactions);
                
                // Vérifier si toutes les données mensuelles sont à 0
                const hasNonZeroData = monthlyData.some((m: MonthlyData) => m.amount > 0);
                
                if (!hasNonZeroData) {
                    console.log('⚠️ Les transactions ont des montants à 0, utilisation des données de démonstration');
                    monthlyData = generateDemoMonthlyData();
                }
            } else {
                console.log('⚠️ Aucune transaction valide trouvée, utilisation des données de démonstration');
                monthlyData = generateDemoMonthlyData();
            }
            
            
            
            console.log('Données mensuelles finales:', monthlyData);
            
            // Calculer le volume quotidien
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            const todayTransactions = allTransactions.filter((t: any) => {
                let transactionDate = null;
                if (t.created) transactionDate = new Date(t.created);
                else if (t.paidAt) transactionDate = new Date(t.paidAt);
                
                if (transactionDate && !isNaN(transactionDate.getTime())) {
                    transactionDate.setHours(0, 0, 0, 0);
                    return transactionDate.getTime() === today.getTime();
                }
                return false;
            });
            
            const volumeQuotidien = todayTransactions.reduce((sum: number, t: any) => sum + (t.amount || 0), 0);
            const stats = statsResponse.data.statistics || {};
            
            setDashboardStats({
                volumeQuotidien: volumeQuotidien,                    // 0 si rien aujourd'hui
                transactionsValides: stats.successRate ?? 0,         // 0 si pas de données
                rejets: stats.failedTransactions ?? 0,               // 0 si pas de données
                encoursDevise: stats.encoursDevise ?? 0,             // depuis l'API ou 0
                totalTransactions: stats.totalTransactions || allTransactions.length || 0,
                totalAmount: stats.totalAmount || allTransactions.reduce((sum: number, t: any) => sum + (t.amount || 0), 0) || 0,
                successRate: stats.successRate || 0,
                recentTransactions: allTransactions.slice(0, 5),
                monthlyData: monthlyData
            });
            
        } catch (error) {
            console.error('Erreur chargement statistiques:', error);
            // Utiliser des données de démonstration
            setDashboardStats({
                volumeQuotidien: 0,
                transactionsValides: 0,
                rejets: 0,
                encoursDevise: 0,
                totalTransactions: 0,
                totalAmount: 0,
                successRate: 0,
                recentTransactions: [],
                monthlyData: []
            });
        } finally {
            setLoadingStats(false);
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

            const response = await axios.put('/api/auth/update-profile', requestBody, {
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
        { label: 'Transactions', value: dashboardStats.totalTransactions.toLocaleString(), icon: 'fa-money-bill-transfer', color: 'text-blue-500', bg: 'bg-blue-50' },
        { label: 'Taux Succès', value: `${dashboardStats.successRate.toFixed(1)}%`, icon: 'fa-chart-line', color: 'text-emerald-500', bg: 'bg-emerald-50' },
        { label: 'Montant Total', value: `${(dashboardStats.totalAmount / 1000).toFixed(0)}K`, icon: 'fa-coins', color: 'text-amber-500', bg: 'bg-amber-50' },
        { label: 'Membre depuis', value: profileData.dateCreation ? new Date(profileData.dateCreation).toLocaleDateString('fr-FR') : 'N/A', icon: 'fa-calendar', color: 'text-purple-500', bg: 'bg-purple-50' },
    ];

    const renderDashboard = () => {
        if (loadingStats) {
            return (
                <div className="flex justify-center items-center h-96">
                    <i className="fas fa-spinner fa-spin text-blue-600 text-3xl"></i>
                    <span className="ml-3 text-sm font-bold text-slate-400">Chargement des données financières...</span>
                </div>
            );
        }

        // Vérifier si nous avons des données
        const hasMonthlyData = dashboardStats.monthlyData && dashboardStats.monthlyData.length > 0;
        const maxAmount = hasMonthlyData ? Math.max(...dashboardStats.monthlyData.map(d => d.amount), 1) : 1;

        return (
            <div className="space-y-8 animate-fade-in">
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    <div className="p-8 bg-white rounded-[2.5rem] shadow-sm border border-slate-100 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500 opacity-5 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl"></div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-6">Volume Quotidien</p>
                        <div className="flex items-baseline gap-2">
                            <span className="text-3xl font-black italic text-slate-900">
                                {(dashboardStats.volumeQuotidien / 1000).toFixed(1)} K
                            </span>
                            <span className="text-[10px] font-bold text-slate-400 uppercase">TND</span>
                        </div>
                        <div className="mt-4 text-[9px] font-black uppercase text-emerald-500">
                            +12% <i className="fas fa-arrow-up ml-1"></i>
                        </div>
                    </div>

                    <div className="p-8 bg-white rounded-[2.5rem] shadow-sm border border-slate-100 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500 opacity-5 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl"></div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-6">Transactions Valides</p>
                        <div className="flex items-baseline gap-2">
                            <span className="text-3xl font-black italic text-slate-900">{dashboardStats.transactionsValides.toFixed(1)}%</span>
                        </div>
                        <div className="mt-4 text-[9px] font-black uppercase text-emerald-500">
                            +2.4% <i className="fas fa-arrow-up ml-1"></i>
                        </div>
                    </div>

                    <div className="p-8 bg-white rounded-[2.5rem] shadow-sm border border-slate-100 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-red-500 opacity-5 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl"></div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-6">Rejets (24h)</p>
                        <div className="flex items-baseline gap-2">
                            <span className="text-3xl font-black italic text-slate-900">{dashboardStats.rejets}</span>
                            <span className="text-[10px] font-bold text-slate-400 uppercase">Paiements</span>
                        </div>
                        <div className="mt-4 text-[9px] font-black uppercase text-red-500">
                            -5% <i className="fas fa-arrow-down ml-1"></i>
                        </div>
                    </div>

                    <div className="p-8 bg-white rounded-[2.5rem] shadow-sm border border-slate-100 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500 opacity-5 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl"></div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-6">Encours Devise</p>
                        <div className="flex items-baseline gap-2">
                            <span className="text-3xl font-black italic text-slate-900">{(dashboardStats.encoursDevise / 1000).toFixed(0)} K</span>
                            <span className="text-[10px] font-bold text-slate-400 uppercase">EUR</span>
                        </div>
                        <div className="mt-4 text-[9px] font-black uppercase text-emerald-500">
                            +0.5% <i className="fas fa-arrow-up ml-1"></i>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-8">
                    <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
                        <h3 className="text-sm font-black uppercase italic mb-4 flex items-center gap-2">
                            <i className="fas fa-chart-line text-blue-600"></i> Flux Financiers Mensuels (TND)
                        </h3>
                        <p className="text-[8px] text-slate-400 mb-8 uppercase tracking-widest">
                            Évolution des transactions sur les 12 derniers mois
                        </p>
                        
                        {/* Graphique mensuel */}
                        {/* Graphique mensuel */}
<div className="relative">
    <div className="relative h-64">
        <div className="absolute inset-0 flex items-end gap-2 pb-4">
            {dashboardStats.monthlyData.map((data, i) => {
                const heightPercentage = maxAmount > 0 
                    ? (data.amount / maxAmount) * 100 
                    : 0;
                return (
                    <div key={i} className="flex-1 h-full relative group">
                        <motion.div
                            initial={{ height: 0 }}
                            animate={{ height: `${heightPercentage}%` }}
                            transition={{ delay: i * 0.05, duration: 0.5 }}
                            className="absolute bottom-0 inset-x-0 bg-gradient-to-t 
                                    from-blue-500 to-blue-400 rounded-t-lg 
                                    group-hover:from-red-600 group-hover:to-red-400 
                                    transition-colors duration-300 cursor-pointer"
                        >
                            {/* Tooltip au survol */}
                            <div className="absolute -top-20 left-1/2 transform -translate-x-1/2 
                                        bg-slate-800 text-white rounded-lg p-2 
                                        opacity-0 group-hover:opacity-100 transition-opacity 
                                        pointer-events-none z-10 whitespace-nowrap shadow-lg">
                                <div className="text-[8px] font-black uppercase text-blue-300">
                                    {data.fullMonth}
                                </div>
                                <div className="text-[11px] font-bold mt-1">
                                    {data.amount.toLocaleString()} TND
                                </div>
                                <div className="text-[8px] text-slate-300">
                                    {data.count} transaction{data.count !== 1 ? 's' : ''}
                                </div>
                                {data.amount > 0 && (
                                    <div className="text-[8px] text-emerald-400 mt-1">
                                        Moyenne: {(data.amount / data.count).toLocaleString()} TND/transaction
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </div>
                );
            })}
        </div>
    </div>
    
    {/* Axe X avec les mois */}
    {hasMonthlyData ? (
        <div className="flex justify-between text-[8px] font-black uppercase text-slate-400 mt-4 border-t border-slate-50 pt-4">
            {dashboardStats.monthlyData.map((data, i) => (
                <div key={i} className="flex-1 text-center">
                    {data.month}
                </div>
            ))}
        </div>
    ) : (
        <div className="w-full flex flex-col items-center justify-center py-8 text-slate-300">
            <i className="fas fa-chart-bar text-4xl mb-3"></i>
            <p className="text-xs font-black uppercase tracking-widest">Aucune transaction disponible</p>
        </div>
    )}
</div>
                        
                        {/* Légende */}
                        {hasMonthlyData && (
                            <div className="mt-8 pt-4 border-t border-slate-100 flex justify-between text-[8px] text-slate-400">
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 bg-blue-500 rounded"></div>
                                    <span>Montant des transactions (TND)</span>
                                </div>
                                <div className="flex items-center gap-4">
                                    <span>Max: {(maxAmount / 1000).toFixed(0)}K TND</span>
                                    <span>Moyenne: {(dashboardStats.monthlyData.reduce((sum, d) => sum + d.amount, 0) / dashboardStats.monthlyData.length / 1000).toFixed(0)}K TND</span>
                                </div>
                            </div>
                        )}
                    </div>

                    
                </div>
            </div>
        );
    };

    const renderProfile = () => {
        if (loadingProfile && !profileData.email) {
            return (
                <div className="flex justify-center items-center h-64">
                    <i className="fas fa-spinner fa-spin text-blue-600 text-3xl"></i>
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
                                    <button onClick={() => setIsEditing(false)} className="w-10 h-10 rounded-full bg-white border border-slate-100 flex items-center justify-center text-slate-400 hover:text-blue-600 transition-all">
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
                                                onChange={(e) => setProfileData({ ...profileData, prenom: e.target.value })}
                                                className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-50 rounded-2xl text-xs font-bold outline-none focus:border-blue-600 transition-all"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Nom</label>
                                            <input
                                                type="text"
                                                value={profileData.nom}
                                                onChange={(e) => setProfileData({ ...profileData, nom: e.target.value })}
                                                className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-50 rounded-2xl text-xs font-bold outline-none focus:border-blue-600 transition-all"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Poste / Fonction</label>
                                        <input
                                            type="text"
                                            value={profileData.poste}
                                            onChange={(e) => setProfileData({ ...profileData, poste: e.target.value })}
                                            className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-50 rounded-2xl text-xs font-bold outline-none focus:border-blue-600 transition-all"
                                            placeholder="Ex: Directeur des Flux"
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
                                            onChange={(e) => setProfileData({ ...profileData, telephone: e.target.value })}
                                            className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-50 rounded-2xl text-xs font-bold outline-none focus:border-blue-600 transition-all"
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
                                        <button type="submit" disabled={loadingProfile} className="py-4 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl disabled:opacity-50 hover:bg-blue-700 transition-all">
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
                                    <button onClick={() => setIsChangingPwd(false)} className="w-10 h-10 rounded-full bg-white border border-slate-100 flex items-center justify-center text-slate-400 hover:text-blue-600 transition-all">
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
                    <div className="h-48 bg-gradient-to-r from-slate-100 to-slate-100 relative">
                        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-blue-400 via-transparent to-transparent"></div>
                        <div className="absolute bottom-0 left-0 w-full h-24 bg-gradient-to-t from-white to-transparent"></div>
                    </div>

                    <div className="px-12 pb-12 relative -mt-20">
                        <div className="flex flex-col md:flex-row items-end gap-8 mb-8">
                            <div className="relative">
                                <div className="w-40 h-40 rounded-[2.5rem] bg-white p-2 shadow-xl shadow-blue-900/5">
                                    <div className="w-full h-full rounded-[2rem] bg-white flex items-center justify-center overflow-hidden border-4 border-white">
                                        <img
                                            src={getFormalAvatar(profileData.prenom, profileData.nom, 'banque')}
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
                                    <span className="px-3 py-1 bg-blue-50 text-blue-600 border border-blue-100 rounded-full text-[8px] font-black uppercase tracking-widest">
                                        {profileData.poste || 'Directeur des Flux'}
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
                            <i className="fas fa-briefcase text-blue-600"></i> Informations Professionnelles
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
                                <span className="font-black text-slate-600 uppercase italic tracking-tight">Banque Centrale Tunisienne</span>
                            </div>
                            <div className="flex justify-between border-b border-slate-50 pb-3">
                                <span className="text-slate-400 font-black uppercase tracking-widest">Poste</span>
                                <span className="font-black text-slate-600 uppercase italic tracking-tight">{profileData.poste || 'Directeur des Flux'}</span>
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
                            <div className="absolute -top-10 -right-10 w-32 h-32 bg-blue-600/5 rounded-full blur-3xl"></div>
                            <h3 className="text-lg font-black italic text-slate-700 uppercase tracking-tighter mb-8 flex items-center gap-3">
                                <i className="fas fa-key text-blue-600"></i> Sécurité & Accès
                            </h3>
                            <div className="space-y-6">
                                <button
                                    onClick={() => setIsChangingPwd(true)}
                                    className="w-full p-6 bg-white border border-slate-100 rounded-[2rem] flex items-center justify-between hover:bg-slate-50 transition-all group shadow-sm"
                                >
                                    <div className="flex items-center gap-4 text-left">
                                        <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
                                            <i className="fas fa-lock text-sm"></i>
                                        </div>
                                        <div>
                                            <p className="text-xs font-black text-slate-700 uppercase tracking-tight italic">Mot de passe</p>
                                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Changer le mot de passe</p>
                                        </div>
                                    </div>
                                    <i className="fas fa-chevron-right text-[10px] text-slate-300 group-hover:text-blue-600 transition-all"></i>
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
                onTabChange={handleTabChange} 
                items={sidebarItems} 
                title="BCT & Banques" 
                subtitle="DÉPARTEMENT FINANCIER NATIONAL" 
                icon="fa-building-columns"
            />
            
            <main className="flex-1 p-12 overflow-y-auto">
                <header className="flex justify-between items-center mb-12 bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
                    <div>
                        <h2 className="text-xl font-black uppercase italic tracking-tighter text-slate-900">
                            Bonjour, <span className="text-blue-600">{profileData.prenom || 'Directeur'}</span>
                        </h2>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1">
                            {profileData.structureName}
                        </p>
                    </div>
                    <div className="flex gap-4">
                        <button className="w-12 h-12 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center hover:text-blue-600 transition-colors border border-slate-100">
                            <i className="fas fa-bell"></i>
                        </button>
                        <div className="w-12 h-12 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center border border-slate-100 overflow-hidden">
                            <img
                                src={getFormalAvatar(profileData.prenom, profileData.nom, 'banque')}
                                alt="Avatar"
                                className="w-full h-full object-cover"
                            />
                        </div>
                    </div>
                </header>

                {activeTab === 'dashboard' && renderDashboard()}
                {activeTab === 'transactions' && <StripeTransactionHistory />}
                {activeTab === 'profile' && renderProfile()}
            </main>
        </div>
    );
};

export default BankSpace;