import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import ExporterDirectory from './ExporterDirectory';
import ImporterTracking from './ImporterTracking';
import ImporterDashboard from './ImporterDashboard';
import RequestArchive from '../RequestArchive';
import ArrivalCalendar from './ArrivalCalendar';


const ImporterSpace: React.FC = () => {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [view, setView] = useState<'main' | 'track' | 'archive' | 'calendar'>('main');
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalContent, setModalContent] = useState<any>(null);

  const handleViewChange = (newView: 'main' | 'track' | 'archive' | 'calendar') => {
    if (newView === view) return;
    setIsTransitioning(true);
    setTimeout(() => {
      setView(newView);
      setTimeout(() => setIsTransitioning(false), 50);
    }, 150);
  };

  const handleModalOpen = (isOpen: boolean, content?: any) => {
    setIsModalOpen(isOpen);
    if (content) {
      setModalContent(content);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20">
      <br /> 
      {/* Overlay global avec flou */}
      {isModalOpen && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] animate-fade-in"
          onClick={() => handleModalOpen(false)}
        />
      )}

      {/* Modal global */}
      {isModalOpen && modalContent && (
        <div className="fixed inset-0 z-[101] flex items-center justify-center p-4 pointer-events-none">
          <div className="pointer-events-auto">
            {modalContent}
          </div>
        </div>
      )}

      {/* Global Search Header */}
      <div className={`bg-white p-8 rounded-[3rem] shadow-xl border border-slate-100 space-y-6 transition-all duration-300 ${isModalOpen ? 'blur-sm' : ''
        }`}>
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex-shrink-0">
            <h2
              className="text-2xl font-black text-slate-900 tracking-tighter uppercase italic cursor-pointer hover:text-tunisia-red transition-colors duration-300"
              onClick={() => {
                setSearchQuery('');
                handleViewChange('main');
              }}
            >
              Espace Importateurs
            </h2>
          </div>
          {view === 'main' && (
            <div className="relative flex-grow max-w-2xl w-full animate-fade-in">
              <input
                type="text"
                placeholder="Rechercher un exportateur, un produit ou un code NGP..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  if (e.target.value !== '') setView('main');
                }}
                className="w-full pl-12 pr-12 py-4 bg-slate-50 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-tunisia-red outline-none transition-all shadow-inner"
              />
              <i className="fas fa-search absolute left-5 top-1/2 -translate-y-1/2 text-slate-300"></i>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-tunisia-red transition-colors"
                >
                  <i className="fas fa-times-circle"></i>
                </button>
              )}
            </div>
          )}
          {view !== 'main' && <div className="flex-grow"></div>}

          {/* Boutons */}
          <div className="flex bg-slate-50 p-1 rounded-xl border border-slate-100 w-full md:w-auto">
            <button
              onClick={() => handleViewChange('main')}
              className={`flex-1 md:flex-none px-6 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${view === 'main'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-400 hover:text-slate-600'
                }`}
            >
              Dashboard
            </button>
            <button
              onClick={() => handleViewChange('track')}
              className={`flex-1 md:flex-none px-6 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${view === 'track'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-400 hover:text-slate-600'
                }`}
            >
              Suivi
            </button>
            <button
              onClick={() => handleViewChange('calendar')}
              className={`flex-1 md:flex-none px-6 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${view === 'calendar'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-400 hover:text-slate-600'
                }`}
            >
              Arrivage
            </button>
            <button
              onClick={() => handleViewChange('archive')}
              className={`flex-1 md:flex-none px-6 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${view === 'archive'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-400 hover:text-slate-600'
                }`}
            >
              Archive
            </button>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className={`relative min-h-[500px] transition-all duration-300 ${isModalOpen ? 'blur-sm' : ''
        }`}>
        <div className={`transition-all duration-300 ease-in-out ${isTransitioning ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'
          }`}>
          {view === 'archive' ? (
            <div className="space-y-6 animate-fade-in">
              <div className='flex items-center justify-between'>
                <button
                  onClick={() => handleViewChange('main')}
                  className="text-slate-400 font-black uppercase text-[10px] tracking-widest hover:text-tunisia-red flex items-center gap-2 transition-colors duration-300 group"
                >
                  <i className="fas fa-arrow-left group-hover:-translate-x-1 transition-transform duration-300"></i>
                  Retour au Dashboard
                </button>
                <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest italic">Historique des demandes archivées</span>
              </div>
              <RequestArchive userRole="IMPORTATEUR" />
            </div>
          ) : view === 'track' ? (
            <div className="space-y-6 animate-fade-in">
              <div className='flex items-center justify-between'>
                <button
                  onClick={() => handleViewChange('main')}
                  className="text-slate-400 font-black uppercase text-[10px] tracking-widest hover:text-tunisia-red flex items-center gap-2 transition-colors duration-300 group"
                >
                  <i className="fas fa-arrow-left group-hover:-translate-x-1 transition-transform duration-300"></i>
                  Retour au Dashboard
                </button>
                <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest italic">Suivi en temps réel</span>
              </div>
              <ImporterTracking onModalOpen={handleModalOpen} />
            </div>
          ) : view === 'calendar' ? (
            <div className="space-y-6 animate-slide-up">
              <div className="flex items-center justify-between">
                <button onClick={() => setView('main')} className="group text-slate-400 font-black uppercase text-[9px] tracking-widest hover:text-tunisia-red flex items-center gap-2 transition-all">
                  <i className="fas fa-arrow-left group-hover:-translate-x-1 transition-transform"></i> Retour
                </button>
                <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest italic">Planning des Arrivages</span>
              </div>
              <ArrivalCalendar />
            </div>
          ) : (
            <div className="animate-fade-in">
              {searchQuery ? (
                <div className="space-y-6">
                  <div className="flex items-center justify-between px-4">
                    <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest italic animate-slide-in">
                      Résultats pour "{searchQuery}"
                    </h3>
                    <button
                      onClick={() => setSearchQuery('')}
                      className="text-[10px] font-black text-tunisia-red uppercase tracking-widest hover:scale-105 transition-transform duration-300"
                    >
                      Effacer
                    </button>
                  </div>
                  <ExporterDirectory externalSearchQuery={searchQuery} />
                </div>
              ) : (
                <ImporterDashboard />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ImporterSpace;