# Deployment Rules

## Platform
Vercel

## Build Process
```bash
npm run build    # TypeScript check + production build (tsc && vite build)
```

## Environment Variables
- `GITHUB_TOKEN` (PAT with `public_repo` scope) - Required for feedback feature

## Serverless Functions
- `/api/feedback` - Vercel serverless function that creates GitHub issues from user feedback

## PWA Configuration
- Service worker configured via `vite-plugin-pwa`
- All data stored client-side (IndexedDB via Dexie, localStorage)
