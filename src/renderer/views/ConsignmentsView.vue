<template>
  <div class="nexo-page">
    <div class="d-flex flex-wrap align-center justify-space-between ga-3 mb-4">
      <div>
        <h1 class="text-h5 font-weight-bold mb-1">Consignações</h1>
        <p class="text-body-2 text-medium-emphasis mb-0">
          Controle de estoque por ponto de venda / localização.
        </p>
      </div>
      <div class="d-flex flex-wrap ga-2">
        <v-btn variant="outlined" prepend-icon="mdi-map-marker-plus" @click="manageOpen = true">
          Gerenciar Localizações
        </v-btn>
        <v-btn
          color="primary"
          prepend-icon="mdi-link-plus"
          :disabled="!locStore.selected"
          @click="linkDialog = true"
        >
          Vincular Produto
        </v-btn>
      </div>
    </div>

    <v-tabs
      v-if="locStore.locations.length"
      :model-value="locStore.selectedId"
      color="primary"
      class="mb-4"
      show-arrows
      @update:model-value="locStore.select"
    >
      <v-tab v-for="loc in locStore.locations" :key="loc.id" :value="loc.id">
        {{ loc.nome }}
      </v-tab>
    </v-tabs>

    <v-alert v-else type="info" variant="tonal" class="mb-4">
      Nenhuma localização cadastrada. Clique em
      <strong>Gerenciar Localizações</strong> para criar o primeiro ponto.
    </v-alert>

    <template v-if="locStore.selected">
      <v-row class="mb-4" dense>
        <v-col v-for="card in kpiCards" :key="card.label" cols="12" sm="6" md="4" lg="2">
          <v-card class="nexo-kpi pa-4" border>
            <div class="nexo-kpi__label">{{ card.label }}</div>
            <div class="nexo-kpi__value">{{ card.value }}</div>
          </v-card>
        </v-col>
      </v-row>

      <div class="d-flex align-center justify-space-between mb-2">
        <div class="text-subtitle-1 font-weight-medium">
          {{ locStore.selected.nome }}
          <span class="text-caption text-medium-emphasis ml-2">
            {{ locStore.selected.items?.length || 0 }} produto(s)
          </span>
        </div>
        <div class="d-flex ga-1">
          <v-btn
            size="small"
            variant="text"
            prepend-icon="mdi-pencil"
            @click="openLocationEdit(locStore.selected)"
          >
            Editar ponto
          </v-btn>
          <v-btn
            size="small"
            variant="text"
            color="error"
            prepend-icon="mdi-delete"
            @click="confirmDeleteLocation(locStore.selected)"
          >
            Excluir ponto
          </v-btn>
        </div>
      </div>

      <v-card border>
        <v-data-table
          :headers="headers"
          :items="locStore.selected.items || []"
          :loading="locStore.loading"
          item-value="id"
          density="comfortable"
        >
          <template #item.entregue="{ item }">
            <div class="d-flex align-center justify-end ga-1">
              <span>{{ item.entregue }}</span>
              <v-btn
                icon="mdi-plus"
                size="x-small"
                variant="tonal"
                @click="quickAdjust(item, { entregueDelta: 1 })"
              />
              <v-btn
                icon="mdi-minus"
                size="x-small"
                variant="tonal"
                :disabled="!item.entregue"
                @click="quickAdjust(item, { entregueDelta: -1 })"
              />
            </div>
          </template>
          <template #item.saidas="{ item }">
            <div class="d-flex align-center justify-end ga-1">
              <span>{{ item.saidas }}</span>
              <v-btn
                icon="mdi-plus"
                size="x-small"
                variant="tonal"
                color="warning"
                @click="quickAdjust(item, { saidasDelta: 1 })"
              />
              <v-btn
                icon="mdi-minus"
                size="x-small"
                variant="tonal"
                color="warning"
                :disabled="!item.saidas"
                @click="quickAdjust(item, { saidasDelta: -1 })"
              />
            </div>
          </template>
          <template #item.reposicao="{ item }">
            <div class="d-flex align-center justify-end ga-1">
              <span>{{ item.reposicao }}</span>
              <v-btn
                icon="mdi-plus"
                size="x-small"
                variant="tonal"
                color="info"
                @click="quickAdjust(item, { reposicaoDelta: 1 })"
              />
              <v-btn
                icon="mdi-minus"
                size="x-small"
                variant="tonal"
                color="info"
                :disabled="!item.reposicao"
                @click="quickAdjust(item, { reposicaoDelta: -1 })"
              />
            </div>
          </template>
          <template #item.em_estoque="{ item }">
            <v-chip
              size="small"
              :color="item.em_estoque <= 0 ? 'error' : item.em_estoque <= 2 ? 'warning' : 'success'"
              variant="tonal"
            >
              {{ item.em_estoque }}
            </v-chip>
          </template>
          <template #item.preco_lojista="{ item }">
            {{ money(item.preco_lojista) }}
          </template>
          <template #item.preco_sugerido="{ item }">
            {{ money(item.preco_sugerido) }}
          </template>
          <template #item.actions="{ item }">
            <v-btn icon="mdi-pencil" size="small" variant="text" @click="openItemEdit(item)" />
            <v-btn
              icon="mdi-link-off"
              size="small"
              variant="text"
              color="error"
              @click="confirmUnlink(item)"
            />
          </template>
        </v-data-table>
      </v-card>
    </template>

    <LocationDialog
      v-model="locationDialog"
      :location="editingLocation"
      @save="onSaveLocation"
    />

    <!-- Manage locations list dialog -->
    <v-dialog v-model="manageOpen" max-width="640">
      <v-card>
        <v-card-title class="d-flex justify-space-between align-center">
          <span>Localizações</span>
          <v-btn color="primary" size="small" prepend-icon="mdi-plus" @click="openLocationCreate">
            Nova
          </v-btn>
        </v-card-title>
        <v-divider />
        <v-list>
          <v-list-item
            v-for="loc in locStore.locations"
            :key="loc.id"
            :title="loc.nome"
            :subtitle="[loc.endereco, loc.contato].filter(Boolean).join(' · ') || 'Sem contato'"
          >
            <template #append>
              <v-btn icon="mdi-pencil" variant="text" size="small" @click="openLocationEdit(loc)" />
              <v-btn
                icon="mdi-delete"
                variant="text"
                size="small"
                color="error"
                @click="confirmDeleteLocation(loc)"
              />
            </template>
          </v-list-item>
        </v-list>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="manageOpen = false">Fechar</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Link product -->
    <v-dialog v-model="linkDialog" max-width="480">
      <v-card>
        <v-card-title>Vincular produto à localização</v-card-title>
        <v-card-text>
          <v-select
            v-model="linkCodigo"
            :items="availableProducts"
            item-title="label"
            item-value="codigo"
            label="Produto do catálogo"
            :rules="[(v) => !!v || 'Selecione um produto']"
          />
          <v-text-field
            v-model.number="linkEntregue"
            type="number"
            label="Quantidade entregue"
            min="0"
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="linkDialog = false">Cancelar</v-btn>
          <v-btn color="primary" :disabled="!linkCodigo" @click="doLink">Vincular</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Edit consignment item -->
    <v-dialog v-model="itemDialog" max-width="560">
      <v-card v-if="editingItem">
        <v-card-title>{{ editingItem.produto_nome }} ({{ editingItem.codigo }})</v-card-title>
        <v-card-text>
          <v-row dense>
            <v-col cols="4">
              <v-text-field v-model.number="itemForm.entregue" type="number" label="Entregue" />
            </v-col>
            <v-col cols="4">
              <v-text-field v-model.number="itemForm.saidas" type="number" label="Saídas" />
            </v-col>
            <v-col cols="4">
              <v-text-field v-model.number="itemForm.reposicao" type="number" label="Reposição" />
            </v-col>
            <v-col cols="6">
              <v-text-field
                v-model.number="itemForm.preco_lojista"
                type="number"
                step="0.01"
                label="Preço Lojista"
                prefix="R$"
              />
            </v-col>
            <v-col cols="6">
              <v-text-field
                v-model.number="itemForm.preco_sugerido"
                type="number"
                step="0.01"
                label="Preço Sugerido"
                prefix="R$"
              />
            </v-col>
            <v-col cols="6">
              <v-text-field v-model="itemForm.data_entrega" type="date" label="Data entrega" />
            </v-col>
            <v-col cols="12">
              <v-textarea v-model="itemForm.observacoes" label="Observações" rows="2" />
            </v-col>
            <v-col cols="12">
              <v-alert type="info" variant="tonal" density="compact">
                Em estoque (calculado):
                <strong>
                  {{
                    (Number(itemForm.entregue) || 0) +
                    (Number(itemForm.reposicao) || 0) -
                    (Number(itemForm.saidas) || 0)
                  }}
                </strong>
              </v-alert>
            </v-col>
          </v-row>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="itemDialog = false">Cancelar</v-btn>
          <v-btn color="primary" @click="saveItem">Salvar</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="deleteLocOpen" max-width="420">
      <v-card>
        <v-card-title>Excluir localização?</v-card-title>
        <v-card-text>
          Remover <strong>{{ deletingLoc?.nome }}</strong> e todos os itens consignados.
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="deleteLocOpen = false">Cancelar</v-btn>
          <v-btn color="error" @click="doDeleteLocation">Excluir</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup>
