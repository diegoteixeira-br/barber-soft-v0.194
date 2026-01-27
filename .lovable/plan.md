

# Area Administrativa Super Admin - BarberSoft (Atualizado)

## Resumo

Criacao de uma area administrativa exclusiva para gerenciar o SaaS BarberSoft, incluindo:
- Dashboard de metricas globais (KPIs)
- Gestao de clientes (barbearias)
- Rastreamento de leads
- Central de feedbacks
- **Configuracoes de ferramentas e gateway de pagamento (Stripe)**

---

## 1. Arquitetura de Seguranca

### 1.1 Novo Valor no Enum de Roles

O enum atual possui `owner` e `barber`. Adicionaremos `super_admin`:

```sql
ALTER TYPE public.app_role ADD VALUE 'super_admin';
```

### 1.2 Funcao de Verificacao Super Admin

Funcao security definer para evitar recursao RLS:

```sql
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'super_admin'
  )
$$;
```

### 1.3 Componente SuperAdminGuard

Guard React que:
- Verifica se usuario tem role `super_admin`
- Redireciona para `/dashboard` se nao for super admin
- Mostra loading enquanto verifica

---

## 2. Estrutura de Banco de Dados

### 2.1 Tabela `saas_settings` (Configuracoes Globais do SaaS)

Nova tabela para configuracoes do Super Admin, incluindo Stripe:

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | uuid | PK |
| stripe_mode | text | 'test' ou 'live' |
| stripe_test_publishable_key | text | Chave publica de teste |
| stripe_test_secret_key | text | Chave secreta de teste (criptografada) |
| stripe_live_publishable_key | text | Chave publica de producao |
| stripe_live_secret_key | text | Chave secreta de producao (criptografada) |
| stripe_webhook_secret | text | Segredo do webhook Stripe |
| default_trial_days | integer | Dias padrao de trial (default: 14) |
| professional_plan_price | numeric | Preco do plano Profissional |
| elite_plan_price | numeric | Preco do plano Elite |
| empire_plan_price | numeric | Preco do plano Empire |
| maintenance_mode | boolean | Se o sistema esta em manutencao |
| maintenance_message | text | Mensagem de manutencao |
| updated_at | timestamptz | Ultima atualizacao |
| updated_by | uuid | Quem atualizou |

RLS: Apenas super_admin pode ler/escrever.

### 2.2 Tabela `page_visits` (Rastreamento de Leads)

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | uuid | PK |
| visited_at | timestamptz | Data/hora da visita |
| page_path | text | URL visitada |
| referrer | text | De onde veio |
| user_agent | text | Navegador |
| ip_hash | text | Hash do IP (anonimizado) |
| session_id | text | ID da sessao |

RLS: Super admin pode ler, qualquer um pode inserir (anonimo).

### 2.3 Tabela `feedbacks`

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | uuid | PK |
| company_id | uuid | FK para company |
| user_id | uuid | Quem enviou |
| type | text | 'feedback', 'bug', 'suggestion' |
| message | text | Conteudo |
| status | text | 'pending', 'in_progress', 'resolved' |
| priority | text | 'low', 'medium', 'high' |
| admin_notes | text | Notas do admin |
| created_at | timestamptz | Criacao |
| resolved_at | timestamptz | Quando resolvido |

RLS: Usuarios inserem e veem os seus; Super admin ve todos.

### 2.4 Alteracoes na Tabela `companies`

Adicionar colunas para gestao SaaS:

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| plan_status | text | 'trial', 'active', 'cancelled', 'overdue' |
| plan_type | text | 'professional', 'elite', 'empire' |
| trial_ends_at | timestamptz | Fim do trial |
| last_login_at | timestamptz | Ultimo acesso do dono |
| signup_source | text | 'google', 'instagram', 'referral', 'organic' |
| monthly_price | numeric | Valor do plano |
| is_blocked | boolean | Se esta bloqueado |
| stripe_customer_id | text | ID do cliente no Stripe |
| stripe_subscription_id | text | ID da assinatura no Stripe |

RLS adicional: Super admin pode ler todas as companies.

---

## 3. Frontend - Estrutura de Arquivos

