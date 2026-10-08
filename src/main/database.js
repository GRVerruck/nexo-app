import { app } from 'electron'
import { existsSync, mkdirSync, readFileSync, writeFileSync, copyFileSync } from 'node:fs'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'

let dbPath = null
let cache = null

function round2(n) {
  return Math.round((Number(n) || 0) * 100) / 100
}

function calcStock(item) {
  const entregue = Number(item.entregue) || 0
  const reposicao = Number(item.reposicao) || 0
  const saidas = Number(item.saidas) || 0
  return entregue + reposicao - saidas
}

function calcLucro(product) {
  return round2((Number(product.preco_loja) || 0) - (Number(product.custo) || 0))
}

function resolveSeedPath() {
  const candidates = [
    join(process.resourcesPath || '', 'data', 'initialSeed.json'),
    join(app.getAppPath(), 'src', 'data', 'initialSeed.json'),
    join(app.getAppPath(), 'data', 'initialSeed.json'),
    join(process.cwd(), 'src', 'data', 'initialSeed.json')
  ]
  return candidates.find((p) => p && existsSync(p)) || null
}

function emptyStore() {
  return {
    version: 1,
    seeded: false,
    products: [],
    locations: []
  }
}

function loadSeed() {
  const seedPath = resolveSeedPath()
  if (!seedPath) {
    console.warn('[NEXO] Seed file not found')
    return emptyStore()
  }
  const raw = JSON.parse(readFileSync(seedPath, 'utf-8'))
  const products = (raw.products || []).map((p) => ({
    ...p,
    custo: Number(p.custo) || 0,
    preco_loja: Number(p.preco_loja) || 0,
    preco_final: Number(p.preco_final) || 0,
    lucro: calcLucro(p)
  }))
  const locations = (raw.locations || []).map((loc) => ({
    id: loc.id || randomUUID(),
    nome: loc.nome,
    endereco: loc.endereco || '',
    contato: loc.contato || '',
    items: (loc.items || []).map((item) => {
      const normalized = {
        id: item.id || randomUUID(),
        codigo: item.codigo,
        produto_nome: item.produto_nome,
        entregue: Number(item.entregue) || 0,
        saidas: Number(item.saidas) || 0,
        reposicao: Number(item.reposicao) || 0,
        preco_lojista: Number(item.preco_lojista) || 0,
        preco_sugerido: Number(item.preco_sugerido) || 0,
        data_entrega: item.data_entrega || null,
        observacoes: item.observacoes || ''
      }
      normalized.em_estoque = calcStock(normalized)
      return normalized
    })
  }))
  return {
    version: 1,
    seeded: true,
    products,
    locations
  }
}

function persist() {
  writeFileSync(dbPath, JSON.stringify(cache, null, 2), 'utf-8')
}

function ensureLoaded() {
  if (!cache) {
    if (existsSync(dbPath)) {
      cache = JSON.parse(readFileSync(dbPath, 'utf-8'))
    } else {
      cache = emptyStore()
    }
  }
  return cache
}

export function initDatabase() {
  const dataDir = join(app.getPath('userData'), 'nexo')
  if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true })
  dbPath = join(dataDir, 'store.json')

  if (!existsSync(dbPath)) {
    cache = loadSeed()
    persist()
    const seedPath = resolveSeedPath()
    if (seedPath) {
      try {
        copyFileSync(seedPath, join(dataDir, 'initialSeed.backup.json'))
      } catch {
        /* ignore */
      }
    }
    console.log('[NEXO] Database initialized with seed data')
    return
  }

  cache = JSON.parse(readFileSync(dbPath, 'utf-8'))
  const isEmpty =
    (!cache.products || cache.products.length === 0) &&
    (!cache.locations || cache.locations.length === 0)

  if (isEmpty) {
    cache = loadSeed()
    persist()
    console.log('[NEXO] Empty store detected — seed applied')
  }
}

export function getProducts() {
  return ensureLoaded().products
}

