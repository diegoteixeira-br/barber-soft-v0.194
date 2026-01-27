
# Mover Chat de Suporte para o Menu Lateral

## O Que Será Feito

Remover o botão flutuante do chat e adicionar um item no menu principal do sidebar, logo abaixo de "Configurações".

## Mudanças Planejadas

### 1. AppSidebar.tsx

Adicionar novo item no menu:

```text
Antes:
  - Dashboard
  - Agenda
  - ...
  - Unidades
  - Configurações  ← último item

Depois:
  - Dashboard
  - Agenda
  - ...
  - Unidades
  - Configurações
  - Suporte 24h    ← novo item (ícone: MessageCircle ou HeadphonesIcon)
```

O item de suporte vai:
- Ter ícone de headphones/chat
- Exibir "Suporte 24h" como texto
- Ao clicar, abrir o modal/drawer do chat (não navegar para outra página)

### 2. SupportChatWidget.tsx

Modificar para:
- Remover o botão flutuante completamente
- Receber uma prop `isOpen` controlada pelo sidebar
- Exportar função para controlar abertura/fechamento

### 3. DashboardLayout.tsx

Ajustar para:
- Gerenciar estado de abertura do chat
- Passar estado para o AppSidebar e SupportChatWidget

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/components/layout/AppSidebar.tsx` | Adicionar item "Suporte 24h" no menu, com onClick para abrir chat |
| `src/components/support/SupportChatWidget.tsx` | Remover botão flutuante, receber props de controle |
| `src/components/layout/DashboardLayout.tsx` | Gerenciar estado global do chat |

## Fluxo Técnico

```text
DashboardLayout
  ├── isChatOpen state
  ├── AppSidebar (recebe onOpenChat)
  │     └── Item "Suporte 24h" → onClick chama onOpenChat()
  └── SupportChatWidget (recebe isOpen, onClose)
        └── Exibe chat apenas quando isOpen=true
```

## Visual no Menu

O item terá a mesma aparência dos outros itens do menu:
- Ícone `MessageCircle` ou `HeadphonesIcon` do lucide-react
- Texto "Suporte 24h"
- Hover com fundo secundário
- Destaque dourado quando chat está aberto

## Resultado

- Menu lateral limpo e organizado
- Chat acessível de forma intuitiva no mesmo local que outras ferramentas
- Nenhum botão flutuante cobrindo conteúdo
- Experiência consistente com o resto do sistema
