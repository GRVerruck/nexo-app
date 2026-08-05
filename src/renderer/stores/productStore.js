import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useProductStore = defineStore('products', () => {
  const products = ref([])
  const loading = ref(false)
  const search = ref('')
  const categoryFilter = ref(null)

  const categories = computed(() => {
    const set = new Set(products.value.map((p) => p.categoria).filter(Boolean))
    return [...set].sort((a, b) => a.localeCompare(b, 'pt-BR'))
  })

  const filtered = computed(() => {
    const q = search.value.trim().toLowerCase()
    return products.value.filter((p) => {
      const matchCat = !categoryFilter.value || p.categoria === categoryFilter.value
      if (!matchCat) return false
      if (!q) return true
      return (
        p.codigo.toLowerCase().includes(q) ||
        p.produto.toLowerCase().includes(q) ||
        (p.categoria || '').toLowerCase().includes(q)
      )
    })
  })

  async function fetchAll() {
    loading.value = true
    try {
      products.value = await window.nexoApi.products.list()
    } finally {
      loading.value = false
    }
  }

  async function save(payload) {
    const saved = await window.nexoApi.products.upsert(payload)
    await fetchAll()
    return saved
  }

  async function remove(codigo) {
    await window.nexoApi.products.delete(codigo)
    await fetchAll()
  }

  async function exportCatalog(format) {
    return window.nexoApi.products.export(format)
  }

  function getByCodigo(codigo) {
    return products.value.find((p) => p.codigo === codigo)
  }

  return {
    products,
    loading,
    search,
    categoryFilter,
    categories,
    filtered,
    fetchAll,
    save,
    remove,
    exportCatalog,
    getByCodigo
  }
})