export function upsertProduct(payload) {
  const store = ensureLoaded()
  const codigo = String(payload.codigo || '').trim().toUpperCase()
  if (!codigo) throw new Error('Código é obrigatório')
  if (!payload.produto?.trim()) throw new Error('Nome do produto é obrigatório')

  const product = {
    codigo,
    produto: payload.produto.trim(),
    categoria: (payload.categoria || '').trim() || 'Geral',
    custo: Number(payload.custo) || 0,
    preco_loja: Number(payload.preco_loja) || 0,
    preco_final: Number(payload.preco_final) || 0,
    lucro: 0
  }
  product.lucro = calcLucro(product)

  const idx = store.products.findIndex((p) => p.codigo === codigo)
  if (idx >= 0) {
    if (payload._originalCodigo && payload._originalCodigo !== codigo) {
      const clash = store.products.find((p) => p.codigo === codigo)
      if (clash) throw new Error(`Já existe produto com código ${codigo}`)
    }
    store.products[idx] = product
  } else {
    if (store.products.some((p) => p.codigo === codigo)) {
      throw new Error(`Já existe produto com código ${codigo}`)
    }
    store.products.push(product)
  }

  // Sync name on linked consignment items when code matches
  for (const loc of store.locations) {
    for (const item of loc.items) {
      if (item.codigo === codigo) {
        item.produto_nome = product.produto
      }
    }
  }

  persist()
  return product
}

export function deleteProduct(codigo) {
  const store = ensureLoaded()
  const code = String(codigo).trim().toUpperCase()
  store.products = store.products.filter((p) => p.codigo !== code)
  for (const loc of store.locations) {
    loc.items = loc.items.filter((i) => i.codigo !== code)
  }
  persist()
  return true
}

export function getCategories() {
  const store = ensureLoaded()
  const set = new Set([
    ...(store.categories || []),
    ...store.products.map((p) => p.categoria).filter(Boolean)
  ])
  return [...set].sort((a, b) => a.localeCompare(b, 'pt-BR'))
}

export function saveCategory({ nome, original } = {}) {
  const store = ensureLoaded()
  const name = String(nome || '').trim()
  if (!name) throw new Error('Nome da categoria é obrigatório')

  const clash = getCategories().find((c) => c.toLowerCase() === name.toLowerCase())
  if (clash && clash !== original) throw new Error(`Já existe a categoria ${clash}`)

  const list = (store.categories || []).filter((c) => c !== original)
  list.push(name)
  store.categories = list

  if (original && original !== name) {
    for (const p of store.products) {
      if (p.categoria === original) p.categoria = name
    }
  }

  persist()
  return name
}

export function deleteCategory(nome) {
  const store = ensureLoaded()
  const emUso = store.products.filter((p) => p.categoria === nome).length
  if (emUso) throw new Error(`Categoria em uso por ${emUso} produto(s)`)
  store.categories = (store.categories || []).filter((c) => c !== nome)
  persist()
  return true
}

export function getLocations() {
  return ensureLoaded().locations
}

export function upsertLocation(payload) {
  const store = ensureLoaded()
  if (!payload.nome?.trim()) throw new Error('Nome da localização é obrigatório')

  if (payload.id) {
    const idx = store.locations.findIndex((l) => l.id === payload.id)
    if (idx < 0) throw new Error('Localização não encontrada')
    store.locations[idx] = {
      ...store.locations[idx],
      nome: payload.nome.trim(),
      endereco: payload.endereco?.trim() || '',
      contato: payload.contato?.trim() || ''
    }
    persist()
    return store.locations[idx]
  }

  const location = {
    id: randomUUID(),
    nome: payload.nome.trim(),
    endereco: payload.endereco?.trim() || '',
    contato: payload.contato?.trim() || '',
    items: []
  }
  store.locations.push(location)
  persist()
  return location
}

export function deleteLocation(id) {
  const store = ensureLoaded()
  store.locations = store.locations.filter((l) => l.id !== id)
  persist()
  return true
}

