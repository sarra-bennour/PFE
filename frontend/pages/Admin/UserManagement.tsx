import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { DeactivationRequest } from '../../types/DeactivationRequest';
import { User } from '../../types/User';
import { UserManagementProps } from '../../types/UserManagementProps';


// Composant séparé pour chaque carte de demande
const DeactivationRequestCard: React.FC<{
  request: DeactivationRequest;
  onProcess: (id: number, action: 'ACCEPT' | 'REJECT', comment: string) => void;
  isProcessing: boolean;
}> = ({ request, onProcess, isProcessing }) => {
  const [comment, setComment] = useState('');

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, scale: 0.9, x: 20 }}
      animate={{ opacity: 1, scale: 1, x: 0 }}
      exit={{ opacity: 0, scale: 0.8, y: -20 }}
      className="flex-shrink-0 w-[320px] bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 snap-center relative group"
    >
      {request.urgent && (
        <div className="absolute top-4 right-4 px-2 py-0.5 bg-red-50 text-tunisia-red border border-red-100 rounded-full text-[7px] font-black uppercase tracking-widest animate-pulse">
          Urgent
        </div>
      )}
      
      <div className="flex items-center gap-4 mb-4">
        <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400">
          <i className="fas fa-user-slash text-lg"></i>
        </div>
        <div>
          <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight italic">{request.companyName}</h4>
          <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">
            {new Date(request.requestDate).toLocaleDateString('fr-FR')}
          </p>
          <p className="text-[8px] font-black text-slate-400">{request.userEmail}</p>
        </div>
      </div>

      <div className="mb-4">
        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-tight mb-1">Motif :</p>
        <p className="text-xs font-bold text-slate-800">{request.reason || 'Non spécifié'}</p>
      </div>

      <div className="space-y-3">
        <textarea 
          placeholder="Commentaire (optionnel)..."
          className="w-full p-3 bg-slate-50 border-2 border-slate-50 rounded-xl text-[10px] font-bold outline-none focus:border-tunisia-red transition-all resize-none h-16"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        ></textarea>
        
        <div className="grid grid-cols-2 gap-3">
          <button 
            onClick={() => onProcess(request.id, 'ACCEPT', comment)}
            disabled={isProcessing}
            className="py-2.5 bg-emerald-500 text-white rounded-xl text-[8px] font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20 hover:bg-emerald-600 transition-all disabled:opacity-50"
          >
            {isProcessing ? '...' : 'Accepter'}
          </button>
          <button 
            onClick={() => onProcess(request.id, 'REJECT', comment)}
            disabled={isProcessing}
            className="py-2.5 bg-white border-2 border-slate-100 text-slate-400 rounded-xl text-[8px] font-black uppercase tracking-widest hover:border-tunisia-red hover:text-tunisia-red transition-all disabled:opacity-50"
          >
            {isProcessing ? '...' : 'Rejeter'}
          </button>
        </div>
      </div>
    </motion.div>
  );
};

