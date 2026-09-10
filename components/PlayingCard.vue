<script setup lang="ts">
import { isRed, pupSrcFor, RANK_LABELS, type Card } from '~/composables/useSolitaire'

const props = defineProps<{
  card: Card
  selected?: boolean
  hinted?: boolean
  dragging?: boolean
}>()

const label = computed(() => RANK_LABELS[props.card.rank])
const red = computed(() => isRed(props.card.suit))
const pupSrc = computed(() => pupSrcFor(props.card))
</script>

<template>
  <div class="card" :class="{ down: !card.faceUp, red, selected, hinted, dragging }">
    <template v-if="card.faceUp">
      <div class="head">
        <span class="rank">{{ label }}</span>
        <span class="suit">{{ card.suit }}</span>
      </div>
      <div class="photo"><img :src="pupSrc" alt="" draggable="false" decoding="async"></div>
    </template>
    <span v-else class="paw">🐾</span>
  </div>
</template>

<style scoped>
.card {
  width: var(--card-w);
  height: var(--card-h);
  border-radius: 12px;
  background: #fff;
  color: #3f2233;
  border: 2px solid #fff;
  box-shadow: 0 6px 14px rgba(214, 51, 132, .22);
  position: relative;
  overflow: hidden;
  user-select: none;
  -webkit-user-select: none;
  touch-action: none;
  cursor: grab;
  font-weight: 800;
  transition: transform .14s, box-shadow .14s;
}
.card.red { color: var(--pink-500); }

.head {
  display: flex; align-items: center; justify-content: space-between;
  padding: calc(var(--card-w) * .07) calc(var(--card-w) * .1) 0;
  line-height: 1;
}
.rank { font-size: calc(var(--card-w) * .3); font-family: 'Baloo 2', sans-serif; }
.suit { font-size: calc(var(--card-w) * .26); }

.photo {
  position: absolute; left: 3%; right: 3%; bottom: 3%;
  height: 70%;
}
.photo img {
  width: 100%; height: 100%;
  object-fit: contain;      /* never crop the puppy */
  object-position: bottom;
  display: block;
  -webkit-user-drag: none;
  user-select: none;
  filter: drop-shadow(0 2px 3px rgba(122, 18, 70, .18));
}

.card.down {
  background:
    radial-gradient(circle at 22% 26%, rgba(255,255,255,.22) 0 12%, transparent 13%),
    radial-gradient(circle at 78% 72%, rgba(255,255,255,.22) 0 12%, transparent 13%),
    linear-gradient(160deg, #ff7ab8, var(--pink-500));
  display: grid; place-items: center;
  cursor: pointer;
}
.paw { font-size: calc(var(--card-w) * .4); opacity: .55; filter: grayscale(1) brightness(3); }

.card.selected { outline: 3px solid var(--pink-600); outline-offset: -3px; transform: translateY(-5px); }
.card.hinted { animation: pulse 1s ease-in-out infinite; }
.card.dragging { opacity: .32; }

@keyframes pulse {
  0%, 100% { box-shadow: 0 6px 14px rgba(214,51,132,.22); }
  50% { box-shadow: 0 0 0 4px rgba(246,51,140,.55), 0 6px 18px rgba(214,51,132,.35); }
}
</style>
