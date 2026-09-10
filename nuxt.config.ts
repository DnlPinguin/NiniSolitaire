export default defineNuxtConfig({
  compatibilityDate: '2025-01-01',
  devtools: { enabled: false },
  css: ['~/assets/css/main.css'],
  app: {
    head: {
      title: 'Ninis Spieleecke',
      htmlAttrs: { lang: 'de' },
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no' },
        { name: 'description', content: 'Ein kleines Geburtstagsgeschenk: Solitaire mit ganz vielen Hunden.' },
        { name: 'theme-color', content: '#ffd9ec' },

        /* Vorschau in WhatsApp, Signal, iMessage & Co.
           Absolute Adressen sind Pflicht - relative Pfade werden ignoriert.
           Das Bild ist bewusst JPEG: WebP zeigt WhatsApp oft gar nicht an. */
        { property: 'og:type', content: 'website' },
        { property: 'og:site_name', content: 'Ninis Spieleecke' },
        { property: 'og:title', content: 'Ninis Spieleecke 💖' },
        { property: 'og:description', content: 'Ein kleines Geburtstagsgeschenk: Solitaire mit ganz vielen Hunden.' },
        { property: 'og:url', content: 'https://ninis-ecke.netlify.app/' },
        { property: 'og:locale', content: 'de_DE' },
        { property: 'og:image', content: 'https://ninis-ecke.netlify.app/vorschau.jpg' },
        { property: 'og:image:secure_url', content: 'https://ninis-ecke.netlify.app/vorschau.jpg' },
        { property: 'og:image:type', content: 'image/jpeg' },
        { property: 'og:image:width', content: '1200' },
        { property: 'og:image:height', content: '630' },
        { property: 'og:image:alt', content: 'Ein Hund mit Partyhut, Torte und Blumenstrauß' },

        { name: 'twitter:card', content: 'summary_large_image' },
        { name: 'twitter:title', content: 'Ninis Spieleecke 💖' },
        { name: 'twitter:description', content: 'Ein kleines Geburtstagsgeschenk: Solitaire mit ganz vielen Hunden.' },
        { name: 'twitter:image', content: 'https://ninis-ecke.netlify.app/vorschau.jpg' }
      ],
      link: [{ rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }]
    }
  }
})
