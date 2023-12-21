import './assets/main.css'
import 'element-plus/dist/index.css'
import ElementPlus from 'element-plus'
import { createApp } from 'vue'
import App from './App.vue'
import router from './router'

import * as zrender from 'zrender'
import CanvasPainter from 'zrender/lib/canvas/Painter.js'

const { registerPainter } = zrender

registerPainter('canvas', CanvasPainter)

const app = createApp(App)
app.use(ElementPlus)
app.use(router)

app.mount('#app')
