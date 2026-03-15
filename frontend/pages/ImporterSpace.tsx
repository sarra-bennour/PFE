
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import ExporterDirectory from './ExporterDirectory';
import ImporterNewDeclaration from './ImporterNewDeclaration';
import ImporterTracking from './ImporterTracking';
import ImporterDashboard from './ImporterDashboard';

const ImporterSpace: React.FC = () => {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [view, setView] = useState<'main' | 'declare' | 'track'>('main');

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Global Search Header */}
      <div className="bg-white p-8 rounded-[3rem] shadow-xl border border-slate-100 space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex-shrink-0">
            <h2 
              className="text-2xl font-black text-slate-900 tracking-tighter uppercase italic cursor-pointer"
              onClick={() => {
                setSearchQuery('');
                setView('main');
              }}
            >
              Espace Importateurs
            </h2>
          </div>
          {view === 'main' && (
            <div className="relative flex-grow max-w-2xl w-full">
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
          <div className="flex gap-3">
            <button 
              onClick={() => setView('declare')}
              className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${view === 'declare' ? 'bg-tunisia-red text-white shadow-lg shadow-red-200' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              Nouveau
            </button>
            <button 
              onClick={() => setView('track')}
              className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${view === 'track' ? 'bg-white border-2 border-slate-100 text-slate-600 hover:border-tunisia-red hover:text-tunisia-red' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              Suivi
            </button>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="animate-fade-in-scale">
        {view === 'declare' ? (
          <div className="space-y-6">
            <button onClick={() => setView('main')} className="text-slate-400 font-black uppercase text-[10px] tracking-widest hover:text-tunisia-red flex items-center gap-2">
              <i className="fas fa-arrow-left"></i> Retour au Dashboard
            </button>
            <ImporterNewDeclaration />
          </div>
        ) : view === 'track' ? (
          <div className="space-y-6">
            <button onClick={() => setView('main')} className="text-slate-400 font-black uppercase text-[10px] tracking-widest hover:text-tunisia-red flex items-center gap-2">
              <i className="fas fa-arrow-left"></i> Retour au Dashboard
            </button>
            <ImporterTracking />
          </div>
        ) : (
          <>
            {searchQuery ? (
              <div className="space-y-6">
                <div className="flex items-center justify-between px-4">
                  <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest italic">Résultats pour "{searchQuery}"</h3>
                  <button onClick={() => setSearchQuery('')} className="text-[10px] font-black text-tunisia-red uppercase tracking-widest">Effacer</button>
                </div>
                <ExporterDirectory externalSearchQuery={searchQuery} />
              </div>
            ) : (
              <ImporterDashboard />
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ImporterSpace;
