import React from 'react';
import { ThemeToggle } from '@/components/theme-toggle';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-gradient-to-br from-background to-muted transition-colors duration-300">
      <div className="z-10 w-full max-w-5xl items-center justify-between font-mono text-sm lg:flex">
        <div className="fixed bottom-0 left-0 flex h-48 w-full items-end justify-center bg-gradient-to-t from-background via-background lg:static lg:h-auto lg:w-auto lg:bg-none">
          <a
            className="pointer-events-none flex place-items-center gap-2 p-8 lg:pointer-events-auto lg:p-0 font-bold text-2xl"
            href="/"
            rel="noopener noreferrer"
          >
            🛡️ DevVault
          </a>
        </div>
        <div className="fixed top-0 right-0 p-8 flex gap-4 items-center">
            <ThemeToggle />
            <a href="/login" className="px-4 py-2 bg-primary text-primary-foreground font-semibold rounded-lg shadow hover:bg-primary/90 transition-colors">Entrar</a>
        </div>
      </div>

      <div className="relative flex place-items-center mt-20 before:absolute before:h-[300px] before:w-[480px] before:-translate-x-1/2 before:rounded-full before:bg-gradient-radial before:from-muted-foreground before:to-transparent before:blur-2xl before:content-[''] after:absolute after:-z-20 after:h-[180px] after:w-[240px] after:translate-x-1/3 after:bg-gradient-conic after:from-indigo-400 after:via-indigo-200 after:blur-2xl after:content-[''] before:dark:bg-gradient-to-br before:dark:from-transparent before:dark:to-blue-700 before:dark:opacity-10 after:dark:from-sky-900 after:dark:via-[#0141ff] after:dark:opacity-40 sm:before:w-[480px] sm:after:w-[240px] before:lg:h-[360px]">
        <h1 className="text-6xl font-extrabold tracking-tight text-center z-10 drop-shadow-md text-foreground">
          Zero-Knowledge <br/>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-indigo-600">
            Gestão de Segredos
          </span>
        </h1>
      </div>

      <p className="mt-8 text-xl text-muted-foreground max-w-2xl text-center z-10">
        Gestão segura de chaves de API de nível empresarial. 
        Suas chaves são criptografadas no seu navegador — o servidor nunca vê seus segredos em texto simples.
      </p>

      <div className="mb-32 grid text-center lg:mb-0 lg:grid-cols-3 lg:text-left mt-16 gap-4 z-10 w-full max-w-5xl">
        <a
          href="/dashboard"
          className="group rounded-lg border border-transparent px-5 py-4 transition-colors hover:border-border hover:bg-muted/50 dark:hover:bg-neutral-800/30"
          rel="noopener noreferrer"
        >
          <h2 className={`mb-3 text-2xl font-semibold text-foreground`}>
            Criptografia no Cliente{' '}
            <span className="inline-block transition-transform group-hover:translate-x-1 motion-reduce:transform-none">
              -&gt;
            </span>
          </h2>
          <p className={`m-0 max-w-[30ch] text-sm text-muted-foreground`}>
            Criptografia AES-256-GCM realizada usando a Web Crypto API antes da transmissão.
          </p>
        </a>

        <a
          href="/dashboard"
          className="group rounded-lg border border-transparent px-5 py-4 transition-colors hover:border-border hover:bg-muted/50 dark:hover:bg-neutral-800/30"
          rel="noopener noreferrer"
        >
          <h2 className={`mb-3 text-2xl font-semibold text-foreground`}>
            RBAC Multi-Tenant{' '}
            <span className="inline-block transition-transform group-hover:translate-x-1 motion-reduce:transform-none">
              -&gt;
            </span>
          </h2>
          <p className={`m-0 max-w-[30ch] text-sm text-muted-foreground`}>
            Organizações, Projetos e Controle de Acesso Baseado em Funções (RBAC).
          </p>
        </a>

        <a
          href="/dashboard"
          className="group rounded-lg border border-transparent px-5 py-4 transition-colors hover:border-border hover:bg-muted/50 dark:hover:bg-neutral-800/30"
          rel="noopener noreferrer"
        >
          <h2 className={`mb-3 text-2xl font-semibold text-foreground`}>
            MFA & Rate Limits{' '}
            <span className="inline-block transition-transform group-hover:translate-x-1 motion-reduce:transform-none">
              -&gt;
            </span>
          </h2>
          <p className={`m-0 max-w-[30ch] text-sm text-muted-foreground`}>
            Autenticação de dois fatores TOTP e proteção contra força bruta com Redis.
          </p>
        </a>
      </div>
    </main>
  );
}
