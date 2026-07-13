import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  LayoutDashboard,
  Truck,
  Map,
  Route as RouteIcon,
  LogOut,
  Package,
  Bell,
  Search,
  Compass,
  CreditCard,
  Sun,
  Moon,
  MapPin,
  Settings,
  X,
  Check,
  Users
} from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { buscarLogs, marcarLogsLidos } from '../services/api';
import { useGpsTracker } from '../hooks/useGpsTracker';

export default function Layout({ children }: { children: React.ReactNode }) {
  useGpsTracker();
  const { user, logout, updateUser } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);

  const fetchNotifications = async () => {
    if (!user) return;
    try {
      const data = await buscarLogs(user.idEmpresa, undefined, true);
      setNotifications(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Erro ao buscar notificações:', err);
    }
  };

  useEffect(() => {
    if (user && user.tipoPessoaAtivo !== 'Motorista') {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 10000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const handleMarkAllAsRead = async () => {
    if (!user || notifications.length === 0) return;
    try {
      await marcarLogsLidos(Number(user.idEmpresa));
      setNotifications([]);
    } catch (err) {
      console.error('Erro ao marcar notificações como lidas:', err);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const isMotorista = user?.tipoPessoaAtivo === 'Motorista';
  const canSwitch = user?.tipoPessoa === 'A/M';

  const handleTogglePerfil = () => {
    if (!user) return;
    const novoPapel = user.tipoPessoaAtivo === 'Motorista' ? 'Administrador' : 'Motorista';
    updateUser({ tipoPessoaAtivo: novoPapel });
    navigate(novoPapel === 'Motorista' ? '/inicio' : '/dashboard');
  };

  // 1. LAYOUT MOBILE (Motorista) - Visualização limpa para telas mobile
  if (isMotorista) {
    return (
      <div style={{
        background: '#f8f9fe',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        maxWidth: '480px',
        margin: '0 auto',
        boxShadow: '0 0 20px rgba(0,0,0,0.05)',
        position: 'relative',
      }}>
        {/* Botão de Alternar Perfil no topo esquerdo (A/M) */}
        {canSwitch && (
          <button 
            onClick={handleTogglePerfil}
            style={{
              position: 'absolute',
              top: 'calc(20px + env(safe-area-inset-top, 0px))',
              left: '16px',
              background: '#8c2cf5',
              border: 'none',
              borderRadius: '20px',
              padding: '6px 14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              cursor: 'pointer',
              zIndex: 90,
              fontSize: '0.75rem',
              fontWeight: 700,
              boxShadow: '0 4px 10px rgba(140, 44, 245, 0.3)'
            }}
            title="Alternar para Admin"
          >
            Painel Admin
          </button>
        )}

        {/* Botão de Logout Rápido no topo */}
        <button 
          onClick={handleLogout}
          style={{
            position: 'absolute',
            top: 'calc(20px + env(safe-area-inset-top, 0px))',
            right: '16px',
            background: 'rgba(255,255,255,0.2)',
            border: 'none',
            borderRadius: '50%',
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            cursor: 'pointer',
            zIndex: 90,
          }}
          title="Sair"
        >
          <LogOut size={16} />
        </button>

        {/* Conteúdo Principal do Mobile */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {children}
        </div>
      </div>
    );
  }

  // 2. LAYOUT DESKTOP (Administrador) - Painel completo das imagens 4 e 5
  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f8f9fa', color: '#333' }}>
      {/* Sidebar Cinza Claro */}
      <aside style={{
        width: '260px',
        background: '#ffffff',
        borderRight: '1px solid #e9ecef',
        padding: '24px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        position: 'fixed',
        top: 0,
        left: 0,
        bottom: 0,
        zIndex: 50,
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', marginBottom: '24px' }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '8px',
            background: '#8c2cf5',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <RouteIcon size={20} color="white" />
          </div>
          <span style={{ fontSize: '1.15rem', fontWeight: 700, color: '#333' }}>Magic Route</span>
        </div>

        {/* Links de Navegação */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <p style={{ fontSize: '0.75rem', fontWeight: 600, color: '#adb5bd', padding: '0 16px', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
            Platform Navigation
          </p>

          <NavLink to="/dashboard" className={({ isActive }) => `nav-link-adm ${isActive ? 'active' : ''}`}>
            <LayoutDashboard size={18} />
            Dashboard
          </NavLink>

          <NavLink to="/rotas" className={({ isActive }) => `nav-link-adm ${isActive ? 'active' : ''}`}>
            <RouteIcon size={18} />
            Rotas
          </NavLink>

          <NavLink to="/usuarios" className={({ isActive }) => `nav-link-adm ${isActive ? 'active' : ''}`}>
            <Users size={18} />
            Usuários / Motoristas
          </NavLink>

          <NavLink to="/veiculos" className={({ isActive }) => `nav-link-adm ${isActive ? 'active' : ''}`}>
            <Truck size={18} />
            Veículos
          </NavLink>

          <NavLink to="/locais" className={({ isActive }) => `nav-link-adm ${isActive ? 'active' : ''}`}>
            <MapPin size={18} />
            Locais / Unidades
          </NavLink>

          <p style={{ fontSize: '0.75rem', fontWeight: 600, color: '#adb5bd', padding: '0 16px', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '16px', marginBottom: '8px' }}>
            Settings
          </p>

          <NavLink to="/configuracoes" className={({ isActive }) => `nav-link-adm ${isActive ? 'active' : ''}`}>
            <Settings size={18} />
            Configurações
          </NavLink>

          <button 
            onClick={() => setShowNotifications(true)}
            className="nav-link-adm" 
            style={{ border: 'none', background: 'none', cursor: 'pointer', width: '100%', textAlign: 'left' }}
          >
            <Bell size={18} />
            Notifications
            {notifications.length > 0 && (
              <span style={{ marginLeft: 'auto', background: '#e63946', color: 'white', fontSize: '0.75rem', padding: '2px 8px', borderRadius: '10px', fontWeight: 600 }}>
                {notifications.length}
              </span>
            )}
          </button>

          <button className="nav-link-adm" style={{ border: 'none', background: 'none', cursor: 'pointer', width: '100%', textAlign: 'left' }}>
            <CreditCard size={18} />
            Billing
          </button>

          <button className="nav-link-adm" style={{ border: 'none', background: 'none', cursor: 'pointer', width: '100%', textAlign: 'left' }}>
            <Compass size={18} />
            Explore
          </button>
        </div>

        {/* Botão para mudar para perfil de Motorista (se for A/M) */}
        {canSwitch && (
          <div style={{ padding: '0 8px', marginBottom: '8px', boxSizing: 'border-box' }}>
            <button 
              onClick={handleTogglePerfil}
              style={{
                width: '100%',
                padding: '10px',
                border: 'none',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #8c2cf5 0%, #6e1ac9 100%)',
                color: '#ffffff',
                fontWeight: 700,
                fontSize: '0.8rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 4px 12px rgba(140, 44, 245, 0.2)'
              }}
            >
              <Truck size={16} />
              Mudar para Motorista
            </button>
          </div>
        )}

        {/* Rodapé Alternador de Tema e Sair */}
        <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{
            display: 'flex',
            background: '#f1f3f5',
            padding: '4px',
            borderRadius: '8px',
            gap: '4px',
          }}>
            <button style={{ flex: 1, border: 'none', background: '#ffffff', borderRadius: '6px', padding: '6px 0', fontSize: '0.75rem', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <Sun size={14} /> Light Mode
            </button>
            <button style={{ flex: 1, border: 'none', background: 'transparent', borderRadius: '6px', padding: '6px 0', fontSize: '0.75rem', color: '#495057', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
              <Moon size={14} /> Dark Mode
            </button>
          </div>

          <button onClick={handleLogout} className="nav-link-adm" style={{ border: 'none', background: 'none', cursor: 'pointer', width: '100%', textAlign: 'left', color: '#dc3545' }}>
            <LogOut size={18} />
            Sair da Conta
          </button>
        </div>
      </aside>

      {/* Main Content Pane */}
      <div style={{ flex: 1, marginLeft: '260px', padding: '32px 40px', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        {/* Cabeçalho Superior */}
        <header style={{
          display: 'flex',
          justifyContent: 'flex-end',
          alignItems: 'center',
          marginBottom: '24px',
        }}>
          {/* Profile Badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: '0.9rem', fontWeight: 700, margin: 0, color: '#333' }}>John E.</p>
              <p style={{ fontSize: '0.75rem', color: '#868e96', margin: 0 }}>admin@gmail.com</p>
            </div>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              background: '#e9ecef',
              overflow: 'hidden',
            }}>
              <img 
                src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=100" 
                alt="Profile" 
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>
          </div>
        </header>

        {/* Children Render */}
        <div style={{ flex: 1 }}>
          {children}
        </div>
      </div>

      {/* Estilos inline adicionais para links de navegação do admin */}
      <style>{`
        .nav-link-adm {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 16px;
          border-radius: 8px;
          color: #495057;
          font-weight: 500;
          font-size: 0.9rem;
          text-decoration: none;
          transition: all 0.2s ease;
        }
        .nav-link-adm:hover {
          background: #f1f3f5;
          color: #212529;
        }
        .nav-link-adm.active {
          background: #f3f0ff;
          color: #8c2cf5;
          font-weight: 600;
        }
      `}</style>
      {/* Drawer de Notificações */}
      {showNotifications && (
        <div style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: '380px',
          background: '#ffffff',
          boxShadow: '-4px 0 24px rgba(0,0,0,0.15)',
          zIndex: 100,
          display: 'flex',
          flexDirection: 'column',
          fontFamily: 'sans-serif'
        }}>
          {/* Header do Drawer */}
          <div style={{
            padding: '20px 24px',
            borderBottom: '1px solid #e9ecef',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: '#f8f9fa'
          }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#333' }}>Notificações</h3>
              <p style={{ margin: '4px 0 0 0', fontSize: '0.75rem', color: '#868e96' }}>
                {notifications.length} novas atualizações
              </p>
            </div>
            <button 
              onClick={() => setShowNotifications(false)}
              style={{ background: 'none', border: 'none', color: '#495057', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
            >
              <X size={20} />
            </button>
          </div>

          {/* Lista de Notificações */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
            {notifications.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#868e96', gap: '12px' }}>
                <Bell size={48} style={{ opacity: 0.25 }} />
                <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 600 }}>Tudo limpo por aqui!</p>
                <p style={{ margin: 0, fontSize: '0.75rem', opacity: 0.8 }}>Sem notificações pendentes.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {notifications.map((notif, index) => (
                  <div key={index} style={{
                    padding: '14px',
                    borderRadius: '8px',
                    background: '#f8f9fe',
                    borderLeft: '4px solid #8c2cf5',
                    fontSize: '0.82rem',
                    lineHeight: '1.4',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <strong style={{ color: '#495057' }}>{notif.Usuario}</strong>
                      <span style={{ fontSize: '0.7rem', color: '#adb5bd' }}>
                        {new Date(notif.DataCriacao).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p style={{ margin: 0, color: '#333' }}>{notif.Descricao}</p>
                    {notif.IDLote && (
                      <span style={{ display: 'inline-block', marginTop: '6px', background: '#f3f0ff', color: '#8c2cf5', fontSize: '0.7rem', fontWeight: 700, padding: '2px 8px', borderRadius: '4px' }}>
                        Lote #{notif.IDLote}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer do Drawer */}
          {notifications.length > 0 && (
            <div style={{
              padding: '16px 20px',
              borderTop: '1px solid #e9ecef',
              display: 'flex',
              justifyContent: 'center',
              background: '#f8f9fa'
            }}>
              <button
                onClick={handleMarkAllAsRead}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: 'none',
                  borderRadius: '8px',
                  background: '#8c2cf5',
                  color: '#ffffff',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 10px rgba(140, 44, 245, 0.2)'
                }}
              >
                <Check size={16} /> Marcar todas como lidas
              </button>
            </div>
          )}
        </div>
      )}

      {/* Backdrop escuro para fechar ao clicar fora */}
      {showNotifications && (
        <div 
          onClick={() => setShowNotifications(false)}
          style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.25)',
            zIndex: 99
          }}
        />
      )}
    </div>
  );
}
