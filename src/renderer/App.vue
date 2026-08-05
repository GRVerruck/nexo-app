<template>
  <v-app>
    <AppHeader />
    <v-main>
      <router-view v-slot="{ Component }">
        <transition name="fade-slide" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </v-main>

    <v-snackbar
      v-model="ui.snackbar"
      :color="ui.snackColor"
      :timeout="3200"
      location="bottom right"
    >
      {{ ui.snackText }}
    </v-snackbar>
  </v-app>
</template>

<script setup>
import { reactive, provide } from 'vue'
import AppHeader from './components/AppHeader.vue'

const ui = reactive({
  snackbar: false,
  snackText: '',
  snackColor: 'primary'
})

function notify(text, color = 'primary') {
  ui.snackText = text
  ui.snackColor = color
  ui.snackbar = true
}

provide('notify', notify)
</script>
