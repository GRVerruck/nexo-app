import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useLocationStore = defineStore('locations', () => {
  const locations = ref([])
  const loading = ref(false)
  const selectedId = ref(null)

  const selected = computed(
    () => locations.value.find((l) => l.id === selectedId.value) || locations.value[0] || null
  )

  const kpis = computed(() => {
    const items = selected.value?.items || []
    const totalEntregue = items.reduce((s, i) => s + (Number(i.entregue) || 0), 0)
    const totalSaidas = items.reduce((s, i) => s + (Number(i.saidas) || 0), 0)
    const totalReposicao = items.reduce((s, i) => s + (Number(i.reposicao) || 0), 0)
    const totalEstoque = items.reduce((s, i) => s + (Number(i.em_estoque) || 0), 0)
    const aReceber = items.reduce(
      (s, i) => s + (Number(i.saidas) || 0) * (Number(i.preco_lojista) || 0),
      0
    )
    const vendaEstimada = items.reduce(
      (s, i) => s + (Number(i.em_estoque) || 0) * (Number(i.preco_sugerido) || 0),
      0
    )
    return {
      totalEntregue,
      totalSaidas,
      totalReposicao,
      totalEstoque,
      aReceber,
      vendaEstimada
    }
  })

  async function fetchAll() {
    loading.value = true
    try {
      locations.value = await window.nexoApi.locations.list()
      if (!selectedId.value && locations.value.length) {
        selectedId.value = locations.value[0].id
      } else if (selectedId.value && !locations.value.some((l) => l.id === selectedId.value)) {
        selectedId.value = locations.value[0]?.id || null
      }
    } finally {
      loading.value = false
    }
  }

  function select(id) {
    selectedId.value = id
  }

  async function saveLocation(payload) {
    const saved = await window.nexoApi.locations.upsert(payload)
    await fetchAll()
    selectedId.value = saved.id
    return saved
  }

  async function removeLocation(id) {
    await window.nexoApi.locations.delete(id)
    await fetchAll()
  }

  async function linkProduct(codigo, overrides = {}) {
    if (!selected.value) throw new Error('Selecione uma localização')
    await window.nexoApi.locations.linkProduct({
      locationId: selected.value.id,
      codigo,
      overrides
    })
    await fetchAll()
  }

  async function updateItem(itemId, patch) {
    if (!selected.value) return
    await window.nexoApi.locations.updateItem({
      locationId: selected.value.id,
      itemId,
      patch
    })
    await fetchAll()
  }

  async function removeItem(itemId) {
    if (!selected.value) return
    await window.nexoApi.locations.removeItem({
      locationId: selected.value.id,
      itemId
    })
    await fetchAll()
  }

  async function adjustStock(itemId, deltas) {
    if (!selected.value) return
    await window.nexoApi.locations.adjustStock({
      locationId: selected.value.id,
      itemId,
      deltas
    })
    await fetchAll()
  }

  return {
    locations,
    loading,
    selectedId,
    selected,
    kpis,
    fetchAll,
    select,
    saveLocation,
    removeLocation,
    linkProduct,
    updateItem,
    removeItem,
    adjustStock
  }
})
