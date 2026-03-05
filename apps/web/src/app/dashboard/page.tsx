"use client";

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { encryptSecretClientSide, decryptSecretClientSide, EncryptedPayload } from '@/lib/crypto';

interface Secret {
  id: string;
  name: string;
  description?: string;
  type: string;
  tags: string[];
  keyHint?: string;
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
}

export default function DashboardPage() {
  const [showAddSecret, setShowAddSecret] = useState(false);
  const [secrets, setSecrets] = useState<Secret[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  
  // App State cache
  const [token, setToken] = useState<string | null>(null);
  const [masterPassword, setMasterPassword] = useState<string | null>(null);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [projectId, setProjectId] = useState<string | null>(null);

  // New Secret form state
  const [newName, setNewName] = useState('');
  const [newValue, setNewValue] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newType, setNewType] = useState('API_KEY');
  const [newTags, setNewTags] = useState('');
  const [savingSecret, setSavingSecret] = useState(false);

  // Edit Secret state
  const [editingSecret, setEditingSecret] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editValue, setEditValue] = useState('');
  const [editTags, setEditTags] = useState('');
  const [updatingSecret, setUpdatingSecret] = useState(false);

  // Delete confirmation
  const [deletingSecretId, setDeletingSecretId] = useState<string | null>(null);

  // Revealed secrets cache
  const [revealedSecrets, setRevealedSecrets] = useState<Record<string, string>>({});

  // Toast notification state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchSecrets = useCallback(async (t: string, oId: string, pId: string) => {
    const res = await fetch(`http://localhost:3001/api/v1/organizations/${oId}/projects/${pId}/secrets`, {
      headers: { Authorization: `Bearer ${t}` }
    });
    const data = await res.json();
    // API returns { secrets, pagination } inside data
    const secretsList = data.data?.secrets || data.data || [];
    setSecrets(Array.isArray(secretsList) ? secretsList : []);
  }, []);

  // Initial Boot: fetch orgs & projects
  useEffect(() => {
    const t = localStorage.getItem('devvault_token');
    const mp = sessionStorage.getItem('master_password');
    if (!t) return;

    setToken(t);
    setMasterPassword(mp);

    const init = async () => {
      try {
        const meRes = await fetch('http://localhost:3001/api/v1/auth/me', {
          headers: { Authorization: `Bearer ${t}` }
        });
        const meData = await meRes.json();
        
        // API returns { data: { user: { memberships: [...] } } }
        const organizationId = meData.data?.user?.memberships?.[0]?.organization?.id;
        setOrgId(organizationId);

        if (organizationId) {
          const projRes = await fetch(`http://localhost:3001/api/v1/organizations/${organizationId}/projects`, {
            headers: { Authorization: `Bearer ${t}` }
          });
          const projData = await projRes.json();
          const pId = projData.data[0]?.id;
          setProjectId(pId);

          if (pId) {
            await fetchSecrets(t, organizationId, pId);
          }
        }
      } catch (err) {
        console.error("Falha ao inicializar o painel", err);
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [fetchSecrets]);

  // ─── CREATE SECRET ───────────────────────────────────────────────────
  const handleAddSecret = async () => {
    if (!newName || !newValue || !token || !orgId || !projectId || !masterPassword) {
      showToast('Preencha todos os campos obrigatórios', 'error');
      return;
    }

    setSavingSecret(true);
    try {
      const payload: EncryptedPayload = await encryptSecretClientSide(newValue, masterPassword);

      const tags = newTags
        .split(',')
        .map(t => t.trim())
        .filter(t => t.length > 0);

      const res = await fetch(`http://localhost:3001/api/v1/organizations/${orgId}/projects/${projectId}/secrets`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name: newName,
          keyHint: newValue.substring(0, Math.min(3, newValue.length)) + '...',
          description: newDescription || undefined,
          type: newType,
          tags,
          ...payload
        })
      });

      if (res.ok) {
        setNewName('');
        setNewValue('');
        setNewDescription('');
        setNewTags('');
        setNewType('API_KEY');
        setShowAddSecret(false);
        await fetchSecrets(token, orgId, projectId);
        showToast('Segredo criado e criptografado com sucesso!');
      } else {
        const err = await res.json();
        showToast(err.error?.message || "Falha ao salvar o segredo", 'error');
      }
    } catch(err) {
      showToast("Erro de criptografia ou rede", 'error');
    } finally {
      setSavingSecret(false);
    }
  };

  // ─── REVEAL SECRET ───────────────────────────────────────────────────
  const handleReveal = async (secretId: string) => {
    if (!token || !orgId || !projectId || !masterPassword) return;

    // Toggle off if already revealed
    if (revealedSecrets[secretId]) {
      setRevealedSecrets(prev => {
        const next = { ...prev };
        delete next[secretId];
        return next;
      });
      return;
    }

    setActionLoading(secretId);
    try {
      const res = await fetch(`http://localhost:3001/api/v1/organizations/${orgId}/projects/${projectId}/secrets/${secretId}/reveal`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();

      if (res.ok) {
        const plaintext = await decryptSecretClientSide({
          encryptedValue: data.data.encryptedValue,
          iv: data.data.iv,
          authTag: data.data.authTag,
          salt: data.data.salt
        }, masterPassword);
        
        setRevealedSecrets(prev => ({ ...prev, [secretId]: plaintext }));
      } else {
        showToast(data.error?.message || "Não foi possível revelar", 'error');
      }
    } catch(err) {
      showToast("Falha na descriptografia. Você usou a senha master correta?", 'error');
    } finally {
      setActionLoading(null);
    }
  };

  // ─── DELETE SECRET ───────────────────────────────────────────────────
  const handleDelete = async (secretId: string) => {
    if (!token || !orgId || !projectId) return;

    setActionLoading(secretId);
    try {
      const res = await fetch(`http://localhost:3001/api/v1/organizations/${orgId}/projects/${projectId}/secrets/${secretId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        setDeletingSecretId(null);
        // Remove from revealed cache
        setRevealedSecrets(prev => {
          const next = { ...prev };
          delete next[secretId];
          return next;
        });
        await fetchSecrets(token, orgId, projectId);
        showToast('Segredo excluído com sucesso!');
      } else {
        const err = await res.json();
        showToast(err.error?.message || "Falha ao excluir o segredo", 'error');
      }
    } catch(err) {
      showToast("Erro de rede ao excluir", 'error');
    } finally {
      setActionLoading(null);
    }
  };

  // ─── EDIT SECRET (open form) ─────────────────────────────────────────
  const startEdit = (secret: Secret) => {
    setEditingSecret(secret.id);
    setEditName(secret.name);
    setEditDescription(secret.description || '');
    setEditTags(secret.tags?.join(', ') || '');
    setEditValue('');
  };

  const cancelEdit = () => {
    setEditingSecret(null);
    setEditName('');
    setEditDescription('');
    setEditValue('');
    setEditTags('');
  };

  // ─── UPDATE SECRET ───────────────────────────────────────────────────
  const handleUpdateSecret = async () => {
    if (!token || !orgId || !projectId || !editingSecret || !masterPassword) return;

    setUpdatingSecret(true);
    try {
      const tags = editTags
        .split(',')
        .map(t => t.trim())
        .filter(t => t.length > 0);

      const body: Record<string, any> = {
        name: editName || undefined,
        description: editDescription,
        tags,
      };

      // If new value provided, re-encrypt
      if (editValue) {
        const payload: EncryptedPayload = await encryptSecretClientSide(editValue, masterPassword);
        body.keyHint = editValue.substring(0, Math.min(3, editValue.length)) + '...';
        Object.assign(body, payload);
      }

      const res = await fetch(`http://localhost:3001/api/v1/organizations/${orgId}/projects/${projectId}/secrets/${editingSecret}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(body)
      });

      if (res.ok) {
        cancelEdit();
        // Invalidate revealed cache for this secret
        setRevealedSecrets(prev => {
          const next = { ...prev };
          delete next[editingSecret];
          return next;
        });
        await fetchSecrets(token, orgId, projectId);
        showToast('Segredo atualizado com sucesso!');
      } else {
        const err = await res.json();
        showToast(err.error?.message || "Falha ao atualizar o segredo", 'error');
      }
    } catch(err) {
      showToast("Erro de criptografia ou rede", 'error');
    } finally {
      setUpdatingSecret(false);
    }
  };

  // ─── COPY TO CLIPBOARD ───────────────────────────────────────────────
  const handleCopy = (value: string) => {
    navigator.clipboard.writeText(value);
    showToast('Copiado para a área de transferência!');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
          <p className="text-muted-foreground animate-pulse">Carregando cofre seguro...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-xl shadow-2xl border backdrop-blur-md transition-all duration-300 animate-in slide-in-from-top-2 ${
          toast.type === 'success' 
            ? 'bg-green-500/10 border-green-500/30 text-green-600 dark:text-green-400' 
            : 'bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400'
        }`}>
          <div className="flex items-center gap-2">
            {toast.type === 'success' ? (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
            ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            )}
            <span className="text-sm font-medium">{toast.message}</span>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingSecretId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-2xl p-8 shadow-2xl max-w-md w-full mx-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center">
                <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-foreground">Excluir Segredo</h3>
            </div>
            <p className="text-muted-foreground text-sm mb-6">
              Tem certeza que deseja excluir este segredo? Esta ação não pode ser desfeita. O segredo será removido permanentemente do cofre.
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setDeletingSecretId(null)}>Cancelar</Button>
              <Button 
                variant="destructive" 
                onClick={() => handleDelete(deletingSecretId)}
                disabled={actionLoading === deletingSecretId}
              >
                {actionLoading === deletingSecretId ? 'Excluindo...' : 'Excluir Segredo'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-10">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
            Cofre de Segredos
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1 sm:mt-2">Gerencie os ambientes do seu projeto de forma segura.</p>
        </div>

        <Button onClick={() => { setShowAddSecret(!showAddSecret); cancelEdit(); }} variant="default" className="w-full sm:w-auto">
          <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Adicionar Segredo
        </Button>
      </div>

      {/* Add Secret Form */}
      {showAddSecret && (
        <div className="mb-8 sm:mb-10 p-4 sm:p-6 bg-card border border-border rounded-xl shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <h2 className="text-lg sm:text-xl font-semibold text-card-foreground">Criar Novo Segredo</h2>
            <span className="text-xs font-semibold px-2 py-1 bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20 rounded-md w-fit">
              Criptografado localmente
            </span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Nome do Segredo</label>
              <Input 
                type="text" 
                placeholder="ex: DATABASE_URL" 
                value={newName}
                onChange={e => setNewName(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Valor</label>
              <Input 
                type="password" 
                placeholder="Digite o valor em texto simples..." 
                value={newValue}
                onChange={e => setNewValue(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Descrição (opcional)</label>
              <Input 
                type="text" 
                placeholder="Conexão com banco de dados de produção" 
                value={newDescription}
                onChange={e => setNewDescription(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Tags (separadas por vírgula)</label>
              <Input 
                type="text" 
                placeholder="produção, banco-de-dados, crítico" 
                value={newTags}
                onChange={e => setNewTags(e.target.value)}
              />
            </div>
          </div>
          <div className="mt-6 flex flex-col sm:flex-row justify-end gap-3">
            <Button variant="ghost" className="order-2 sm:order-1" onClick={() => setShowAddSecret(false)}>Cancelar</Button>
            <Button className="order-1 sm:order-2" onClick={handleAddSecret} disabled={savingSecret}>
              {savingSecret ? (
                <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" /> Criptografando...</>
              ) : (
                'Criptografar & Salvar'
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Edit Secret Form */}
      {editingSecret && (
        <div className="mb-8 sm:mb-10 p-4 sm:p-6 bg-card border border-blue-500/30 rounded-xl shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <h2 className="text-lg sm:text-xl font-semibold text-card-foreground">Editar Segredo</h2>
            <span className="text-xs font-semibold px-2 py-1 bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 rounded-md w-fit">
              Modo de Edição
            </span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Nome do Segredo</label>
              <Input 
                type="text" 
                placeholder="ex: DATABASE_URL" 
                value={editName}
                onChange={e => setEditName(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Novo Valor (deixe em branco para manter o atual)</label>
              <Input 
                type="password" 
                placeholder="Deixe vazio para manter o valor atual" 
                value={editValue}
                onChange={e => setEditValue(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Descrição</label>
              <Input 
                type="text" 
                placeholder="Descrição do segredo" 
                value={editDescription}
                onChange={e => setEditDescription(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Tags (separadas por vírgula)</label>
              <Input 
                type="text" 
                placeholder="produção, banco-de-dados, crítico" 
                value={editTags}
                onChange={e => setEditTags(e.target.value)}
              />
            </div>
          </div>
          <div className="mt-6 flex flex-col sm:flex-row justify-end gap-3">
            <Button variant="ghost" className="order-2 sm:order-1" onClick={cancelEdit}>Cancelar</Button>
            <Button className="order-1 sm:order-2" onClick={handleUpdateSecret} disabled={updatingSecret}>
              {updatingSecret ? (
                <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" /> Atualizando...</>
              ) : (
                'Salvar Alterações'
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Secrets Table */}
      <div className="bg-card border border-border rounded-xl shadow-md overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[500px] relative">
          <thead>
            <tr className="bg-muted/50 border-b border-border text-sm font-medium text-muted-foreground uppercase tracking-wider">
              <th className="p-4">Nome</th>
              <th className="p-4 hidden sm:table-cell">Tags</th>
              <th className="p-4 hidden md:table-cell">Adicionado</th>
              <th className="p-4 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {secrets.length === 0 ? (
                <tr>
                    <td colSpan={4} className="p-8 text-center text-muted-foreground">
                        <div className="flex flex-col items-center gap-3">
                          <svg className="w-12 h-12 text-muted-foreground/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                          </svg>
                          <p>Nenhum segredo encontrado. Crie um acima!</p>
                        </div>
                    </td>
                </tr>
            ) : secrets.map((sec) => (
              <tr key={sec.id} className="border-b border-border hover:bg-muted/30 transition group">
                <td className="p-4">
                  <div className="font-medium text-card-foreground">{sec.name}</div>
                  {revealedSecrets[sec.id] ? (
                    <div className="flex items-center gap-2 mt-1">
                      <code className="text-xs text-green-600 dark:text-green-400 font-mono bg-green-500/10 px-2 py-0.5 rounded">
                        {revealedSecrets[sec.id]}
                      </code>
                      <button 
                        onClick={() => handleCopy(revealedSecrets[sec.id])}
                        className="text-muted-foreground hover:text-foreground transition"
                        title="Copiar"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      </button>
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground mt-1 font-mono">{sec.keyHint}</div>
                  )}
                </td>
                <td className="p-4 hidden sm:table-cell">
                  <div className="flex flex-wrap gap-2">
                    {sec.tags?.map((t: string) => (
                      <span key={t} className="px-2 py-0.5 bg-background text-muted-foreground rounded-lg text-xs border border-border">
                        {t}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="p-4 text-sm text-muted-foreground hidden md:table-cell">
                  {new Date(sec.createdAt).toLocaleDateString('pt-BR')}
                </td>
                <td className="p-4 text-right">
                  <div className="flex items-center justify-end gap-1">
                    {/* Reveal / Hide */}
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleReveal(sec.id)} 
                      className={`text-primary ${revealedSecrets[sec.id] ? 'bg-primary/5' : ''}`}
                      disabled={actionLoading === sec.id}
                    >
                      {actionLoading === sec.id ? (
                        <span className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                      ) : revealedSecrets[sec.id] ? (
                        <>
                          <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                          </svg>
                          Ocultar
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          Revelar
                        </>
                      )}
                    </Button>

                    <div className="flex">
                      {/* Edit */}
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="text-muted-foreground hover:text-blue-500"
                        onClick={() => startEdit(sec)}
                        title="Editar segredo"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </Button>

                      {/* Delete */}
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="text-muted-foreground hover:text-destructive"
                        onClick={() => setDeletingSecretId(sec.id)}
                        title="Excluir segredo"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </Button>
                    </div>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
