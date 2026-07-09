# Análise do Social Pulse

Este projeto é uma base self-hosted inspirada no fluxo do Post4me, com foco em:

- clone de carrosséis virais
- adaptação de copy para a marca
- bake de texto em 9:16, 1:1 e 4:5
- agendamento e publicação via fila
- conexão OAuth com múltiplas plataformas

## Fluxo principal

1. O usuário entra com Google e acessa o studio.
2. Define o nome da marca e o contexto do produto.
3. Envia screenshots de um carrossel viral.
4. O sistema gera 3 variações de copy.
5. O usuário escolhe uma variação e entra no compositor.
6. O compositor bakeia os slides e permite publicar ou agendar.
7. O backend grava o post, cria alvos para as contas selecionadas e envia para a fila.

## Pontos fortes da arquitetura

- Next.js App Router com rotas API localmente organizadas
- Supabase para auth, banco relacional e storage
- Estrutura modular para publishers por plataforma
- Fluxo de onboarding simples e rápido
- Fácil de adaptar para um app próprio sem dependência de planos externos

## Melhorias recomendadas

- upload real para Supabase Storage no compositor
- refresh automático de tokens OAuth
- fila com retries e observabilidade
- analytics reais por rede
- painel de performance por marca e conta
