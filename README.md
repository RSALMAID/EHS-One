# EHS One

Gestão de Saúde, Segurança e Meio Ambiente (EHS/SST) para pequenas empresas, como SaaS web
multiempresa. O mapa de telas e o escopo de MVP, V2 e Premium estão no documento do projeto.

**Pilha:** Next.js (App Router) + Supabase (Postgres, Auth, Storage) + Vercel; Stripe entra na
etapa de assinatura.

## O que já existe

- Site público, cadastro e login por e-mail e senha.
- Criação da empresa (organização) com período de teste de 14 dias.
- Área logada com o menu completo do mapa de telas (itens futuros marcados "em breve").
- Trabalhadores: cadastro e lista.
- Central de Ações: criar, numerar por empresa (#0001), mudar status, situação por prazo.
- Banco multiempresa com Row Level Security: cada empresa só enxerga os próprios registros.
- Trilha de auditoria automática (quem, quando, antes e depois) em cadastros e ações.

## Rodar localmente

1. Crie um projeto gratuito em [supabase.com](https://supabase.com).
2. No SQL Editor do Supabase, rode `supabase/migrations/0001_multiempresa.sql` e depois
   `supabase/migrations/0002_permissoes.sql`
   (ou `supabase db push` com a CLI).
3. Copie `.env.example` para `.env.local` e preencha a URL e a chave `anon` do projeto.
4. `npm install` e `npm run dev`, depois abra http://localhost:3000.

Para testar sem confirmar e-mail, desative "Confirm email" em Authentication → Providers → Email
no Supabase.

## Publicar na Vercel

Importe o repositório na Vercel e cadastre as mesmas duas variáveis de ambiente.

## Segurança

O repositório é público: nunca envie `.env.local`, chaves `service_role` ou dados de clientes.
