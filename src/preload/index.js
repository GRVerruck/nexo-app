import { contextBridge, ipcRenderer } from 'electron'

async function invoke(channel, ...args) {
  const result = await ipcRenderer.invoke(channel, ...args)
  if (!result?.ok) {
    throw new Error(result?.error || 'Erro desconhecido na operação')
  }
  return result.data
}

contextBridge.exposeInMainWorld('nexoApi', {
  products: {
    list: () => invoke('products:list'),
    upsert: (payload) => invoke('products:upsert', payload),
    delete: (codigo) => invoke('products:delete', codigo),
    export: (format) => invoke('products:export', format)
  },
  categories: {
    list: () => invoke('categories:list'),
    save: (payload) => invoke('categories:save', payload),
    delete: (nome) => invoke('categories:delete', nome)
  },
  locations: {
    list: () => invoke('locations:list'),
    upsert: (payload) => invoke('locations:upsert', payload),
    delete: (id) => invoke('locations:delete', id),
    linkProduct: (payload) => invoke('locations:linkProduct', payload),
    updateItem: (payload) => invoke('locations:updateItem', payload),
    removeItem: (payload) => invoke('locations:removeItem', payload),
    adjustStock: (payload) => invoke('locations:adjustStock', payload),
    exportPdf: (locationId) => invoke('locations:exportPdf', locationId)
  }
})
