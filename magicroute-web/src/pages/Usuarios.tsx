import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { listarUsuarios, adicionarUsuario, editarUsuario, excluirUsuario } from '../services/api';
import { Truck, Shield, Users, Plus, Edit, Trash2, ShieldAlert, Key, Eye, EyeOff, Loader2 } from 'lucide-react';

export default function Usuarios() {
  const { user } = useAuth();
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal Control
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedUsuario, setSelectedUsuario] = useState<any>(null);
  const [formLoading, setFormLoading] = useState(false);

  // Form Fields
  const [formCodigo, setFormCodigo] = useState('');
  const [formNome, setFormNome] = useState('');
  const [formSenha, setFormSenha] = useState('');
  const [formTipoPessoa, setFormTipoPessoa] = useState('M'); // A, M, A/M
  const [formSituacao, setFormSituacao] = useState('Ativo'); // Ativo, Inativo
  const [formCpf, setFormCpf] = useState('');
  const [formRg, setFormRg] = useState('');
  const [formCnh, setFormCnh] = useState('');
  const [formValidadeCnh, setFormValidadeCnh] = useState('');
  const [formCategoriaCnh, setFormCategoriaCnh] = useState('AB');

  const [showSenhaId, setShowSenhaId] = useState<string | null>(null);

  useEffect(() => {
    fetchUsuarios();
  }, [user]);

  const fetchUsuarios = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await listarUsuarios(user.idEmpresa);
      setUsuarios(data || []);
    } catch (err) {
      console.error('Erro ao buscar usuários:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAdd = () => {
    setFormCodigo('');
    setFormNome('');
    setFormSenha('');
    setFormTipoPessoa('M');
    setFormSituacao('Ativo');
    setFormCpf('');
    setFormRg('');
    setFormCnh('');
    setFormValidadeCnh('');
    setFormCategoriaCnh('AB');
    setShowAddModal(true);
  };

  const handleOpenEdit = (u: any) => {
    setSelectedUsuario(u);
    setFormCodigo(String(u.Codigo));
    setFormNome(u.Nome || '');
    setFormSenha(u.Senha || '');
    setFormTipoPessoa(u.TipoPessoa || u.tipopessoa || 'M');
    setFormSituacao(u.Situacao || u.situacao || 'Ativo');
    setFormCpf(u.CPF || '');
    setFormRg(u.RG || '');
    setFormCnh(u.CNH || '');
    setFormValidadeCnh(u.ValidadeCNH || '');
    setFormCategoriaCnh(u.CategoriaCNH || 'AB');
    setShowEditModal(true);
  };

  const handleAddSubmit = async () => {
    if (!user) return;
    if (!formNome || !formSenha) {
      alert('Nome e Senha são obrigatórios!');
      return;
    }
    setFormLoading(true);
    try {
      await adicionarUsuario({
        IdEmpresa: user.idEmpresa,
        Codigo: formCodigo ? Number(formCodigo) : undefined,
        Nome: formNome,
        Senha: formSenha,
        TipoPessoa: formTipoPessoa,
        Situacao: formSituacao,
        CPF: formCpf || '0',
        RG: formRg || '0',
        CNH: formCnh || '0',
        ValidadeCNH: formValidadeCnh || '0',
        CategoriaCNH: formCategoriaCnh || 'AB'
      });
      setShowAddModal(false);
      fetchUsuarios();
    } catch (err: any) {
      console.error(err);
      alert('Erro ao adicionar usuário: ' + (err.message || 'Código duplicado ou inválido.'));
    } finally {
      setFormLoading(false);
    }
  };

  const handleEditSubmit = async () => {
    if (!user || !selectedUsuario) return;
    if (!formNome || !formSenha) {
      alert('Nome e Senha são obrigatórios!');
      return;
    }
    setFormLoading(true);
    try {
      await editarUsuario({
        IdEmpresa: user.idEmpresa,
        CodigoOriginal: Number(selectedUsuario.Codigo),
        TipoPessoaOriginal: selectedUsuario.TipoPessoa || selectedUsuario.tipopessoa,
        Codigo: Number(formCodigo),
        Nome: formNome,
        Senha: formSenha,
        TipoPessoa: formTipoPessoa,
        Situacao: formSituacao,
        CPF: formCpf || '0',
        RG: formRg || '0',
        CNH: formCnh || '0',
        ValidadeCNH: formValidadeCnh || '0',
        CategoriaCNH: formCategoriaCnh || 'AB'
      });
      setShowEditModal(false);
      fetchUsuarios();
    } catch (err: any) {
      console.error(err);
      alert('Erro ao editar usuário: ' + (err.message || 'Código ou tipo duplicado.'));
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (u: any) => {
    if (!user) return;
    if (!window.confirm(`Deseja realmente excluir o usuário "${u.Nome}"?`)) return;
    try {
      await excluirUsuario({
        IdEmpresa: user.idEmpresa,
        Codigo: Number(u.Codigo),
        TipoPessoa: u.TipoPessoa || u.tipopessoa
      });
      fetchUsuarios();
    } catch (err: any) {
      console.error(err);
      alert('Erro ao excluir usuário: ' + err.message);
    }
  };

  // Contadores
  const totalAdms = usuarios.filter(u => (u.TipoPessoa || u.tipopessoa) === 'A').length;
  const totalMotoristas = usuarios.filter(u => (u.TipoPessoa || u.tipopessoa) === 'M').length;
  const totalAmbos = usuarios.filter(u => (u.TipoPessoa || u.tipopessoa) === 'A/M').length;

  const renderBadge = (tipo: string) => {
    if (tipo === 'A') return <span style={{ background: 'rgba(140, 44, 245, 0.1)', color: '#8c2cf5', padding: '4px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700 }}>Admin (A)</span>;
    if (tipo === 'M') return <span style={{ background: 'rgba(54, 162, 235, 0.1)', color: '#36a2eb', padding: '4px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700 }}>Motorista (M)</span>;
    return <span style={{ background: 'rgba(75, 192, 192, 0.1)', color: '#4bc0c0', padding: '4px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700 }}>Ambos (A/M)</span>;
  };

  const renderModal = (title: string, onSubmit: () => void, isNew: boolean, onClose: () => void) => {
    return (
      <div style={{
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 200,
        padding: '20px',
        boxSizing: 'border-box'
      }}>
        <div style={{
          background: '#ffffff',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '600px',
          maxHeight: '90vh',
          overflowY: 'auto',
          padding: '28px',
          boxShadow: '0 15px 35px rgba(0,0,0,0.2)',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          fontFamily: 'sans-serif',
          boxSizing: 'border-box'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1.5px solid #f1f3f5', paddingBottom: '12px', boxSizing: 'border-box' }}>
            <h3 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 700, color: '#212529' }}>{title}</h3>
            <span style={{ fontSize: '0.75rem', color: '#868e96', background: '#f1f3f5', padding: '4px 8px', borderRadius: '4px', fontWeight: 600 }}>Empresa #{user?.idEmpresa}</span>
          </div>

          {/* Seção 1: Credenciais de Acesso */}
          <div style={{ background: '#f8f9fa', padding: '16px', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '12px', boxSizing: 'border-box' }}>
            <h4 style={{ margin: 0, fontSize: '0.8rem', color: '#8c2cf5', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Credenciais</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 1.2fr', gap: '12px', width: '100%', boxSizing: 'border-box' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', boxSizing: 'border-box' }}>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#495057' }}>Código *</label>
                <input 
                  type="number" 
                  value={formCodigo} 
                  onChange={(e) => setFormCodigo(e.target.value)}
                  placeholder="Auto"
                  style={{ width: '100%', boxSizing: 'border-box', padding: '8px 12px', borderRadius: '8px', border: '1.5px solid #ced4da', outline: 'none', background: '#ffffff', fontSize: '0.85rem' }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', boxSizing: 'border-box' }}>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#495057' }}>Nome Completo *</label>
                <input 
                  type="text" 
                  value={formNome} 
                  onChange={(e) => setFormNome(e.target.value)}
                  placeholder="Nome do usuário"
                  style={{ width: '100%', boxSizing: 'border-box', padding: '8px 12px', borderRadius: '8px', border: '1.5px solid #ced4da', outline: 'none', background: '#ffffff', fontSize: '0.85rem' }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', boxSizing: 'border-box' }}>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#495057' }}>Senha *</label>
                <input 
                  type="password" 
                  value={formSenha} 
                  onChange={(e) => setFormSenha(e.target.value)}
                  placeholder="Senha"
                  style={{ width: '100%', boxSizing: 'border-box', padding: '8px 12px', borderRadius: '8px', border: '1.5px solid #ced4da', outline: 'none', background: '#ffffff', fontSize: '0.85rem' }}
                />
              </div>
            </div>
          </div>

          {/* Seção 2: Perfis e Configurações */}
          <div style={{ background: '#f8f9fa', padding: '16px', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '12px', boxSizing: 'border-box' }}>
            <h4 style={{ margin: 0, fontSize: '0.8rem', color: '#8c2cf5', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Perfil e Situação</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', width: '100%', boxSizing: 'border-box' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', boxSizing: 'border-box' }}>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#495057' }}>Tipo de Pessoa (Acesso)</label>
                <select
                  value={formTipoPessoa}
                  onChange={(e) => setFormTipoPessoa(e.target.value)}
                  style={{ width: '100%', boxSizing: 'border-box', padding: '8px 12px', borderRadius: '8px', border: '1.5px solid #ced4da', outline: 'none', background: '#ffffff', fontSize: '0.85rem', height: '37px' }}
                >
                  <option value="A">A - Administrador</option>
                  <option value="M">M - Motorista</option>
                  <option value="A/M">A/M - Ambos (Adm e Motorista)</option>
                </select>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', boxSizing: 'border-box' }}>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#495057' }}>Situação</label>
                <select
                  value={formSituacao}
                  onChange={(e) => setFormSituacao(e.target.value)}
                  style={{ width: '100%', boxSizing: 'border-box', padding: '8px 12px', borderRadius: '8px', border: '1.5px solid #ced4da', outline: 'none', background: '#ffffff', fontSize: '0.85rem', height: '37px' }}
                >
                  <option value="Ativo">Ativo</option>
                  <option value="Inativo">Inativo</option>
                </select>
              </div>
            </div>
          </div>

          {/* Seção 3: Documentação (Exclusivo CNH para Motoristas / Ambos) */}
          <div style={{ background: '#f8f9fa', padding: '16px', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '12px', boxSizing: 'border-box' }}>
            <h4 style={{ margin: 0, fontSize: '0.8rem', color: '#8c2cf5', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Documentação Adicional</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', width: '100%', boxSizing: 'border-box' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', boxSizing: 'border-box' }}>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#495057' }}>CPF</label>
                <input 
                  type="text" 
                  value={formCpf} 
                  onChange={(e) => setFormCpf(e.target.value)}
                  placeholder="Ex: 000.000.000-00"
                  style={{ width: '100%', boxSizing: 'border-box', padding: '8px 12px', borderRadius: '8px', border: '1.5px solid #ced4da', outline: 'none', background: '#ffffff', fontSize: '0.85rem' }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', boxSizing: 'border-box' }}>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#495057' }}>RG</label>
                <input 
                  type="text" 
                  value={formRg} 
                  onChange={(e) => setFormRg(e.target.value)}
                  placeholder="RG do usuário"
                  style={{ width: '100%', boxSizing: 'border-box', padding: '8px 12px', borderRadius: '8px', border: '1.5px solid #ced4da', outline: 'none', background: '#ffffff', fontSize: '0.85rem' }}
                />
              </div>
            </div>

            {(formTipoPessoa === 'M' || formTipoPessoa === 'A/M') && (
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 0.8fr', gap: '12px', width: '100%', boxSizing: 'border-box', marginTop: '4px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', boxSizing: 'border-box' }}>
                  <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#495057' }}>Número CNH</label>
                  <input 
                    type="text" 
                    value={formCnh} 
                    onChange={(e) => setFormCnh(e.target.value)}
                    placeholder="CNH do motorista"
                    style={{ width: '100%', boxSizing: 'border-box', padding: '8px 12px', borderRadius: '8px', border: '1.5px solid #ced4da', outline: 'none', background: '#ffffff', fontSize: '0.85rem' }}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', boxSizing: 'border-box' }}>
                  <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#495057' }}>Validade CNH</label>
                  <input 
                    type="text" 
                    value={formValidadeCnh} 
                    onChange={(e) => setFormValidadeCnh(e.target.value)}
                    placeholder="DD/MM/YYYY"
                    style={{ width: '100%', boxSizing: 'border-box', padding: '8px 12px', borderRadius: '8px', border: '1.5px solid #ced4da', outline: 'none', background: '#ffffff', fontSize: '0.85rem' }}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', boxSizing: 'border-box' }}>
                  <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#495057' }}>Categoria</label>
                  <input 
                    type="text" 
                    value={formCategoriaCnh} 
                    onChange={(e) => setFormCategoriaCnh(e.target.value)}
                    placeholder="AB"
                    style={{ width: '100%', boxSizing: 'border-box', padding: '8px 12px', borderRadius: '8px', border: '1.5px solid #ced4da', outline: 'none', background: '#ffffff', fontSize: '0.85rem' }}
                  />
                </div>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '12px', borderTop: '1.5px solid #f1f3f5', paddingTop: '16px', boxSizing: 'border-box' }}>
            <button 
              onClick={onClose}
              style={{ padding: '10px 18px', border: '1.5px solid #eaeaea', borderRadius: '8px', background: '#ffffff', color: '#495057', fontWeight: 600, cursor: 'pointer', fontSize: '0.85rem' }}
              disabled={formLoading}
            >
              Cancelar
            </button>
            <button 
              onClick={onSubmit}
              style={{ padding: '10px 22px', border: 'none', borderRadius: '8px', background: '#8c2cf5', color: '#ffffff', fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 12px rgba(140, 44, 245, 0.2)', fontSize: '0.85rem' }}
              disabled={formLoading}
            >
              {formLoading ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', fontFamily: 'sans-serif' }}>
      {/* Topo com Título e Ação */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 800, color: '#212529' }}>Usuários e Motoristas</h2>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#868e96' }}>Gerencie as contas de acesso administrativo e as credenciais dos motoristas.</p>
        </div>
        <button 
          onClick={handleOpenAdd}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: '#8c2cf5',
            color: '#ffffff',
            border: 'none',
            borderRadius: '10px',
            padding: '10px 20px',
            fontWeight: 700,
            fontSize: '0.85rem',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(140, 44, 245, 0.25)',
            transition: 'all 0.2s'
          }}
        >
          <Plus size={16} />
          Novo Usuário
        </button>
      </div>

      {/* Cards de Contadores */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '16px' }}>
        <div style={{ background: '#ffffff', borderRadius: '16px', padding: '20px', display: 'flex', alignItems: 'center', gap: '16px', border: '1px solid #e9ecef', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(140, 44, 245, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8c2cf5' }}>
            <Users size={22} />
          </div>
          <div>
            <p style={{ margin: 0, fontSize: '0.8rem', color: '#868e96', fontWeight: 600 }}>Total Usuários</p>
            <p style={{ margin: '4px 0 0 0', fontSize: '1.4rem', fontWeight: 800, color: '#212529' }}>{usuarios.length}</p>
          </div>
        </div>

        <div style={{ background: '#ffffff', borderRadius: '16px', padding: '20px', display: 'flex', alignItems: 'center', gap: '16px', border: '1px solid #e9ecef', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(140, 44, 245, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8c2cf5' }}>
            <Shield size={22} />
          </div>
          <div>
            <p style={{ margin: 0, fontSize: '0.8rem', color: '#868e96', fontWeight: 600 }}>Administradores (A)</p>
            <p style={{ margin: '4px 0 0 0', fontSize: '1.4rem', fontWeight: 800, color: '#212529' }}>{totalAdms}</p>
          </div>
        </div>

        <div style={{ background: '#ffffff', borderRadius: '16px', padding: '20px', display: 'flex', alignItems: 'center', gap: '16px', border: '1px solid #e9ecef', boxShadow: '0 4px 12px rgba(54, 162, 235, 0.08)' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(54, 162, 235, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#36a2eb' }}>
            <Truck size={22} />
          </div>
          <div>
            <p style={{ margin: 0, fontSize: '0.8rem', color: '#868e96', fontWeight: 600 }}>Motoristas (M)</p>
            <p style={{ margin: '4px 0 0 0', fontSize: '1.4rem', fontWeight: 800, color: '#212529' }}>{totalMotoristas}</p>
          </div>
        </div>

        <div style={{ background: '#ffffff', borderRadius: '16px', padding: '20px', display: 'flex', alignItems: 'center', gap: '16px', border: '1px solid #e9ecef', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(75, 192, 192, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4bc0c0' }}>
            <ShieldAlert size={22} />
          </div>
          <div>
            <p style={{ margin: 0, fontSize: '0.8rem', color: '#868e96', fontWeight: 600 }}>Ambos (A/M)</p>
            <p style={{ margin: '4px 0 0 0', fontSize: '1.4rem', fontWeight: 800, color: '#212529' }}>{totalAmbos}</p>
          </div>
        </div>
      </div>

      {/* Tabela de Usuários */}
      <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e9ecef', boxShadow: '0 4px 12px rgba(0,0,0,0.02)', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '60px', gap: '12px' }}>
            <Loader2 className="animate-spin" size={32} color="#8c2cf5" />
            <span style={{ fontSize: '0.9rem', color: '#868e96', fontWeight: 600 }}>Carregando dados dos usuários...</span>
          </div>
        ) : usuarios.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '60px', gap: '8px' }}>
            <Users size={40} color="#adb5bd" />
            <span style={{ fontSize: '0.95rem', color: '#495057', fontWeight: 700 }}>Nenhum usuário cadastrado</span>
            <span style={{ fontSize: '0.85rem', color: '#868e96' }}>Clique no botão "Novo Usuário" para começar.</span>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: '#f8f9fa', borderBottom: '1px solid #e9ecef' }}>
                  <th style={{ padding: '16px 20px', fontWeight: 700, color: '#495057' }}>Código</th>
                  <th style={{ padding: '16px 20px', fontWeight: 700, color: '#495057' }}>Nome</th>
                  <th style={{ padding: '16px 20px', fontWeight: 700, color: '#495057' }}>Acesso</th>
                  <th style={{ padding: '16px 20px', fontWeight: 700, color: '#495057' }}>Senha</th>
                  <th style={{ padding: '16px 20px', fontWeight: 700, color: '#495057' }}>Situação</th>
                  <th style={{ padding: '16px 20px', fontWeight: 700, color: '#495057' }}>CPF</th>
                  <th style={{ padding: '16px 20px', fontWeight: 700, color: '#495057' }}>CNH</th>
                  <th style={{ padding: '16px 20px', fontWeight: 700, color: '#495057', textAlign: 'center' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {usuarios.map((u, index) => {
                  const uid = `${u.Codigo}-${u.TipoPessoa || u.tipopessoa}`;
                  const isSenhaVisivel = showSenhaId === uid;
                  const tipo = u.TipoPessoa || u.tipopessoa || 'M';
                  const situacao = u.Situacao || u.situacao || 'Ativo';

                  return (
                    <tr key={uid} style={{ borderBottom: index === usuarios.length - 1 ? 'none' : '1px solid #f1f3f5', transition: 'background 0.2s', background: index % 2 === 0 ? '#ffffff' : '#fcfdff' }}>
                      <td style={{ padding: '16px 20px', fontWeight: 700, color: '#495057' }}>{u.Codigo}</td>
                      <td style={{ padding: '16px 20px', fontWeight: 600, color: '#212529' }}>{u.Nome}</td>
                      <td style={{ padding: '16px 20px' }}>{renderBadge(tipo)}</td>
                      <td style={{ padding: '16px 20px', color: '#495057' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontFamily: isSenhaVisivel ? 'monospace' : 'sans-serif', letterSpacing: isSenhaVisivel ? '0' : '3px', fontSize: isSenhaVisivel ? '0.85rem' : '1.1rem' }}>
                            {isSenhaVisivel ? u.Senha : '••••'}
                          </span>
                          <button 
                            onClick={() => setShowSenhaId(isSenhaVisivel ? null : uid)}
                            style={{ background: 'none', border: 'none', padding: '4px', cursor: 'pointer', color: '#868e96', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            title={isSenhaVisivel ? "Ocultar senha" : "Ver senha"}
                          >
                            {isSenhaVisivel ? <EyeOff size={14} /> : <Eye size={14} />}
                          </button>
                        </div>
                      </td>
                      <td style={{ padding: '16px 20px' }}>
                        <span style={{
                          background: situacao === 'Ativo' ? 'rgba(40, 167, 69, 0.1)' : 'rgba(220, 53, 69, 0.1)',
                          color: situacao === 'Ativo' ? '#28a745' : '#dc3545',
                          padding: '4px 8px',
                          borderRadius: '6px',
                          fontWeight: 700,
                          fontSize: '0.75rem'
                        }}>
                          {situacao}
                        </span>
                      </td>
                      <td style={{ padding: '16px 20px', color: '#868e96' }}>{u.CPF && u.CPF !== '0' ? u.CPF : '-'}</td>
                      <td style={{ padding: '16px 20px', color: '#868e96' }}>
                        {u.CNH && u.CNH !== '0' ? (
                          <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{u.CNH} ({u.CategoriaCNH || 'AB'})</span>
                        ) : '-'}
                      </td>
                      <td style={{ padding: '16px 20px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                          <button 
                            onClick={() => handleOpenEdit(u)}
                            style={{ border: 'none', background: 'none', color: '#868e96', cursor: 'pointer', padding: '6px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}
                            title="Editar usuário"
                          >
                            <Edit size={16} />
                          </button>
                          <button 
                            onClick={() => handleDelete(u)}
                            style={{ border: 'none', background: 'none', color: '#dc3545', cursor: 'pointer', padding: '6px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}
                            title="Excluir usuário"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Adicionar Novo Usuário */}
      {showAddModal && renderModal('Cadastrar Novo Usuário', handleAddSubmit, true, () => setShowAddModal(false))}

      {/* Modal Editar Usuário */}
      {showEditModal && renderModal('Editar Usuário', handleEditSubmit, false, () => setShowEditModal(false))}
    </div>
  );
}
