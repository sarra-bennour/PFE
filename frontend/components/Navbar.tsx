import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../App';

const Navbar: React.FC = () => {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Masquer la Navbar standard si on est dans le Back-office admin
  const isAdminPanel = location.pathname === '/admin' && user?.role === 'admin';

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 40);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  if (isAdminPanel) return null;

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
    document.documentElement.dir = lng === 'ar' ? 'rtl' : 'ltr';
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
      // Forcer la déconnexion locale en cas d'erreur
      localStorage.clear();
      sessionStorage.clear();
      window.location.href = '/login';
    } finally {
      setIsLoggingOut(false);
      setShowLogoutConfirm(false);
    }
  };

  const confirmLogout = () => {
    setShowLogoutConfirm(true);
  };

  const allNavLinks = [
    { path: '/', label: 'nav_home', roles: [] },
    { path: '/exporter', label: 'nav_exporter', roles: ['exporter'] },
    { path: '/importer', label: 'nav_importer', roles: ['importer'] },
    { path: '/validator', label: 'nav_validator', roles: ['validator'] },
    { path: '/dashboard', label: 'nav_dashboard', roles: ['admin', 'validator'] },
    { path: '/admin', label: 'nav_admin', roles: ['admin'] },
  ];

  const visibleLinks = allNavLinks.filter(link => {
    if (link.roles.length === 0) return true;
    if (!user) return false;
    return link.roles.includes(user.role);
  });

  return (
    <>
      {/* Modal de confirmation de déconnexion */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-[1000] bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl animate-fade-in-scale">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <i className="fas fa-power-off text-2xl text-red-500"></i>
              </div>
              <h3 className="text-xl font-black text-slate-900 mb-2">
                {t('confirm_logout_title')}
              </h3>
              <p className="text-slate-500 text-sm">
                {t('confirm_logout_message')}
              </p>
            </div>
            <div className="flex gap-4">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                disabled={isLoggingOut}
                className="flex-1 py-3 bg-slate-100 text-slate-700 rounded-xl font-black uppercase tracking-widest text-xs hover:bg-slate-200 transition-colors disabled:opacity-50"
              >
                {t('cancel')}
              </button>
              <button
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="flex-1 py-3 bg-red-500 text-white rounded-xl font-black uppercase tracking-widest text-xs hover:bg-red-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isLoggingOut ? (
                  <>
                    <i className="fas fa-spinner fa-spin"></i>
                    {t('logging_out')}
                  </>
                ) : (
                  <>
                    <i className="fas fa-power-off"></i>
                    {t('logout')}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Navbar principale */}
      <div 
        className={`fixed left-0 w-full z-[100] transition-all duration-500 ease-in-out ${
          scrolled ? 'top-6 px-6 pointer-events-none' : 'top-0 px-0 pointer-events-auto'
        }`}
      >
        <nav 
          className={`mx-auto transition-all duration-500 ease-in-out pointer-events-auto ${
            scrolled 
              ? 'container max-w-5xl rounded-full glass-pill py-2 px-8 shadow-2xl shadow-slate-900/10' 
              : 'w-full bg-white border-b border-slate-100 py-4 px-12 rounded-none shadow-none'
          }`}
        >
          <div className="flex justify-between items-center">
            <Link to="/" className="flex items-center gap-3 group">
              <div className="w-8 h-8 bg-tunisia-red rounded-full flex items-center justify-center shadow-md transition-transform group-hover:scale-110">
                <i className="fas fa-landmark text-white text-[10px]"></i>
              </div>
              <div className="flex flex-col">
                <span className={`text-[7px] font-black uppercase tracking-widest leading-none mb-1 transition-colors ${scrolled ? 'text-slate-400' : 'text-slate-500'}`}>
                  République Tunisienne
                </span>
                <span className="text-[10px] font-black text-slate-900 uppercase tracking-tighter leading-none">
                  Ministère du Commerce
                </span>
              </div>
            </Link>

            <div className="hidden lg:flex items-center gap-10">
              {visibleLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`text-[9px] font-black uppercase tracking-[0.2em] transition-all hover:text-tunisia-red relative group ${
                    location.pathname === link.path ? 'text-tunisia-red' : 'text-slate-500'
                  }`}
                >
                  {t(link.label)}
                  <span className={`absolute -bottom-1 left-0 w-full h-0.5 bg-tunisia-red transform scale-x-0 transition-transform duration-300 group-hover:scale-x-100 ${location.pathname === link.path ? 'scale-x-100' : ''}`}></span>
                </Link>
              ))}
            </div>

            <div className="flex items-center gap-6">
              <div className={`flex items-center gap-3 border-r pr-6 transition-colors ${scrolled ? 'border-slate-200' : 'border-slate-100'}`}>
                <button 
                  onClick={() => changeLanguage('fr')} 
                  className={`text-[9px] font-black tracking-widest transition-colors ${i18n.language === 'fr' ? 'text-tunisia-red' : 'text-slate-400 hover:text-slate-900'}`}
                >
                  FR
                </button>
                <button 
                  onClick={() => changeLanguage('ar')} 
                  className={`text-[9px] font-black tracking-widest transition-colors ${i18n.language === 'ar' ? 'text-tunisia-red' : 'text-slate-400 hover:text-slate-900'}`}
                >
                  AR
                </button>
                <button 
                  onClick={() => changeLanguage('en')} 
                  className={`text-[9px] font-black tracking-widest transition-colors ${i18n.language === 'en' ? 'text-tunisia-red' : 'text-slate-400 hover:text-slate-900'}`}
                >
                  EN
                </button>
              </div>

              {user ? (
                <div className="flex items-center gap-4">
                  {/* Menu utilisateur avec dropdown */}
                  <div className="relative group">
                    <button className="flex items-center gap-3 group">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-50 to-indigo-100 flex items-center justify-center border border-blue-200 group-hover:border-tunisia-red transition-all shadow-sm">
                        <i className="fas fa-user text-[10px] text-blue-600 group-hover:text-tunisia-red"></i>
                      </div>
                      <div className="hidden md:flex flex-col items-start">
                        <span className="text-[9px] font-black text-slate-900 uppercase tracking-widest leading-none">
                          {user.companyName || user.email.split('@')[0]}
                        </span>
                        <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest leading-none mt-0.5">
                          {user.role.toUpperCase()}
                        </span>
                      </div>
                      <i className="fas fa-chevron-down text-[8px] text-slate-400 group-hover:text-tunisia-red transition-colors"></i>
                    </button>
                    
                    {/* Dropdown menu */}
                    <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-2xl border border-slate-100 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 transform translate-y-2 group-hover:translate-y-0 z-50">
                      <div className="p-1">
                        <Link
                          to="/profile"
                          className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-50 transition-colors text-left"
                        >
                          <i className="fas fa-user-circle text-slate-400 text-xs"></i>
                          <div>
                            <div className="text-[9px] font-black text-slate-900 uppercase tracking-widest">
                              {t('my_profile')}
                            </div>
                            <div className="text-[7px] text-slate-400 font-medium">
                              {t('manage_account')}
                            </div>
                          </div>
                        </Link>
                        
                        <Link
                          to="/settings"
                          className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-50 transition-colors text-left"
                        >
                          <i className="fas fa-cog text-slate-400 text-xs"></i>
                          <div>
                            <div className="text-[9px] font-black text-slate-900 uppercase tracking-widest">
                              {t('settings')}
                            </div>
                            <div className="text-[7px] text-slate-400 font-medium">
                              {t('preferences')}
                            </div>
                          </div>
                        </Link>
                        
                        <div className="border-t border-slate-100 my-1"></div>
                        
                        <button
                          onClick={confirmLogout}
                          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-red-50 transition-colors text-left text-red-500"
                        >
                          <i className="fas fa-power-off text-xs"></i>
                          <div>
                            <div className="text-[9px] font-black uppercase tracking-widest">
                              {t('logout')}
                            </div>
                            <div className="text-[7px] text-red-400 font-medium">
                              {t('sign_out_account')}
                            </div>
                          </div>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <Link 
                  to="/login" 
                  className={`px-6 py-2 rounded-full text-[9px] font-black uppercase tracking-widest transition-all shadow-lg ${
                    scrolled ? 'bg-slate-900 text-white hover:bg-black' : 'bg-tunisia-red text-white hover:bg-red-700'
                  }`}
                >
                  {t('nav_login')}
                </Link>
              )}
            </div>
          </div>
        </nav>
      </div>
    </>
  );
};

export default Navbar;