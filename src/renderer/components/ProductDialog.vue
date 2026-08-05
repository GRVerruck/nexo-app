<template>
  <v-dialog :model-value="modelValue" max-width="560" persistent @update:model-value="emitClose">
    <v-card>
      <v-card-title class="d-flex align-center justify-space-between pa-4">
        <span>{{ isEdit ? 'Editar Produto' : 'Novo Produto' }}</span>
        <v-btn icon="mdi-close" variant="text" @click="emitClose(false)" />
      </v-card-title>
      <v-divider />
      <v-card-text class="pt-4">
        <v-form ref="formRef" @submit.prevent="submit">
          <v-row dense>
            <v-col cols="12" sm="4">
              <v-text-field
                v-model="form.codigo"
                label="Código"
                :disabled="isEdit"
                :rules="[rules.required]"
                hint="Ex: CP001"
                persistent-hint
              />
            </v-col>
            <v-col cols="12" sm="8">
              <v-text-field
                v-model="form.produto"
                label="Produto"
                :rules="[rules.required]"
              />
            </v-col>
            <v-col cols="12">
              <v-combobox
                v-model="form.categoria"
                label="Categoria"
                :items="categories"
                :rules="[rules.required]"
              />
            </v-col>
            <v-col cols="12" sm="4">
              <v-text-field
                v-model.number="form.custo"
                label="Custo"
                type="number"
                step="0.01"
                prefix="R$"
              />
            </v-col>
            <v-col cols="12" sm="4">
              <v-text-field
                v-model.number="form.preco_loja"
                label="Preço Loja"
                type="number"
                step="0.01"
                prefix="R$"
              />
            </v-col>
            <v-col cols="12" sm="4">
              <v-text-field
                v-model.number="form.preco_final"
                label="Preço Final"
                type="number"
                step="0.01"
                prefix="R$"
              />
            </v-col>
            <v-col cols="12">
              <v-alert type="info" variant="tonal" density="comfortable">
                Lucro (Loja − Custo):
                <strong>R$ {{ lucroDisplay }}</strong>
              </v-alert>
            </v-col>
          </v-row>
        </v-form>
      </v-card-text>
      <v-divider />
      <v-card-actions class="pa-4">
        <v-spacer />
        <v-btn variant="text" @click="emitClose(false)">Cancelar</v-btn>
        <v-btn color="primary" :loading="saving" @click="submit">Salvar</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'

const props = defineProps({
  modelValue: Boolean,
  product: { type: Object, default: null },
  categories: { type: Array, default: () => [] }
})

const emit = defineEmits(['update:modelValue', 'save'])

const formRef = ref(null)
const saving = ref(false)
const form = reactive({
  codigo: '',
  produto: '',
  categoria: '',
  custo: 0,
  preco_loja: 0,
  preco_final: 0
})

const isEdit = computed(() => Boolean(props.product?.codigo))
const lucroDisplay = computed(() =>
  ((Number(form.preco_loja) || 0) - (Number(form.custo) || 0)).toFixed(2)
)

const rules = {
  required: (v) => !!String(v || '').trim() || 'Obrigatório'
}

watch(
  () => props.modelValue,
  (open) => {
    if (!open) return
    if (props.product) {
      Object.assign(form, {
        codigo: props.product.codigo,
        produto: props.product.produto,
        categoria: props.product.categoria,
        custo: props.product.custo,
        preco_loja: props.product.preco_loja,
        preco_final: props.product.preco_final
      })
    } else {
      Object.assign(form, {
        codigo: '',
        produto: '',
        categoria: '',
        custo: 0,
        preco_loja: 0,
        preco_final: 0
      })
    }
  }
)

function emitClose(val) {
  emit('update:modelValue', val)
}

async function submit() {
  const { valid } = await formRef.value.validate()
  if (!valid) return
  saving.value = true
  try {
    await emit('save', { ...form })
    emitClose(false)
  } finally {
    saving.value = false
  }
}
</script>