const UserManagement: React.FC<UserManagementProps> = ({ onResetPassword }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [deactivationRequests, setDeactivationRequests] = useState<DeactivationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-slide effect
  useEffect(() => {
    const interval = setInterval(() => {
      if (scrollRef.current && deactivationRequests.length > 0) {
        const maxScroll = scrollRef.current.scrollWidth - scrollRef.current.clientWidth;
        if (scrollRef.current.scrollLeft >= maxScroll - 10) {
          scrollRef.current.scrollTo({ left: 0, behavior: 'smooth' });
        } else {
          scrollRef.current.scrollBy({ left: 344, behavior: 'smooth' });
        }
      }
    }, 7000);

    return () => clearInterval(interval);
  }, [deactivationRequests.length]);

  // Charger les données
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const token = localStorage.getItem('token');
    
    try {
      // Charger les utilisateurs
      const usersResponse = await fetch('http://localhost:8080/api/admin/users', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const usersData = await usersResponse.json();
      
      if (usersData.success) {
        // Filtrer pour exclure les admins
        const filteredUsers = usersData.users.filter((user: User) => user.role !== 'ADMIN');
        setUsers(filteredUsers);
      }

      // Charger les demandes de désactivation
      const requestsResponse = await fetch('http://localhost:8080/api/admin/deactivation-requests', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const requestsData = await requestsResponse.json();
      
      if (requestsData.success) {
        setDeactivationRequests(requestsData.requests);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des données:', error);
    } finally {
      setLoading(false);
    }
  };

  const processRequest = async (requestId: number, action: 'ACCEPT' | 'REJECT', comment: string) => {
    setProcessingId(requestId);
    const token = localStorage.getItem('token');
    
    try {
      const response = await fetch(`http://localhost:8080/api/admin/deactivation-requests/${requestId}/process`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ action, comment })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setDeactivationRequests(prev => prev.filter(r => r.id !== requestId));
        fetchData();
        alert(data.message || 'Demande traitée avec succès');
      } else {
        alert(data.error || 'Erreur lors du traitement');
      }
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur de connexion au serveur');
    } finally {
      setProcessingId(null);
    }
  };

  // Fonction pour désactiver un utilisateur (suspendre)
  const suspendUser = async (userId: number, userEmail: string) => {
    const token = localStorage.getItem('token');
    
    if (!window.confirm(`Êtes-vous sûr de vouloir SUSPENDRE le compte de ${userEmail} ?`)) {
      return;
    }
    
    try {
      const response = await fetch(`http://localhost:8080/api/admin/users/${userId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: 'INACTIF' })  // 🔥 Important: "INACTIF" en majuscule
      });
      
      const data = await response.json();
      
      if (data.success) {
        await fetchData(); // Rafraîchir la liste
        alert(`Compte ${userEmail} suspendu avec succès`);
      } else {
        alert(data.error || 'Erreur lors de la suspension');
      }
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur de connexion au serveur');
    }
  };

  // Fonction pour réactiver un utilisateur
  const reactivateUser = async (userId: number, userEmail: string) => {
    const token = localStorage.getItem('token');
    
    if (!window.confirm(`Êtes-vous sûr de vouloir RÉACTIVER le compte de ${userEmail} ?`)) {
      return;
    }
    
    try {
      const response = await fetch(`http://localhost:8080/api/admin/users/${userId}/reactivate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ comment: "Réactivation du compte par l'administrateur" })
      });
      
      const data = await response.json();
      
      if (data.success) {
        fetchData();
        alert(`Compte ${userEmail} réactivé avec succès`);
      } else {
        alert(data.error || 'Erreur lors de la réactivation');
      }
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur de connexion au serveur');
    }
  };

  // Filtrer les utilisateurs par recherche
  const filteredUsers = users.filter(user => 
    user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.nom?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.prenom?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.raisonSociale?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.role?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <i className="fas fa-spinner fa-spin text-3xl text-tunisia-red mb-4"></i>
          <p className="text-sm font-bold">Chargement des données...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {/* Deactivation Requests Carousel */}
      {deactivationRequests.length > 0 ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              Demandes de Désactivation en attente ({deactivationRequests.length})
            </h3>
            <div className="flex gap-2">
              <button 
                onClick={() => scrollRef.current?.scrollBy({ left: -300, behavior: 'smooth' })}
                className="w-8 h-8 rounded-full bg-white border border-slate-100 flex items-center justify-center text-slate-400 hover:text-tunisia-red transition-all shadow-sm"
              >
                <i className="fas fa-chevron-left text-[10px]"></i>
              </button>
              <button 
                onClick={() => scrollRef.current?.scrollBy({ left: 300, behavior: 'smooth' })}
                className="w-8 h-8 rounded-full bg-white border border-slate-100 flex items-center justify-center text-slate-400 hover:text-tunisia-red transition-all shadow-sm"
              >
                <i className="fas fa-chevron-right text-[10px]"></i>
              </button>
            </div>
          </div>
          
          <div 
            ref={scrollRef}
            className="flex gap-6 overflow-x-auto pb-6 scrollbar-hide snap-x cursor-grab active:cursor-grabbing"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            <AnimatePresence mode="popLayout">
              {deactivationRequests.map((req) => (
                <DeactivationRequestCard
                  key={req.id}
                  request={req}
                  onProcess={processRequest}
                  isProcessing={processingId === req.id}
                />
              ))}
            </AnimatePresence>
          </div>
        </div>
      ) : (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white p-10 rounded-[2rem] border border-slate-100 text-center"
        >
          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
            <i className="fas fa-check-circle text-2xl"></i>
          </div>
          <p className="text-sm font-black text-slate-400 uppercase tracking-widest italic">
            Aucune demande de désactivation en attente
          </p>
        </motion.div>
      )}

      {/* User Table */}
      <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/30">
          <h3 className="text-lg font-black italic text-slate-900 uppercase tracking-tighter">
            Comptes Opérateurs ({filteredUsers.length})
          </h3>
          <div className="relative">
            <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 text-[10px]"></i>
            <input 
              type="text" 
              placeholder="Rechercher..." 
              className="pl-10 pr-6 py-2 bg-white border border-slate-200 rounded-xl text-[10px] font-bold outline-none focus:border-tunisia-red transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="px-8 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">ID</th>
                <th className="px-8 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Entité</th>
                <th className="px-8 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Email</th>
                <th className="px-8 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Rôle</th>
                <th className="px-8 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Statut</th>
                <th className="px-8 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Pays</th>
                <th className="px-8 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredUsers.length > 0 ? (
                filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-8 py-5 font-black text-slate-900 italic tracking-tighter">{u.id}</td>
                    <td className="px-8 py-5">
                      <div>
                        <p className="text-xs font-black text-slate-800 uppercase tracking-tight">{u.raisonSociale || u.nom}</p>
                        <p className="text-[8px] font-black text-slate-400">{u.nom} {u.prenom}</p>
                      </div>
                    </td>
                    <td className="px-8 py-5 text-[10px] font-bold text-slate-600">{u.email}</td>
                    <td className="px-8 py-5 text-[9px] font-black text-slate-400 uppercase tracking-widest">{u.role}</td>
                    <td className="px-8 py-5">
                      <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border ${
                        u.statut === 'ACTIF' 
                          ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
                          : 'bg-red-50 text-red-600 border-red-100'
                      }`}>
                        {u.statut === 'ACTIF' ? 'Actif' : 'Inactif'}
                      </span>
                    </td>
                    <td className="px-8 py-5 text-[10px] font-bold text-slate-600">{u.paysOrigine || 'Tunisie'}</td>
                    <td className="px-8 py-5 text-right">
                      <div className="flex justify-end gap-4">
                        <button 
                          onClick={() => onResetPassword(u)}
                          className="text-[9px] font-black uppercase tracking-widest text-blue-500 hover:text-blue-700 transition-all"
                          title="Réinitialiser le mot de passe"
                        >
                          <i className="fas fa-key mr-1"></i> Password
                        </button>
                        {u.statut === 'ACTIF' ? (
                          <button 
                            onClick={() => suspendUser(u.id, u.email)}
                            className="text-[9px] font-black uppercase tracking-widest text-amber-600 hover:text-amber-700 transition-all"
                          >
                            <i className="fas fa-pause-circle mr-1"></i> Suspendre
                          </button>
                        ) : (
                          <button 
                            onClick={() => reactivateUser(u.id, u.email)}
                            className="text-[9px] font-black uppercase tracking-widest text-emerald-600 hover:text-emerald-700 transition-all"
                          >
                            <i className="fas fa-play-circle mr-1"></i> Activer
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-8 py-12 text-center">
                    <div className="text-center">
                      <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
                        <i className="fas fa-users-slash text-2xl"></i>
                      </div>
                      <p className="text-sm font-black text-slate-400 uppercase tracking-widest italic">
                        Aucun utilisateur trouvé
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default UserManagement;