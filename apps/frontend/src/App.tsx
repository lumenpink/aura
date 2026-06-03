import React, { useState } from 'react';
import LoginPage from './modules/auth/LoginPage';
import AppLayout from './modules/core/layout/AppLayout';
import { ArrowUpRight, Plus, ChevronRight } from 'lucide-react';
import './styles/global.css';

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setEmail('');
    setPassword('');
  };

  // 1. LOGIN SCREEN
  if (!isLoggedIn) {
    return <LoginPage onLogin={(loggedEmail) => {
      setEmail(loggedEmail);
      setIsLoggedIn(true);
    }} />;
  }

  // 2. DASHBOARD VIEW
  return (
    <AppLayout activeTab={activeTab} setActiveTab={setActiveTab} onLogout={handleLogout}>
      {activeTab === 'dashboard' && (
        <div className="flex flex-col gap-8 flex-1">
          {/* Header */}
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-light text-zinc-900 tracking-wide">Hub de Dashboards</h1>
            <p className="text-xs text-zinc-400">Aqui está a visão consolidada da Aura hoje.</p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-zinc-200/50 shadow-xs flex flex-col gap-3 aura-glow">
              <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Desempenho Geral</span>
              <div className="flex items-baseline justify-between">
                <span className="text-3xl font-light text-zinc-900">94.2%</span>
                <span className="text-[11px] font-semibold bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full">+2.4%</span>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-2xl border border-zinc-200/50 shadow-xs flex flex-col gap-3">
              <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Projetos Ativos</span>
              <div className="flex items-baseline justify-between">
                <span className="text-3xl font-light text-zinc-900">12</span>
                <span className="text-[11px] font-semibold bg-zinc-100 text-zinc-600 px-2 py-0.5 rounded-full">+1 este mês</span>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-zinc-200/50 shadow-xs flex flex-col gap-3">
              <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Compromissos</span>
              <div className="flex items-baseline justify-between">
                <span className="text-3xl font-light text-zinc-900">4</span>
                <span className="text-[11px] font-semibold bg-aura-violet/10 text-aura-violet px-2 py-0.5 rounded-full">Hoje</span>
              </div>
            </div>
          </div>

          {/* Consolidado Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 flex-1 items-stretch">
            {/* Luminous Card Graphic */}
            <div className="lg:col-span-2 bg-zinc-900 text-white rounded-3xl p-8 flex flex-col justify-between relative overflow-hidden shadow-xl aura-glow min-h-[300px]">
              <div className="absolute inset-0 bg-gradient-to-br from-aura-violet/20 via-transparent to-aura-pink/10 pointer-events-none" />
              <div className="flex flex-col gap-2 relative z-10">
                <span className="text-[10px] font-bold text-aura-pink tracking-widest uppercase">Premium Insights</span>
                <h3 className="text-xl font-light tracking-wide max-w-sm">A atividade do ecossistema expandiu 18% esta semana.</h3>
              </div>
              <div className="flex justify-between items-end relative z-10">
                <div className="flex flex-col">
                  <span className="text-xs text-zinc-400">Próxima revisão</span>
                  <span className="text-sm font-light">Sexta-feira, 14:00</span>
                </div>
                <button className="flex items-center gap-1.5 px-4 py-2 bg-white text-zinc-950 rounded-xl text-xs font-semibold shadow-xs hover:bg-zinc-100 transition-all cursor-pointer">
                  <span>Visualizar relatório</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Recent Activites */}
            <div className="bg-white rounded-3xl p-6 border border-zinc-200/50 shadow-xs flex flex-col gap-4">
              <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Atividades Recentes</span>
              <div className="flex flex-col gap-3.5">
                {[
                  { time: '10m atrás', title: 'Novo projeto criado', desc: 'Design System V2 foi inicializado.' },
                  { time: '1h atrás', title: 'Reunião agendada', desc: 'Sincronização de design com Lumen.' },
                  { time: '3h atrás', title: 'Deploy concluído', desc: 'Nova versão do frontend está online.' }
                ].map((act, index) => (
                  <div key={index} className="flex gap-3 text-xs leading-normal">
                    <div className="w-1.5 h-1.5 rounded-full bg-aura-violet mt-1.5 shrink-0" />
                    <div className="flex flex-col gap-0.5">
                      <span className="font-semibold text-zinc-900">{act.title}</span>
                      <span className="text-[11px] text-zinc-400">{act.desc}</span>
                      <span className="text-[10px] text-zinc-300 mt-0.5">{act.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'agenda' && (
        <div className="flex flex-col gap-8 flex-1">
          <div className="flex justify-between items-center">
            <div className="flex flex-col gap-1">
              <h1 className="text-2xl font-light text-zinc-900 tracking-wide">Agenda</h1>
              <p className="text-xs text-zinc-400">Consulte seus compromissos e marcos da semana.</p>
            </div>
            <button className="flex items-center gap-1.5 px-4 py-2.5 bg-zinc-900 text-white rounded-xl text-xs font-semibold hover:bg-zinc-800 transition-all cursor-pointer">
              <Plus className="w-4 h-4" />
              <span>Novo evento</span>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch flex-1">
            {/* Calendar Grid Mock */}
            <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-zinc-200/50 shadow-xs flex flex-col gap-4">
              <div className="flex justify-between items-center border-b border-zinc-100 pb-3">
                <span className="text-sm font-semibold text-zinc-850">Junho de 2026</span>
                <div className="flex gap-1">
                  <button className="p-1.5 hover:bg-zinc-50 rounded-lg text-zinc-500 cursor-pointer">⟨</button>
                  <button className="p-1.5 hover:bg-zinc-50 rounded-lg text-zinc-500 cursor-pointer">⟩</button>
                </div>
              </div>

              <div className="grid grid-cols-7 gap-y-3.5 text-center text-xs">
                {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => (
                  <span key={d} className="font-semibold text-zinc-400 mb-1">{d}</span>
                ))}
                {Array.from({ length: 31 }).map((_, i) => {
                  const day = i + 1;
                  const isToday = day === 3; // Today is June 3rd based on local metadata
                  return (
                    <div key={i} className="flex justify-center items-center">
                      <button className={`w-8 h-8 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                        isToday 
                          ? 'bg-aura-violet text-white shadow-md shadow-aura-violet/20 font-semibold' 
                          : 'hover:bg-zinc-100 text-zinc-600'
                      }`}>
                        {day}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Today Events */}
            <div className="bg-white rounded-3xl p-6 border border-zinc-200/50 shadow-xs flex flex-col gap-4">
              <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Compromissos de Hoje</span>
              <div className="flex flex-col gap-3">
                {[
                  { time: '09:00 - 10:00', title: 'Daily Standup', type: 'meeting' },
                  { time: '11:00 - 12:00', title: 'Sincronização de Design', type: 'design' },
                  { time: '14:00 - 15:30', title: 'Revisão com Clientes', type: 'presentation' },
                  { time: '17:00 - 17:30', title: 'Weekly Wrap-up', type: 'meeting' }
                ].map((ev, index) => (
                  <div key={index} className="flex flex-col p-3.5 rounded-xl border border-zinc-100 hover:border-zinc-200 transition-all">
                    <span className="text-[10px] text-zinc-400 font-semibold">{ev.time}</span>
                    <span className="text-xs font-bold text-zinc-800 mt-1">{ev.title}</span>
                    <span className={`text-[9px] font-bold uppercase tracking-wider mt-2 w-max px-1.5 py-0.5 rounded-sm ${
                      ev.type === 'design' 
                        ? 'bg-aura-violet/10 text-aura-violet' 
                        : ev.type === 'presentation' 
                        ? 'bg-aura-pink/10 text-aura-pink' 
                        : 'bg-zinc-100 text-zinc-500'
                    }`}>{ev.type}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'workspace' && (
        <div className="flex flex-col gap-8 flex-1">
          <div className="flex justify-between items-center">
            <div className="flex flex-col gap-1">
              <h1 className="text-2xl font-light text-zinc-900 tracking-wide">Workspace</h1>
              <p className="text-xs text-zinc-400">Gerencie projetos, tarefas e recursos da equipe.</p>
            </div>
            <button className="flex items-center gap-1.5 px-4 py-2.5 bg-zinc-900 text-white rounded-xl text-xs font-semibold hover:bg-zinc-800 transition-all cursor-pointer">
              <Plus className="w-4 h-4" />
              <span>Novo projeto</span>
            </button>
          </div>

          <div className="bg-white rounded-3xl border border-zinc-200/50 shadow-xs overflow-hidden flex-1">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-zinc-100 bg-zinc-50/50 text-zinc-400 font-bold uppercase tracking-wider">
                    <th className="p-4 pl-6">Projeto</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Progresso</th>
                    <th className="p-4">Time</th>
                    <th className="p-4 pr-6 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 text-zinc-600">
                  {[
                    { name: 'Plataforma Core', status: 'Em progresso', progress: 75, members: ['LM', 'JS', 'AB'] },
                    { name: 'Design System V2', status: 'Concluído', progress: 100, members: ['LM', 'AB'] },
                    { name: 'Integração D1', status: 'Em planejamento', progress: 40, members: ['JS', 'CV'] },
                    { name: 'App iOS', status: 'Em pausa', progress: 15, members: ['LM', 'JS', 'CV', 'AB'] }
                  ].map((proj, index) => (
                    <tr key={index} className="hover:bg-zinc-50/40 transition-all">
                      <td className="p-4 pl-6 font-semibold text-zinc-900">{proj.name}</td>
                      <td className="p-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          proj.status === 'Concluído' 
                            ? 'bg-emerald-50 text-emerald-600' 
                            : proj.status === 'Em progresso' 
                            ? 'bg-amber-50 text-amber-600' 
                            : proj.status === 'Em planejamento' 
                            ? 'bg-blue-50 text-blue-600' 
                            : 'bg-zinc-100 text-zinc-500'
                        }`}>{proj.status}</span>
                      </td>
                      <td className="p-4 w-48">
                        <div className="flex items-center gap-3">
                          <div className="w-full bg-zinc-100 h-1.5 rounded-full overflow-hidden">
                            <div className="bg-aura-violet h-full rounded-full" style={{ width: `${proj.progress}%` }} />
                          </div>
                          <span className="font-semibold text-zinc-900 w-8">{proj.progress}%</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex -space-x-1.5 overflow-hidden">
                          {proj.members.map((mem, mi) => (
                            <div key={mi} className="inline-block h-6.5 w-6.5 rounded-full ring-2 ring-white bg-zinc-100 text-[9px] font-bold text-zinc-500 flex items-center justify-center">
                              {mem}
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="p-4 pr-6 text-right">
                        <button className="p-1 hover:bg-zinc-100 rounded-lg text-zinc-400 hover:text-zinc-600 transition-all cursor-pointer">
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="flex flex-col gap-8 flex-1">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-light text-zinc-900 tracking-wide">Configurações</h1>
            <p className="text-xs text-zinc-400">Customize as preferências do seu perfil e sistema.</p>
          </div>

          <div className="bg-white rounded-3xl border border-zinc-200/50 shadow-xs p-8 max-w-2xl flex flex-col gap-6">
            <div className="flex flex-col gap-1 pb-4 border-b border-zinc-100">
              <h3 className="text-sm font-semibold text-zinc-800">Preferências do Usuário</h3>
              <p className="text-[11px] text-zinc-400">Configure as preferências do seu perfil corporativo.</p>
            </div>

            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-zinc-500">Nome de exibição</label>
                  <input type="text" defaultValue="Lumen Aura" className="w-full bg-zinc-50 border border-zinc-200/60 rounded-xl px-4 py-2.5 text-xs text-zinc-800 focus:outline-hidden" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-zinc-500">Cargo</label>
                  <input type="text" defaultValue="Administrador de Design" className="w-full bg-zinc-50 border border-zinc-200/60 rounded-xl px-4 py-2.5 text-xs text-zinc-800 focus:outline-hidden" disabled />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-zinc-500">Notificações por e-mail</label>
                <div className="flex items-center gap-3 mt-1">
                  <input type="checkbox" defaultChecked className="w-4 h-4 rounded text-aura-violet focus:ring-aura-violet border-zinc-300" />
                  <span className="text-xs text-zinc-600">Desejo receber relatórios semanais de desempenho no meu e-mail corporativo.</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-zinc-100 mt-2">
              <button className="px-5 py-2.5 bg-zinc-900 text-white rounded-xl text-xs font-semibold hover:bg-zinc-800 transition-all cursor-pointer">
                Salvar alterações
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
