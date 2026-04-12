
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AnimatePresence } from 'motion/react';
import { useAuth } from '../../App';
import Sidebar from '../../components/Sidebar';
import InstructionModal, { ValidationRequest, RequestType } from './InstructionModal';

const ValidatorSpace: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'instruction' | 'stats' | 'archive'>('instruction');
  const [inboxTab, setInboxTab] = useState<RequestType>('REGISTRATION');
  const [selectedRequest, setSelectedRequest] = useState<ValidationRequest | null>(null);
  const [selectedAgency, setSelectedAgency] = useState('Ministère du Commerce');

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

  const [requests, setRequests] = useState<ValidationRequest[]>([
    {
      id: '1',
      reference: 'REG-2024-001',
      submittedAt: '2024-05-10 14:30',
      paymentAmount: '150 TND',
      applicantType: 'EXPORTATEUR',
      applicantName: 'Tunisia Olive Oil Co.',
      type: 'REGISTRATION',
      status: 'PENDING',
      documents: [
        { id: 'd1', name: 'Registre de Commerce', status: 'PENDING' },
        { id: 'd2', name: 'Identifiant Fiscal', status: 'PENDING' },
        { id: 'd3', name: 'Attestation d\'Exportation', status: 'PENDING' },
      ]
    },
    {
      id: '2',
      reference: 'PRD-2024-042',
      submittedAt: '2024-05-11 09:15',
      paymentAmount: '250 TND',
      applicantType: 'EXPORTATEUR',
      applicantName: 'Sousse Textile S.A.',
      type: 'PRODUCT_DECLARATION',
      status: 'PENDING',
      documents: [
        { id: 'd4', name: 'Fiche Technique', status: 'PENDING' },
        { id: 'd5', name: 'Certificat d\'Origine', status: 'PENDING' },
      ],
      products: [
        {
          type: 'INDUSTRIEL',
          category: 'Textile',
          hscode: '61091000',
          name: 'T-shirt Coton',
          originCountry: 'Tunisie',
          commercialBrand: 'TunisStyle'
        },
        {
          type: 'ALIMENTAIRE',
          category: 'Huiles',
          hscode: '15091000',
          name: 'Huile d\'Olive Vierge',
          originCountry: 'Tunisie',
          commercialBrand: 'Zitouna',
          productState: 'Liquide',
          brandName: 'Zitouna Gold',
          annualQuantity: '5000',
          unit: 'Litres'
        }
      ]
    },
    {
      id: '3',
      reference: 'IMP-2024-991',
      submittedAt: '2024-05-12 16:45',
      paymentAmount: '450 TND',
      applicantType: 'IMPORTATEUR',
      applicantName: 'Global Trading Tunis',
      type: 'IMPORT',
      status: 'PENDING',
      documents: [
        { id: 'd6', name: 'Facture Proforma', status: 'PENDING' },
        { id: 'd7', name: 'Liste de Colisage', status: 'PENDING' },
        { id: 'd8', name: 'Titre de Transport', status: 'PENDING' },
      ],
      importDetails: {
        invoiceNum: 'INV-8822',
        invoiceDate: '2024-05-01',
        amount: '12500',
        currency: 'EUR',
        incoterm: 'FOB',
        transportMode: 'SEA',
        departurePort: 'Marseille',
        arrivalPort: 'Radès',
        arrivalDate: '2024-05-20'
      }
    }
  ]);

  const handleFinalDecision = (decision: 'APPROVED' | 'REJECTED' | 'MORE_INFO', updatedRequest: ValidationRequest) => {
    setRequests(prev => prev.map(req => 
      req.id === updatedRequest.id ? { ...updatedRequest, status: decision } : req
    ));
    setSelectedRequest(null);
  };

  const filteredRequests = requests.filter(r => r.type === inboxTab && r.status === 'PENDING');

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
                { id: 'REGISTRATION', label: 'Enregistrements', icon: 'fa-user-plus', count: requests.filter(r => r.type === 'REGISTRATION' && r.status === 'PENDING').length },
                { id: 'PRODUCT_DECLARATION', label: 'Produits', icon: 'fa-box', count: requests.filter(r => r.type === 'PRODUCT_DECLARATION' && r.status === 'PENDING').length },
                { id: 'IMPORT', label: 'Importations', icon: 'fa-ship', count: requests.filter(r => r.type === 'IMPORT' && r.status === 'PENDING').length },
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
              </div>
              
              <div className="overflow-x-auto">
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
            <p className="text-slate-500">Visualisation des données de validation en cours de développement...</p>
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
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {requests.filter(r => r.status !== 'PENDING').map(req => (
                    <tr key={req.id}>
                      <td className="px-8 py-4 font-black text-slate-900 italic tracking-tighter">{req.reference}</td>
                      <td className="px-8 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">{req.type}</td>
                      <td className="px-8 py-4">
                        <span className={`text-[9px] font-black uppercase tracking-widest ${
                          req.status === 'APPROVED' ? 'text-emerald-500' : 
                          req.status === 'REJECTED' ? 'text-tunisia-red' : 'text-amber-500'
                        }`}>
                          {req.status}
                        </span>
                      </td>
                    </tr>
                  ))}
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