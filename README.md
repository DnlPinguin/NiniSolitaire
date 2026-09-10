# Ninis Spieleecke 🐾💖

Ein kleines Geburtstagsgeschenk: Solitaire (Klondike) mit Hundefotos, gebaut mit Nuxt.

## Starten

```bash
npm install --legacy-peer-deps
npm run dev
```

Läuft dann auf http://localhost:3000

## Was drin ist

- **Solitaire (Klondike)** – Ziehen wahlweise 1 oder 3 Karten, Rückgängig über das ganze Spiel,
  Ziehen per Maus **und** Touch (Drag & Drop), Doppelklick legt automatisch ab.
- **Geburtstagskarte** – interaktive, mehrseitige Karte beim ersten Öffnen
  (gemerkt im Cookie `nini-geburtstagskarte`); über 💌 oben rechts jederzeit erneut ansehbar.
- **Animationen** – Karten fliegen zum Deck zurück, das Deck riffelt, dann wird neu ausgeteilt.
- **Töne** – komplett per Web Audio API erzeugt, keine Audiodateien. Stummschalter oben rechts.
- **Teilen ohne Server** – die komplette Spielstellung steckt in der URL (`?g=…`),
  ein Byte pro Karte. Keine Datenbank.
- **Hundefotos** – 28 freigestellte Welpen in `public/pups/`.

## Struktur

| Pfad | Inhalt |
| --- | --- |
| `pages/index.vue` | das Spiel (Startseite) |
| `pages/games/solitaire.vue` | Weiterleitung für ältere Teilen-Links |
| `composables/useSolitaire.ts` | Spiellogik, Rückgängig, Teilen-Codes |
| `composables/useSounds.ts` | Klangerzeugung |
| `components/PlayingCard.vue` | Spielkarte |
| `components/BirthdayCard.vue` | Geburtstagskarte |
| `parked/` | stillgelegt: Spiele-Hub und ein Bilderrätsel (auskommentiert, nicht gelöscht) |
