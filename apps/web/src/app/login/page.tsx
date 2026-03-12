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
    <div className="bg-[#0a0a0b] text-white font-sans min-h-screen flex flex-col items-center justify-center overflow-hidden selection:bg-emerald-500/30 relative">
      {/* Background Atmosphere */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-5%] w-[40vw] h-[40vw] rounded-full bg-cyan-500/10 blur-[120px] animate-float"></div>
        <div className="absolute bottom-[-10%] right-[-5%] w-[45vw] h-[45vw] rounded-full bg-lime-500/10 blur-[150px] animate-float delay-1"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[30vw] h-[30vw] rounded-full bg-fuchsia-600/5 blur-[100px] animate-float delay-2"></div>

        {/* Grid Decoration */}
        <div className="absolute top-20 left-20 opacity-20 hidden lg:block">
          <div className="grid grid-cols-3 gap-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="w-1.5 h-1.5 rounded-full bg-white"></div>
            ))}
          </div>
        </div>
      </div>

      <main className="relative z-10 w-full max-w-md px-6 py-12">
        {/* Brand Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 mb-6">
            <span className="text-2xl font-bold tracking-tighter">Dev.</span>
            <span className="bg-[#ff2d60] text-xs font-bold px-2 py-0.5 rounded italic">
              vault
            </span>
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4 leading-tight">
            Entrar no{" "}
            <span className="bg-clip-text text-transparent bg-vibrant-gradient">
              DevVault
            </span>
          </h1>
          <p className="text-gray-400 font-light text-sm">
            Gerenciamento de segredos de nível elite para equipes modernas.
          </p>
        </div>

        {/* Login Card */}
        <div className="glassmorphism rounded-[2.5rem] p-8 md:p-10">
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label
                className="block text-xs font-semibold text-gray-400 uppercase tracking-widest ml-1"
                htmlFor="email"
              >
                E-mail
              </label>
              <Input
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 h-14 text-sm text-white placeholder-gray-500 transition-all duration-300 focus:border-emerald-400/50 focus:ring-emerald-400/20"
                id="email"
                type="email"
                name="email"
                placeholder="seu@email.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center px-1">
                <label
                  className="block text-xs font-semibold text-gray-400 uppercase tracking-widest"
                  htmlFor="password"
                >
                  Senha Master
                </label>
                <a
                  className="text-xs font-medium text-emerald-400 hover:text-emerald-300 transition-colors"
                  href="#"
                >
                  Esqueceu a senha?
                </a>
              </div>
              <Input
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 h-14 text-sm text-white placeholder-gray-500 transition-all duration-300 focus:border-emerald-400/50 focus:ring-emerald-400/20"
                id="password"
                type="password"
                name="password"
                placeholder="••••••••••••"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <div className="pt-2">
              <Button
                disabled={isLoading}
                className="w-full bg-hero-gradient text-[#0a0a0b] font-bold py-6 rounded-2xl flex items-center justify-center gap-2 hover:opacity-90 transition-all active:scale-[0.98] border-none"
                type="submit"
              >
                <span>
                  {isLoading ? "Processando..." : "Entrar e Desbloquear"}
                </span>
                {!isLoading && (
                  <svg
                    className="h-5 w-5"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      clipRule="evenodd"
                      d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z"
                      fillRule="evenodd"
                    ></path>
                  </svg>
                )}
              </Button>
            </div>
          </form>

          {/* Security Note */}
          <div className="mt-8 flex items-center justify-center gap-2 text-[10px] text-gray-500 uppercase tracking-tighter">
            <svg
              className="h-3 w-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
              ></path>
            </svg>
            <span>Criptografia AES-256 Ponta a Ponta Ativa</span>
          </div>
        </div>
      </main>

      <footer className="mt-auto py-8 text-center text-xs text-gray-600 tracking-wide relative z-10 w-full">
        <p>© 2026 DevVault Global. Todos os direitos reservados.</p>
      </footer>
    </div>
  );
}