import { computed, inject, onMounted, reactive, ref } from 'vue'
import { useLocationStore } from '../stores/locationStore'
import { useProductStore } from '../stores/productStore'
import LocationDialog from '../components/LocationDialog.vue'

const locStore = useLocationStore()
const productStore = useProductStore()
const notify = inject('notify')

const locationDialog = ref(false)
const editingLocation = ref(null)
const manageOpen = ref(false)
const linkDialog = ref(false)
const linkCodigo = ref(null)
const linkEntregue = ref(0)
const itemDialog = ref(false)
const editingItem = ref(null)
const itemForm = reactive({
  entregue: 0,
  saidas: 0,
  reposicao: 0,
  preco_lojista: 0,
  preco_sugerido: 0,
  data_entrega: '',
  observacoes: ''
})
const deleteLocOpen = ref(false)
const deletingLoc = ref(null)

const headers = [
  { title: 'Código', key: 'codigo', width: 100 },
  { title: 'Produto', key: 'produto_nome' },
  { title: 'Entregue', key: 'entregue', align: 'end' },
  { title: 'Saídas', key: 'saidas', align: 'end' },
  { title: 'Reposição', key: 'reposicao', align: 'end' },
  { title: 'Em Estoque', key: 'em_estoque', align: 'center' },
  { title: 'Lojista', key: 'preco_lojista', align: 'end' },
  { title: 'Sugerido', key: 'preco_sugerido', align: 'end' },
  { title: 'Ações', key: 'actions', sortable: false, align: 'center', width: 110 }
]