```text
src/
  components/
    auth/
      SuperAdminGuard.tsx        -- Guard de protecao
    admin/
      AdminLayout.tsx            -- Layout com sidebar diferenciado
      AdminSidebar.tsx           -- Menu lateral cor distinta (slate-800)
      KPICard.tsx                -- Cards de metricas
      CompaniesTable.tsx         -- Tabela de barbearias
      CompanyActionsDropdown.tsx -- Acoes: bloquear, estender, etc
      CompanyDetailsModal.tsx    -- Modal com detalhes completos
      ConversionChart.tsx        -- Grafico visitantes x cadastros
      FeedbacksTable.tsx         -- Lista de feedbacks
      FeedbackDetailsModal.tsx   -- Detalhes do feedback
      StripeSettingsCard.tsx     -- Config do Stripe
      PlanPricingCard.tsx        -- Config de precos
      MaintenanceCard.tsx        -- Modo manutencao
    feedback/
      FeedbackButton.tsx         -- Botao flutuante no dashboard
      FeedbackFormModal.tsx      -- Modal para enviar feedback
  pages/
    admin/
      AdminDashboard.tsx         -- Overview com KPIs
      AdminCompanies.tsx         -- Gestao de barbearias
      AdminFeedbacks.tsx         -- Central de feedbacks
      AdminSettings.tsx          -- Configuracoes (Stripe, precos, etc)
  hooks/
    useAdminStats.ts             -- Metricas globais
    useAdminCompanies.ts         -- CRUD companies para admin
    useAdminFeedbacks.ts         -- Gestao de feedbacks
    useSaasSettings.ts           -- Config do SaaS (Stripe, precos)
    useFeedback.ts               -- Envio de feedback pelo usuario
    usePageTracking.ts           -- Registra visitas na landing
    useSuperAdmin.ts             -- Verifica se e super admin
```

---

## 4. Rotas

```text
/admin                  -- Dashboard Overview
/admin/companies        -- Gestao de Barbearias  
/admin/feedbacks        -- Central de Feedbacks
/admin/settings         -- Configuracoes (Stripe, precos, manutencao)
```

Todas protegidas pelo `SuperAdminGuard`.

---

## 5. Pagina de Configuracoes do Admin (`/admin/settings`)

### 5.1 Card: Gateway de Pagamento (Stripe)

```text
+--------------------------------------------------+
|  Gateway de Pagamento - Stripe                   |
+--------------------------------------------------+
|  Modo:  ( ) Teste   (x) Producao                 |
|                                                  |
|  Chaves de Teste:                                |
|  Publishable Key: [pk_test_...]                  |
|  Secret Key:      [sk_test_...] (oculto)         |
|                                                  |
|  Chaves de Producao:                             |
|  Publishable Key: [pk_live_...]                  |
|  Secret Key:      [sk_live_...] (oculto)         |
|                                                  |
|  Webhook Secret:  [whsec_...]                    |
|                                                  |
|  Status: [!] Conectado / Desconectado            |
|                                                  |
|  [ Testar Conexao ]  [ Salvar ]                  |
+--------------------------------------------------+
```

### 5.2 Card: Precos dos Planos

```text
+--------------------------------------------------+
|  Precos dos Planos                               |
+--------------------------------------------------+
|  Trial Padrao: [14] dias                         |
|                                                  |
|  Profissional:  R$ [149,90] /mes                 |
|  Elite:         R$ [249,90] /mes                 |
|  Empire:        R$ [449,90] /mes                 |
|                                                  |
|  [ Salvar Precos ]                               |
+--------------------------------------------------+
```

### 5.3 Card: Modo Manutencao

```text
+--------------------------------------------------+
|  Modo Manutencao                                 |
+--------------------------------------------------+
|  [x] Ativar modo manutencao                      |
|                                                  |
|  Mensagem:                                       |
|  [Estamos em manutencao. Voltamos em breve!]     |
|                                                  |
|  [ Salvar ]                                      |
+--------------------------------------------------+
```

---

## 6. Dashboard Admin (Overview)

### KPIs no Topo

```text
+------------------+  +------------------+  +------------------+  +------------------+
| Barbearias       |  | MRR Estimado     |  | Novos Cadastros  |  | Status Pgto      |
| Ativas           |  |                  |  | (30 dias)        |  |                  |
|        24        |  |    R$ 4.800      |  |        8         |  | 20 ok / 4 atraso |
+------------------+  +------------------+  +------------------+  +------------------+
```

### Grafico de Conversao

Linha mostrando "Visitantes vs Cadastros" nos ultimos 30 dias usando Recharts.

---

## 7. Gestao de Barbearias

### Tabela com Colunas

| Barbearia | Dono | Plano | Status | Ultimo Login | Acoes |
|-----------|------|-------|--------|--------------|-------|
| Barber King | Joao Silva | Elite | Ativo | 2h atras | [...] |
| Style Cut | Maria... | Prof | Trial (5d) | 3 dias | [...] |

### Acoes Disponiveis (Dropdown)

