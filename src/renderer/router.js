import { createRouter, createWebHashHistory } from 'vue-router'
import ProductsView from './views/ProductsView.vue'
import ConsignmentsView from './views/ConsignmentsView.vue'

const routes = [
  { path: '/', redirect: '/produtos' },
  { path: '/produtos', name: 'produtos', component: ProductsView },
  { path: '/consignacoes', name: 'consignacoes', component: ConsignmentsView }
]

export default createRouter({
  history: createWebHashHistory(),
  routes
})
