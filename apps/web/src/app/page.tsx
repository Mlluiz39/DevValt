"use client";

import Link from "next/link";
import { User, RefreshCw, ArrowRight, X } from "lucide-react";
import { useState } from "react";

const FEATURES = [
  {
    id: 1,
    title: "Criptografia Ponta a Ponta",
    subtitle: "Segurança",
    description: "Garanta o mais alto nível de proteção para seus dados sensíveis. O algoritmo AES-256 é o padrão global para criptografia simétrica, protegendo seus segredos contra ataques de força bruta. Com nossa abordagem de conhecimento zero (Zero-Knowledge), nem mesmo nossos servidores têm acesso às chaves que descriptografam suas informações.",
    gradient: "from-emerald-400 to-cyan-500",
    glow: "hover:border-emerald-500/30",
    tech: "AES-256",
    category: "Tecnologia"
  },
  {
    id: 2,
    title: "Multi-Tenant Nativo",
    subtitle: "Acesso",
    description: "Controle quem, quando e como pode acessar cada segredo em sua organização. Com o Controle de Acesso Baseado em Funções (RBAC), você define permissões detalhadas para membros da equipe, garantindo conformidade e segurança em múltiplos ambientes de desenvolvimento.",
    gradient: "from-yellow-400 to-orange-500",
    glow: "hover:border-yellow-500/30",
    tech: "RBAC",
    category: "Escalável"
  },
  {
    id: 3,
    title: "Limites de Taxa",
    subtitle: "Controle",
    description: "Camadas adicionais de defesa para sua tranquilidade. Combine a Autenticação de Múltiplos Fatores (MFA) com nossa proteção inteligente de Limite de Taxa (Rate Limiting) para prevenir acessos não autorizados e ataques automatizados, mantendo a integridade de sua infraestrutura crítica.",
    gradient: "from-purple-500 to-pink-500",
    glow: "hover:border-pink-500/30",
    tech: "MFA + RATE",
    category: "Proteção"
  }
];

const BrandIcon = ({ name }: { name: string }) => {
  switch (name) {
    case "aws":
      return (
        <svg className="w-8 h-8 text-[#FF9900]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 6.412a2 2 0 0 0-2.529-1.921l-3.235.88a2 2 0 0 0-1.485 1.54L6.412 12l1.339 5.088a2 2 0 0 0 1.485 1.54l3.235.88a2 2 0 0 0 2.529-1.921V6.412Z" />
          <path d="M10 10l4 4m0-4l-4 4" />
        </svg>
      );
    case "github":
      return (
        <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.042-1.416-4.042-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
        </svg>
      );
    case "vercel":
      return (
        <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
          <path d="M24 22.5L12 1.5 0 22.5h24z" />
        </svg>
      );
    case "docker":
      return (
        <svg className="w-8 h-8 text-[#2496ED]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 3v18M3 12h18" />
          <path d="M12 8l-4 4 4 4 4-4-4-4z" />
        </svg>
      );
    case "azure":
      return (
        <svg className="w-8 h-8 text-[#0078D4]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 10l-6-6H4l6 6v10l6 6h6V10z" />
        </svg>
      );
    case "gcp":
      return (
        <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none">
          <path d="M18.24 15.5401L22.6001 18.0601L18.24 20.5801L13.8799 18.0601L18.24 15.5401Z" fill="#EA4335"/>
          <path d="M8.15991 4.74011L12.52 7.26011L8.15991 9.78011L3.7998 7.26011L8.15991 4.74011Z" fill="#4285F4"/>
          <path d="M8.15991 10.2601L12.52 12.7801L8.15991 15.3001L3.7998 12.7801L8.15991 10.2601Z" fill="#FBBC05"/>
          <path d="M13.2401 7.26011L17.6002 9.78011L13.2401 12.3001L8.87988 9.78011L13.2401 7.26011Z" fill="#34A853"/>
          <path d="M13.2401 12.7801L17.6002 15.3001L13.2401 17.8201L8.87988 15.3001L13.2401 12.7801Z" fill="#4285F4"/>
        </svg>
      );
    case "slack":
      return (
        <svg className="w-8 h-8 text-[#4A154B]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="4" y="4" width="16" height="16" rx="2" />
          <path d="M9 12h6m-3-3v6" />
        </svg>
      );
    case "netlify":
      return (
        <svg className="w-8 h-8 text-[#00C7B7]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
        </svg>
      );
    default:
      return <span>📦</span>;
  }
};

