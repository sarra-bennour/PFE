
import React, { useEffect, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

const Home: React.FC = () => {
  const { t } = useTranslation();
  const [isVisible, setIsVisible] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    setIsVisible(true);
    window.scrollTo(0, 0);
  }, []);

  const exchangeRates = [
    { pair: "EUR/TND", rate: "3.385", change: "+0.12%", up: true },
    { pair: "USD/TND", rate: "3.120", change: "-0.05%", up: false },
    { pair: "TRY/TND", rate: "0.096", change: "+0.45%", up: true },
    { pair: "CNY/TND", rate: "0.431", change: "+0.02%", up: true },
    { pair: "GBP/TND", rate: "4.052", change: "-0.18%", up: false },
  ];

  const collaborators = [
    { name: t('min_commerce'), role: t('min_commerce_role'), icon: 'fa-landmark', highlight: true },
    { name: t('min_tech'), role: 'Partenaire Numérique', icon: 'fa-microchip' },
    { name: t('customs'), role: 'Surveillance Douanière', icon: 'fa-shield-halved' },
    { name: t('min_agri'), role: 'Contrôle Sanitaire', icon: 'fa-wheat-awn' },
    { name: t('min_sante'), role: 'Sécurité Sanitaire', icon: 'fa-heart-pulse' },
    { name: t('min_industrie'), role: 'Promotion Industrielle', icon: 'fa-industry' },
    { name: t('cni'), role: 'Support Technique', icon: 'fa-server' },
  ];

  return (
    <div className={`transition-opacity duration-1000 ${isVisible ? 'opacity-100' : 'opacity-0'} space-y-24 pb-32`}>
      
      {/* Hero Section - Panoramic Rectangular Format with Intro Video */}
      <section className="relative h-[550px] md:h-[650px] mx-4 md:mx-8 mt-20 md:mt-24 overflow-hidden rounded-[3rem] md:rounded-[4rem] shadow-2xl group">
        {/* Background Cinematic Video */}
        <div className="absolute inset-0 z-0">
           <video 
             ref={videoRef}
             autoPlay 
             muted 
             loop 
             playsInline 
             className="w-full h-full object-cover filter brightness-[0.75] saturate-[1.1] transition-all duration-700"
             poster="https://images.unsplash.com/photo-1578575437130-527eed3abbec?q=80&w=2070&auto=format&fit=crop"
             onMouseOver={(e) => (e.currentTarget.controls = true)}
             onMouseOut={(e) => (e.currentTarget.controls = false)}
           >
             {/* New video source matching the user's screenshots of a busy container port */}
             <source src="https://assets.mixkit.co/videos/preview/mixkit-busy-port-terminal-with-containers-and-cranes-4376-large.mp4" type="video/mp4" />
           </video>
           
           {/* Protective Overlays */}
           <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-slate-900/20 to-transparent pointer-events-none"></div>
           <div className="absolute inset-0 bg-slate-900/10 backdrop-blur-[0.5px] pointer-events-none"></div>
        </div>

        <div className="relative h-full container mx-auto px-6 z-10 flex flex-col items-center justify-center text-center pointer-events-none">
          <div className="max-w-4xl mx-auto space-y-8 animate-fade-in-scale pointer-events-auto">
            
            <div className="flex flex-col items-center gap-4 mb-2">
              <div className="w-12 h-12 bg-white/10 backdrop-blur-2xl rounded-xl border border-white/20 p-2 shadow-2xl">
                 <img src="https://upload.wikimedia.org/wikipedia/commons/c/ce/Coat_of_arms_of_Tunisia.svg" alt="Tunisia Arms" className="w-full h-full object-contain filter invert" />
              </div>
              <div className="inline-flex items-center gap-3 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-xl border border-white/10 shadow-xl">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
                <span className="text-[8px] font-black uppercase tracking-[0.4em] text-white">Plateforme Nationale de Conformité</span>
              </div>
            </div>

            <h1 className="text-4xl md:text-[5rem] font-black tracking-tighter leading-[0.9] text-white">
              {t('hero_title').split(' ').map((word, i) => (
                <span key={i} className={`inline-block mr-3 ${i === 2 ? "text-tunisia-red drop-shadow-[0_5px_20px_rgba(231,0,19,0.4)]" : ""}`}>
                  {word}
                </span>
              ))}
            </h1>

            <p className="text-lg md:text-xl text-slate-200 font-medium max-w-2xl mx-auto leading-relaxed drop-shadow-md">
              {t('hero_subtitle')}
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-6 pt-4">
              <Link 
                to="/signup/exporter" 
                className="px-10 py-5 bg-tunisia-red text-white rounded-full font-black uppercase tracking-[0.2em] transition-all hover:scale-105 active:scale-95 shadow-2xl shadow-red-600/30 text-[9px]"
              >
                {t('register_now')}
              </Link>
              <Link 
                to="/login" 
                className="px-10 py-5 bg-white/10 backdrop-blur-xl border border-white/20 text-white rounded-full font-black uppercase tracking-[0.2em] hover:bg-white/20 transition-all hover:scale-105 active:scale-95 text-[9px]"
              >
                {t('declare_goods')}
              </Link>
            </div>
          </div>
        </div>

        {/* Subtle Horizontal Label */}
        <div className="absolute bottom-8 right-12 hidden md:block pointer-events-none">
           <span className="text-[7px] font-black text-white/30 uppercase tracking-[0.8em] vertical-text">DGCE DIGITAL GATEWAY</span>
        </div>
        
        {/* Floating Indicator for Video Controls */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-[8px] font-black text-white/30 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
           Survoler pour les contrôles vidéo
        </div>
      </section>

      {/* Live Market Data */}
      <section className="container mx-auto px-6 -mt-16 relative z-20">
        <div className="bg-white/90 backdrop-blur-3xl rounded-[2.5rem] p-10 border border-slate-100 shadow-[0_30px_80px_-15px_rgba(0,0,0,0.1)]">
          <div className="flex flex-col md:flex-row items-center justify-between mb-8 gap-4">
            <div className="text-center md:text-left">
              <h2 className="text-xl font-black text-slate-900 tracking-tight uppercase italic">{t('exchange_rates_title')}</h2>
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 mt-1">Source : Banque Centrale de Tunisie</p>
            </div>
            <div className="flex gap-3">
               <div className="px-4 py-2 rounded-full bg-slate-900 text-white text-[8px] font-black uppercase tracking-widest flex items-center gap-2">
                 <i className="fas fa-calendar-alt text-red-400"></i> {new Date().toLocaleDateString()}
               </div>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-5 gap-6">
            {exchangeRates.map((item, idx) => (
              <div key={idx} className="group p-6 rounded-[1.5rem] bg-white border border-slate-50 transition-all duration-500 hover:border-tunisia-red hover:shadow-xl hover:-translate-y-1">
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 block group-hover:text-tunisia-red">{item.pair}</span>
                <div className="text-xl font-black text-slate-900 tracking-tighter mb-1 italic">{item.rate}</div>
                <div className={`text-[9px] font-black flex items-center gap-1 ${item.up ? 'text-emerald-500' : 'text-rose-500'}`}>
                  <i className={`fas fa-caret-${item.up ? 'up' : 'down'}`}></i>
                  {item.change}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Strategic Vision Section */}
      <section className="container mx-auto px-6 max-w-6xl">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
          <div className="space-y-8">
            <span className="text-tunisia-red text-[9px] font-black uppercase tracking-[0.5em]">Modernisation d'État</span>
            <h2 className="text-4xl font-black text-slate-900 leading-[0.95] tracking-tighter uppercase italic">
              Simplifier pour <br/> mieux <span className="text-tunisia-red">Rayonner.</span>
            </h2>
            <p className="text-base text-slate-500 font-medium leading-relaxed">
              L'infrastructure numérique du Ministère du Commerce garantit une conformité totale aux normes internationales tout en accélérant les flux de marchandises à travers nos frontières.
            </p>
            <div className="grid grid-cols-2 gap-6 pt-4">
              <div className="p-4 bg-slate-50 rounded-2xl">
                <span className="block text-2xl font-black italic text-slate-900 mb-1 tracking-tighter">03 min</span>
                <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">Temps de Traitement</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-2xl">
                <span className="block text-2xl font-black italic text-slate-900 mb-1 tracking-tighter">100%</span>
                <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">Sécurité des données</p>
              </div>
            </div>
          </div>
          <div className="relative group">
            <div className="aspect-[4/3] bg-slate-100 rounded-[3rem] overflow-hidden shadow-2xl transition-all duration-700 group-hover:shadow-red-100">
               <img src="https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?q=80&w=2070&auto=format&fit=crop" alt="Logistique" className="w-full h-full object-cover grayscale opacity-80 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-1000" />
            </div>
            <div className="absolute -bottom-6 -left-6 bg-white p-6 rounded-[2rem] shadow-2xl border border-slate-100 max-w-[220px]">
               <p className="text-[10px] font-bold text-slate-700 italic leading-relaxed">"Le numérique est le moteur de notre souveraineté économique moderne."</p>
            </div>
          </div>
        </div>
      </section>

      {/* Institutional Collaborators Section (COPIL) */}
      <section className="bg-slate-50/50 py-24 -mx-4 md:-mx-8">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto text-center mb-20">
             <span className="text-tunisia-red text-[9px] font-black uppercase tracking-[0.5em] mb-4 block">Partenariats Stratégiques</span>
             <h2 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tighter uppercase italic">{t('institutional_collaborators')}</h2>
             <div className="w-20 h-1.5 bg-tunisia-red mx-auto mt-6 rounded-full shadow-lg shadow-red-500/20"></div>
             <p className="text-slate-500 font-bold uppercase text-[10px] tracking-widest mt-8">Sous l'égide du Comité de Pilotage (COPIL)</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {collaborators.map((collab, idx) => (
              <div 
                key={idx} 
                className={`group p-8 rounded-[2.5rem] bg-white border transition-all duration-500 hover:shadow-2xl hover:-translate-y-2 ${
                  collab.highlight ? 'border-tunisia-red/30 ring-4 ring-tunisia-red/5' : 'border-slate-100'
                }`}
              >
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 shadow-xl transition-transform group-hover:scale-110 ${
                  collab.highlight ? 'bg-tunisia-red text-white' : 'bg-slate-50 text-slate-400'
                }`}>
                  <i className={`fas ${collab.icon} text-xl`}></i>
                </div>
                <h3 className="text-sm font-black text-slate-900 leading-snug mb-3 uppercase tracking-tight">
                  {collab.name}
                </h3>
                <div className="flex items-center gap-2">
                  <span className={`text-[9px] font-black uppercase tracking-widest ${
                    collab.highlight ? 'text-tunisia-red' : 'text-slate-400'
                  }`}>
                    {collab.role}
                  </span>
                  {collab.highlight && <span className="w-1.5 h-1.5 rounded-full bg-tunisia-red animate-pulse"></span>}
                </div>
              </div>
            ))}
            
            {/* Call to Action for Institutional Partners */}
            <div className="p-8 rounded-[2.5rem] bg-slate-900 text-white flex flex-col justify-center border border-slate-800 shadow-xl group">
               <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-4">Support & Coordination</h4>
               <p className="text-xs font-bold leading-relaxed mb-6">Accédez au portail inter-services pour la gestion des workflows.</p>
               <button className="self-start text-[9px] font-black uppercase tracking-widest px-6 py-3 bg-white/10 hover:bg-white/20 rounded-xl transition-all">Accès COPIL <i className="fas fa-arrow-right ml-2 group-hover:translate-x-1 transition-transform"></i></button>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section - Rectangular wide style */}
      <section className="container mx-auto px-6">
        <div className="bg-slate-900 rounded-[3.5rem] p-20 text-center relative overflow-hidden shadow-2xl group">
          <div className="absolute top-0 right-0 w-96 h-96 bg-red-600/10 rounded-full blur-[100px] group-hover:bg-red-600/20 transition-all duration-1000"></div>
          <div className="relative z-10 space-y-10">
            <h2 className="text-4xl md:text-6xl font-black text-white tracking-tighter uppercase italic leading-[1]">
              Accédez à votre <span className="text-tunisia-red">Espace Opérateur</span>
            </h2>
            <p className="text-slate-400 text-sm font-medium max-w-xl mx-auto">
              Utilisez vos identifiants officiels ou votre Mobile ID pour une connexion sécurisée et immédiate.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6 pt-4">
              <Link to="/login" className="px-12 py-5 bg-white text-slate-900 rounded-full font-black uppercase tracking-widest shadow-2xl hover:bg-slate-50 transition-all text-[9px]">
                Se connecter
              </Link>
              <Link to="/signup/exporter" className="px-12 py-5 bg-white/5 border border-white/10 text-white rounded-full font-black uppercase tracking-widest hover:bg-white/10 transition-all text-[9px]">
                Créer un compte
              </Link>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
};

export default Home;
