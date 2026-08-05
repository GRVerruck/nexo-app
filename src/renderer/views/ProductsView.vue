<template>
  <div class="nexo-page">
    <div class="d-flex flex-wrap align-center justify-space-between ga-3 mb-4">
      <div>
        <h1 class="text-h5 font-weight-bold mb-1">Catálogo de Produtos</h1>
        <p class="text-body-2 text-medium-emphasis mb-0">
          Cadastro mestre com custos, preços e lucro automático.
        </p>
      </div>
      <div class="d-flex flex-wrap ga-2">
        <v-menu>
          <template #activator="{ props: menuProps }">
            <v-btn v-bind="menuProps" variant="outlined" prepend-icon="mdi-export">
              Exportar
            </v-btn>
          </template>
          <v-list density="compact">
            <v-list-item title="Exportar CSV" @click="doExport('csv')" />
            <v-list-item title="Exportar JSON" @click="doExport('json')" />
          </v-list>
        </v-menu>
        <v-btn color="primary" prepend-icon="mdi-plus" @click="openCreate">Novo Produto</v-btn>
      </div>
    </div>

    <v-card class="pa-3 mb-4" border>
      <v-row dense align="center">
        <v-col cols="12" md="6">
          <v-text-field
            v-model="store.search"
            prepend-inner-icon="mdi-magnify"
            label="Buscar por código, nome ou categoria"
            hide-details
            clearable
          />
        </v-col>
        <v-col cols="12" md="4">
          <v-select
            v-model="store.categoryFilter"
            :items="store.categories"
            label="Filtrar categoria"
            clearable
            hide-details
          />
        </v-col>
        <v-col cols="12" md="2" class="text-md-right">
          <span class="text-caption text-medium-emphasis">
            {{ store.filtered.length }} item(ns)
          </span>
        </v-col>
      </v-row>
    </v-card>

    <v-card border>
      <v-data-table
        :headers="headers"
        :items="store.filtered"
        :loading="store.loading"
        item-value="codigo"
        density="comfortable"
      >
        <template #item.custo="{ item }">
          {{ money(item.custo) }}
        </template>
        <template #item.preco_loja="{ item }">
          {{ money(item.preco_loja) }}
        </template>
        <template #item.preco_final="{ item }">
          {{ money(item.preco_final) }}
        </template>
        <template #item.lucro="{ item }">
          <span :class="item.lucro >= 0 ? 'text-success' : 'text-error'">
            {{ money(item.lucro) }}
          </span>
        </template>
        <template #item.actions="{ item }">
          <v-btn icon="mdi-pencil" size="small" variant="text" @click="openEdit(item)" />
          <v-btn
            icon="mdi-delete"
            size="small"
            variant="text"
            color="error"
            @click="confirmDelete(item)"
          />
        </template>
      </v-data-table>
    </v-card>

    <ProductDialog
      v-model="dialogOpen"
      :product="editing"
      :categories="store.categories"
      @save="onSave"
    />

    <v-dialog v-model="deleteOpen" max-width="420">
      <v-card>
        <v-card-title>Excluir produto?</v-card-title>
        <v-card-text>
          Remover <strong>{{ deleting?.produto }}</strong> ({{ deleting?.codigo }}) também remove
          vínculos nas consignações.
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="deleteOpen = false">Cancelar</v-btn>
          <v-btn color="error" @click="doDelete">Excluir</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup>
import { inject, onMounted, ref } from 'vue'
import { useProductStore } from '../stores/productStore'
import ProductDialog from '../components/ProductDialog.vue'

const store = useProductStore()
const notify = inject('notify')

const dialogOpen = ref(false)
const editing = ref(null)
const deleteOpen = ref(false)
const deleting = ref(null)

const headers = [
  { title: 'Código', key: 'codigo', width: 110 },
  { title: 'Produto', key: 'produto' },
  { title: 'Categoria', key: 'categoria' },
  { title: 'Custo', key: 'custo', align: 'end' },
  { title: 'Preço Loja', key: 'preco_loja', align: 'end' },
  { title: 'Preço Final', key: 'preco_final', align: 'end' },
  { title: 'Lucro', key: 'lucro', align: 'end' },
  { title: 'Ações', key: 'actions', sortable: false, align: 'center', width: 110 }
]

function money(v) {
  return Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function openCreate() {
  editing.value = null
  dialogOpen.value = true
}

function openEdit(item) {
  editing.value = { ...item }
  dialogOpen.value = true
}

async function onSave(payload) {
  try {
    await store.save(payload)
    notify('Produto salvo com sucesso', 'success')
  } catch (err) {
    notify(err.message || 'Erro ao salvar', 'error')
  }
}

function confirmDelete(item) {
  deleting.value = item
  deleteOpen.value = true
}

async function doDelete() {
  try {
    await store.remove(deleting.value.codigo)
    deleteOpen.value = false
    notify('Produto excluído', 'success')
  } catch (err) {
    notify(err.message || 'Erro ao excluir', 'error')
  }
}

async function doExport(format) {
  try {
    const result = await store.exportCatalog(format)
    if (!result?.canceled) notify(`Catálogo exportado (${format.toUpperCase()})`, 'success')
  } catch (err) {
    notify(err.message || 'Erro ao exportar', 'error')
  }
}

onMounted(() => store.fetchAll())
</script>
