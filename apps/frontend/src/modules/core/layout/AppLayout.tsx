import React from 'react';
import Logo from '../../../components/brand/Logo';
import { LayoutDashboard, Calendar, Briefcase, Settings, LogOut } from 'lucide-react';

interface AppLayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onLogout: () => void;
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  children,
  activeTab,
  setActiveTab,
  onLogout,
}) => {
  const menuItems = [
    { id: 'dashboard', label: 'Hub de Dashboards', icon: LayoutDashboard },
    { id: 'agenda', label: 'Agenda', icon: Calendar },
    { id: 'workspace', label: 'Workspace', icon: Briefcase },
    { id: 'settings', label: 'Configurações', icon: Settings },
  ];

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-zinc-50 text-zinc-850 font-sans">
      {/* Sidebar */}
      <aside className="w-64 h-full flex flex-col justify-between bg-zinc-50/50 backdrop-blur-md border-r border-zinc-200/50 p-6 shrink-0">
        <div className="flex flex-col gap-8">
          {/* Logo */}
          <div className="flex items-center justify-start py-2">
            <Logo size="small" />
          </div>

          {/* Navigation */}
          <nav className="flex flex-col gap-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer ${
                    isActive
                      ? 'bg-zinc-900/5 text-zinc-900 shadow-xs border border-zinc-200/20'
                      : 'text-zinc-500 hover:bg-zinc-900/5 hover:text-zinc-900'
                  }`}
                >
                  <Icon className={`w-4.5 h-4.5 stroke-[1.5] ${isActive ? 'text-aura-violet' : ''}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* User profile & Logout */}
        <div className="flex flex-col gap-4 border-t border-zinc-200/50 pt-4">
          <div className="flex items-center gap-3 px-2">
            <div className="w-9 h-9 rounded-full bg-linear-to-br from-aura-violet to-aura-pink flex items-center justify-center text-white text-xs font-semibold shadow-xs">
              LM
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-semibold text-zinc-900 truncate">Lumen Aura</span>
              <span className="text-[10px] text-zinc-400 truncate">lumen@aura.design</span>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-medium text-red-500 hover:bg-red-500/5 transition-all duration-200 cursor-pointer"
          >
            <LogOut className="w-4.5 h-4.5 stroke-[1.5]" />
            <span>Sair</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 h-full overflow-y-auto p-8 bg-zinc-50/20">
        <div className="max-w-7xl mx-auto h-full flex flex-col">
          {children}
        </div>
      </main>
    </div>
  );
};

export default AppLayout;
