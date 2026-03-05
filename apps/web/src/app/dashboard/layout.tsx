"use client";

import { Inter } from 'next/font/google';
import { ThemeToggle } from '@/components/theme-toggle';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

const inter = Inter({ subsets: ['latin'] });

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [authenticated, setAuthenticated] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('devvault_token');
    if (!token) {
      router.push('/login');
    } else {
      setAuthenticated(true);
    }
  }, [router]);

  const handleSignOut = () => {
    localStorage.removeItem('devvault_token');
    sessionStorage.removeItem('master_password');
    router.push('/login');
  };

  if (!authenticated) {
    return (
      <div className={`${inter.className} min-h-screen bg-background flex items-center justify-center`}>
        <div className="animate-pulse text-muted-foreground">Redirecionando...</div>
      </div>
    );
  }

  return (
    <div className={`${inter.className} min-h-screen bg-background flex`}>
      {/* Fundo escuro do menu mobile */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden" 
          onClick={() => setMobileMenuOpen(false)} 
        />
      )}

      {/* Sidebar - responsivo (drawer em mobile, fixed em desktop/tablet) */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 border-r border-border bg-card p-6 transform transition-transform duration-200 ease-in-out md:relative md:translate-x-0 ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center justify-between mb-10">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🛡️</span>
            <span className="text-lg font-bold text-foreground">DevVault</span>
          </div>
          <button className="md:hidden text-muted-foreground" onClick={() => setMobileMenuOpen(false)}>
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        
        <nav className="space-y-4">
          <a href="/dashboard" className="flex items-center gap-3 text-primary font-medium">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
            Segredos
          </a>
          <a href="/dashboard/settings" className="flex items-center gap-3 text-muted-foreground hover:text-foreground transition">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            Equipe & Configs
          </a>
          <a href="#" className="flex items-center gap-3 text-muted-foreground hover:text-foreground transition">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            Registro de Auditoria
          </a>
          <a href="#" className="flex items-center gap-3 text-muted-foreground hover:text-foreground transition">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>
            Faturamento
          </a>
        </nav>
      </aside>

      <main className="flex-1 bg-background flex flex-col min-h-screen min-w-0">
        <header className="h-16 border-b border-border flex items-center justify-between px-4 sm:px-6 bg-card/50 backdrop-blur-md sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <button 
              className="md:hidden p-2 -ml-2 text-muted-foreground hover:text-foreground"
              onClick={() => setMobileMenuOpen(true)}
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
            </button>
            <div className="flex bg-muted rounded-lg p-1 border border-border text-sm">
              <button className="px-3 py-1 bg-background text-foreground rounded shadow-sm">DevValt Corp</button>
            </div>
          </div>
          <div className="flex gap-4 items-center">
            <ThemeToggle />
            <button 
              onClick={handleSignOut}
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition"
            >
              Sair
            </button>
            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600" />
          </div>
        </header>

        <div className="p-4 sm:p-8 max-w-6xl w-full mx-auto text-foreground flex-1 overflow-x-hidden">
          {children}
        </div>
      </main>
    </div>
  );
}
