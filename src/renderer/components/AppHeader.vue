<template>
  <v-app-bar flat border class="px-2" color="surface" height="64">
    <div class="d-flex align-center ga-3 ml-2">
      <div class="nexo-mark">
        <span>N</span>
      </div>
      <div>
        <div class="text-h6 font-weight-bold" style="letter-spacing: 0.12em; line-height: 1">
          NEXO
        </div>
        <div class="text-caption text-medium-emphasis" style="line-height: 1.2">
          Produtos &amp; Consignações
        </div>
      </div>
    </div>

    <v-spacer />

    <v-tabs
      :model-value="route.path"
      color="primary"
      density="comfortable"
      class="mr-2"
      @update:model-value="go"
    >
      <v-tab value="/produtos" prepend-icon="mdi-package-variant-closed">Produtos</v-tab>
      <v-tab value="/consignacoes" prepend-icon="mdi-map-marker-radius">Consignações</v-tab>
    </v-tabs>
  </v-app-bar>
</template>

<script setup>
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

function go(path) {
  if (path && path !== route.path) router.push(path)
}
</script>

<style scoped>
.nexo-mark {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: grid;
  place-items: center;
  font-weight: 800;
  color: #fff;
  background: linear-gradient(145deg, #1a5f4a 0%, #247a60 55%, #c4782b 160%);
  box-shadow: 0 6px 16px rgba(26, 95, 74, 0.28);
  animation: mark-in 0.5s ease both;
}

@keyframes mark-in {
  from {
    opacity: 0;
    transform: scale(0.85);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}
</style>
