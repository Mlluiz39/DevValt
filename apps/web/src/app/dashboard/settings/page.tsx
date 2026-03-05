"use client";

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';


interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
}

interface Member {
  id: string;
  role: string;
  createdAt: string;
  user: User;
}

interface Organization {
  id: string;
  name: string;
  slug: string;
  planType: string;
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'members' | 'organization'>('members');
  const [members, setMembers] = useState<Member[]>([]);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [token, setToken] = useState<string | null>(null);
  const [orgId, setOrgId] = useState<string | null>(null);

  // Invite state
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [invitePassword, setInvitePassword] = useState('');
  const [inviteRole, setInviteRole] = useState('MEMBER');
  const [inviting, setInviting] = useState(false);

  // Edit Member state
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [newRole, setNewRole] = useState('MEMBER');

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchMembers = useCallback(async (t: string, oId: string) => {
    try {
      const res = await fetch(`http://localhost:3001/api/v1/organizations/${oId}/members`, {
        headers: { Authorization: `Bearer ${t}` }
      });
      const data = await res.json();
      if (res.ok) setMembers(data.data || []);
    } catch {
      showToast('Erro ao carregar membros', 'error');
    }
  }, []);

  useEffect(() => {
    const t = localStorage.getItem('devvault_token');
    if (!t) return;
    setToken(t);

    const init = async () => {
      try {
        const meRes = await fetch('http://localhost:3001/api/v1/auth/me', {
          headers: { Authorization: `Bearer ${t}` }
        });
        const meData = await meRes.json();
        
        const oId = meData.data?.user?.memberships?.[0]?.organization?.id;
        const role = meData.data?.user?.memberships?.[0]?.role;
        setOrgId(oId);
        setCurrentUserRole(role);

        if (oId) {
          await fetchMembers(t, oId);
          
          const orgRes = await fetch(`http://localhost:3001/api/v1/organizations/${oId}`, {
            headers: { Authorization: `Bearer ${t}` }
          });
          const orgData = await orgRes.json();
          if (orgRes.ok) setOrganization(orgData.data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [fetchMembers]);

  const handleInvite = async () => {
    if (!inviteEmail || !token || !orgId) return;
    setInviting(true);
    try {
      const res = await fetch(`http://localhost:3001/api/v1/organizations/${orgId}/members`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ 
          email: inviteEmail, 
          role: inviteRole,
          name: inviteName || undefined,
          password: invitePassword || undefined 
        })
      });
      const data = await res.json();
      if (res.ok) {
        showToast('Membro adicionado com sucesso!');
        setShowInviteModal(false);
        setInviteEmail('');
        await fetchMembers(token, orgId);
      } else {
        showToast(data.error?.message || 'Erro ao adicionar membro', 'error');
      }
    } catch {
      showToast('Erro de rede', 'error');
    } finally {
      setInviting(false);
    }
  };

  const handleUpdateRole = async (userId: string) => {
    if (!token || !orgId) return;
    try {
      const res = await fetch(`http://localhost:3001/api/v1/organizations/${orgId}/members/${userId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ 
          role: newRole,
          name: editName || undefined,
          email: editEmail || undefined,
          password: editPassword || undefined
        })
      });
      const data = await res.json();
      if (res.ok) {
        showToast('Cargo atualizado!');
        setEditingUserId(null);
        await fetchMembers(token, orgId);
      } else {
        showToast(data.error?.message || 'Erro ao atualizar cargo', 'error');
      }
    } catch {
      showToast('Erro de rede', 'error');
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!token || !orgId || !confirm('Tem certeza que deseja remover este membro?')) return;
    try {
      const res = await fetch(`http://localhost:3001/api/v1/organizations/${orgId}/members/${userId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        showToast('Membro removido com sucesso!');
        await fetchMembers(token, orgId);
      } else {
        showToast(data.error?.message || 'Erro ao remover', 'error');
      }
    } catch {
      showToast('Erro de rede', 'error');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
          <p className="text-muted-foreground animate-pulse">Carregando configurações...</p>
        </div>
      </div>
    );
  }

  const roleLabels: Record<string, string> = {
    OWNER: 'Proprietário',
    ADMIN: 'Administrador',
    MEMBER: 'Membro',
    VIEWER: 'Visualizador'
  };

  const canManage = currentUserRole === 'OWNER' || currentUserRole === 'ADMIN';

  return (
    <>
      {toast && (
        <div className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-xl shadow-2xl border backdrop-blur-md transition-all duration-300 animate-in slide-in-from-top-2 ${toast.type === 'success' ? 'bg-green-500/10 border-green-500/30 text-green-600' : 'bg-red-500/10 border-red-500/30 text-red-600'}`}>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{toast.message}</span>
          </div>
        </div>
      )}

      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-card border border-border rounded-2xl p-6 md:p-8 shadow-2xl max-w-md w-full animate-in zoom-in-95 duration-200">
            <h3 className="text-xl font-semibold text-foreground mb-4">Adicionar Membro</h3>
            <p className="text-sm text-muted-foreground mb-6">Preencha o Nome e Senha apenas caso o usuário ainda não possua conta (ele será registrado e adicionado automaticamente).</p>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Email do Usuário</label>
                <Input type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="email@exemplo.com" />
              </div>
              
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Nome do Usuário</label>
                <Input type="text" value={inviteName} onChange={e => setInviteName(e.target.value)} placeholder="João Silva" />
              </div>

              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Senha Inical</label>
                <Input type="password" value={invitePassword} onChange={e => setInvitePassword(e.target.value)} placeholder="Definir uma senha inicial..." />
              </div>
              
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Cargo</label>
                <select 
                  value={inviteRole}
                  onChange={e => setInviteRole(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                >
                  <option value="ADMIN">Administrador</option>
                  <option value="MEMBER">Membro (pode ver/criar segredos)</option>
                  <option value="VIEWER">Visualizador (apenas leitura)</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-8">
              <Button variant="ghost" onClick={() => setShowInviteModal(false)}>Cancelar</Button>
              <Button onClick={handleInvite} disabled={inviting}>
                {inviting ? 'Adicionando...' : 'Adicionar Membro'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Member Modal */}
      {editingUserId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-card border border-border rounded-2xl p-6 md:p-8 shadow-2xl max-w-md w-full animate-in zoom-in-95 duration-200">
            <h3 className="text-xl font-semibold text-foreground mb-4">Editar Perfil do Membro</h3>
            <p className="text-sm text-muted-foreground mb-6">Atualize os dados, email ou o nível de acesso do usuário.</p>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Nome do Usuário</label>
                <Input type="text" value={editName} onChange={e => setEditName(e.target.value)} placeholder="Ex: João da Silva" />
              </div>

              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Novo Email (opcional)</label>
                <Input type="email" value={editEmail} onChange={e => setEditEmail(e.target.value)} placeholder="email.novo@exemplo.com" />
              </div>

              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Nova Senha (opcional)</label>
                <Input type="password" value={editPassword} onChange={e => setEditPassword(e.target.value)} placeholder="***" />
              </div>
              
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Cargo</label>
                <select 
                  value={newRole}
                  onChange={e => setNewRole(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                >
                  <option value="ADMIN">Administrador</option>
                  <option value="MEMBER">Membro (pode ver/criar segredos)</option>
                  <option value="VIEWER">Visualizador (apenas leitura)</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-8">
              <Button variant="ghost" onClick={() => setEditingUserId(null)}>Cancelar</Button>
              <Button onClick={() => handleUpdateRole(editingUserId)}>
                Salvar Alterações
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Configurações e Equipe</h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1 sm:mt-2">Gerencie os detalhes da organização e o acesso dos membros.</p>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border overflow-x-auto hide-scrollbar">
          <button 
            className={`pb-3 px-4 font-medium whitespace-nowrap border-b-2 transition ${activeTab === 'members' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
            onClick={() => setActiveTab('members')}
          >
            Membros da Equipe
          </button>
          <button 
            className={`pb-3 px-4 font-medium whitespace-nowrap border-b-2 transition ${activeTab === 'organization' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
            onClick={() => setActiveTab('organization')}
          >
            Perfil da Organização
          </button>
        </div>

        {/* Members Tab */}
        {activeTab === 'members' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <h2 className="text-xl font-semibold">Membros ({members.length})</h2>
              {canManage && (
                <Button onClick={() => setShowInviteModal(true)} className="w-full sm:w-auto">
                  <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>
                  Adicionar Integrante
                </Button>
              )}
            </div>

            <div className="bg-card border border-border rounded-xl shadow-md overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[600px]">
                <thead>
                  <tr className="bg-muted/50 border-b border-border text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    <th className="p-4">Usuário</th>
                    <th className="p-4">Cargo</th>
                    <th className="p-4">Entrou em</th>
                    {canManage && <th className="p-4 text-right">Ações</th>}
                  </tr>
                </thead>
                <tbody>
                  {members.map(member => (
                    <tr key={member.id} className="border-b border-border hover:bg-muted/30 transition">
                      <td className="p-4">
                        <div className="font-medium text-foreground">{member.user.name}</div>
                        <div className="text-sm text-muted-foreground">{member.user.email}</div>
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded-md text-xs font-medium border ${member.role === 'OWNER' ? 'bg-purple-500/10 text-purple-500 border-purple-500/20' : (member.role === 'ADMIN' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' : 'bg-muted text-muted-foreground border-border')}`}>
                          {roleLabels[member.role] || member.role}
                        </span>
                      </td>
                      <td className="p-4 text-sm text-muted-foreground">
                        {new Date(member.createdAt).toLocaleDateString('pt-BR')}
                      </td>
                      {canManage && (
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {member.role !== 'OWNER' && (
                              <>
                                <Button variant="ghost" size="icon" onClick={() => { 
                                  setEditingUserId(member.user.id); 
                                  setNewRole(member.role); 
                                  setEditName(member.user.name);
                                  setEditEmail(member.user.email);
                                  setEditPassword('');
                                }} title="Editar Membro">
                                  <svg className="w-4 h-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => handleRemoveMember(member.user.id)} title="Remover Usuário">
                                  <svg className="w-4 h-4 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                </Button>
                              </>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Organization Tab */}
        {activeTab === 'organization' && organization && (
          <div className="max-w-2xl bg-card border border-border rounded-xl p-6 shadow-sm">
            <h2 className="text-xl font-semibold mb-6">Detalhes da Organização</h2>
            <div className="space-y-6">
              <div>
                <label className="text-sm text-muted-foreground block mb-1">Nome Fantasia</label>
                <Input value={organization.name} readOnly disabled className="bg-muted/50 font-medium" />
              </div>
              <div>
                <label className="text-sm text-muted-foreground block mb-1">Identificador Único (Slug)</label>
                <div className="flex items-center">
                  <span className="flex items-center justify-center bg-muted border border-border border-r-0 rounded-l-md px-3 h-10 text-sm text-muted-foreground">@</span>
                  <Input value={organization.slug} readOnly disabled className="rounded-l-none bg-muted/50 font-mono" />
                </div>
              </div>
              <div>
                <label className="text-sm text-muted-foreground block mb-1">Plano Atual</label>
                <div className="inline-block px-3 py-1 bg-primary/10 text-primary border border-primary/20 rounded-lg text-sm font-semibold tracking-wide">
                  {organization.planType} PLAN
                </div>
              </div>
              <p className="text-sm text-muted-foreground mt-4 italic border-t border-border pt-4">
                Por motivos de segurança contábil, mudanças no nome da organização e no faturamento precisam ser solicitadas via Suporte Administrativo.
              </p>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
