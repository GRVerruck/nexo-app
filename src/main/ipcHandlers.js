import { ipcMain, dialog, shell } from 'electron'
import { writeFileSync } from 'node:fs'
import { buildConsignmentHtml, renderPdf } from './pdf.js'
import {
  getProducts,
  upsertProduct,
  deleteProduct,
  getLocations,
  upsertLocation,
  deleteLocation,
  linkProductToLocation,
  updateConsignmentItem,
  removeConsignmentItem,
  adjustStock,
  exportCatalog,
  getCategories,
  saveCategory,
  deleteCategory
} from './database.js'

function wrap(fn) {
  return async (_event, ...args) => {
    try {
      const data = await fn(...args)
      return { ok: true, data }
    } catch (err) {
      return { ok: false, error: err?.message || String(err) }
    }
  }
}

export function registerIpcHandlers() {
  ipcMain.handle('products:list', wrap(() => getProducts()))
  ipcMain.handle('products:upsert', wrap((payload) => upsertProduct(payload)))
  ipcMain.handle('products:delete', wrap((codigo) => deleteProduct(codigo)))
  ipcMain.handle(
    'products:export',
    wrap(async (format) => {
      const result = exportCatalog(format)
      const filters =
        format === 'csv'
          ? [{ name: 'CSV', extensions: ['csv'] }]
          : [{ name: 'JSON', extensions: ['json'] }]
      const { canceled, filePath } = await dialog.showSaveDialog({
        title: 'Exportar catálogo',
        defaultPath: format === 'csv' ? 'nexo-produtos.csv' : 'nexo-produtos.json',
        filters
      })
      if (canceled || !filePath) return { canceled: true }
      writeFileSync(filePath, result.content, 'utf-8')
      return { canceled: false, filePath }
    })
  )

  ipcMain.handle('categories:list', wrap(() => getCategories()))
  ipcMain.handle('categories:save', wrap((payload) => saveCategory(payload)))
  ipcMain.handle('categories:delete', wrap((nome) => deleteCategory(nome)))

  ipcMain.handle('locations:list', wrap(() => getLocations()))
  ipcMain.handle('locations:upsert', wrap((payload) => upsertLocation(payload)))
  ipcMain.handle('locations:delete', wrap((id) => deleteLocation(id)))
  ipcMain.handle(
    'locations:linkProduct',
    wrap(({ locationId, codigo, overrides }) => linkProductToLocation(locationId, codigo, overrides))
  )
  ipcMain.handle(
    'locations:updateItem',
    wrap(({ locationId, itemId, patch }) => updateConsignmentItem(locationId, itemId, patch))
  )
  ipcMain.handle(
    'locations:removeItem',
    wrap(({ locationId, itemId }) => removeConsignmentItem(locationId, itemId))
  )
  ipcMain.handle(
    'locations:adjustStock',
    wrap(({ locationId, itemId, deltas }) => adjustStock(locationId, itemId, deltas))
  )
  ipcMain.handle(
    'locations:exportPdf',
    wrap(async (locationId) => {
      const location = getLocations().find((l) => l.id === locationId)
      if (!location) throw new Error('Localização não encontrada')
      const safeName = location.nome.replace(/[<>:"/\\|?*\x00-\x1f]/g, '').trim() || 'localizacao'
      const today = new Date().toISOString().slice(0, 10)
      const { canceled, filePath } = await dialog.showSaveDialog({
        title: 'Salvar PDF da consignação',
        defaultPath: `consignacao-${safeName}-${today}.pdf`,
        filters: [{ name: 'PDF', extensions: ['pdf'] }]
      })
      if (canceled || !filePath) return { canceled: true }
      const pdf = await renderPdf(buildConsignmentHtml(location))
      writeFileSync(filePath, pdf)
      shell.openPath(filePath)
      return { canceled: false, filePath }
    })
  )
}
