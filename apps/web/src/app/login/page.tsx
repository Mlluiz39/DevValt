"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const res = await fetch('http://localhost:3001/api/v1/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      
      if (res.ok) {
        localStorage.setItem('devvault_token', data.data.accessToken);
        sessionStorage.setItem('master_password', password); 
        router.push('/dashboard');
      } else {
        alert(data.error?.message || 'Erro ao fazer login');
      }
    } catch (err) {
      alert("Erro ao conectar ao servidor.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-background">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-10 shadow-2xl">
        
        <div className="mb-8 flex flex-col items-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 mb-4">
            <span className="text-2xl">🛡️</span>
          </div>
          <h1 className="text-foreground text-3xl font-bold">
            Bem-vindo ao DevVault
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Gestão de Segredos Zero-Knowledge Empresarial
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-medium text-muted-foreground block">Endereço de E-mail</label>
            <Input 
              type="email" 
              placeholder="admin@devvault.dev" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-background border-input text-foreground font-mono"
              required 
            />
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-muted-foreground">Senha Master</label>
              <a href="#" className="text-sm text-primary hover:text-primary/80">Esqueceu?</a>
            </div>
            <Input 
              type="password" 
              placeholder="••••••••••••••••" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-background border-input text-foreground font-mono"
              required 
            />
            <p className="text-xs text-muted-foreground mt-2">
              Sua senha nunca sai deste navegador e é usada para descriptografar seu cofre localmente.
            </p>
          </div>

          <Button 
            disabled={isLoading}
            className="w-full font-semibold mt-4 h-12 rounded-lg"
          >
            {isLoading ? "Desbloqueando cofre..." : "Entrar & Desbloquear Cofre"}
          </Button>
        </form>

      </div>
    </div>
  );
}
