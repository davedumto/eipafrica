# EIP Africa – landing page bundle

| Path | What it is |
|---|---|
| `index.html` | The finished landing page as one standalone file (HTML + CSS + JS). Source of truth for look and behaviour. |
| `models/*.glb` | Web-optimised 3D models, meshopt-compressed (thermal plant, dam, pylon, wind turbine). |
| `models/plain/*.glb` | Same models without meshopt, used as an automatic fallback when WebAssembly is blocked. |
| `PROMPTS.md` | Prompts for an AI coding agent to port this page to Next.js + Tailwind with identical output. |
| `CREDITS.md` | Model licences and the attribution you must publish somewhere on the site. |

## Run it locally

```bash
npx serve .          # or: python3 -m http.server 8080
```

Open the printed URL. It must be served over http(s); opening `index.html` from the file system will fail to load the models.
Three.js (r160) and the fonts load from public CDNs (jsDelivr, Google Fonts).

## Notes
- All listing data on the page is sample data and is labelled as such.
- The wind turbine model is a single merged mesh, so the blades cannot spin.
- The 3D scenes load in this order: thermal plant first, then dam, pylon and turbine in parallel.