export function linkProductToLocation(locationId, codigo, overrides = {}) {
  const store = ensureLoaded()
  const loc = store.locations.find((l) => l.id === locationId)
  if (!loc) throw new Error('Localização não encontrada')

  const code = String(codigo).trim().toUpperCase()
  const product = store.products.find((p) => p.codigo === code)
  if (!product) throw new Error('Produto não encontrado no catálogo')

  if (loc.items.some((i) => i.codigo === code)) {
    throw new Error('Produto já vinculado a esta localização')
  }

  const item = {
    id: randomUUID(),
    codigo: product.codigo,
    produto_nome: product.produto,
    entregue: Number(overrides.entregue) || 0,
    saidas: Number(overrides.saidas) || 0,
    reposicao: Number(overrides.reposicao) || 0,
    preco_lojista: Number(overrides.preco_lojista ?? product.preco_loja) || 0,
    preco_sugerido: Number(overrides.preco_sugerido ?? product.preco_final) || 0,
    data_entrega: overrides.data_entrega || new Date().toISOString().slice(0, 10),
    observacoes: overrides.observacoes || ''
  }
  item.em_estoque = calcStock(item)
  loc.items.push(item)
  persist()
  return item
}

export function updateConsignmentItem(locationId, itemId, patch) {
  const store = ensureLoaded()
  const loc = store.locations.find((l) => l.id === locationId)
  if (!loc) throw new Error('Localização não encontrada')
  const item = loc.items.find((i) => i.id === itemId || i.codigo === itemId)
  if (!item) throw new Error('Item não encontrado')

  const numericFields = ['entregue', 'saidas', 'reposicao', 'preco_lojista', 'preco_sugerido']
  for (const key of numericFields) {
    if (patch[key] !== undefined && patch[key] !== null && patch[key] !== '') {
      item[key] = Number(patch[key]) || 0
    }
  }
  if (patch.observacoes !== undefined) item.observacoes = String(patch.observacoes)
  if (patch.data_entrega !== undefined) item.data_entrega = patch.data_entrega
  if (patch.produto_nome !== undefined) item.produto_nome = patch.produto_nome

  item.em_estoque = calcStock(item)
  persist()
  return item
}

export function removeConsignmentItem(locationId, itemId) {
  const store = ensureLoaded()
  const loc = store.locations.find((l) => l.id === locationId)
  if (!loc) throw new Error('Localização não encontrada')
  loc.items = loc.items.filter((i) => i.id !== itemId && i.codigo !== itemId)
  persist()
  return true
}

export function adjustStock(locationId, itemId, { entregueDelta = 0, saidasDelta = 0, reposicaoDelta = 0 } = {}) {
  const store = ensureLoaded()
  const loc = store.locations.find((l) => l.id === locationId)
  if (!loc) throw new Error('Localização não encontrada')
  const item = loc.items.find((i) => i.id === itemId || i.codigo === itemId)
  if (!item) throw new Error('Item não encontrado')

  item.entregue = Math.max(0, (Number(item.entregue) || 0) + (Number(entregueDelta) || 0))
  item.saidas = Math.max(0, (Number(item.saidas) || 0) + (Number(saidasDelta) || 0))
  item.reposicao = Math.max(0, (Number(item.reposicao) || 0) + (Number(reposicaoDelta) || 0))
  if (entregueDelta || reposicaoDelta) {
    item.data_entrega = new Date().toISOString().slice(0, 10)
  }
  item.em_estoque = calcStock(item)
  persist()
  return item
}

export function exportCatalog(format = 'json') {
  const products = getProducts()
  if (format === 'csv') {
    const header = 'codigo,produto,categoria,custo,preco_loja,preco_final,lucro'
    const lines = products.map((p) =>
      [p.codigo, `"${p.produto.replace(/"/g, '""')}"`, `"${p.categoria}"`, p.custo, p.preco_loja, p.preco_final, p.lucro].join(',')
    )
    return { format: 'csv', content: [header, ...lines].join('\n') }
  }
  return { format: 'json', content: JSON.stringify(products, null, 2) }
}

export function getDbPath() {
  return dbPath
}
