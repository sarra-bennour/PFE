import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { AnimatePresence } from 'motion/react';
import axios from 'axios';
import { useAuth } from '../../App';
import Sidebar from '../../components/Sidebar';
import InstructionModal, { ValidationRequest, RequestType, AttachedDocument } from './InstructionModal';
import { Product } from '@/types/Product';
import { ImportDetails } from '@/types/DemandeEnregistrement';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080/api';

const ValidatorSpace: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'instruction' | 'stats' | 'archive'>('instruction');
  const [inboxTab, setInboxTab] = useState<RequestType>('REGISTRATION');
  const [selectedRequest, setSelectedRequest] = useState<ValidationRequest | null>(null);
  const [selectedAgency, setSelectedAgency] = useState('Ministère du Commerce');
  const [loading, setLoading] = useState(false);
  const [requests, setRequests] = useState<ValidationRequest[]>([]);
  const [archivedRequests, setArchivedRequests] = useState<ValidationRequest[]>([]);

  const institutions = [
    "Ministère du Commerce",
    "Ministère de l'Industrie",
    "INSSPA (Sécurité Sanitaire)",
    "ANMPS (Médicaments)",
    "Ministère de l'Agriculture"
  ];

  const sidebarItems = [
    { id: 'instruction', label: 'Instruction', icon: 'fa-folder-open' },
    { id: 'stats', label: 'Statistiques', icon: 'fa-chart-bar' },
    { id: 'archive', label: 'Archives', icon: 'fa-archive' },
    { id: 'admin', label: 'Admin Panel', icon: 'fa-shield-halved', path: '/admin', roles: ['admin'] as any },
  ];

  // Fetch all pending requests
  const fetchRequests = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE_URL}/validation/demandes`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { status: 'SOUMISE' }
      });
      
      const demandesData = response.data.data || response.data || [];
      const mappedRequests = demandesData.map((req: any) => mapBackendRequestToFrontend(req));
      setRequests(mappedRequests);
      
      // Also fetch archived requests (non-pending)
      const archivedResponse = await axios.get(`${API_BASE_URL}/validation/demandes`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { status: 'ALL' }
      });
      
      const allData = archivedResponse.data.data || archivedResponse.data || [];
      const allRequests = allData.map((req: any) => mapBackendRequestToFrontend(req));
      const nonPending = allRequests.filter((req: ValidationRequest) => req.status !== 'PENDING');
      setArchivedRequests(nonPending);
      
    } catch (error) {
      console.error('Error fetching requests:', error);
    } finally {
      setLoading(false);
    }
  };

  // Map backend data to frontend format
  const mapBackendRequestToFrontend = (backendReq: any): ValidationRequest => {
    const isImportateur = backendReq.typeDemandeur === 'IMPORTATEUR';
    const isExportateur = backendReq.typeDemandeur === 'EXPORTATEUR';
    
    // Determine request type
    let requestType: RequestType = 'REGISTRATION';
    if (backendReq.reference?.startsWith('IMP-')) {
      requestType = 'IMPORT';
    } else if (backendReq.reference?.startsWith('DEM-')) {
      requestType = 'PRODUCT_DECLARATION';
    } else if (backendReq.reference?.startsWith('DOS-')) {
      requestType = 'REGISTRATION';
    }
    
    // Map documents
    const documents: AttachedDocument[] = (backendReq.documents || []).map((doc: any) => ({
      id: doc.id.toString(),
      name: doc.fileName,
      status: mapDocumentStatus(doc.status),
      comment: doc.validationComment,
      fileUrl: doc.downloadUrl ? `${API_BASE_URL}${doc.downloadUrl}` : null,
      documentType: doc.documentType
    }));
    
    // Map products
    const products: Product[] = (backendReq.products || []).map((prod: any) => ({
      type: prod.productType === 'ALIMENTAIRE' ? 'ALIMENTAIRE' : 'INDUSTRIEL',
      category: prod.category || '',
      hscode: prod.hsCode || '',
      name: prod.productName || '',
      originCountry: prod.originCountry || '',
      commercialBrand: prod.commercialBrandName || prod.brandName || '',
      productState: prod.productState || prod.processingType,
      brandName: prod.brandName,
      annualQuantity: prod.annualQuantityValue,
      unit: prod.annualQuantityUnit
    }));
    
    // Map import details if applicable
    let importDetails: ImportDetails | undefined;
    if (requestType === 'IMPORT') {
      importDetails = {
        invoiceNum: backendReq.invoiceNumber || '',
        invoiceDate: backendReq.invoiceDate || '',
        amount: backendReq.amount?.toString() || '',
        currency: backendReq.currency || 'TND',
        incoterm: backendReq.incoterm || 'FOB',
        transportMode: backendReq.transportMode || 'SEA',
        departurePort: backendReq.loadingPort || '',
        arrivalPort: backendReq.dischargePort || '',
        arrivalDate: backendReq.arrivalDate || ''
      };
    }
    
    return {
      id: backendReq.id.toString(),
      reference: backendReq.reference || '',
      submittedAt: backendReq.submittedAt ? new Date(backendReq.submittedAt).toLocaleString() : '',
      paymentAmount: backendReq.paymentAmount ? `${backendReq.paymentAmount} TND` : '0 TND',
      applicantType: isImportateur ? 'IMPORTATEUR' : 'EXPORTATEUR',
      applicantName: backendReq.applicantName || (isImportateur ? 'Importateur' : 'Exportateur'),
      type: requestType,
      status: mapBackendStatus(backendReq.status),
      documents,
      products: products.length > 0 ? products : undefined,
      importDetails
    };
  };
  
  const mapDocumentStatus = (backendStatus: string): 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'NOT_SURE' => {
    switch (backendStatus) {
      case 'VALIDE': return 'ACCEPTED';
      case 'REJETE': return 'REJECTED';
      case 'EN_ATTENTE': return 'PENDING';
      default: return 'PENDING';
    }
  };
  
  const mapBackendStatus = (backendStatus: string): 'PENDING' | 'APPROVED' | 'REJECTED' | 'MORE_INFO' => {
    switch (backendStatus) {
      case 'SOUMISE': return 'PENDING';
      case 'VALIDEE': return 'APPROVED';
      case 'REJETEE': return 'REJECTED';
      case 'EN_ATTENTE_INFO': return 'MORE_INFO';
      default: return 'PENDING';
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleFinalDecision = (decision: 'APPROVED' | 'REJECTED' | 'MORE_INFO', updatedRequest: ValidationRequest, comment?: string) => {
  console.log('📝 [ValidatorSpace] Mise à jour UI après décision:', { decision, requestId: updatedRequest.id });
  
  // 🔥 NE PAS FAIRE D'APPEL API ICI - Le modal a déjà fait l'appel
  // Il suffit de mettre à jour l'état local
  
  setRequests(prev => prev.filter(req => req.id !== updatedRequest.id));
  setArchivedRequests(prev => [...prev, { 
    ...updatedRequest, 
    status: decision === 'APPROVED' ? 'APPROVED' : decision === 'REJECTED' ? 'REJECTED' : 'MORE_INFO' 
  }]);
  setSelectedRequest(null);
};

  const filteredRequests = requests.filter(r => {
    if (inboxTab === 'REGISTRATION') return r.type === 'REGISTRATION';
    if (inboxTab === 'PRODUCT_DECLARATION') return r.type === 'PRODUCT_DECLARATION';
    if (inboxTab === 'IMPORT') return r.type === 'IMPORT';
    return true;
  });

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar 
        activeTab={activeTab}
        onTabChange={(tab) => setActiveTab(tab as any)}
        items={sidebarItems}
        title="Espace Validateur"
        subtitle="Instruction Officielle"
        icon="fa-user-shield"
      />

      <main className="flex-1 p-10 space-y-10 overflow-y-auto">
        <div className="flex justify-between items-end">
          <div>
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
              <i className="fas fa-home"></i>
              <i className="fas fa-chevron-right text-[8px]"></i>
              <span>Validation</span>
              <i className="fas fa-chevron-right text-[8px]"></i>
              <span className="text-tunisia-red">{activeTab}</span>
            </div>
            <h2 className="text-4xl font-black text-slate-900 uppercase italic tracking-tighter">
              {activeTab === 'instruction' && "Instruction des Dossiers"}
              {activeTab === 'stats' && "Analyse des Performances"}
              {activeTab === 'archive' && "Historique des Décisions"}
            </h2>
          </div>
          
          <div className="flex gap-4">
            <div className="flex flex-col items-end gap-1">
              <label className="text-[8px] font-black uppercase tracking-widest text-slate-400">Institution</label>
              <select 
                value={selectedAgency}
                onChange={(e) => setSelectedAgency(e.target.value)}
                className="px-6 py-3 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-600 outline-none focus:border-tunisia-red transition-all shadow-sm"
              >
                {institutions.map(inst => <option key={inst} value={inst}>{inst}</option>)}
              </select>
            </div>
          </div>
        </div>

        {activeTab === 'instruction' && (
          <div className="space-y-10 animate-fade-in">
            {/* Inbox Tabs */}
            <div className="flex gap-4 p-2 bg-slate-100 rounded-3xl w-fit">
              {[
                { id: 'REGISTRATION', label: 'Enregistrements', icon: 'fa-user-plus', count: requests.filter(r => r.type === 'REGISTRATION').length },
                { id: 'PRODUCT_DECLARATION', label: 'Produits', icon: 'fa-box', count: requests.filter(r => r.type === 'PRODUCT_DECLARATION').length },
                { id: 'IMPORT', label: 'Importations', icon: 'fa-ship', count: requests.filter(r => r.type === 'IMPORT').length },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setInboxTab(tab.id as RequestType)}
                  className={`px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-3 ${
                    inboxTab === tab.id 
                      ? 'bg-white text-slate-900 shadow-xl scale-[1.02]' 
                      : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  <i className={`fas ${tab.icon}`}></i>
                  {tab.label}
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[8px] ${
                    inboxTab === tab.id ? 'bg-tunisia-red text-white' : 'bg-slate-200 text-slate-500'
                  }`}>
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>

            <div className="bg-white rounded-[3rem] shadow-sm border border-slate-100 overflow-hidden">
              <div className="p-8 border-b border-slate-50 bg-slate-50/30 flex justify-between items-center">
                <h3 className="text-xl font-black text-slate-900 uppercase italic tracking-tighter">
                  Inbox : {inboxTab === 'REGISTRATION' ? 'Enregistrements' : inboxTab === 'PRODUCT_DECLARATION' ? 'Déclarations Produits' : 'Importations'}
                </h3>
                <button 
                  onClick={fetchRequests}
                  className="px-4 py-2 bg-slate-100 rounded-xl text-[8px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-200 transition-all"
                >
                  <i className="fas fa-sync-alt mr-1"></i> Rafraîchir
                </button>
              </div>
              
              <div className="overflow-x-auto">
                {loading ? (
                  <div className="p-20 text-center">
                    <div className="w-12 h-12 border-4 border-tunisia-red border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-sm font-black text-slate-400 uppercase tracking-widest">Chargement des dossiers...</p>
                  </div>
                ) : (
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-white">
                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Référence</th>
                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Demandeur</th>
                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Soumis le</th>
                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Montant</th>
                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {filteredRequests.length > 0 ? filteredRequests.map((req) => (
                        <tr key={req.id} className="group hover:bg-slate-50/50 transition-colors">
                          <td className="px-8 py-6 font-black text-slate-900 italic tracking-tighter">{req.reference}</td>
                          <td className="px-8 py-6">
                            <div className="text-xs font-bold text-slate-800 uppercase tracking-tight">{req.applicantName}</div>
                            <div className="text-[8px] text-slate-400 font-black uppercase tracking-widest">{req.applicantType}</div>
                          </td>
                          <td className="px-8 py-6 text-[10px] font-bold text-slate-500">{req.submittedAt}</td>
                          <td className="px-8 py-6 text-[10px] font-black text-slate-900">{req.paymentAmount}</td>
                          <td className="px-8 py-6 text-right">
                            <button 
                              onClick={() => setSelectedRequest(req)}
                              className="px-6 py-2 bg-slate-900 text-white rounded-xl text-[9px] font-black uppercase tracking-widest shadow-lg hover:bg-black transition-all"
                            >
                              Instruire
                            </button>
                          </td>
                        </tr>
                      )) : (
                        <tr>
                          <td colSpan={5} className="px-8 py-20 text-center">
                            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-200">
                              <i className="fas fa-inbox text-2xl"></i>
                            </div>
                            <p className="text-sm font-black text-slate-300 uppercase tracking-widest italic">Aucun dossier en attente dans cette inbox</p>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        )}

        <AnimatePresence>
          {selectedRequest && (
            <InstructionModal 
              request={selectedRequest}
              onClose={() => setSelectedRequest(null)}
              onDecision={handleFinalDecision}
            />
          )}
        </AnimatePresence>

        {activeTab === 'stats' && (
          <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-slate-100 animate-fade-in">
            <h3 className="text-xl font-black italic text-slate-900 uppercase tracking-tighter mb-8">Analyse des Performances</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="p-6 bg-emerald-50 rounded-2xl">
                <div className="text-3xl font-black text-emerald-600">{requests.filter(r => r.type === 'REGISTRATION').length}</div>
                <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600 mt-2">Dossiers en attente</p>
              </div>
              <div className="p-6 bg-blue-50 rounded-2xl">
                <div className="text-3xl font-black text-blue-600">{requests.filter(r => r.type === 'PRODUCT_DECLARATION').length}</div>
                <p className="text-[10px] font-black uppercase tracking-widest text-blue-600 mt-2">Déclarations produits</p>
              </div>
              <div className="p-6 bg-purple-50 rounded-2xl">
                <div className="text-3xl font-black text-purple-600">{requests.filter(r => r.type === 'IMPORT').length}</div>
                <p className="text-[10px] font-black uppercase tracking-widest text-purple-600 mt-2">Demandes importation</p>
              </div>
            </div>
            <p className="text-slate-500 text-center">Visualisation détaillée des performances en cours de développement...</p>
          </div>
        )}

        {activeTab === 'archive' && (
          <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-slate-100 animate-fade-in">
            <h3 className="text-xl font-black italic text-slate-900 uppercase tracking-tighter mb-8">Historique des Décisions</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-white">
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Référence</th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Type</th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Statut Final</th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Date Décision</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {archivedRequests.length > 0 ? archivedRequests.map(req => (
                    <tr key={req.id}>
                      <td className="px-8 py-4 font-black text-slate-900 italic tracking-tighter">{req.reference}</td>
                      <td className="px-8 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">{req.type}</td>
                      <td className="px-8 py-4">
                        <span className={`text-[9px] font-black uppercase tracking-widest ${
                          req.status === 'APPROVED' ? 'text-emerald-500' : 
                          req.status === 'REJECTED' ? 'text-tunisia-red' : 'text-amber-500'
                        }`}>
                          {req.status === 'APPROVED' ? 'Approuvé' : req.status === 'REJECTED' ? 'Rejeté' : 'Plus d\'infos'}
                        </span>
                      </td>
                      <td className="px-8 py-4 text-[9px] font-black text-slate-500">{req.submittedAt}</td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={4} className="px-8 py-20 text-center">
                        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-200">
                          <i className="fas fa-archive text-2xl"></i>
                        </div>
                        <p className="text-sm font-black text-slate-300 uppercase tracking-widest italic">Aucun dossier traité</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default ValidatorSpace;