- **Bloquear Acesso**: Define `is_blocked = true`
- **Desbloquear**: Define `is_blocked = false`
- **Estender Trial**: Adiciona dias ao `trial_ends_at`
- **Alterar Plano**: Muda o `plan_type`
- **Ver Detalhes**: Modal com info completa
- **Cancelar Assinatura**: Cancela no Stripe e atualiza status

---

## 8. Rastreamento de Visitas

### Hook usePageTracking

Chamado no `LandingPage.tsx` via `useEffect`:
- Registra path, referrer, user agent
- Gera session_id unico
- IP hasheado para privacidade (ou omitido)

### Grafico no Dashboard

Recharts LineChart com duas series:
- Visitantes unicos por dia (page_visits)
- Cadastros por dia (companies.created_at)
- Taxa de conversao calculada

---

## 9. Central de Feedback

### Botao Flutuante no Dashboard

Botao fixo no canto inferior direito:
- Icone de mensagem/bug
- Abre modal para enviar feedback

### Modal de Feedback

```text
+--------------------------------+
|  Enviar Feedback               |
+--------------------------------+
|  Tipo:                         |
|  ( ) Feedback  ( ) Bug         |
|  ( ) Sugestao                  |
|                                |
|  Mensagem:                     |
|  [                           ] |
|  [                           ] |
|                                |
|  [ Cancelar ]  [ Enviar ]      |
+--------------------------------+
```

### Painel Admin - Aba Feedbacks

Tabela com filtros por status e tipo:

| Data | Barbearia | Tipo | Mensagem | Status | Prioridade | Acoes |
|------|-----------|------|----------|--------|------------|-------|

Acoes: Definir prioridade, Marcar "Em Analise", "Resolvido", Adicionar notas.

---

## 10. Design Diferenciado

### Sidebar Admin

- Background: `#1e293b` (slate-800) ao inves do padrao
- Accent: Azul (`blue-500`) ao inves de dourado
- Logo com badge "Admin" ou icone de escudo

### Itens do Menu Admin

- Dashboard (Home icon)
- Barbearias (Building2 icon)
- Feedbacks (MessageSquare icon)
- Configuracoes (Settings icon)

---

## 11. Arquivos a Criar/Modificar

