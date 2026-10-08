<template>
  <v-dialog :model-value="modelValue" max-width="560" persistent @update:model-value="emitClose">
    <v-card>
      <v-card-title class="d-flex align-center justify-space-between pa-4">
        <span>Categorias</span>
        <v-btn icon="mdi-close" variant="text" @click="emitClose(false)" />
      </v-card-title>
      <v-divider />
      <v-card-text class="pt-4">
        <v-form ref="formRef" @submit.prevent="submit">
          <div class="d-flex ga-2 align-start">
            <v-text-field
              v-model="nome"
              :label="editing ? `Renomear “${editing}”` : 'Nova categoria'"
              :rules="[rules.required]"
            />
            <v-btn color="primary" class="mt-2" :loading="saving" @click="submit">
              {{ editing ? 'Salvar' : 'Criar' }}
            </v-btn>
            <v-btn v-if="editing" variant="text" class="mt-2" @click="resetForm">Cancelar</v-btn>
          </div>
        </v-form>

        <v-list density="compact" class="mt-2" border rounded>
          <v-list-item
            v-for="cat in store.categories"
            :key="cat"
            :title="cat"
            :subtitle="`${countByCategory[cat] || 0} produto(s)`"
          >
            <template #append>
              <v-btn icon="mdi-pencil" variant="text" size="small" @click="startEdit(cat)" />
              <v-btn
                icon="mdi-delete"
                variant="text"
                size="small"
                color="error"
                @click="confirmDelete(cat)"
              />
            </template>
          </v-list-item>
          <v-list-item v-if="!store.categories.length" title="Nenhuma categoria cadastrada" />
        </v-list>
      </v-card-text>
      <v-divider />
      <v-card-actions class="pa-4">
        <v-spacer />
        <v-btn variant="text" @click="emitClose(false)">Fechar</v-btn>
      </v-card-actions>
    </v-card>

    <v-dialog v-model="deleteOpen" max-width="420">
      <v-card>
        <v-card-title>Excluir categoria?</v-card-title>
        <v-card-text>
          Remover a categoria <strong>{{ deleting }}</strong>.
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="deleteOpen = false">Cancelar</v-btn>
          <v-btn color="error" @click="doDelete">Excluir</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-dialog>
</template>

<script setup>
import { computed, inject, ref, watch } from 'vue'
import { useProductStore } from '../stores/productStore'

const props = defineProps({
  modelValue: Boolean
})

const emit = defineEmits(['update:modelValue'])

const store = useProductStore()
const notify = inject('notify')

const formRef = ref(null)
const saving = ref(false)
const nome = ref('')
const editing = ref(null)
const deleteOpen = ref(false)
const deleting = ref(null)

const rules = {
  required: (v) => !!String(v || '').trim() || 'Obrigatório'
}

const countByCategory = computed(() => {
  const counts = {}
  for (const p of store.products) counts[p.categoria] = (counts[p.categoria] || 0) + 1
  return counts
})

watch(
  () => props.modelValue,
  (open) => {
    if (open) resetForm()
  }
)

function emitClose(val) {
  emit('update:modelValue', val)
}

function resetForm() {
  editing.value = null
  nome.value = ''
  formRef.value?.resetValidation()
}

function startEdit(cat) {
  editing.value = cat
  nome.value = cat
}

async function submit() {
  const { valid } = await formRef.value.validate()
  if (!valid) return
  saving.value = true
  try {
    await store.saveCategory({ nome: nome.value, original: editing.value })
    notify(editing.value ? 'Categoria atualizada' : 'Categoria criada', 'success')
    resetForm()
  } catch (err) {
    notify(err.message || 'Erro ao salvar categoria', 'error')
  } finally {
    saving.value = false
  }
}

function confirmDelete(cat) {
  deleting.value = cat
  deleteOpen.value = true
}

async function doDelete() {
  try {
    await store.removeCategory(deleting.value)
    if (editing.value === deleting.value) resetForm()
    deleteOpen.value = false
    notify('Categoria excluída', 'success')
  } catch (err) {
    deleteOpen.value = false
    notify(err.message || 'Erro ao excluir categoria', 'error')
  }
}
</script>
