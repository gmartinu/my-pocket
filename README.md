# 💰 App Controle Financeiro

App mobile para controle de gastos mensais com workspaces compartilháveis. Feito para casal gerenciar finanças de forma independente ou conjunta.

## 🎯 Objetivo

Replicar sistema de planilha para controle de:
- Despesas fixas e variáveis (com status pago/não pago)
- Cartões de crédito com parcelas
- Projeção de saldo para próximos meses
- Workspaces independentes e compartilháveis

## 🛠️ Stack

- **Frontend**: React Native (Expo)
- **Backend**: Firebase (Auth + Firestore)
- **Navegação**: React Navigation
- **State**: Context API + React Hooks
- **UI**: React Native Paper ou NativeWind (Tailwind)
- **Formulários**: React Hook Form (opcional)

## 🏗️ Arquitetura Firebase

### Firestore Structure
```
/users/{userId}
  - name: string
  - email: string
  - workspaces: string[]
  - activeWorkspace: string
  - createdAt: timestamp

/workspaces/{workspaceId}
  - name: string
  - owner: userId
  - members: [{userId, role}]
  - createdAt: timestamp
  
  /months/{monthId}  // monthId = "2025-10"
    - nome: string
    - ano: number
    - mes: number
    - saldoInicial: number
    - despesas: [
        {
          id: string,
          nome: string,
          valorPlanejado: string | number,
          pago: boolean,
          valorCalculado: number
        }
      ]
    - cartoes: [
        {
          id: string,
          nome: string,
          limiteTotal: number,
          compras: [
            {
              id: string,
              descricao: string,
              valorTotal: number,
              parcelaAtual: number,
              parcelasTotal: number,
              marcado: boolean
            }
          ]
        }
      ]
    - totalDespesas: number
    - totalCartoes: number
    - sobra: number
    - updatedAt: timestamp
```

### Security Rules
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth.uid == userId;
    }
    
    match /workspaces/{workspaceId} {
      function isMember() {
        return request.auth.uid in resource.data.members[0].userId;
      }
      
      allow read: if request.auth != null && isMember();
      allow write: if request.auth != null && isMember();
      
      match /months/{monthId} {
        allow read, write: if request.auth != null && 
          get(/databases/$(database)/documents/workspaces/$(workspaceId)).data.members[0].userId == request.auth.uid;
      }
    }
  }
}
```

## 📁 Estrutura de Pastas

```
src/
├── config/
│   └── firebase.js              # Configuração Firebase
├── contexts/
│   ├── AuthContext.js           # Autenticação
│   └── WorkspaceContext.js      # Workspace ativo
├── screens/
│   ├── auth/
│   │   ├── LoginScreen.js
│   │   └── RegisterScreen.js
│   ├── dashboard/
│   │   └── DashboardScreen.js   # Tela principal com resumo
│   ├── despesas/
│   │   ├── DespesasScreen.js
│   │   └── DespesaFormModal.js
│   ├── cartoes/
│   │   ├── CartoesScreen.js
│   │   └── CompraFormModal.js
│   ├── workspaces/
│   │   ├── WorkspacesScreen.js
│   │   └── ShareWorkspaceModal.js
│   └── settings/
│       └── SettingsScreen.js
├── components/
│   ├── DespesaCard.js
│   ├── CartaoCard.js
│   ├── MonthSelector.js
│   └── WorkspaceSelector.js
├── hooks/
│   ├── useAuth.js
│   ├── useWorkspace.js
│   └── useMonth.js
├── utils/
│   ├── calculations.js          # Cálculos (fórmulas, totais)
│   └── validators.js
└── navigation/
    ├── AppNavigator.js
    └── AuthNavigator.js
