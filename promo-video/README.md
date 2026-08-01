# DataCube AI — Promo Video (Remotion)

Remotion project for the product promo video.

## ⚠️ Generated artifacts removed 2026-08-02

The previously rendered voiceover MP3s (`public/audio/promo/`), the audio
manifest, and the rendered MP4 (`public/video/datacube-promo.mp4`) were
removed: they were generated in 2026-02 and contained claims that are no
longer true (real-time stock data — paused for licensing, see
`docs/data-rights.md`; "22 sources / 14 Reddit communities / two
languages" — the product now has 35+ curated sources and 8 languages).

The scene sources (`remotion/promo-scenes.json`, `src/scenes/*`) are
up to date. **Regenerate before any use:**

```bash
# 1. Voiceover (needs ELEVENLABS_API_KEY in promo-video/.env.local)
node scripts/generate-voiceover.js

# 2. Render
npm install
npx remotion render DataCubePromo out/promo.mp4
```

`public/video/thumbnail.png` (brand card) is current and kept.
