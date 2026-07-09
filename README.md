# Social Pulse

Base self-hosted inspirada no fluxo do Post4me para clonar, adaptar e publicar carrosséis em múltiplas redes sem depender de planos pagos de terceiros.

## O que a base faz

- Clone de carrossel com 3 variações de copy
- Bake de slides para formatos como 9:16, 1:1 e 4:5
- Fluxo de onboarding com marca, clone, conexão de contas e publicação
- Agendamento e publicação via API routes + worker por cron
- Autenticação com Google e integração OAuth por plataforma

## Arquitetura principal

- Frontend: Next.js 16 + React 19 + Tailwind 4
- Auth + banco: Supabase (Postgres + Google OAuth)
- Storage: Supabase Storage
- Publicação: API routes com publishers por plataforma

## Como usar

1. Crie um projeto no Supabase
2. Aplique o SQL em [supabase/migrations/001_initial.sql](supabase/migrations/001_initial.sql)
3. Configure Google OAuth e um bucket chamado post-media
4. Copie as variáveis de ambiente para .env.local
5. Execute npm install && npm run dev

## O que foi aprendido com o Post4me

O fluxo de produto do Post4me é simples e poderoso:

1. Clonar um carrossel viral
2. Adaptar a copy para a própria marca
3. Renderizar o texto na imagem para ficar nativo em cada rede
4. Distribuir para várias contas em um único fluxo
5. Medir o que funcionou e iterar

A versão aqui criada preserva esse núcleo, mas deixa a stack sob seu controle.

## Documentação

- [docs/ANALISE_POST4ME.md](docs/ANALISE_POST4ME.md)
- [docs/ANALISE_SOCIAL_PULSE.md](docs/ANALISE_SOCIAL_PULSE.md)

## Variáveis de ambiente

Copie [.env.example](.env.example) para .env.local e preencha os valores do Supabase, OAuth e da sua chave de IA opcional.

## Rodar localmente

```bash
npm install
npm run dev
```

A aplicação ficará disponível em http://localhost:3000 e o health check está em /api/health.

## Rodar com Docker

```bash
docker compose up --build
```

## Próximos passos

- Subir mídia para Supabase Storage no compositor
- Implementar refresh de tokens OAuth
- Conectar apps reais de TikTok, Meta, LinkedIn e X
- Adicionar analytics reais por plataforma
- Transformar a fila em worker robusto com retries
