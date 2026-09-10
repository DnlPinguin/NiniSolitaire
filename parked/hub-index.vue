<!--
  ============================================================
  HUB / SPIELE-ÜBERSICHT — vorerst stillgelegt (2026-09-10)
  ------------------------------------------------------------
  Die App startet jetzt direkt mit Solitaire (pages/index.vue).
  Zum Reaktivieren: Kommentar entfernen, Datei nach
  pages/index.vue verschieben und das Spiel wieder unter
  pages/games/solitaire.vue ablegen. Die Tab-Bar in app.vue
  ist ebenfalls auskommentiert.
  ============================================================

<script setup lang="ts">
const game = {
  slug: 'solitaire',
  title: 'Solitaire',
  subtitle: 'Klondike mit Hunden',
  badge: '🔥 Beliebt',
  note: 'Klassiker geht immer',
  img: '/pups/pup-11.webp'
}
</script>

<template>
  <main class="container">
    <section class="hero">
      <div class="hero-top">
        <div>
          <h1 class="brand">Ninis <span>Spieleecke</span> 💖</h1>
          <p class="tagline">Spielen. Entspannen. Glücklich sein. ♡</p>
        </div>
        <span class="btn hero-btn">🎮 Spiele</span>
      </div>

      <div class="hero-body">
        <h2>Alles Gute zum<br>Geburtstag, Nini! 🎂</h2>
        <p>Was Kleines für dich – falls du mal<br>ein bisschen Ablenkung brauchst. ♡</p>
        <span class="script fun">✧ Viel Spaß! ♡</span>
      </div>

      <span class="blob b1" /><span class="blob b2" /><span class="blob b3" />
      <span class="h-heart h1">💗</span><span class="h-heart h2">🩷</span><span class="h-heart h3">💕</span>
    </section>

    <section class="grid">
      <NuxtLink :to="`/games/${game.slug}`" class="tile live">
        <span class="pill pill-hot">{{ game.badge }}</span>
        <div class="art">
          <img :src="game.img" alt="" draggable="false">
          <span class="sparkle s1">✦</span><span class="sparkle s2">✧</span>
        </div>
        <h3>{{ game.title }}</h3>
        <p>{{ game.subtitle }}</p>
        <span class="btn btn-primary play">Spielen →</span>
        <span class="script note">{{ game.note }} ♡</span>
      </NuxtLink>
    </section>

    <div class="quote">
      <span class="q-heart">💗</span>
      <span class="script q-text">„Kleine Spiele, große Glücksmomente.“</span>
      <span class="q-heart">♡</span>
    </div>
  </main>
</template>

<style scoped>
/* ---------- Hero ---------- */
.hero {
  position: relative;
  overflow: hidden;
  margin: 14px 0 20px;
  padding: 20px 20px 28px;
  border-radius: 30px;
  color: #fff;
  background:
    radial-gradient(120% 120% at 85% 20%, #ff9ecd 0%, transparent 55%),
    linear-gradient(150deg, #8a1450 0%, #b52070 45%, #f0629f 100%);
  box-shadow: var(--shadow);
}
.hero-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 14px; position: relative; z-index: 2; }
.brand { margin: 0; font-size: clamp(21px, 5.4vw, 30px); white-space: nowrap; }
.brand span { color: #ffb3d8; }
.tagline { margin: 4px 0 0; font-family: 'Caveat', cursive; font-size: 17px; opacity: .92; white-space: nowrap; }
.hero-btn { font-size: 14px; padding: 9px 15px; white-space: nowrap; flex: none; }

.hero-body { position: relative; z-index: 2; margin-top: 34px; max-width: 66%; }
.hero-body h2 { margin: 0; font-size: clamp(24px, 6.5vw, 36px); line-height: 1.15; }
.hero-body p { margin: 10px 0 0; opacity: .9; font-size: 15px; }
.fun { display: inline-block; margin-top: 14px; color: #fff; transform: rotate(-7deg); }

.blob { position: absolute; border-radius: 50%; filter: blur(2px); opacity: .5; }
.b1 { width: 120px; height: 120px; right: -30px; bottom: -40px; background: #ffb9d8; }
.b2 { width: 70px; height: 70px; left: -22px; bottom: 20px; background: #ff9cc9; opacity: .35; }
.b3 { width: 150px; height: 150px; right: 30%; top: -70px; background: #ff7fb9; opacity: .3; }
.h-heart { position: absolute; z-index: 1; filter: drop-shadow(0 4px 8px rgba(0,0,0,.18)); }
.h1 { font-size: 28px; right: 22%; top: 30%; }
.h2 { font-size: 22px; right: 7%; top: 48%; }
.h3 { font-size: 17px; right: 12%; top: 22%; opacity: .75; }

/* ---------- 3x3 game grid ---------- */
.grid { display: flex; justify-content: center; margin-bottom: 18px; }
.tile {
  position: relative;
  display: flex; flex-direction: column; align-items: center;
  text-align: center;
  width: 100%; max-width: 330px;
  padding: 22px 20px 24px;
  border-radius: 26px;
  background: var(--card);
  border: 1px solid rgba(255,255,255,.75);
  backdrop-filter: blur(10px);
  box-shadow: var(--shadow);
  transition: transform .18s, box-shadow .18s;
  min-height: 0;
}
.tile.live:hover { transform: translateY(-4px); box-shadow: 0 20px 40px rgba(214,51,132,.26); }

.tile .pill { align-self: center; margin-bottom: 8px; font-size: 11px; padding: 6px 13px; letter-spacing: .08em; }

.art { position: relative; height: 132px; width: 100%; display: grid; place-items: center; margin-bottom: 6px; }
.art img { max-height: 132px; max-width: 92%; object-fit: contain; filter: drop-shadow(0 6px 10px rgba(214,51,132,.22)); }
.sparkle { position: absolute; color: #fff; font-size: 13px; text-shadow: 0 0 8px rgba(246,51,140,.5); }
.s1 { top: 0; right: 10px; }
.s2 { bottom: 2px; left: 8px; font-size: 11px; }

.tile h3 { margin: 0; font-size: 26px; color: var(--plum); line-height: 1.15; }
.tile p { margin: 4px 0 0; font-size: 14px; color: var(--ink-soft); font-weight: 600; line-height: 1.3; }
.play { margin-top: 16px; padding: 12px 30px; font-size: 16px; }
.note { margin-top: 10px; font-size: 17px; transform: rotate(-4deg); }

/* ---------- Quote ---------- */
.quote {
  display: flex; align-items: center; justify-content: center; gap: 12px;
  padding: 18px 20px;
  border-radius: var(--radius);
  background: rgba(255,255,255,.5);
  border: 1px solid rgba(255,255,255,.7);
  box-shadow: var(--shadow);
}
.q-text { font-size: 20px; text-align: center; color: var(--pink-600); }
.q-heart { font-size: 20px; }

@media (max-width: 520px) {
  .tile { padding: 18px 16px 20px; }
  .art { height: 112px; }
  .art img { max-height: 112px; }
  .tile h3 { font-size: 23px; }
  .hero-body { max-width: 100%; }
}
</style>

-->
