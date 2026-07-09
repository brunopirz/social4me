# Análise técnica — Post4me

> Análise baseada em reconhecimento público de [post4me.app](https://www.post4me.app/), bundles JS e API `api.post4me.app`. Área logada não foi acessada com credenciais do usuário.

## Visão geral do produto

O Post4me é um **motor de distribuição** (não só agendador) focado em:

1. **Clonar** carrosséis virais (TikTok/IG) via IA
2. **Compor** slides com texto baked em 9:16 (1080×1920)
3. **Distribuir** para múltiplas contas de uma marca
4. **Aprender** com analytics (IG completo; TikTok carrossel limitado pela API)

## Stack identificada

| Camada | Tecnologia |
|--------|------------|
| Frontend | Next.js (App Router) + React + Turbopack + Tailwind |
| Hosting | Firebase Hosting (`post4me-9336b.firebaseapp.com`) |
| Auth | Firebase Auth (Google OAuth) + cookies de sessão |
| Banco | Cloud Firestore |
| Storage | Firebase Storage |
| API backend | Node.js separado em `https://api.post4me.app` |
| Analytics | Google Analytics (`G-Q9F3ER18WP`) |
| PWA | `manifest.json` (web-first, sem app store) |

## Arquitetura

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────────┐
│  Next.js (web)  │────▶│ Firebase Auth    │     │ api.post4me.app     │
│  post4me.app    │     │ + Firestore      │────▶│ (OAuth + publish)   │
└────────┬────────┘     │ + Storage        │     └──────────┬──────────┘
         │              └──────────────────┘                │
         │  /api/sessionLogin, verify-session               │
         ▼                                                   ▼
   Studio UI (SPA)                              Instagram, TikTok, X,
   /studio/start, /studio/compose               LinkedIn, Facebook APIs
```

### Fluxo de autenticação

1. `signInWithPopup` (Google) via Firebase Auth
2. `getIdToken()` → `POST /api/sessionLogin` (cookie httpOnly)
3. `GET /api/verify-session` valida sessão em cada navegação
4. Entitlements em `users/{uid}/entitlements/pro` (Firestore snapshot)

### Fluxo de onboarding (`/studio/start`)

Wizard de 4 passos:

1. **Marca** — nome do app + categoria
2. **Clone** — upload de screenshots → `POST /api/content/clone-carousel`
3. **Conectar** — OAuth TikTok via `/api/tiktok/auth-url`
4. **Postar** — redireciona para `/studio/compose`

### Firestore (coleções inferidas)

- `scheduled_posts` — fila de publicação
- `users/{uid}/entitlements/pro` — plano free/pro
- Contas sociais vinculadas por plataforma (via módulos dinâmicos)

### API backend (`api.post4me.app`)

Endpoints documentados publicamente:

```
GET  /health
GET  /api
GET  /api/facebook/auth-url
GET  /api/facebook/auth-callback
POST /api/facebook/exchange-token | refresh-token | validate-token | post
GET  /api/linkedin/auth-url
GET  /api/tiktok/auth-url
GET  /api/tiktok/creator-info
POST /api/tiktok/post
POST /api/content/clone-carousel
POST /api/content/campaign/generate
POST /api/content/campaign/research
POST /api/posts/schedule
DELETE /api/posts/:id
```

Autenticação: `Authorization: Bearer <firebase_id_token>`

### Modelo de dados de post agendado

```typescript
{
  userId, pageId, platformType, pageName,
  scheduledFor, status, // scheduled | queued | posting | posted | failed
  renderedAssets: [{ mediaUrl, mediaType }],
  post: { content, mediaUrls, additionalData?: { tiktok: {...} } },
  platformPostId, errorMessage
}
```

### Integrações OAuth

| Plataforma | Escopos observados |
|------------|-------------------|
| LinkedIn | `openid profile email w_member_social w_organization_social rw_organization_admin` |
| TikTok | Redirect para `/{origin}/tiktok-callback?uid=` |
| Facebook | Pages API + smart-exchange de tokens |
| Instagram | Via Facebook Graph API (inferido) |
| X/Twitter | auth-url (requer credenciais server-side) |

### Monetização

- **Free**: 5 posts lifetime, 1 conta por plataforma
- **Pro** ($9.99/mo ou $69.99/yr): posts ilimitados, multi-conta, analytics, templates, IA

Entitlement checado em tempo real via Firestore listener.

## O que replicar no Social Distro

1. Separação frontend (Next.js) + API de publicação
2. OAuth por plataforma com tokens armazenados criptografados
3. Fila de agendamento com worker/cron
4. Composer com bake 9:16 no client (Canvas)
5. Clone de carrossel (stub local ou OpenAI depois)
6. Multi-marca / multi-conta
7. Analytics por ângulo (tags manuais + métricas IG quando disponível)

## Limitações conhecidas (do próprio Post4me)

- TikTok **não expõe analytics** para carrosséis de foto — só vídeos
- Aprovação de apps nas plataformas é obrigatória para produção
- Tokens OAuth expiram — precisa refresh automático
