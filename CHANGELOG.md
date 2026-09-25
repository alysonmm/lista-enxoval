# Changelog

Todas as mudanças relevantes do projeto são documentadas neste arquivo, no formato [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/).

## [Unreleased]

### Added — indicadores de carregamento

- **`src/components/ui/submit-button.tsx`**: botão de submit com `useFormStatus()` — mostra um spinner e fica desabilitado enquanto a Server Action do formulário está em andamento. Substituiu `<Button type="submit">` em todos os formulários que chamam uma Server Action (34 ocorrências em 20 páginas — admin, portal dos pais e página pública), deixando de fora só as barras de busca (`method="GET"`), que já ganham feedback via `loading.tsx` (abaixo) por serem navegação normal.
- **`loading.tsx`** (convenção do Next.js) em `admin/(protected)`, `pais/(protected)`, `lista/[slug]` e na raiz do app: mostra um spinner central automaticamente enquanto a página de destino carrega, sem precisar de nenhum código extra por rota — cobre navegação entre páginas (clicar em "Editar", em um item do menu, etc.).

Sem isso, qualquer clique que disparasse uma Server Action ou uma navegação com busca de dados não dava nenhum retorno visual até terminar, parecendo travado.

Validado com Playwright simulando uma rede lenta (requisições atrasadas propositalmente): botão de login e de criar categoria ficam visivelmente desabilitados com spinner durante o envio; navegação direta para uma página nova mostra "Carregando..." enquanto os dados carregam (cliques em links já pré-carregados pelo Next.js são instantâneos por design — o loading.tsx é a rede de segurança para quando não há pré-carregamento). npm test (22/22), typecheck, lint e build seguem limpos.

### Added — clonagem de cadastros e fotos padrão

- **Clonar cadastro**: páginas "novo" de Produtos, Funcionários e Unidades aceitam `?cloneFrom=<id>` e vêm pré-preenchidas com os dados do registro de origem — exceto os campos que precisam ser únicos (SKU, e-mail, código) ou nunca são copiáveis (senha), que ficam em branco para o usuário definir. Link "Clonar" nas listagens e nas páginas de edição dos três cadastros.
- **Fotos padrão por categoria**: `public/placeholders/` ganhou um ícone simples por categoria (roupas, banho, quarto, passeio, alimentação, higiene, bolsas, ninhos, mantas, acessórios, móveis, decoração, saída de maternidade, + um genérico de fallback). `prisma/assign-default-images.ts` (`npm run db:assign-default-images`) atribui essas fotos a qualquer produto sem imagem — sem sobrescrever quem já tem foto enviada — e o seed já cria produtos novos com a foto da categoria por padrão. Continuam 100% editáveis depois pelo upload já existente (Produtos → editar → trocar imagem).
- Corrigido de passagem: `prisma/create-admin.ts` e `prisma/assign-default-images.ts` não carregavam `.env` automaticamente quando rodados direto via `tsx` (só via `prisma db seed`/`migrate`, que passam pelo `prisma.config.ts`) — adicionado `import "dotenv/config"` nos dois para funcionarem sozinhos em dev sem precisar prefixar `DATABASE_URL=...` toda vez (continua respeitando um valor prefixado, para apontar a outro banco).

Validado com Playwright contra o Postgres local: fluxo completo de clonagem nos três cadastros (título muda para "Clonar X", campos únicos em branco, demais pré-preenchidos, salvar com sucesso), thumbnails aparecendo na listagem de produtos e na lista pública após rodar `db:assign-default-images` nos 50 produtos existentes. `npm test` (22/22), typecheck, lint e build seguem limpos.

### Added — preparação para deploy em produção (Vercel)

- **Upload de imagem em produção**: `src/lib/storage.ts` agora usa **Vercel Blob** (`@vercel/blob`) quando `BLOB_READ_WRITE_TOKEN` está definido — necessário porque o filesystem da Vercel é somente leitura fora de `/tmp` e não persiste entre deploys, então a gravação local em `public/uploads` (que funciona em dev) não sobreviveria em produção. Sem o token, continua gravando localmente.
- **`APP_URL` com fallback inteligente**: `src/lib/qrcode.ts` agora cai para `VERCEL_PROJECT_PRODUCTION_URL`/`VERCEL_URL` (injetadas automaticamente pela Vercel) quando `APP_URL` não está definida — links e QR Code já saem corretos no primeiro deploy, antes de qualquer domínio próprio ser configurado.
- **Build pronto para Vercel**: `postinstall` roda `prisma generate`; `npm run build` agora roda `prisma migrate deploy` antes de `next build`, aplicando migrations pendentes automaticamente a cada deploy (idempotente, também seguro em dev local).
- **`prisma/create-admin.ts`** (`npm run db:create-admin`): cria um único Administrador real num banco de produção vazio, sem rodar o seed de demonstração inteiro (que grava dados fictícios e a senha `demo1234`).
- `DEPLOYMENT.md` ganhou uma seção com o passo a passo real de deploy (Vercel + Neon + Vercel Blob, todos no plano gratuito), e `.env.example`/a tabela de variáveis foram atualizados para refletir o storage de verdade (antes documentava um `StorageProvider`/S3 genérico que nunca chegou a ser implementado).

