// src/components/StripeTransactionHistory.tsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';

interface Transaction {
  transactionId: string;
  paymentIntentId: string;
  amount: number;
  currency: string;
  status: string;
  description: string;
  customerEmail: string;
  customerName: string;
  paymentMethod: string;
  paymentMethodType: string;
  cardBrand: string;
  cardLast4: string;
  failureCode: string;
  failureMessage: string;
  created: string;
  paidAt: string;
  demandeReference: string;
  demandeId: number;
  userRole: string;
}

const StripeTransactionHistory: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [statistics, setStatistics] = useState<any>(null);
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalItems, setTotalItems] = useState(0);

  useEffect(() => {
    fetchTransactions();
    fetchStatistics();
  }, []);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/stripe-payment/all', {
        headers: { Authorization: `Bearer ${token}` },
        params: { limit: 1000 } // Récupérer plus de données pour la pagination
      });
      
      if (response.data.success) {
        setTransactions(response.data.transactions);
        setTotalItems(response.data.transactions.length);
        setCurrentPage(1); // Reset to first page when new data arrives
      }
    } catch (error) {
      console.error('Erreur lors du chargement des transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStatistics = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/stripe-payment/statistics', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.success) {
        setStatistics(response.data.statistics);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des statistiques:', error);
    }
  };

  // Filtrer les transactions
  const filteredTransactions = transactions.filter(t => {
    if (filter && !t.customerEmail?.toLowerCase().includes(filter.toLowerCase()) &&
        !t.customerName?.toLowerCase().includes(filter.toLowerCase()) &&
        !t.demandeReference?.toLowerCase().includes(filter.toLowerCase())) {
      return false;
    }
    if (statusFilter && t.status !== statusFilter) {
      return false;
    }
    return true;
  });

  // Pagination logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentTransactions = filteredTransactions.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);

  const handlePageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber);
    // Scroll to top of the table when page changes
    document.getElementById('transactions-table')?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleItemsPerPageChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setItemsPerPage(Number(event.target.value));
    setCurrentPage(1); // Reset to first page
  };

  // Generate page numbers for pagination
  const getPageNumbers = () => {
    const pageNumbers = [];
    const maxPagesToShow = 5;
    
    if (totalPages <= maxPagesToShow) {
      for (let i = 1; i <= totalPages; i++) {
        pageNumbers.push(i);
      }
    } else {
      const startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
      const endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);
      
      if (startPage > 1) {
        pageNumbers.push(1);
        if (startPage > 2) pageNumbers.push('...');
      }
      
      for (let i = startPage; i <= endPage; i++) {
        pageNumbers.push(i);
      }
      
      if (endPage < totalPages) {
        if (endPage < totalPages - 1) pageNumbers.push('...');
        pageNumbers.push(totalPages);
      }
    }
    
    return pageNumbers;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'succeeded':
        return <span className="px-3 py-1 rounded-full text-[8px] font-black bg-emerald-50 text-emerald-600">SUCCÈS</span>;
      case 'requires_payment_method':
        return <span className="px-3 py-1 rounded-full text-[8px] font-black bg-red-50 text-red-600">ÉCHOUÉ</span>;
      case 'requires_action':
        return <span className="px-3 py-1 rounded-full text-[8px] font-black bg-amber-50 text-amber-600">ACTION REQUISE</span>;
      case 'processing':
        return <span className="px-3 py-1 rounded-full text-[8px] font-black bg-blue-50 text-blue-600">EN COURS</span>;
      default:
        return <span className="px-3 py-1 rounded-full text-[8px] font-black bg-slate-100 text-slate-600">{status}</span>;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <i className="fas fa-spinner fa-spin text-blue-600 text-3xl"></i>
        <span className="ml-3 text-sm font-bold text-slate-400">Chargement des transactions...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Statistiques */}
      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <p className="text-[8px] font-black uppercase text-slate-400">Total Transactions</p>
            <p className="text-2xl font-black text-slate-900">{statistics.totalTransactions}</p>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <p className="text-[8px] font-black uppercase text-slate-400">Succès</p>
            <p className="text-2xl font-black text-emerald-600">{statistics.succeededTransactions}</p>
            <p className="text-[10px] text-emerald-500">{statistics.successRate?.toFixed(1)}%</p>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <p className="text-[8px] font-black uppercase text-slate-400">Échecs</p>
            <p className="text-2xl font-black text-red-600">{statistics.failedTransactions}</p>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <p className="text-[8px] font-black uppercase text-slate-400">Montant Total</p>
            <p className="text-2xl font-black text-slate-900">{statistics.totalAmount?.toLocaleString()} TND</p>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <p className="text-[8px] font-black uppercase text-slate-400">Moyenne</p>
            <p className="text-2xl font-black text-slate-900">{statistics.averageAmount?.toLocaleString()} TND</p>
          </div>
        </div>
      )}

      {/* Filtres */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex-1 min-w-[200px]">
            <input
              type="text"
              placeholder="Rechercher par email, nom ou référence..."
              value={filter}
              onChange={(e) => {
                setFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-4 py-3 bg-slate-50 rounded-xl text-sm font-bold outline-none focus:border-blue-500 transition-all"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="px-4 py-3 bg-slate-50 rounded-xl text-sm font-bold outline-none focus:border-blue-500 transition-all"
          >
            <option value="">Tous les statuts</option>
            <option value="succeeded">Succès</option>
            <option value="requires_payment_method">Échec</option>
            <option value="requires_action">Action requise</option>
            <option value="processing">En cours</option>
          </select>
          <button
            onClick={() => {
              setFilter('');
              setStatusFilter('');
              setCurrentPage(1);
            }}
            className="px-6 py-3 bg-slate-100 rounded-xl text-[10px] font-black uppercase hover:bg-slate-200 transition-all"
          >
            Réinitialiser
          </button>
          
          {/* Items per page selector */}
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-[8px] font-black text-slate-400 uppercase">Afficher</span>
            <select
              value={itemsPerPage}
              onChange={handleItemsPerPageChange}
              className="px-3 py-2 bg-slate-50 rounded-lg text-[10px] font-bold outline-none focus:border-blue-500 transition-all"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <span className="text-[8px] font-black text-slate-400 uppercase">par page</span>
          </div>
        </div>
        
        {/* Résultats count */}
        <div className="mt-4 text-[9px] font-bold text-slate-400">
          Affichage de {filteredTransactions.length > 0 ? indexOfFirstItem + 1 : 0} à{' '}
          {Math.min(indexOfLastItem, filteredTransactions.length)} sur{' '}
          {filteredTransactions.length} résultat(s)
        </div>
      </div>

      {/* Tableau des transactions */}
      <div id="transactions-table" className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                <th className="p-4 text-left text-[8px] font-black uppercase text-slate-400">Date</th>
                <th className="p-4 text-left text-[8px] font-black uppercase text-slate-400">Client</th>
                <th className="p-4 text-left text-[8px] font-black uppercase text-slate-400">Montant</th>
                <th className="p-4 text-left text-[8px] font-black uppercase text-slate-400">Moyen Paiement</th>
                <th className="p-4 text-left text-[8px] font-black uppercase text-slate-400">Description</th>
                <th className="p-4 text-left text-[8px] font-black uppercase text-slate-400">Statut</th>
                <th className="p-4 text-left text-[8px] font-black uppercase text-slate-400">Motif Refus</th>
                <th className="p-4 text-left text-[8px] font-black uppercase text-slate-400">Référence</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {currentTransactions.map((tx) => (
                <tr key={tx.transactionId} className="hover:bg-slate-50/50 transition-colors">
                  <td className="p-4">
                    <div className="text-[10px] font-bold text-slate-600">
                      {tx.created ? new Date(tx.created).toLocaleDateString('fr-FR') : 'N/A'}
                    </div>
                    <div className="text-[8px] text-slate-400">
                      {tx.created ? new Date(tx.created).toLocaleTimeString('fr-FR') : ''}
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="text-[10px] font-bold text-slate-900">{tx.customerName || 'N/A'}</div>
                    <div className="text-[8px] text-slate-400">{tx.customerEmail || 'N/A'}</div>
                  </td>
                  <td className="p-4">
                    <div className="text-[10px] font-black text-slate-900">
                      {tx.amount?.toLocaleString()} {tx.currency?.toUpperCase()}
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <i className={`fas ${
                        tx.paymentMethodType === 'card' ? 'fa-credit-card' : 'fa-money-bill-wave'
                      } text-slate-400 text-[10px]`}></i>
                      <div>
                        <div className="text-[9px] font-bold text-slate-700">
                          {tx.paymentMethod || tx.paymentMethodType}
                        </div>
                        {tx.cardBrand && tx.cardLast4 && (
                          <div className="text-[7px] text-slate-400">
                            {tx.cardBrand} •••• {tx.cardLast4}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="text-[9px] text-slate-600 max-w-[200px] truncate" title={tx.description}>
                      {tx.description || 'Frais de dossier'}
                    </div>
                  </td>
                  <td className="p-4">
                    {getStatusBadge(tx.status)}
                  </td>
                  <td className="p-4">
                    {tx.failureMessage ? (
                      <div className="group relative">
                        <span className="text-[9px] text-red-500 cursor-help">
                          <i className="fas fa-info-circle mr-1"></i>
                          {tx.failureCode || 'Erreur'}
                        </span>
                        <div className="absolute z-10 hidden group-hover:block bg-slate-800 text-white text-[8px] p-2 rounded-lg whitespace-nowrap">
                          {tx.failureMessage}
                        </div>
                      </div>
                    ) : (
                      <span className="text-[9px] text-slate-300">—</span>
                    )}
                  </td>
                  <td className="p-4">
                    <div className="text-[9px] font-mono text-slate-500">
                      {tx.demandeReference || tx.transactionId?.substring(0, 8)}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {filteredTransactions.length === 0 && (
          <div className="text-center py-12">
            <i className="fas fa-receipt text-4xl text-slate-300 mb-3 block"></i>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Aucune transaction trouvée</p>
          </div>
        )}

        {/* Pagination */}
        {filteredTransactions.length > 0 && (
          <div className="flex justify-between items-center p-4 border-t border-slate-100 bg-slate-50/30">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase transition-all ${
                currentPage === 1
                  ? 'bg-slate-100 text-slate-300 cursor-not-allowed'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-blue-200'
              }`}
            >
              <i className="fas fa-chevron-left mr-2 text-[8px]"></i>
              Précédent
            </button>
            
            <div className="flex gap-2">
              {getPageNumbers().map((page, index) => (
                <button
                  key={index}
                  onClick={() => typeof page === 'number' && handlePageChange(page)}
                  className={`w-8 h-8 rounded-xl text-[10px] font-black transition-all ${
                    currentPage === page
                      ? 'bg-blue-600 text-white shadow-md'
                      : page === '...'
                      ? 'bg-transparent text-slate-400 cursor-default'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-blue-200'
                  }`}
                  disabled={page === '...'}
                >
                  {page}
                </button>
              ))}
            </div>
            
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase transition-all ${
                currentPage === totalPages
                  ? 'bg-slate-100 text-slate-300 cursor-not-allowed'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-blue-200'
              }`}
            >
              Suivant
              <i className="fas fa-chevron-right ml-2 text-[8px]"></i>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default StripeTransactionHistory;