const kpiCards = computed(() => {
  const k = locStore.kpis
  return [
    { label: 'Entregues', value: k.totalEntregue },
    { label: 'Saídas', value: k.totalSaidas },
    { label: 'Em Estoque', value: k.totalEstoque },
    { label: 'A Receber', value: money(k.aReceber) },
    { label: 'Venda Estimada', value: money(k.vendaEstimada) },
    { label: 'Reposições', value: k.totalReposicao }
  ]
})

const availableProducts = computed(() => {
  const linked = new Set((locStore.selected?.items || []).map((i) => i.codigo))
  return productStore.products
    .filter((p) => !linked.has(p.codigo))
    .map((p) => ({ codigo: p.codigo, label: `${p.codigo} — ${p.produto}` }))
})

function money(v) {
  return Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function openLocationCreate() {
  editingLocation.value = null
  locationDialog.value = true
}

function openLocationEdit(loc) {
  editingLocation.value = { ...loc }
  locationDialog.value = true
}

async function onSaveLocation(payload) {
  try {
    await locStore.saveLocation(payload)
    notify('Localização salva', 'success')
  } catch (err) {
    notify(err.message || 'Erro ao salvar localização', 'error')
  }
}

function confirmDeleteLocation(loc) {
  deletingLoc.value = loc
  deleteLocOpen.value = true
}

async function doDeleteLocation() {
  try {
    await locStore.removeLocation(deletingLoc.value.id)
    deleteLocOpen.value = false
    notify('Localização excluída', 'success')
  } catch (err) {
    notify(err.message || 'Erro ao excluir', 'error')
  }
}

async function doLink() {
  try {
    await locStore.linkProduct(linkCodigo.value, { entregue: linkEntregue.value || 0 })
    linkDialog.value = false
    linkCodigo.value = null
    linkEntregue.value = 0
    notify('Produto vinculado', 'success')
  } catch (err) {
    notify(err.message || 'Erro ao vincular', 'error')
  }
}

function openItemEdit(item) {
  editingItem.value = item
  Object.assign(itemForm, {
    entregue: item.entregue,
    saidas: item.saidas,
    reposicao: item.reposicao,
    preco_lojista: item.preco_lojista,
    preco_sugerido: item.preco_sugerido,
    data_entrega: item.data_entrega || '',
    observacoes: item.observacoes || ''
  })
  itemDialog.value = true
}

async function saveItem() {
  try {
    await locStore.updateItem(editingItem.value.id, { ...itemForm })
    itemDialog.value = false
    notify('Item atualizado', 'success')
  } catch (err) {
    notify(err.message || 'Erro ao atualizar', 'error')
  }
}

async function quickAdjust(item, deltas) {
  try {
    await locStore.adjustStock(item.id, deltas)
  } catch (err) {
    notify(err.message || 'Erro ao ajustar estoque', 'error')
  }
}

async function confirmUnlink(item) {
  try {
    await locStore.removeItem(item.id)
    notify('Produto desvinculado', 'success')
  } catch (err) {
    notify(err.message || 'Erro ao desvincular', 'error')
  }
}

onMounted(async () => {
  await Promise.all([productStore.fetchAll(), locStore.fetchAll()])
})
</script>