Validado: `npm run build` local confirma que `prisma migrate deploy` roda antes do build sem quebrar nada (nenhuma migration pendente); `prisma/create-admin.ts` testado criando, rejeitando e-mail duplicado e rejeitando senha curta. `npm test` (22/22), typecheck e lint seguem limpos.

### Added — melhorias de UI/UX (feedback pós-deploy local)

- **Upload de imagem de produto**: `src/lib/storage.ts` grava o arquivo em `public/uploads/products` (dev/local; produção deve trocar por S3/R2, ver `DEPLOYMENT.md`). Substitui o antigo "só URL colada" por um `<input type="file">` de verdade nas páginas de novo/editar produto, com thumbnail na listagem e na edição; o campo de URLs continua disponível para imagens adicionais/externas.
- **Logo da Ponto das Crianças**: adicionada em `public/logo.png` e usada na sidebar do admin, no header do portal dos pais, nas duas telas de login e no topo da página pública da lista (substituindo o ícone genérico).
- **Menu do admin e do portal dos pais**: itens de navegação ganharam borda visível em repouso/hover e destaque para a página atual (`src/app/admin/(protected)/admin-nav.tsx`, `src/app/pais/(protected)/parent-nav.tsx`) — antes não havia nenhuma distinção visual entre os botões.
- **Logout inacessível em telas estreitas**: a sidebar do admin é `hidden` abaixo do breakpoint `sm` (640px) e não existia nenhuma alternativa nesse caso — inclusive escondendo o botão "Sair". Adicionado um header mobile com logo + menu (`<details>` nativo, sem JS extra) contendo a navegação e o logout.
- **Mostrar/ocultar senha**: `src/components/ui/password-input.tsx` (ícone de olho, `lucide-react`) usado nas telas de login do admin e dos pais.
- **Cards do dashboard clicáveis**: cada indicador agora linka para o relatório correspondente com os mesmos filtros usados no cálculo (`/admin/relatorios?from=...`/`?channel=...` para métricas de venda, `/admin/listas?status=ACTIVE` para listas ativas/valor potencial). Vendedor não acessa `/admin/relatorios` (restrito a ADMIN/MANAGER), então nele os cards de venda linkam para `/admin/vendas`. `/admin/listas` ganhou suporte a `?status=`.
- **Link de compartilhamento na tela principal dos pais**: a URL pública da lista agora aparece direto em `/pais` (antes só existia dentro de `/pais/compartilhar`), com atalho para a tela completa (link + WhatsApp + QR Code).

### Added

**Documentação**
- `PROJECT_SPEC.md`, `ARCHITECTURE.md`, `DATABASE.md`, `API.md`, `DEPLOYMENT.md` cobrindo a especificação completa, decisões técnicas e o modelo de dados.

**Base do projeto**
- Next.js 15 (App Router) + TypeScript strict + Tailwind CSS v4 + kit de UI próprio sobre Radix primitives (o registro `ui.shadcn.com` está fora da política de rede deste ambiente).
- Prisma 6 (engine clássica) com as 30 tabelas do modelo de dados completo (identidade/RBAC, lojas, pessoas, catálogo/estoque, listas, vendas, logística, benefícios/créditos, auditoria, configurações).
- Autenticação própria (`jose` + `bcryptjs`, sessão em cookie httpOnly) para funcionários e pais, com bloqueio de conta após tentativas inválidas.

**Catálogo e cadastros**
- CRUD de unidades, categorias (com subcategoria), produtos, variações (tamanho/cor) e estoque físico por unidade — restrito a ADMIN.
- CRUD de clientes/pais com criação de acesso ao portal (Customer + Parent) — disponível para ADMIN, MANAGER e SELLER.

**Listas de enxoval**
- Criação de lista (bebê + responsável + lista, incluindo cadastro do responsável na hora, em uma única transação), ciclo de vida DRAFT→ACTIVE→PAUSED→CLOSED/CANCELLED, múltiplos responsáveis por lista, itens com quantidade desejada e prioridade (nunca removidos fisicamente, apenas desativados).

