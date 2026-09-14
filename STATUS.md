# Project Status

As of 2026-09-13, we have:

- Prepared the frontend for production by building the Vite project and configuring the Express server to serve the static assets.
- Updated the server to serve the frontend from the `web/dist` directory and fallback to `index.html` for client-side routing.
- Updated the environment variable example for the frontend to point to the production API.
- Pushed the changes to the main branch.

The current commit is: 5862f38 (Rebuild web dist with service photo upload field (Render redeploy))

Notes on the "service photo upload" feature:
- The photo upload markup exists at `web/src/pages/admin/Servicos.jsx` (~lines 140-161, class `service-photo-upload`).
- The production build (`web/dist`) was rebuilt and contains the feature (bundle `index-BomMqx4-.js`, CSS `index-GWaoARCR.css`).
- The last deploy pushed to GitHub: `5862f38` on `main` (repo: https://github.com/RENANOLIVEIRA01996/BARBERSHOP.git).
- RENDER STATUS: last automatic deploy reported by the user was `2f48ae1` (barber_hours). The commits `c1a5276` and `5862f38` have NOT been deployed yet -> a manual deploy on Render is required (Dashboard -> service -> Deploy latest commit). Check branch = `main` and Auto-Deploy = Yes in Render Settings.

Next steps could include:
- Triggering a manual deploy on Render (Dashboard.render.com -> service -> Deploy -> latest commit).
- After deploy is live: hard reload (`Ctrl+Shift+R`) and check whether the "Foto do serviço" field appears when opening "+ Novo serviço" in /admin/servicos.
- If the field still does not appear after the deploy, investigate CSS hiding the `.service-photo-upload` element:
  1. In the browser console (F12 -> Console) paste the diagnostic snippet that queries `document.querySelector('.service-photo-upload')` and reports `getComputedStyle` (display/visibility/opacity) + `getBoundingClientRect`.
  2. Suspects: `display:none`, `visibility:hidden`, `opacity:0`, zero height/width, offscreen positioning, or an overlapping/parent clip (`overflow:hidden`, `max-height`).
  3. Possible quick fix: temporary debug override in `web/src/styles/globals.css` forcing `display:block !important; visibility:visible !important; opacity:1 !important`.
- Untracked helper scripts (not committed): `server/manual_test.ps1`, `server/test_fixed.ps1`, `server/verify.ps1`, `test_server.ps1`.