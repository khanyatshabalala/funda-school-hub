# Netlify Deployment Guide - Funda School Hub

## Quick Start

### 1. Connect Your Repository
- Go to [Netlify](https://netlify.com)
- Click "Add new site" → "Import an existing project"
- Connect your GitHub repository (Khanya Mgebisa/funda-school-hub)
- Choose your main branch

### 2. Build Settings (Automatically Detected)
Netlify will automatically detect:
- **Build command**: `npm run build`
- **Publish directory**: `dist/client`
- **Node version**: 20.x

### 3. Environment Variables
Add these environment variables in Netlify Dashboard → Site settings → Build & deploy → Environment:

```
VITE_SUPABASE_URL=https://pbhppoanxwbbbinrcwdj.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_zgBoK5MCB1gJoMypsNf10A_n8SHK38V
SUPABASE_URL=https://pbhppoanxwbbbinrcwdj.supabase.co
SUPABASE_PUBLISHABLE_KEY=sb_publishable_zgBoK5MCB1gJoMypsNf10A_n8SHK38V
VITE_VAPID_PUBLIC_KEY=BIVGT0FWfqCGs0KoGOvDVTVTCT3KPjPu7S_Ltvlu33afMDeSUTVigG3V2nl52oT4fVSI6JnecbE7HvQPBzAQ2Rc
```

### 4. Deploy
Simply push to your main branch, and Netlify will automatically:
- Build your project
- Run `npm run build`
- Deploy the `dist/client` folder
- Assign a live URL

## Important Notes

### Current Setup
- ✅ Client-side build is fully optimized for Netlify
- ⚠️ Server-side rendering (SSR) from TanStack Start won't work with current Cloudflare Workers config
- ✅ All API calls to Supabase will work through VITE environment variables

### What Works
- Full React router with TanStack Router
- All UI components and pages
- Supabase integration (auth, database, real-time)
- Web push notifications
- Mobile-responsive design

### Limitations with Current Setup
- SSR/Server-side rendering features are limited
- If you need server-side functions, you'll need Netlify Functions (see Advanced Deployment)

## Monitoring & Debugging

### View Logs
- Dashboard → Deploys → Select deployment → Deploy log

### Common Issues
1. **Build fails**: Check Node.js version (should be 20+)
2. **Missing environment variables**: Verify all VITE_* and SUPABASE_* vars are set
3. **Blank page**: Check browser console for errors (F12)

## Domain Setup
1. Dashboard → Site settings → Domain management
2. Add custom domain or use `*.netlify.app` domain

## Continuous Deployment
Deployments happen automatically when you:
- Push to main branch
- Merge a pull request to main
- You can also trigger manual deploys in Dashboard → Deploys

## Advanced: Adding Server Functions

If you need server-side rendering or backend logic, create `netlify/functions/` directory:

```
netlify/
└── functions/
    └── api.js  # Handles /api/* routes
```

See: https://docs.netlify.com/functions/overview/
