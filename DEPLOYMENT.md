# Deployment Guide

This app is configured for easy deployment to **Vercel**, a free hosting platform perfect for React/Vite apps with automatic HTTPS.

## Why Vercel?

- ✅ **Free HTTPS** - Required for PWA functionality
- ✅ **Automatic deploys** - Push to GitHub and it deploys automatically
- ✅ **Zero configuration** - Works out of the box with Vite
- ✅ **Custom domains** - Add your own domain (optional)
- ✅ **Global CDN** - Fast loading worldwide

## Quick Deploy to Vercel

### Option 1: GitHub Integration (Recommended)

1. **Push your code to GitHub** (if you haven't already)
   ```bash
   git push origin main
   ```

2. **Go to [Vercel](https://vercel.com/)**
   - Sign up/login with your GitHub account

3. **Import your repository**
   - Click "Add New..." → "Project"
   - Select your `home-fitness-tracker` repository
   - Click "Import"

4. **Deploy**
   - Vercel will auto-detect it's a Vite project
   - Click "Deploy"
   - Wait 1-2 minutes

5. **Done!**
   - Your app will be live at `https://your-app-name.vercel.app`
   - Every push to `main` branch will auto-deploy

### Option 2: Vercel CLI

1. **Install Vercel CLI**
   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel**
   ```bash
   vercel login
   ```

3. **Deploy**
   ```bash
   vercel
   ```
   - Follow the prompts
   - Accept defaults (Vite framework detected automatically)

4. **Deploy to production**
   ```bash
   vercel --prod
   ```

## After Deployment

### Test PWA Features

Once deployed to HTTPS, test these PWA features on your phone:

1. **Install Button** - Should appear in Settings page
2. **Offline Mode** - Should work after first visit
3. **Add to Home Screen** - Should see browser prompt (Chrome/Edge)

### Custom Domain (Optional)

In Vercel dashboard:
1. Go to your project → Settings → Domains
2. Add your domain (e.g., `fitness.example.com`)
3. Follow DNS configuration instructions

## Alternative Free Hosting Options

### Netlify
- Similar to Vercel, also excellent
- Deploy: Drop the `dist` folder after running `npm run build`
- Auto HTTPS included

### GitHub Pages
- Good for static sites
- Requires some configuration for SPA routing
- Follow [Vite GitHub Pages guide](https://vitejs.dev/guide/static-deploy.html#github-pages)

## Troubleshooting

### Issue: Routes don't work (404 on refresh)

**Solution**: The `vercel.json` file already handles this with SPA rewrites.

### Issue: PWA not working

**Cause**: You're accessing via HTTP instead of HTTPS
**Solution**: Always use the `https://` URL provided by Vercel

### Issue: Service Worker not updating

**Solution**: Hard refresh (Ctrl+Shift+R) or clear browser cache

## Local Testing

To test the production build locally:

```bash
npm run build
npm run preview
```

Access at `http://localhost:4173` (note: PWA features require HTTPS in production)

## Environment Variables

This app doesn't currently use environment variables, but if you add them:

1. Go to Vercel Dashboard → Project → Settings → Environment Variables
2. Add your variables
3. Redeploy

## Support

- [Vercel Documentation](https://vercel.com/docs)
- [Vite Deployment Guide](https://vitejs.dev/guide/static-deploy.html)
