# NEXO

Sistema desktop para **Gestão de Produtos** e **Controle de Estoque em Consignações/Localizações**.

Stack: **Electron** · **Vue 3** · **Vuetify 3** · **Pinia** · **Vite** · persistência local em JSON (via IPC no Main Process).

---

## Pré-requisitos

1. **Node.js 20 LTS (ou superior)** — [https://nodejs.org](https://nodejs.org)
2. **npm** (já vem com o Node)
3. Windows 10/11 (x64) para gerar o instalador `.exe`
4. Para o build do Electron no Windows, o `electron-builder` baixa as ferramentas necessárias na primeira execução (pode pedir permissão de rede)

Opcional, mas recomendado:

- Git
- Visual Studio Build Tools (somente se no futuro você trocar o storage por módulos nativos como `better-sqlite3`)

---

## Instalação

No PowerShell, na pasta do projeto:

```powershell
cd C:\Users\verru\nexo-app
npm install
```

---

## Desenvolvimento

```powershell
npm run dev
```

Isso sobe o Vite + abre a janela Electron. Na primeira execução, se o armazenamento local estiver vazio, o sistema carrega automaticamente `src/data/initialSeed.json` (dados das planilhas LUME e Consignações).

Os dados ficam em:

`%APPDATA%\nexo-app\nexo\store.json`

(ou pasta equivalente do `userData` do Electron)

---

## Telas

### Produtos
- Tabela com busca, ordenação e filtro por categoria
- Cadastro/edição com cálculo automático de **Lucro** (`preço loja − custo`)
- Exclusão e exportação CSV/JSON

### Consignações
- Abas dinâmicas por localização (ex.: Bar 25 de Julho, Mercado Schoulten)
- Gerenciar pontos (criar / editar / excluir)
- Vincular produtos do catálogo
- Ações rápidas de Entrega, Saída e Reposição
- **Em estoque** = `entregue + reposição − saídas`
- KPIs: entregues, saídas, estoque, valor a receber e venda estimada

---

## Compilar o instalador `.exe` (Windows / NSIS)

1. Garanta que a instalação de dependências está ok:

```powershell
npm install
```

2. Gere o build de produção e o instalador:

```powershell
npm run build
```

O que acontece:

1. `vite build` gera o frontend em `dist/` e o Main/Preload em `dist-electron/`
2. `electron-builder --win nsis` empacota o app e cria o instalador NSIS

3. Artefato gerado em:

```text
release\NEXO-Setup-1.0.0.exe
```

### Apenas pasta portable (sem instalador)

```powershell
npm run build:dir
```

Saída em `release\win-unpacked\`.

---

## Estrutura do projeto

```text
nexo-app/
├── package.json
├── electron-builder.json5
├── vite.config.js
├── index.html
├── src/
│   ├── main/
│   │   ├── index.js
│   │   ├── ipcHandlers.js
│   │   └── database.js
│   ├── data/
│   │   └── initialSeed.json
│   ├── preload/
│   │   └── index.js
│   └── renderer/
│       ├── main.js
│       ├── App.vue
│       ├── router.js
│       ├── components/
│       ├── stores/
│       └── views/
└── README.md
```

---

## Segurança Electron

- `contextIsolation: true`
- `nodeIntegration: false`
- Bridge IPC apenas via `preload` (`window.nexoApi`)

---

## Resetar dados locais

Feche o NEXO e apague:

```text
%APPDATA%\nexo-app\nexo\store.json
```

Na próxima abertura, o seed inicial será carregado novamente.