```

## 🚀 Fases de Desenvolvimento

### **FASE 1: Setup e Autenticação** 
**Objetivo**: Projeto rodando com login funcional

**Tarefas**:
- [ ] Criar projeto Expo com TypeScript (opcional)
- [ ] Configurar Firebase (Auth + Firestore)
- [ ] Criar telas de Login/Registro
- [ ] Implementar AuthContext
- [ ] Navegação básica (Auth vs App)

**Entregável**: Login com email/senha funcionando

---

### **FASE 2: Workspaces Base**
**Objetivo**: Criar e listar workspaces

**Tarefas**:
- [ ] WorkspaceContext
- [ ] Tela de listagem de workspaces
- [ ] Criar novo workspace (automático no primeiro login)
- [ ] Selecionar workspace ativo
- [ ] Firestore: CRUD de workspaces

**Entregável**: Usuário pode ter múltiplos workspaces

---

### **FASE 3: Meses e Dashboard**
**Objetivo**: Dashboard com resumo mensal

**Tarefas**:
- [ ] useMonth hook (criar, buscar, atualizar mês)
- [ ] DashboardScreen com resumo:
  - Saldo disponível
  - Total despesas
  - Sobra prevista
  - Projeção próximos meses
- [ ] MonthSelector (navegar entre meses)
- [ ] Criar mês se não existir

**Entregável**: Dashboard mostrando resumo do mês atual

---

### **FASE 4: Despesas CRUD**
**Objetivo**: Adicionar, editar e marcar despesas

**Tarefas**:
- [ ] DespesasScreen (lista)
- [ ] DespesaCard com toggle pago/não pago
- [ ] DespesaFormModal (adicionar/editar)
- [ ] Suporte a fórmulas simples (475.11/2+650)
- [ ] Cálculo automático de totais
- [ ] Excluir despesa (swipe)

**Entregável**: CRUD completo de despesas funcionando

---

### **FASE 5: Cartões de Crédito**
**Objetivo**: Gerenciar cartões e compras parceladas

**Tarefas**:
- [ ] CartoesScreen (lista de cartões)
- [ ] CartaoCard (expandir/colapsar compras)
- [ ] CompraFormModal (adicionar compra parcelada)
- [ ] Cálculo de parcela automático
- [ ] Total da fatura por cartão
- [ ] Editar/Excluir compra

**Entregável**: Sistema de cartões completo

---

### **FASE 6: Compartilhamento**
**Objetivo**: Compartilhar workspace entre usuários

**Tarefas**:
- [ ] ShareWorkspaceModal
- [ ] Buscar usuário por email
- [ ] Adicionar membro ao workspace
- [ ] Definir roles (owner/editor/viewer)
- [ ] Atualizar security rules
- [ ] Notificação de compartilhamento (opcional)

**Entregável**: Gabriel pode compartilhar com Eloane

---

### **FASE 7: Sincronização em Tempo Real**
**Objetivo**: Updates automáticos entre dispositivos

**Tarefas**:
- [ ] Implementar onSnapshot no useMonth
- [ ] Listener de mudanças no workspace ativo
- [ ] Feedback visual de sincronização
- [ ] Resolver conflitos (last-write-wins)

**Entregável**: Mudanças aparecem em tempo real

---

### **FASE 8: Polimento e Extras**
**Objetivo**: UX melhorada e features extras

**Tarefas**:
- [ ] Tela de configurações do mês (editar saldo inicial)
- [ ] Histórico de meses anteriores (read-only ou editável)
- [ ] Gráficos (opcional - Victory Native)
- [ ] Dark mode
- [ ] Exportar mês como PDF (opcional)
- [ ] Cache offline (AsyncStorage)
- [ ] Loading states e error handling
- [ ] Animações (Reanimated)

**Entregável**: App polido e pronto pra uso

---

## 🔧 Setup Inicial

### 1. Criar projeto
```bash
npx create-expo-app@latest controle-financeiro --template blank
cd controle-financeiro
```

### 2. Instalar dependências
```bash
# Firebase
npx expo install firebase

# Navegação
npx expo install @react-navigation/native @react-navigation/native-stack @react-navigation/bottom-tabs
npx expo install react-native-screens react-native-safe-area-context

