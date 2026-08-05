<template>
  <v-dialog :model-value="modelValue" max-width="520" persistent @update:model-value="emitClose">
    <v-card>
      <v-card-title class="d-flex align-center justify-space-between pa-4">
        <span>{{ isEdit ? 'Editar Localização' : 'Nova Localização' }}</span>
        <v-btn icon="mdi-close" variant="text" @click="emitClose(false)" />
      </v-card-title>
      <v-divider />
      <v-card-text class="pt-4">
        <v-form ref="formRef">
          <v-text-field
            v-model="form.nome"
            label="Nome do ponto"
            :rules="[rules.required]"
            class="mb-2"
          />
          <v-text-field v-model="form.endereco" label="Endereço" class="mb-2" />
          <v-text-field v-model="form.contato" label="Contato" />
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
  location: { type: Object, default: null }
})

const emit = defineEmits(['update:modelValue', 'save'])

const formRef = ref(null)
const saving = ref(false)
const form = reactive({
  id: null,
  nome: '',
  endereco: '',
  contato: ''
})

const isEdit = computed(() => Boolean(props.location?.id))
const rules = {
  required: (v) => !!String(v || '').trim() || 'Obrigatório'
}

watch(
  () => props.modelValue,
  (open) => {
    if (!open) return
    if (props.location) {
      Object.assign(form, {
        id: props.location.id,
        nome: props.location.nome,
        endereco: props.location.endereco || '',
        contato: props.location.contato || ''
      })
    } else {
      Object.assign(form, { id: null, nome: '', endereco: '', contato: '' })
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