| Arquivo | Acao |
|---------|------|
| Migracao SQL | Criar tabelas, alterar companies, enum |
| `src/hooks/useSuperAdmin.ts` | Criar - verifica role |
| `src/components/auth/SuperAdminGuard.tsx` | Criar |
| `src/components/admin/AdminLayout.tsx` | Criar |
| `src/components/admin/AdminSidebar.tsx` | Criar |
| `src/components/admin/KPICard.tsx` | Criar |
| `src/components/admin/CompaniesTable.tsx` | Criar |
| `src/components/admin/CompanyActionsDropdown.tsx` | Criar |
| `src/components/admin/CompanyDetailsModal.tsx` | Criar |
| `src/components/admin/ConversionChart.tsx` | Criar |
| `src/components/admin/FeedbacksTable.tsx` | Criar |
| `src/components/admin/FeedbackDetailsModal.tsx` | Criar |
| `src/components/admin/StripeSettingsCard.tsx` | Criar |
| `src/components/admin/PlanPricingCard.tsx` | Criar |
| `src/components/admin/MaintenanceCard.tsx` | Criar |
| `src/components/feedback/FeedbackButton.tsx` | Criar |
| `src/components/feedback/FeedbackFormModal.tsx` | Criar |
| `src/pages/admin/AdminDashboard.tsx` | Criar |
| `src/pages/admin/AdminCompanies.tsx` | Criar |
| `src/pages/admin/AdminFeedbacks.tsx` | Criar |
| `src/pages/admin/AdminSettings.tsx` | Criar |
| `src/hooks/useAdminStats.ts` | Criar |
| `src/hooks/useAdminCompanies.ts` | Criar |
| `src/hooks/useAdminFeedbacks.ts` | Criar |
| `src/hooks/useSaasSettings.ts` | Criar |
| `src/hooks/useFeedback.ts` | Criar |
| `src/hooks/usePageTracking.ts` | Criar |
| `src/App.tsx` | Adicionar rotas /admin/* |
| `src/pages/LandingPage.tsx` | Adicionar tracking |
| `src/components/layout/DashboardLayout.tsx` | Adicionar botao feedback |

---

## 12. Detalhes Tecnicos

### Migracao SQL Completa

```sql
-- 1. Adicionar super_admin ao enum
ALTER TYPE public.app_role ADD VALUE 'super_admin';

-- 2. Funcao is_super_admin
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'super_admin'
  )
$$;

-- 3. Tabela saas_settings (configuracoes globais)
CREATE TABLE public.saas_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_mode TEXT DEFAULT 'test',
  stripe_test_publishable_key TEXT,
  stripe_test_secret_key TEXT,
  stripe_live_publishable_key TEXT,
  stripe_live_secret_key TEXT,
  stripe_webhook_secret TEXT,
  default_trial_days INTEGER DEFAULT 14,
  professional_plan_price NUMERIC DEFAULT 149.90,
  elite_plan_price NUMERIC DEFAULT 249.90,
  empire_plan_price NUMERIC DEFAULT 449.90,
  maintenance_mode BOOLEAN DEFAULT false,
  maintenance_message TEXT,
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);

ALTER TABLE public.saas_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Super admin full access on saas_settings"
  ON public.saas_settings FOR ALL
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- 4. Tabela page_visits
CREATE TABLE public.page_visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visited_at TIMESTAMPTZ DEFAULT now(),
  page_path TEXT NOT NULL,
  referrer TEXT,
  user_agent TEXT,
  ip_hash TEXT,
  session_id TEXT
);

ALTER TABLE public.page_visits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Super admin can read visits"
  ON public.page_visits FOR SELECT
  USING (is_super_admin());
CREATE POLICY "Anyone can insert visits"
  ON public.page_visits FOR INSERT
  WITH CHECK (true);

-- 5. Tabela feedbacks
CREATE TABLE public.feedbacks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id),
  user_id UUID NOT NULL,
  type TEXT NOT NULL DEFAULT 'feedback',
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  priority TEXT DEFAULT 'medium',
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

ALTER TABLE public.feedbacks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can create feedbacks"
  ON public.feedbacks FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view own feedbacks"
  ON public.feedbacks FOR SELECT
  USING (auth.uid() = user_id OR is_super_admin());
CREATE POLICY "Super admin can update feedbacks"
  ON public.feedbacks FOR UPDATE
  USING (is_super_admin());

-- 6. Colunas extras em companies
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS plan_status TEXT DEFAULT 'trial',
  ADD COLUMN IF NOT EXISTS plan_type TEXT DEFAULT 'professional',
  ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ DEFAULT (now() + interval '14 days'),
  ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS signup_source TEXT,
  ADD COLUMN IF NOT EXISTS monthly_price NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;

-- 7. Policy super admin para companies (adicional)
CREATE POLICY "Super admin can read all companies"
  ON public.companies FOR SELECT
  USING (is_super_admin());

CREATE POLICY "Super admin can update all companies"
  ON public.companies FOR UPDATE
  USING (is_super_admin());

-- 8. Inserir registro inicial em saas_settings
INSERT INTO public.saas_settings (id) VALUES (gen_random_uuid());
```

### Hook useSaasSettings

```typescript
// Busca e atualiza configuracoes do SaaS
// Inclui chaves Stripe, precos, modo manutencao
// Apenas super admin pode acessar
```

### Integracao Stripe

Quando o usuario configurar as chaves do Stripe:
1. Chaves secretas sao armazenadas na tabela `saas_settings`
2. Para producao real, podemos mover para Supabase Secrets
3. Edge function para validar checkout e webhooks
4. Webhooks do Stripe atualizam `plan_status` e `stripe_subscription_id`

---

## 13. Fluxo de Uso

```text
Usuario comum:
  Landing Page --[tracking]--> page_visits
  Dashboard --[feedback btn]--> feedbacks

Super Admin:
  /admin --> Ve KPIs globais
  /admin/companies --> Gerencia todas as barbearias
  /admin/feedbacks --> Le e responde feedbacks
  /admin/settings --> Configura Stripe, precos, manutencao
```

---

## 14. Proximos Passos Apos Implementacao

1. **Atribuir role super_admin**: Executar SQL para adicionar seu usuario:
   ```sql
   INSERT INTO public.user_roles (user_id, role)
   VALUES ('SEU_USER_ID', 'super_admin');
   ```

2. **Configurar Webhooks Stripe**: Criar edge function para receber eventos

3. **Automatizar cobrancas**: Integrar checkout do Stripe com planos

---

## Resultado Esperado

Apos implementacao:
- Rota `/admin` protegida apenas para super_admin
- Dashboard com visao global do SaaS
- Tabela para gerenciar todas as barbearias
- Rastreamento de visitas na landing
- Sistema de feedback integrado
- **Configuracoes de Stripe (modo teste/producao, chaves, precos)**
- Visual diferenciado (slate-800 sidebar) para area admin