# UI (escolher uma)
npx expo install react-native-paper react-native-vector-icons
# OU
npx expo install nativewind tailwindcss
```

### 3. Configurar Firebase
1. Criar projeto no [Firebase Console](https://console.firebase.google.com)
2. Adicionar app Web
3. Habilitar Authentication (Email/Password e Google)
4. Criar Firestore Database
5. Copiar config para `src/config/firebase.js`

### 4. Estrutura base do firebase.js
```javascript
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "...",
  authDomain: "...",
  projectId: "...",
  storageBucket: "...",
  messagingSenderId: "...",
  appId: "..."
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
```

## 📱 Fluxos Principais

### Login → Dashboard
```
LoginScreen 
  → AuthContext.login()
  → Firebase Auth
  → Criar/Buscar workspace padrão
  → WorkspaceContext.setActive()
  → DashboardScreen
```

### Adicionar Despesa
```
DashboardScreen 
  → "Adicionar Despesa"
  → DespesaFormModal
  → useMonth.addDespesa()
  → Firestore update
  → Listener atualiza UI
```

### Toggle Pago/Não Pago
```
DespesaCard
  → onToggle()
  → useMonth.updateDespesa(id, {pago: !pago})
  → Recalcula totais
  → Firestore update
  → UI atualiza
```

## 🎨 Decisões de Design

### Cores Sugeridas
- ✅ Verde (#10B981): Positivo, pago, sobra
- ❌ Vermelho (#EF4444): Negativo, pendente, alerta
- 🔵 Azul (#3B82F6): Neutro, informação
- ⚪ Cinza (#6B7280): Desabilitado, não pago

### Componentes Principais
1. **DespesaCard**: Swipeable, toggle visual, valor destacado
2. **CartaoCard**: Accordion com lista de compras, barra de limite
3. **MonthSelector**: Horizontal scroll ou dropdown
4. **WorkspaceSelector**: Dropdown no header

## 📊 Cálculos Importantes

### Total de Despesas
```javascript
const calcularTotalDespesas = (despesas) => {
  return despesas
    .filter(d => d.pago)
    .reduce((sum, d) => sum + d.valorCalculado, 0);
};
```

### Avaliar Fórmula
```javascript
const avaliarFormula = (valor) => {
  if (typeof valor === 'number') return valor;
  try {
    // Remove espaços e avalia expressão segura
    return Function('"use strict"; return (' + valor + ')')();
  } catch {
    return 0;
  }
};
```

### Sobra do Mês
```javascript
const sobra = saldoInicial - totalDespesas - totalCartoes;
```

### Projeção Próximos Meses
```javascript
// Sobra do mês atual vira saldo inicial do próximo
proximoMes.saldoInicial = mesAtual.sobra;
```

## 🔐 Segurança

- ✅ Nunca expor Firebase config em repositório público
- ✅ Usar variáveis de ambiente (expo-constants)
- ✅ Validar inputs antes de salvar
- ✅ Security rules do Firestore restritivas
- ✅ Sanitizar fórmulas antes de avaliar

## 📝 Convenções

- Componentes em PascalCase
- Hooks com prefixo `use`
- Contextos com sufixo `Context`
- Constantes em UPPER_SNAKE_CASE
- Async functions com try/catch
- Loading e error states sempre

## 🐛 Debug

```javascript
// Habilitar logs Firebase
import { setLogLevel } from 'firebase/firestore';
setLogLevel('debug');

// React Native Debugger
// CMD+D (iOS) / CMD+M (Android) → Debug
```

## 📚 Recursos

- [Expo Docs](https://docs.expo.dev)
- [Firebase Docs](https://firebase.google.com/docs)
- [React Navigation](https://reactnavigation.org)
- [React Native Paper](https://callstack.github.io/react-native-paper/)

## 🚢 Deploy

```bash
# Build Android
eas build --platform android

# Build iOS
eas build --platform ios

# Publicar update OTA
eas update --branch production
```

---

**Criado para uso pessoal de Gabriel e Eloane** 💚
