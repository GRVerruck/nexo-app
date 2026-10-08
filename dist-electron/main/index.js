"use strict";
const electron = require("electron");
const node_path = require("node:path");
const node_fs = require("node:fs");
const node_crypto = require("node:crypto");
function esc(value) {
  return String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function money(v) {
  return Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function buildConsignmentHtml(location) {
  const items = location.items || [];
  const totalEntregue = items.reduce((s, i) => s + (Number(i.entregue) || 0), 0);
  const totalSaidas = items.reduce((s, i) => s + (Number(i.saidas) || 0), 0);
  const totalEstoque = items.reduce((s, i) => s + (Number(i.em_estoque) || 0), 0);
  const aReceber = items.reduce(
    (s, i) => s + (Number(i.saidas) || 0) * (Number(i.preco_lojista) || 0),
    0
  );
  const vendaEstimada = items.reduce(
    (s, i) => s + (Number(i.em_estoque) || 0) * (Number(i.preco_sugerido) || 0),
    0
  );
  const rows = items.map(
    (i) => `
      <tr>
        <td>${esc(i.codigo)}</td>
        <td>${esc(i.produto_nome)}</td>
        <td class="n">${esc(i.entregue)}</td>
        <td class="n">${esc(i.reposicao)}</td>
        <td class="n">${esc(i.saidas)}</td>
        <td class="n">${esc(i.em_estoque)}</td>
        <td class="n">${money(i.preco_lojista)}</td>
        <td class="n">${money(i.preco_sugerido)}</td>
      </tr>`
  ).join("");
  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<style>
  body { font-family: Arial, Helvetica, sans-serif; color: #222; background: #fff; font-size: 12px; margin: 0; }
  h1 { font-size: 18px; margin: 0 0 8px; }
  .info { margin-bottom: 16px; line-height: 1.5; }
  table { width: 100%; border-collapse: collapse; }
  th, td { border: 1px solid #ccc; padding: 5px 6px; text-align: left; }
  th { background: #f0f0f0; }
  .n { text-align: right; white-space: nowrap; }
  .totais { margin-top: 16px; width: 50%; margin-left: auto; }
  .totais td:first-child { font-weight: bold; }
</style>
</head>
<body>
  <h1>Maeli Studio 3D — Relatório de Consignação</h1>
  <div class="info">
    <div><strong>Localização:</strong> ${esc(location.nome)}</div>
    <div><strong>Endereço:</strong> ${esc(location.endereco) || "-"}</div>
    <div><strong>Contato:</strong> ${esc(location.contato) || "-"}</div>
    <div><strong>Emissão:</strong> ${(/* @__PURE__ */ new Date()).toLocaleDateString("pt-BR")}</div>
  </div>
  <table>
    <thead>
      <tr>
        <th>Código</th>
        <th>Produto</th>
        <th class="n">Entregue</th>
        <th class="n">Reposição</th>
        <th class="n">Saídas</th>
        <th class="n">Em Estoque</th>
        <th class="n">Preço Lojista</th>
        <th class="n">Preço Sugerido</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
  <table class="totais">
    <tr><td>Total entregue</td><td class="n">${totalEntregue}</td></tr>
    <tr><td>Total de saídas</td><td class="n">${totalSaidas}</td></tr>
    <tr><td>Total em estoque</td><td class="n">${totalEstoque}</td></tr>
    <tr><td>A Receber</td><td class="n">${money(aReceber)}</td></tr>
    <tr><td>Venda Estimada</td><td class="n">${money(vendaEstimada)}</td></tr>
  </table>
</body>
</html>`;
}
async function renderPdf(html) {
  const win = new electron.BrowserWindow({ show: false });
  try {
    await win.loadURL("data:text/html;charset=utf-8," + encodeURIComponent(html));
    return await win.webContents.printToPDF({ pageSize: "A4", printBackground: true });
  } finally {
    win.destroy();
  }
}
let dbPath = null;
let cache = null;
function round2(n) {
  return Math.round((Number(n) || 0) * 100) / 100;
}
function calcStock(item) {
  const entregue = Number(item.entregue) || 0;
  const reposicao = Number(item.reposicao) || 0;
  const saidas = Number(item.saidas) || 0;
  return entregue + reposicao - saidas;
}
function calcLucro(product) {
  return round2((Number(product.preco_loja) || 0) - (Number(product.custo) || 0));
}
function resolveSeedPath() {
  const candidates = [
    node_path.join(process.resourcesPath || "", "data", "initialSeed.json"),
    node_path.join(electron.app.getAppPath(), "src", "data", "initialSeed.json"),
    node_path.join(electron.app.getAppPath(), "data", "initialSeed.json"),
    node_path.join(process.cwd(), "src", "data", "initialSeed.json")
  ];
  return candidates.find((p) => p && node_fs.existsSync(p)) || null;
}
function emptyStore() {
  return {
    version: 1,
    seeded: false,
    products: [],
    locations: []
  };
}
function loadSeed() {
  const seedPath = resolveSeedPath();
  if (!seedPath) {
    console.warn("[NEXO] Seed file not found");
    return emptyStore();
  }
  const raw = JSON.parse(node_fs.readFileSync(seedPath, "utf-8"));
  const products = (raw.products || []).map((p) => ({
    ...p,
    custo: Number(p.custo) || 0,
    preco_loja: Number(p.preco_loja) || 0,
    preco_final: Number(p.preco_final) || 0,
    lucro: calcLucro(p)
  }));
  const locations = (raw.locations || []).map((loc) => ({
    id: loc.id || node_crypto.randomUUID(),
    nome: loc.nome,
    endereco: loc.endereco || "",
    contato: loc.contato || "",
    items: (loc.items || []).map((item) => {
      const normalized = {
        id: item.id || node_crypto.randomUUID(),
        codigo: item.codigo,
        produto_nome: item.produto_nome,
        entregue: Number(item.entregue) || 0,
        saidas: Number(item.saidas) || 0,
        reposicao: Number(item.reposicao) || 0,
        preco_lojista: Number(item.preco_lojista) || 0,
        preco_sugerido: Number(item.preco_sugerido) || 0,
        data_entrega: item.data_entrega || null,
        observacoes: item.observacoes || ""
      };
      normalized.em_estoque = calcStock(normalized);
      return normalized;
    })
  }));
  return {
    version: 1,
    seeded: true,
    products,
    locations
  };
}
function persist() {
  node_fs.writeFileSync(dbPath, JSON.stringify(cache, null, 2), "utf-8");
}
function ensureLoaded() {
  if (!cache) {
    if (node_fs.existsSync(dbPath)) {
      cache = JSON.parse(node_fs.readFileSync(dbPath, "utf-8"));
    } else {
      cache = emptyStore();
    }
  }
  return cache;
}
function initDatabase() {
  const dataDir = node_path.join(electron.app.getPath("userData"), "nexo");
  if (!node_fs.existsSync(dataDir)) node_fs.mkdirSync(dataDir, { recursive: true });
  dbPath = node_path.join(dataDir, "store.json");
  if (!node_fs.existsSync(dbPath)) {
    cache = loadSeed();
    persist();
    const seedPath = resolveSeedPath();
    if (seedPath) {
      try {
        node_fs.copyFileSync(seedPath, node_path.join(dataDir, "initialSeed.backup.json"));
      } catch {
      }
    }
    console.log("[NEXO] Database initialized with seed data");
    return;
  }
  cache = JSON.parse(node_fs.readFileSync(dbPath, "utf-8"));
  const isEmpty = (!cache.products || cache.products.length === 0) && (!cache.locations || cache.locations.length === 0);
  if (isEmpty) {
    cache = loadSeed();
    persist();
    console.log("[NEXO] Empty store detected — seed applied");
  }
}
function getProducts() {
  return ensureLoaded().products;
}
function upsertProduct(payload) {
  var _a;
  const store = ensureLoaded();
  const codigo = String(payload.codigo || "").trim().toUpperCase();
  if (!codigo) throw new Error("Código é obrigatório");
  if (!((_a = payload.produto) == null ? void 0 : _a.trim())) throw new Error("Nome do produto é obrigatório");
  const product = {
    codigo,
    produto: payload.produto.trim(),
    categoria: (payload.categoria || "").trim() || "Geral",
    custo: Number(payload.custo) || 0,
    preco_loja: Number(payload.preco_loja) || 0,
    preco_final: Number(payload.preco_final) || 0,
    lucro: 0
  };
  product.lucro = calcLucro(product);
  const idx = store.products.findIndex((p) => p.codigo === codigo);
  if (idx >= 0) {
    if (payload._originalCodigo && payload._originalCodigo !== codigo) {
      const clash = store.products.find((p) => p.codigo === codigo);
      if (clash) throw new Error(`Já existe produto com código ${codigo}`);
    }
    store.products[idx] = product;
  } else {
    if (store.products.some((p) => p.codigo === codigo)) {
      throw new Error(`Já existe produto com código ${codigo}`);
    }
    store.products.push(product);
  }
  for (const loc of store.locations) {
    for (const item of loc.items) {
      if (item.codigo === codigo) {
        item.produto_nome = product.produto;
      }
    }
  }
  persist();
  return product;
}
function deleteProduct(codigo) {
  const store = ensureLoaded();
  const code = String(codigo).trim().toUpperCase();
  store.products = store.products.filter((p) => p.codigo !== code);
  for (const loc of store.locations) {
    loc.items = loc.items.filter((i) => i.codigo !== code);
  }
  persist();
  return true;
}
function getCategories() {
  const store = ensureLoaded();
  const set = /* @__PURE__ */ new Set([
    ...store.categories || [],
    ...store.products.map((p) => p.categoria).filter(Boolean)
  ]);
  return [...set].sort((a, b) => a.localeCompare(b, "pt-BR"));
}
function saveCategory({ nome, original } = {}) {
  const store = ensureLoaded();
  const name = String(nome || "").trim();
  if (!name) throw new Error("Nome da categoria é obrigatório");
  const clash = getCategories().find((c) => c.toLowerCase() === name.toLowerCase());
  if (clash && clash !== original) throw new Error(`Já existe a categoria ${clash}`);
  const list = (store.categories || []).filter((c) => c !== original);
  list.push(name);
  store.categories = list;
  if (original && original !== name) {
    for (const p of store.products) {
      if (p.categoria === original) p.categoria = name;
    }
  }
  persist();
  return name;
}
function deleteCategory(nome) {
  const store = ensureLoaded();
  const emUso = store.products.filter((p) => p.categoria === nome).length;
  if (emUso) throw new Error(`Categoria em uso por ${emUso} produto(s)`);
  store.categories = (store.categories || []).filter((c) => c !== nome);
  persist();
  return true;
}
function getLocations() {
  return ensureLoaded().locations;
}
function upsertLocation(payload) {
  var _a, _b, _c, _d, _e;
  const store = ensureLoaded();
  if (!((_a = payload.nome) == null ? void 0 : _a.trim())) throw new Error("Nome da localização é obrigatório");
  if (payload.id) {
    const idx = store.locations.findIndex((l) => l.id === payload.id);
    if (idx < 0) throw new Error("Localização não encontrada");
    store.locations[idx] = {
      ...store.locations[idx],
      nome: payload.nome.trim(),
      endereco: ((_b = payload.endereco) == null ? void 0 : _b.trim()) || "",
      contato: ((_c = payload.contato) == null ? void 0 : _c.trim()) || ""
    };
    persist();
    return store.locations[idx];
  }
  const location = {
    id: node_crypto.randomUUID(),
    nome: payload.nome.trim(),
    endereco: ((_d = payload.endereco) == null ? void 0 : _d.trim()) || "",
    contato: ((_e = payload.contato) == null ? void 0 : _e.trim()) || "",
    items: []
  };
  store.locations.push(location);
  persist();
  return location;
}
function deleteLocation(id) {
  const store = ensureLoaded();
  store.locations = store.locations.filter((l) => l.id !== id);
  persist();
  return true;
}
function linkProductToLocation(locationId, codigo, overrides = {}) {
  const store = ensureLoaded();
  const loc = store.locations.find((l) => l.id === locationId);
  if (!loc) throw new Error("Localização não encontrada");
  const code = String(codigo).trim().toUpperCase();
  const product = store.products.find((p) => p.codigo === code);
  if (!product) throw new Error("Produto não encontrado no catálogo");
  if (loc.items.some((i) => i.codigo === code)) {
    throw new Error("Produto já vinculado a esta localização");
  }
  const item = {
    id: node_crypto.randomUUID(),
    codigo: product.codigo,
    produto_nome: product.produto,
    entregue: Number(overrides.entregue) || 0,
    saidas: Number(overrides.saidas) || 0,
    reposicao: Number(overrides.reposicao) || 0,
    preco_lojista: Number(overrides.preco_lojista ?? product.preco_loja) || 0,
    preco_sugerido: Number(overrides.preco_sugerido ?? product.preco_final) || 0,
    data_entrega: overrides.data_entrega || (/* @__PURE__ */ new Date()).toISOString().slice(0, 10),
    observacoes: overrides.observacoes || ""
  };
  item.em_estoque = calcStock(item);
  loc.items.push(item);
  persist();
  return item;
}
function updateConsignmentItem(locationId, itemId, patch) {
  const store = ensureLoaded();
  const loc = store.locations.find((l) => l.id === locationId);
  if (!loc) throw new Error("Localização não encontrada");
  const item = loc.items.find((i) => i.id === itemId || i.codigo === itemId);
  if (!item) throw new Error("Item não encontrado");
  const numericFields = ["entregue", "saidas", "reposicao", "preco_lojista", "preco_sugerido"];
  for (const key of numericFields) {
    if (patch[key] !== void 0 && patch[key] !== null && patch[key] !== "") {
      item[key] = Number(patch[key]) || 0;
    }
  }
  if (patch.observacoes !== void 0) item.observacoes = String(patch.observacoes);
  if (patch.data_entrega !== void 0) item.data_entrega = patch.data_entrega;
  if (patch.produto_nome !== void 0) item.produto_nome = patch.produto_nome;
  item.em_estoque = calcStock(item);
  persist();
  return item;
}
function removeConsignmentItem(locationId, itemId) {
  const store = ensureLoaded();
  const loc = store.locations.find((l) => l.id === locationId);
  if (!loc) throw new Error("Localização não encontrada");
  loc.items = loc.items.filter((i) => i.id !== itemId && i.codigo !== itemId);
  persist();
  return true;
}
function adjustStock(locationId, itemId, { entregueDelta = 0, saidasDelta = 0, reposicaoDelta = 0 } = {}) {
  const store = ensureLoaded();
  const loc = store.locations.find((l) => l.id === locationId);
  if (!loc) throw new Error("Localização não encontrada");
  const item = loc.items.find((i) => i.id === itemId || i.codigo === itemId);
  if (!item) throw new Error("Item não encontrado");
  item.entregue = Math.max(0, (Number(item.entregue) || 0) + (Number(entregueDelta) || 0));
  item.saidas = Math.max(0, (Number(item.saidas) || 0) + (Number(saidasDelta) || 0));
  item.reposicao = Math.max(0, (Number(item.reposicao) || 0) + (Number(reposicaoDelta) || 0));
  if (entregueDelta || reposicaoDelta) {
    item.data_entrega = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
  }
  item.em_estoque = calcStock(item);
  persist();
  return item;
}
function exportCatalog(format = "json") {
  const products = getProducts();
  if (format === "csv") {
    const header = "codigo,produto,categoria,custo,preco_loja,preco_final,lucro";
    const lines = products.map(
      (p) => [p.codigo, `"${p.produto.replace(/"/g, '""')}"`, `"${p.categoria}"`, p.custo, p.preco_loja, p.preco_final, p.lucro].join(",")
    );
    return { format: "csv", content: [header, ...lines].join("\n") };
  }
  return { format: "json", content: JSON.stringify(products, null, 2) };
}
function wrap(fn) {
  return async (_event, ...args) => {
    try {
      const data = await fn(...args);
      return { ok: true, data };
    } catch (err) {
      return { ok: false, error: (err == null ? void 0 : err.message) || String(err) };
    }
  };
}
function registerIpcHandlers() {
  electron.ipcMain.handle("products:list", wrap(() => getProducts()));
  electron.ipcMain.handle("products:upsert", wrap((payload) => upsertProduct(payload)));
  electron.ipcMain.handle("products:delete", wrap((codigo) => deleteProduct(codigo)));
  electron.ipcMain.handle(
    "products:export",
    wrap(async (format) => {
      const result = exportCatalog(format);
      const filters = format === "csv" ? [{ name: "CSV", extensions: ["csv"] }] : [{ name: "JSON", extensions: ["json"] }];
      const { canceled, filePath } = await electron.dialog.showSaveDialog({
        title: "Exportar catálogo",
        defaultPath: format === "csv" ? "nexo-produtos.csv" : "nexo-produtos.json",
        filters
      });
      if (canceled || !filePath) return { canceled: true };
      node_fs.writeFileSync(filePath, result.content, "utf-8");
      return { canceled: false, filePath };
    })
  );
  electron.ipcMain.handle("categories:list", wrap(() => getCategories()));
  electron.ipcMain.handle("categories:save", wrap((payload) => saveCategory(payload)));
  electron.ipcMain.handle("categories:delete", wrap((nome) => deleteCategory(nome)));
  electron.ipcMain.handle("locations:list", wrap(() => getLocations()));
  electron.ipcMain.handle("locations:upsert", wrap((payload) => upsertLocation(payload)));
  electron.ipcMain.handle("locations:delete", wrap((id) => deleteLocation(id)));
  electron.ipcMain.handle(
    "locations:linkProduct",
    wrap(({ locationId, codigo, overrides }) => linkProductToLocation(locationId, codigo, overrides))
  );
  electron.ipcMain.handle(
    "locations:updateItem",
    wrap(({ locationId, itemId, patch }) => updateConsignmentItem(locationId, itemId, patch))
  );
  electron.ipcMain.handle(
    "locations:removeItem",
    wrap(({ locationId, itemId }) => removeConsignmentItem(locationId, itemId))
  );
  electron.ipcMain.handle(
    "locations:adjustStock",
    wrap(({ locationId, itemId, deltas }) => adjustStock(locationId, itemId, deltas))
  );
  electron.ipcMain.handle(
    "locations:exportPdf",
    wrap(async (locationId) => {
      const location = getLocations().find((l) => l.id === locationId);
      if (!location) throw new Error("Localização não encontrada");
      const safeName = location.nome.replace(/[<>:"/\\|?*\x00-\x1f]/g, "").trim() || "localizacao";
      const today = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
      const { canceled, filePath } = await electron.dialog.showSaveDialog({
        title: "Salvar PDF da consignação",
        defaultPath: `consignacao-${safeName}-${today}.pdf`,
        filters: [{ name: "PDF", extensions: ["pdf"] }]
      });
      if (canceled || !filePath) return { canceled: true };
      const pdf = await renderPdf(buildConsignmentHtml(location));
      node_fs.writeFileSync(filePath, pdf);
      electron.shell.openPath(filePath);
      return { canceled: false, filePath };
    })
  );
}
process.env.DIST_ELECTRON = node_path.join(__dirname, "..");
process.env.DIST = node_path.join(process.env.DIST_ELECTRON, "../dist");
process.env.VITE_PUBLIC = process.env.VITE_DEV_SERVER_URL ? node_path.join(process.env.DIST_ELECTRON, "../public") : process.env.DIST;
let mainWindow = null;
function createWindow() {
  mainWindow = new electron.BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 1024,
    minHeight: 680,
    title: "NEXO",
    show: false,
    backgroundColor: "#0f1419",
    webPreferences: {
      preload: node_path.join(__dirname, "../preload/index.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });
  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
  });
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    electron.shell.openExternal(url);
    return { action: "deny" };
  });
  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(node_path.join(process.env.DIST, "index.html"));
  }
}
electron.app.whenReady().then(() => {
  if (process.platform === "win32") {
    electron.app.setAppUserModelId("com.nexo.app");
  }
  initDatabase();
  registerIpcHandlers();
  createWindow();
  electron.app.on("activate", () => {
    if (electron.BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});
electron.app.on("window-all-closed", () => {
  if (process.platform !== "darwin") electron.app.quit();
});
