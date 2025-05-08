import './assets/styles/_all.scss'
import '@material-symbols/font-400/outlined.css';

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import { addNotificationListener, query } from './Comms'

addNotificationListener("themeChanged", ({ value }) => {
    document.body.classList.toggle('dark-theme', value === 'dark');
});

query("getTheme").then((theme) => {
    document.body.classList.toggle('dark-theme', theme === 'dark');
})


// Create and mount the Vue app
const app = createApp(App)
const pinia = createPinia()
app.use(pinia)
app.mount('#app')
