
import React from 'react';
import { useAuth } from '../App';
import { UserRole } from '../types/User';
import { useNavigate } from 'react-router-dom';

interface SidebarItem {
  id: string;
  label: string;
  icon: string;
  roles?: UserRole[];
  path?: string;
}

interface SidebarProps {
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  items: SidebarItem[];
  title: string;
  subtitle: string;
  icon: string;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, onTabChange, items, title, subtitle, icon }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const filteredItems = items.filter(item => !item.roles || (user && item.roles.includes(user.role)));

  return (
    <aside className="w-72 bg-slate-900 text-white flex flex-col sticky top-0 h-screen shadow-2xl z-20">
      <div className="p-8 border-b border-white/5">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-tunisia-red rounded-xl flex items-center justify-center shadow-lg shadow-tunisia-red/20">
            <i className={`fas ${icon} text-xl`}></i>
          </div>
          <div>
            <h1 className="text-lg font-black uppercase tracking-tighter italic">
              {title.split(' ')[0]}<span className="text-tunisia-red">{title.split(' ').slice(1).join(' ')}</span>
            </h1>
            <p className="text-[8px] font-black uppercase tracking-[0.3em] text-slate-500">{subtitle}</p>
          </div>
        </div>
        
        <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-[10px] font-bold">
              {user?.email?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="overflow-hidden">
              <p className="text-[10px] font-black uppercase truncate">{user?.email?.split('@')[0] || 'Utilisateur'}</p>
              <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">{user?.role || 'Rôle'}</p>
            </div>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-6 space-y-2 overflow-y-auto">
        {filteredItems.map((item) => (
          <button
            key={item.id}
            onClick={() => {
              if (item.path) {
                navigate(item.path);
              } else if (onTabChange) {
                onTabChange(item.id);
              }
            }}
            className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
              activeTab === item.id 
                ? 'bg-tunisia-red text-white shadow-lg shadow-tunisia-red/20' 
                : 'text-slate-400 hover:bg-white/5 hover:text-white'
            }`}
          >
            <i className={`fas ${item.icon} w-5`}></i>
            {item.label}
          </button>
        ))}
      </nav>

      <div className="p-6 border-t border-white/5">
        <button 
          onClick={handleLogout}
          className="w-full flex items-center gap-4 px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white hover:bg-white/5 transition-all"
        >
          <i className="fas fa-sign-out-alt w-5"></i>
          Déconnexion
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;