**Página pública (`/lista/[slug]`)**
- Mobile-first, `noindex` sempre, filtro Todos/Disponíveis/Garantidos via link (sem JavaScript).
- DTO (`PublicGiftListItem`) que estruturalmente nunca declara quantidade desejada/comprada/reservada — `can_purchase` calculado no servidor cruzando quota da lista com estoque real.
- Produtos esgotados continuam visíveis ("✓ Presente já garantido"), nunca desaparecem.
- Listas PIN_PROTECTED pedem PIN antes de mostrar qualquer produto; PRIVATE/DRAFT/CANCELLED retornam 404.

**Compra presencial**
- Venda presencial gera `Order` + `OrderItem` + `Payment` reais (nunca um "marcar como comprado"), com controle de concorrência via `SELECT ... FOR UPDATE` para impedir venda além do desejado/estoque em vendas simultâneas.
- Cancelamento nunca apaga a venda: estorna pagamento, devolve quantidade e estoque, registra motivo e responsável.
- Busca de listas por bebê, mãe/pai, telefone, CPF, título ou código.

**Portal dos pais**
- Visão geral com progresso, minha lista (quantidades reais), presentes recebidos (com opção anônima), itens faltantes, compartilhar (link + WhatsApp + QR Code para download), benefícios (schema pronto) e configurações (dados pessoais, dados do bebê, troca de senha).

**Painel administrativo**
- Dashboard com listas ativas, vendas hoje/mês, online × presencial, ticket médio, compradores únicos e valor potencial das listas — com escopo por papel (ADMIN vê tudo, MANAGER só a unidade, SELLER só as próprias vendas).
- Relatórios com filtro por período/unidade/canal: vendas por unidade/consultor/vendedor e produtos mais presenteados.

**Dados de demonstração**
- `prisma/seed.ts` recria 3 unidades, 1 administrador, 2 gerentes, 5 vendedores, 10 clientes, 3 listas, 50 produtos, compras online e presenciais, um pedido cancelado, produtos completos e disponíveis — reproduzindo os cenários da própria especificação (seções 128–131).

**Funcionários (`/admin/vendedores`)**
- CRUD de funcionários (Administrador/Gerente/Vendedor), restrito a ADMIN: criação com senha inicial, edição (dados, papel, unidade, ativo/inativo), redefinição de senha. Unidade obrigatória para Gerente/Vendedor, opcional para Administrador. Um admin não pode desativar a própria conta.
- Item que faltava no MVP: a seção 133 exige "cadastrar funcionário" no fluxo ponta a ponta, e o próprio menu lateral já linkava para `/admin/vendedores`, mas a página nunca tinha sido implementada — só era possível criar funcionário pelo seed.

**Histórico de vendas na lista**
- `/admin/listas/[id]` ganhou uma seção "Histórico de vendas" com todos os pedidos daquela lista (produto, quantidade, comprador, total, status, data, link para o pedido) — fecha o critério "ver histórico" da seção 133, que antes só dava para inferir cruzando `/admin/vendas` manualmente.

### Testes automatizados (seções 140/141)
- Suíte Vitest contra Postgres real (sem mocks de banco; só a "cola" do Next.js é mockada), cobrindo:
  - **Privacidade pública (obrigatório, seção 141)**: guard de tipo em tempo de compilação + checagens em runtime garantindo que a página pública nunca serializa `desired/purchased/reserved/remaining_quantity`, em todos os estados de lista (disponível, presenteado, com PIN, inexistente).
  - **Permissões**: papel padrão × override individual (`UserPermission`).
  - **Concorrência**: duas vendas simultâneas pela última unidade — exatamente uma aprovada, sem overselling.
  - **Cancelamento**: estorno de pagamento/estoque/quantidade sem apagar o pedido, e proteção contra cancelar duas vezes.
  - **Criação de lista e regras de quantidade**: transação atômica bebê+responsável+lista, e a trava que impede reduzir a quantidade desejada abaixo do já comprado/reservado.
- Bugs reais encontrados e corrigidos ao escrever os testes: `cancelOrderAction` deixava um `SaleError` escapar como exceção não tratada em vez de redirecionar com mensagem amigável (agora envolvido em try/catch como `registerInStoreSaleAction`); o helper de teste `uniqueId()` podia colidir entre arquivos de teste rodando em paralelo (corrigido com um componente aleatório).

### Validado manualmente
Fluxos ponta a ponta testados com Playwright contra um Postgres local: criação de lista, compra presencial, teste de concorrência com dois compradores disputando a última unidade (exatamente uma venda aprovada), cancelamento com estorno, portal dos pais, dashboard/relatórios com números conferidos, ausência de qualquer campo de quantidade no HTML (incluindo o payload RSC serializado) da página pública em todos os estados da lista, e o CRUD de funcionários (criação, login com a senha definida, edição, desativação bloqueando login, redefinição de senha, bloqueio de autodesativação do admin) — confirmado também via consulta direta ao banco.
