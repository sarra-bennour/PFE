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
  const [archiveTab, setArchiveTab] = useState<RequestType>('REGISTRATION');
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
      

      console.log('📊 Toutes les demandes:', allData);
      console.log('📊 Demandes non-pending:', nonPending);
      console.log('📊 Archives par type:', {
        REGISTRATION: nonPending.filter((r: ValidationRequest) => r.type === 'REGISTRATION').length,
        PRODUCT_DECLARATION: nonPending.filter((r: ValidationRequest) => r.type === 'PRODUCT_DECLARATION').length,
        IMPORT: nonPending.filter((r: ValidationRequest) => r.type === 'IMPORT').length
      });

    } catch (error) {
      console.error('Error fetching requests:', error);
    } finally {
      setLoading(false);
    }
  };

  // Map backend data to frontend format
  const mapBackendRequestToFrontend = (backendReq: any): ValidationRequest => {
  const isImportateur = backendReq.applicantType === 'IMPORTATEUR';
  
  // Déterminer le type de demande
  let requestType: RequestType = 'REGISTRATION';
  
  if (backendReq.reference?.startsWith('IMP-')) {
    requestType = 'IMPORT';
  } else if (backendReq.reference?.startsWith('DEM-')) {
    requestType = 'PRODUCT_DECLARATION';
  } else if (backendReq.reference?.startsWith('DOS-')) {
    requestType = 'REGISTRATION';
  }
  
  // Mapper les documents
  const documents: AttachedDocument[] = (backendReq.documents || []).map((doc: any) => ({
    id: doc.id?.toString() || Math.random().toString(),
    name: doc.name || doc.fileName || 'Document',
    status: mapDocumentStatus(doc.status),
    comment: doc.validationComment,
    fileUrl: `http://localhost:8080/api/admin/document/${doc.id}/preview`,
    documentType: doc.documentType
  }));
  
  // Mapper les produits
  const products: Product[] = (backendReq.products || []).map((prod: any) => ({
    productType: prod.productType === 'ALIMENTAIRE' ? 'ALIMENTAIRE' : 'INDUSTRIEL',
    category: prod.category || '',
    hsCode: prod.hsCode || '',
    productName: prod.productName || '',
    originCountry: prod.originCountry || '',
    commercialBrandName: prod.commercialBrandName || prod.brandName || '',
    brandName: prod.brandName,
    productState: prod.productState || prod.processingType,
    annualQuantityValue: prod.annualQuantityValue,
    annualQuantityUnit: prod.annualQuantityUnit,
    isLinkedToBrand: prod.isLinkedToBrand,
    isBrandOwner: prod.isBrandOwner,
    hasBrandLicense: prod.hasBrandLicense,
    productImage: prod.productImage
  }));
  
  // Mapper les détails d'import
  let importDetails: ImportDetails | undefined;
  if (requestType === 'IMPORT') {
    importDetails = {
      invoiceNum: backendReq.importDetails?.invoiceNumber || backendReq.invoiceNumber || '',
      invoiceDate: backendReq.importDetails?.invoiceDate || backendReq.invoiceDate || '',
      amount: backendReq.importDetails?.amount?.toString() || backendReq.amount?.toString() || '',
      currency: backendReq.importDetails?.currency || backendReq.currency || 'TND',
      incoterm: backendReq.importDetails?.incoterm || backendReq.incoterm || 'FOB',
      transportMode: backendReq.importDetails?.transportMode || backendReq.transportMode || 'SEA',
      departurePort: backendReq.importDetails?.loadingPort || backendReq.loadingPort || '',
      arrivalPort: backendReq.importDetails?.dischargePort || backendReq.dischargePort || '',
      arrivalDate: backendReq.importDetails?.arrivalDate || backendReq.arrivalDate || ''
    };
  }
  
  return {
    id: backendReq.id?.toString() || '',
    reference: backendReq.reference || '',
    submittedAt: backendReq.submittedAt ? new Date(backendReq.submittedAt).toLocaleString('fr-TN') : '',
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
              readOnly={selectedRequest.status !== 'PENDING'}
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
          <div className="space-y-10 animate-fade-in">
            {/* Archive Filter Tabs */}
            <div className="flex gap-4 p-2 bg-slate-100 rounded-3xl w-fit">
              {[
                { id: 'REGISTRATION', label: 'Enregistrements', icon: 'fa-user-plus' },
                { id: 'PRODUCT_DECLARATION', label: 'Produits', icon: 'fa-box' },
                { id: 'IMPORT', label: 'Importations', icon: 'fa-ship' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setArchiveTab(tab.id as RequestType)}
                  className={`px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-3 ${
                    archiveTab === tab.id 
                      ? 'bg-white text-slate-900 shadow-sm' 
                      : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  <i className={`fas ${tab.icon}`}></i>
                  {tab.label}
                  <span className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] bg-slate-200 text-slate-500">
                    {archivedRequests.filter(r => r.type === tab.id).length}
                  </span>
                </button>
              ))}
            </div>

            <div className="bg-white rounded-[3rem] shadow-sm border border-slate-100 overflow-hidden">
              <div className="p-8 border-b border-slate-50 bg-slate-50/30 flex justify-between items-center">
                <h3 className="text-xl font-black italic text-slate-900 uppercase tracking-tighter">Historique des Décisions</h3>
                <div className="flex gap-2">
                  <span className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[8px] font-black uppercase tracking-widest border border-emerald-100">
                    {archivedRequests.filter(r => r.status === 'APPROVED').length} Validés
                  </span>
                  <span className="px-3 py-1 bg-red-50 text-red-600 rounded-full text-[8px] font-black uppercase tracking-widest border border-red-100">
                    {archivedRequests.filter(r => r.status === 'REJECTED').length} Rejetés
                  </span>
                </div>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-white">
                      <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Référence</th>
                      <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Demandeur</th>
                      <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Soumis le</th>
                      <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Statut Final</th>
                      <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Décision</th>
                      <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {archivedRequests.filter(r => r.type === archiveTab).length > 0 ? (
                      archivedRequests.filter(r => r.type === archiveTab).map(req => (
                        <tr key={req.id} className="group hover:bg-slate-50/50 transition-colors">
                          <td className="px-8 py-6">
                            <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] ${
                                req.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-500' : 
                                req.status === 'REJECTED' ? 'bg-red-50 text-red-500' : 'bg-amber-50 text-amber-500'
                              }`}>
                                <i className={`fas ${
                                  req.status === 'APPROVED' ? 'fa-check-circle' : 
                                  req.status === 'REJECTED' ? 'fa-times-circle' : 'fa-question-circle'
                                }`}></i>
                              </div>
                              <span className="font-black text-slate-900 italic tracking-tighter">{req.reference}</span>
                            </div>
                          </td>
                          <td className="px-8 py-6">
                            <div className="text-xs font-bold text-slate-800 uppercase tracking-tight">{req.applicantName}</div>
                            <div className="text-[8px] text-slate-400 font-black uppercase tracking-widest">{req.applicantType}</div>
                          </td>
                          <td className="px-8 py-6 text-[10px] font-bold text-slate-500">{req.submittedAt}</td>
                          <td className="px-8 py-6">
                            <span className={`text-[8px] font-black uppercase tracking-widest px-3 py-1 rounded-md border ${
                              req.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 
                              req.status === 'REJECTED' ? 'bg-red-50 text-red-600 border-red-100' : 
                              'bg-amber-50 text-amber-600 border-amber-100'
                            }`}>
                              {req.status === 'APPROVED' ? 'Dossier Validé' : 
                              req.status === 'REJECTED' ? 'Dossier Rejeté' : 'Plus d\'infos'}
                            </span>
                          </td>
                          <td className="px-8 py-6">
                            {req.decisionComment && (
                              <div className="text-[9px] text-slate-500 italic max-w-xs truncate" title={req.decisionComment}>
                                <i className="fas fa-comment mr-1 text-slate-300"></i>
                                {req.decisionComment}
                              </div>
                            )}
                          </td>
                          <td className="px-8 py-6 text-right">
                            <button 
                              onClick={() => setSelectedRequest(req)}
                              className="w-10 h-10 rounded-xl bg-slate-50 text-slate-400 hover:bg-slate-900 hover:text-white transition-all flex items-center justify-center ml-auto"
                              title="Voir les détails"
                            >
                              <i className="fas fa-eye text-xs"></i>
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="px-8 py-20 text-center">
                          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-200">
                            <i className="fas fa-archive text-2xl"></i>
                          </div>
                          <p className="text-sm font-black text-slate-300 uppercase tracking-widest italic">
                            Aucune archive pour {archiveTab === 'REGISTRATION' ? 'les enregistrements' : 
                                            archiveTab === 'PRODUCT_DECLARATION' ? 'les déclarations produits' : 
                                            'les importations'}
                          </p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default ValidatorSpace;
