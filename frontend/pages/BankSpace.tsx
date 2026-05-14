
import React, { useState } from 'react';
import Sidebar from '../components/Sidebar';
import { motion } from 'motion/react';
import { getFormalAvatar } from '../utils/avatarService';

const BankSpace: React.FC = () => {
    const [activeTab, setActiveTab] = useState('dashboard');

    const directeurData = {
        prenom: 'Mohamed',
        nom: 'Sayadi',
        titre: 'Directeur des Flux',
        grade: 'Superviseur BCT',
        departement: 'Département des Finances',
        matricule: 'BCT-7823'
    };

    const sidebarItems = [
        { id: 'dashboard', label: 'Dashboard Financier', icon: 'fa-vault' },
        { id: 'payments', label: 'Gestion des Paiements', icon: 'fa-money-check-dollar' },
        { id: 'profile', label: 'Mon Profil', icon: 'fa-user-circle' },
    ];

    const mockPayments = [
        { id: 'PAY-1001', date: '2025-05-12', amount: 12500, currency: 'TND', exporter: 'ALPHA EXPORT', status: 'VALIDÉ', method: 'Virement' },
        { id: 'PAY-1002', date: '2025-05-11', amount: 8400, currency: 'EUR', exporter: 'BETA INDUSTRY', status: 'REJETÉ', method: 'Carte Bancaire' },
        { id: 'PAY-1003', date: '2025-05-11', amount: 45000, currency: 'USD', exporter: 'OMEGA TRADING', status: 'EN ATTENTE', method: 'Crédit Documentaire' },
        { id: 'PAY-1004', date: '2025-05-10', amount: 5600, currency: 'TND', exporter: 'GAMMA AGRO', status: 'LITIGE', method: 'Virement' },
        { id: 'PAY-1005', date: '2025-05-09', amount: 1200, currency: 'TND', exporter: 'DELTA TEXTILE', status: 'VALIDÉ', method: 'Carte Bancaire' },
    ];

    const renderDashboard = () => (
        <div className="space-y-8 animate-fade-in">
             <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {[
                    { label: 'Volume Quotidien', value: '450.2 K', unit: 'TND', trend: '+12%', color: 'blue' },
                    { label: 'Transactions Valides', value: '89.5%', unit: '', trend: '+2.4%', color: 'emerald' },
                    { label: 'Rejets (24h)', value: '14', unit: 'Paiements', trend: '-5%', color: 'tunisia-red' },
                    { label: 'Encours Devise', value: '1,240,000', unit: 'EUR', trend: '+0.5%', color: 'amber' }
                ].map((stat, i) => (
                    <div key={i} className="p-8 bg-white rounded-[2.5rem] shadow-sm border border-slate-100 relative overflow-hidden group">
                        <div className={`absolute top-0 right-0 w-24 h-24 bg-${stat.color}-500 opacity-5 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl`}></div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-6">{stat.label}</p>
                        <div className="flex items-baseline gap-2">
                            <span className="text-3xl font-black italic text-slate-900">{stat.value}</span>
                            <span className="text-[10px] font-bold text-slate-400 uppercase">{stat.unit}</span>
                        </div>
                        <div className={`mt-4 text-[9px] font-black uppercase ${stat.trend.startsWith('+') ? 'text-emerald-500' : 'text-tunisia-red'}`}>
                            {stat.trend} <i className={`fas fa-arrow-${stat.trend.startsWith('+') ? 'up' : 'down'} ml-1`}></i>
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
                    <h3 className="text-sm font-black uppercase italic mb-8 flex items-center gap-2">
                        <i className="fas fa-chart-area text-blue-600"></i> Flux Financiers (TND)
                    </h3>
                    <div className="h-64 flex items-end gap-3 justify-between pb-4">
                        {[40, 65, 45, 90, 65, 75, 55, 85, 35, 60, 40, 80].map((h, i) => (
                            <div key={i} className="flex-1 bg-slate-100 rounded-t-lg relative group overflow-hidden">
                                <motion.div 
                                    initial={{ height: 0 }}
                                    animate={{ height: `${h}%` }}
                                    transition={{ delay: i * 0.05 }}
                                    className="absolute bottom-0 inset-x-0 bg-blue-500 rounded-t-lg group-hover:bg-tunisia-red transition-colors"
                                />
                            </div>
                        ))}
                    </div>
                    <div className="flex justify-between text-[8px] font-black uppercase text-slate-400 mt-4 border-t border-slate-50 pt-4 px-2">
                        <span>Jan</span><span>Mar</span><span>Mai</span><span>Juil</span><span>Sep</span><span>Nov</span>
                    </div>
                </div>

                <div className="bg-slate-900 p-8 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-tunisia-red opacity-10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                    <h3 className="text-sm font-black uppercase italic mb-8 flex items-center gap-2">
                        <i className="fas fa-tower-observation text-tunisia-red"></i> Alertes d'Intégrité
                    </h3>
                    <div className="space-y-6 relative z-10">
                        <div className="p-4 bg-white/5 rounded-2xl border border-white/10 flex items-start gap-4">
                            <div className="w-10 h-10 rounded-xl bg-orange-500/20 text-orange-500 flex items-center justify-center shrink-0">
                                <i className="fas fa-shield-exclamation"></i>
                            </div>
                            <div>
                                <p className="text-[10px] font-black uppercase text-white">Soupçon de Blanchiment</p>
                                <p className="text-[9px] text-slate-400 font-bold mt-1 line-clamp-2">Transaction anormale détectée sur la référence PAY-X992 (Montant atypique vers zone grise).</p>
                                <button className="mt-3 text-[8px] font-black uppercase text-tunisia-red hover:underline tracking-widest italic">Ouvrir l'Enquête</button>
                            </div>
                        </div>
                        <div className="p-4 bg-white/5 rounded-2xl border border-white/10 flex items-start gap-4 opacity-60">
                            <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-500 flex items-center justify-center shrink-0">
                                <i className="fas fa-circle-info"></i>
                            </div>
                            <div>
                                <p className="text-[10px] font-black uppercase text-white">Mise à jour Swift</p>
                                <p className="text-[9px] text-slate-400 font-bold mt-1 uppercase tracking-tight">Nouvelles directives BCT applicables dès minuit.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    const renderPayments = () => (
        <div className="animate-fade-in space-y-6">
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
                <div className="flex flex-col md:flex-row justify-between items-center mb-10 gap-4">
                    <h3 className="text-sm font-black uppercase italic flex items-center gap-2">
                        <i className="fas fa-list-check text-blue-600"></i> Historique des Mouvements
                    </h3>
                    <div className="relative group w-full md:w-96">
                        <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-300"></i>
                        <input 
                            type="text" 
                            placeholder="RECHERCHER PAY-ID, EXPORTATEUR..."
                            className="w-full pl-12 pr-4 py-3 bg-slate-50 rounded-2xl border-2 border-transparent focus:border-blue-100 focus:bg-white outline-none text-[10px] font-bold uppercase transition-all tracking-widest"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="text-left border-b border-slate-50">
                                <th className="pb-6 text-[9px] font-black uppercase tracking-widest text-slate-400 pl-4">ID Transaction</th>
                                <th className="pb-6 text-[9px] font-black uppercase tracking-widest text-slate-400">Date</th>
                                <th className="pb-6 text-[9px] font-black uppercase tracking-widest text-slate-400">Exportateur / Entité</th>
                                <th className="pb-6 text-[9px] font-black uppercase tracking-widest text-slate-400">Montant</th>
                                <th className="pb-6 text-[9px] font-black uppercase tracking-widest text-slate-400">Méthode</th>
                                <th className="pb-6 text-[9px] font-black uppercase tracking-widest text-slate-400">Statut</th>
                                <th className="pb-6 text-[9px] font-black uppercase tracking-widest text-slate-400 pr-4">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {mockPayments.map((p) => (
                                <tr key={p.id} className="group hover:bg-slate-50/50 transition-colors">
                                    <td className="py-6 pl-4">
                                        <span className="text-[10px] font-black text-slate-900 font-mono tracking-tighter">{p.id}</span>
                                    </td>
                                    <td className="py-6">
                                        <span className="text-[10px] font-bold text-slate-400">{p.date}</span>
                                    </td>
                                    <td className="py-6">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center text-[10px] font-bold">
                                                {p.exporter.charAt(0)}
                                            </div>
                                            <span className="text-[10px] font-black uppercase text-slate-700">{p.exporter}</span>
                                        </div>
                                    </td>
                                    <td className="py-6">
                                        <span className="text-[10px] font-black text-slate-900">{p.amount.toLocaleString()} <span className="text-slate-400 text-[8px] ml-1">{p.currency}</span></span>
                                    </td>
                                    <td className="py-6">
                                        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-tight">{p.method}</span>
                                    </td>
                                    <td className="py-6">
                                        <span className={`px-4 py-1.5 rounded-full text-[8px] font-black uppercase tracking-widest flex items-center gap-2 w-max ${
                                            p.status === 'VALIDÉ' ? 'bg-emerald-50 text-emerald-600' :
                                            p.status === 'REJETÉ' ? 'bg-red-50 text-red-600' :
                                            p.status === 'EN ATTENTE' ? 'bg-amber-50 text-amber-600' : 'bg-slate-100 text-slate-500'
                                        }`}>
                                            <div className={`w-1.5 h-1.5 rounded-full ${
                                                p.status === 'VALIDÉ' ? 'bg-emerald-600' :
                                                p.status === 'REJETÉ' ? 'bg-red-600' :
                                                p.status === 'EN ATTENTE' ? 'bg-amber-600' : 'bg-slate-400'
                                            }`}></div>
                                            {p.status}
                                        </span>
                                    </td>
                                    <td className="py-6 pr-4">
                                        <div className="flex gap-2">
                                            <button className="w-8 h-8 bg-white border border-slate-100 rounded-lg flex items-center justify-center text-slate-400 hover:text-blue-600 hover:border-blue-100 transition-all shadow-sm">
                                                <i className="fas fa-print"></i>
                                            </button>
                                            <button className="w-8 h-8 bg-white border border-slate-100 rounded-lg flex items-center justify-center text-slate-400 hover:text-blue-600 hover:border-blue-100 transition-all shadow-sm">
                                                <i className="fas fa-ellipsis-v"></i>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );

    const renderProfile = () => (
        <div className="space-y-10 animate-fade-in pb-20">
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
                                        src={getFormalAvatar(directeurData.prenom, directeurData.nom, 'banque')} 
                                        alt={`Avatar ${directeurData.prenom} ${directeurData.nom}`}
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                            </div>
                        </div>
                        
                        <div className="flex-1 space-y-2 mb-4">
                            <div className="flex items-center gap-3">
                                <h2 className="text-3xl font-black text-slate-800 uppercase italic tracking-tighter">
                                    {directeurData.titre} {directeurData.nom}
                                </h2>
                                <span className="px-3 py-1 bg-blue-50 text-blue-600 border border-blue-100 rounded-full text-[8px] font-black uppercase tracking-widest">
                                    {directeurData.grade}
                                </span>
                            </div>
                            <p className="text-sm font-bold text-slate-400 flex items-center gap-2 uppercase tracking-wide">
                                <i className="fas fa-building text-slate-200"></i> Banque Centrale de Tunisie &bull; {directeurData.departement}
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-8 border-t border-slate-50">
                        {[
                            { label: 'Transactions', value: '45,890', icon: 'fa-money-bill-transfer' },
                            { label: 'Alertes', value: '12', icon: 'fa-bell' },
                            { label: 'Jours Présence', value: '112j', icon: 'fa-vault' },
                            { label: 'Matricule', value: directeurData.matricule, icon: 'fa-id-card' },
                        ].map((stat, i) => (
                            <div key={i} className="space-y-1">
                                <div className="flex items-center gap-2">
                                    <i className={`fas ${stat.icon} text-[10px] text-slate-300`}></i>
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</span>
                                </div>
                                <div className="text-2xl font-black text-slate-700 italic tracking-tighter pl-4">{stat.value}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );

    return (
        <div className="flex min-h-screen bg-slate-50">
            <Sidebar 
                activeTab={activeTab} 
                onTabChange={setActiveTab} 
                items={sidebarItems} 
                title="BCT & Banques" 
                subtitle="DÉPARTEMENT FINANCIER NATIONAL" 
                icon="fa-building-columns"
            />
            
            <main className="flex-1 p-12 overflow-y-auto">
                <header className="flex justify-between items-center mb-12 bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
                    <div className="space-y-1">
                        <h2 className="text-xl font-black uppercase italic tracking-tighter text-slate-900">
                            Supervision <span className="text-blue-600">Financière</span>
                        </h2>
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Réseau SWIFT Connecté & Opérationnel</p>
                        </div>
                    </div>
                    <div className="flex gap-4">
                        <button className="w-12 h-12 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center hover:text-blue-600 transition-colors border border-slate-100">
                            <i className="fas fa-bell"></i>
                        </button>
                        <div className="w-12 h-12 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center border border-slate-100 overflow-hidden">
                            <img 
                                src={getFormalAvatar(directeurData.prenom, directeurData.nom, 'banque')} 
                                alt={`Avatar ${directeurData.prenom} ${directeurData.nom}`}
                                className="w-full h-full object-cover"
                            />
                        </div>
                    </div>
                </header>

                {activeTab === 'dashboard' && renderDashboard()}
                {activeTab === 'payments' && renderPayments()}
                {activeTab === 'profile' && renderProfile()}
            </main>
        </div>
    );
};

export default BankSpace;
