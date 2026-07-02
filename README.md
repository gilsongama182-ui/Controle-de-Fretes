# Hemmersbach Logistics

Sistema integrado de acompanhamento de entregas e gestão de frotas para operadores e clientes da Hemmersbach Logistics. React 19 + Vite + TypeScript + Tailwind CSS, com autenticação e dados persistidos no Supabase.

## Stack

- **Frontend**: React 19, Vite 6, TypeScript, Tailwind CSS 4
- **Backend**: Supabase (Postgres + Auth + RLS)
- **Deploy**: Vercel

## Rodando localmente

**Pré-requisitos**: Node.js 18+, um projeto Supabase.

1. Instale as dependências:
   ```
   npm install
   ```
2. Copie `.env.example` para `.env.local` e preencha com as credenciais do seu projeto Supabase (Project Settings → API):
   ```
   VITE_SUPABASE_URL="https://xxxx.supabase.co"
   VITE_SUPABASE_ANON_KEY="eyJ..."
   ```
3. No SQL Editor do painel Supabase, rode nesta ordem:
   - `supabase/schema.sql` (tabelas, RLS, trigger de perfil)
   - `supabase/seed.sql` (opcional, dados de exemplo)
4. Em Authentication → Providers → Email, desative "Confirm email" (ambiente de desenvolvimento/demo) para que o cadastro já entre logado.
5. Rode o app:
   ```
   npm run dev
   ```

## Scripts

- `npm run dev` — servidor de desenvolvimento (porta 3000)
- `npm run build` — build de produção (`dist/`)
- `npm run preview` — pré-visualiza o build de produção
- `npm run lint` — checagem de tipos (`tsc --noEmit`)

## Estrutura

- `src/components/` — telas (Login, Cadastro, Dashboards, Gestão e Edição de Entregas)
- `src/components/layout/` — Sidebar, TopBar, modais e navegação reutilizados entre telas
- `src/lib/` — cliente Supabase e acesso a dados (`deliveries.ts`)
- `src/contexts/AuthContext.tsx` — sessão, perfil e ações de autenticação
- `supabase/` — schema SQL, políticas de RLS e seed de dados

## Deploy na Vercel

```
vercel link
vercel env add VITE_SUPABASE_URL production preview development
vercel env add VITE_SUPABASE_ANON_KEY production preview development
vercel --prod
```

As variáveis de ambiente precisam estar cadastradas no projeto Vercel **antes** do deploy, pois são embutidas no build (prefixo `VITE_`).
