/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>
  export default component
}

interface NexoApi {
  products: {
    list: () => Promise<any[]>
    upsert: (payload: Record<string, unknown>) => Promise<any>
    delete: (codigo: string) => Promise<boolean>
    export: (format: 'csv' | 'json') => Promise<{ canceled?: boolean; filePath?: string }>
  }
  locations: {
    list: () => Promise<any[]>
    upsert: (payload: Record<string, unknown>) => Promise<any>
    delete: (id: string) => Promise<boolean>
    linkProduct: (payload: Record<string, unknown>) => Promise<any>
    updateItem: (payload: Record<string, unknown>) => Promise<any>
    removeItem: (payload: Record<string, unknown>) => Promise<boolean>
    adjustStock: (payload: Record<string, unknown>) => Promise<any>
  }
}

interface Window {
  nexoApi: NexoApi
}