export default function Home() {
  const [selectedFeature, setSelectedFeature] = useState<typeof FEATURES[0] | null>(null);

  return (
    <div className="min-h-screen bg-[#0a0b0d] text-white font-sans flex flex-col items-center justify-start py-8 px-4 md:px-0 relative overflow-x-hidden">
      {/* Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="orb orb-cyan top-[10%] left-[10%]"></div>
        <div className="orb orb-pink bottom-[15%] right-[15%] delay-[-2s]"></div>
        <div className="orb orb-yellow top-[50%] left-[40%] delay-[-5s]"></div>
      </div>

      {/* Main Container */}
      <main className="relative z-10 w-full max-w-6xl glassmorphism rounded-[40px] p-6 md:p-12 shadow-2xl overflow-hidden">
        {/* Navigation */}
        <nav className="flex flex-wrap items-center justify-between mb-16 gap-6">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-extrabold tracking-tighter">
              Dev.<span className="bg-pink-500 px-2 py-0.5 rounded text-sm align-middle ml-1">vault</span>
            </span>
          </div>
          <ul className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-400">
            <li><Link className="hover:text-white transition-colors" href="#marketplace">Marketplace</Link></li>
            <li><Link className="hover:text-white transition-colors" href="#estatisticas">Estatísticas</Link></li>
            <li><Link className="hover:text-white transition-colors" href="#recursos">Recursos</Link></li>
            <li><Link className="hover:text-white transition-colors" href="#criar">Criar</Link></li>
          </ul>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 text-gray-400">
              <button className="hover:text-white p-1">
                <User className="w-5 h-5" />
              </button>
              <button className="hover:text-white p-1">
                <RefreshCw className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-1 text-xs font-bold text-white bg-white/10 px-3 py-1.5 rounded-full border border-white/10">
                <span className="w-2 h-2 rounded-full bg-yellow-400"></span> $0.00
              </div>
            </div>
            <Link 
              href="/login" 
              className="border border-white/20 px-6 py-2.5 rounded-lg text-sm font-semibold hover:bg-white/5 transition-all"
            >
              Entrar
            </Link>
          </div>
        </nav>

        {/* Hero Section */}
        <section className="text-center flex flex-col items-center mb-24 relative">
          {/* Decorative dots left */}
          <div className="absolute left-0 top-0 opacity-20 hidden md:block">
            <div className="grid grid-cols-2 gap-2">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="w-1.5 h-1.5 bg-white rounded-full"></div>
              ))}
            </div>
          </div>

          <h1 className="text-4xl md:text-7xl font-extrabold mb-8 max-w-4xl leading-[1.1] bg-clip-text text-transparent bg-text-gradient">
            Colete e proteja segredos de nível elite
          </h1>
          <p className="text-gray-400 text-lg md:text-xl max-w-2xl mb-12 leading-relaxed">
            A primeira e maior plataforma de gerenciamento de segredos para empresas modernas. Gestão descentralizada com segurança Zero-Knowledge.
          </p>

          {/* CTA Button */}
          <Link
            href="/login"
            className="group relative flex items-center gap-3 bg-glow-gradient px-10 py-5 rounded-full font-bold text-gray-900 shadow-[0_0_30px_rgba(248,181,0,0.3)] hover:scale-105 transition-transform duration-300"
          >
            Começar Agora
            <span className="bg-gray-900/10 p-1.5 rounded-full group-hover:bg-gray-900/20 transition-colors">
              <ArrowRight className="w-5 h-5" />
            </span>
          </Link>

          {/* Decorative dots right */}
          <div className="absolute right-0 bottom-0 opacity-20 hidden md:block">
            <div className="grid grid-cols-3 gap-2">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="w-1.5 h-1.5 bg-white rounded-full"></div>
              ))}
            </div>
          </div>
        </section>

        {/* Feature Cards / Recursos */}
        <section id="recursos" className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-32 scroll-mt-24">
          <div className="col-span-full mb-8 text-center md:text-left">
            <h2 className="text-3xl font-bold mb-4">Recursos Avançados</h2>
            <div className="h-1 w-20 bg-pink-500 rounded-full mx-auto md:mx-0"></div>
          </div>
          {FEATURES.map((feature) => (
            <div key={feature.id} className={`glassmorphism rounded-[32px] p-8 relative overflow-hidden group ${feature.glow} transition-colors`}>
              <div className="relative z-10 mb-12">
                <div className={`w-full h-48 rounded-2xl bg-gradient-to-br ${feature.gradient} relative flex items-center justify-center overflow-hidden`}>
                  <div className="absolute w-24 h-24 bg-white/20 rounded-full blur-xl animate-pulse"></div>
                  <div className="text-white text-center relative z-10">
                    <h3 className="text-[10px] font-bold uppercase tracking-widest opacity-80 mb-2">{feature.subtitle}</h3>
                    <p className="text-3xl font-black">{feature.tech}</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-1">{feature.category}</p>
                  <h4 className="text-lg font-bold">{feature.title}</h4>
                </div>
                <button 
                  onClick={() => setSelectedFeature(feature)}
                  className="bg-white/10 hover:bg-white text-white hover:text-black px-4 py-2 rounded-lg text-xs font-bold transition-all"
                >
                  Detalhes
                </button>
              </div>
            </div>
          ))}
        </section>

        {/* Estatísticas */}
        <section id="estatisticas" className="mb-32 scroll-mt-24">
          <div className="glassmorphism rounded-[40px] p-12 relative overflow-hidden">
            <div className="absolute top-0 right-0 -m-12 w-64 h-64 bg-pink-500/10 rounded-full blur-3xl"></div>
            <div className="relative z-10">
              <div className="text-center mb-16">
                <h2 className="text-3xl md:text-4xl font-bold mb-4">DevVault em Números</h2>
                <p className="text-gray-400 max-w-xl mx-auto">Nossa infraestrutura escala com as maiores empresas do mundo.</p>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                {[
                  { label: "Segredos Ativos", value: "1B+", color: "text-emerald-400" },
                  { label: "Disponibilidade", value: "99.99%", color: "text-cyan-400" },
                  { label: "Empresas", value: "15k+", color: "text-yellow-400" },
                  { label: "Regiões", value: "24+", color: "text-pink-400" },
                ].map((stat, idx) => (
                  <div key={idx} className="text-center">
                    <p className={`text-3xl md:text-5xl font-black mb-2 ${stat.color}`}>{stat.value}</p>
                    <p className="text-gray-500 text-xs font-bold uppercase tracking-widest">{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Marketplace */}
        <section id="marketplace" className="mb-32 scroll-mt-24">
          <div className="flex flex-col md:flex-row items-center justify-between mb-12 gap-8">
            <div className="max-w-xl">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Marketplace de Integrações</h2>
              <p className="text-gray-400">Conecte o DevVault com suas ferramentas favoritas. Temos centenas de integrações prontas para uso.</p>
            </div>
            <Link href="/login" className="px-8 py-3 rounded-xl border border-white/10 hover:bg-white/5 transition-all text-sm font-bold">
              Ver Todas as Integrações
            </Link>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { name: "AWS", logo: "aws" },
              { name: "GitHub", logo: "github" },
              { name: "Vercel", logo: "vercel" },
              { name: "Docker", logo: "docker" },
              { name: "Azure", logo: "azure" },
              { name: "GCP", logo: "gcp" },
              { name: "Slack", logo: "slack" },
              { name: "Netlify", logo: "netlify" },
            ].map((app, idx) => (
              <div key={idx} className="glassmorphism p-6 rounded-2xl flex flex-col items-center justify-center gap-4 hover:border-white/20 transition-all cursor-pointer group">
                <div className="group-hover:scale-110 transition-transform">
                  <BrandIcon name={app.logo} />
                </div>
                <span className="text-sm font-medium text-gray-400 group-hover:text-white">{app.name}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Criar / Final CTA */}
        <section id="criar" className="mb-12 scroll-mt-24">
          <div className="bg-glow-gradient rounded-[40px] p-12 md:p-20 text-center relative overflow-hidden shadow-[0_0_50px_rgba(248,181,0,0.15)]">
            <div className="absolute inset-0 bg-black/10 backdrop-blur-3xl"></div>
            <div className="relative z-10">
              <h2 className="text-3xl md:text-5xl font-black text-gray-900 mb-8">Pronto para elevar sua segurança?</h2>
              <p className="text-gray-900/70 text-lg mb-12 max-w-2xl mx-auto font-medium">
                Crie sua conta agora e comece a gerenciar segredos com criptografia de nível militar em menos de 5 minutos.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                  href="/login"
                  className="w-full sm:w-auto bg-gray-900 text-white px-10 py-5 rounded-full font-bold shadow-xl hover:scale-105 transition-transform"
                >
                  Criar Conta Grátis
                </Link>
                <Link
                  href="/login"
                  className="w-full sm:w-auto border border-gray-900/20 bg-gray-900/5 px-10 py-5 rounded-full font-bold hover:bg-gray-900/10 transition-colors text-gray-900"
                >
                  Falar com Vendas
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Feature Modal/Overlay */}
        {selectedFeature && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div 
              className="absolute inset-0 bg-black/60 backdrop-blur-md animate-in fade-in duration-300"
              onClick={() => setSelectedFeature(null)}
            />
            <div className={`relative z-10 w-full max-w-xl glassmorphism rounded-[32px] p-8 border border-white/10 shadow-2xl animate-in zoom-in-95 duration-300`}>
              <button 
                onClick={() => setSelectedFeature(null)}
                className="absolute top-6 right-6 p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-full transition-all"
              >
                <X className="w-5 h-5" />
              </button>
              
              <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${selectedFeature.gradient} mb-6 flex items-center justify-center shadow-lg`}>
                <span className="text-2xl font-black text-white">{selectedFeature.tech.charAt(0)}</span>
              </div>
              
              <h3 className="text-2xl font-bold mb-2">{selectedFeature.title}</h3>
              <p className="text-pink-500 font-bold text-xs uppercase tracking-widest mb-6">
                {selectedFeature.subtitle} • {selectedFeature.category}
              </p>
              
              <div className="space-y-4 text-gray-300 leading-relaxed bg-white/5 p-6 rounded-2xl border border-white/5">
                <p>{selectedFeature.description}</p>
              </div>
              
              <div className="mt-8 flex justify-end">
                <button 
                  onClick={() => setSelectedFeature(null)}
                  className="bg-white text-black px-8 py-3 rounded-xl font-bold hover:bg-gray-200 transition-all"
                >
                  Entendi
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="mt-12 text-gray-500 text-sm font-medium flex flex-col items-center gap-4">
        <p>© 2026 DevVault Global. Todos os direitos reservados.</p>
      </footer>
    </div>
  );
}
