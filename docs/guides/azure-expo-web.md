# Azure Setup for Expo Web Deployment

The Expo app builds for web as a static site (HTML/CSS/JS). We host it on
**Azure Static Web Apps** — a purpose-built service for static sites with a free tier,
built-in CDN, automatic SSL, and native GitHub Actions integration.

This is separate from the Next.js web app which runs on Azure App Service with Docker.

---

## Prerequisites

- Azure CLI installed and logged in: `az login`
- Access to the project's Azure subscription and resource group
- GitHub repository admin access (for adding secrets)

---

## 1. Check Existing Azure Resources

Before creating anything, see what you already have:

```bash
# List all resources in your resource group
az resource list --resource-group <RESOURCE_GROUP> --output table

# List existing Static Web Apps (if any)
az staticwebapp list --output table
```

Replace `<RESOURCE_GROUP>` with your actual resource group name (stored in GitHub as
`vars.AZURE_RESOURCE_GROUP`).

---

## 2. Create the Azure Static Web App

```bash
az staticwebapp create \
  --name starterkit-expo-web-dev \
  --resource-group <RESOURCE_GROUP> \
  --location "East US 2" \
  --sku Free
```

**Notes:**

- The `Free` SKU includes: 2 custom domains, 100 GB bandwidth/month, built-in CDN, auto SSL
- Location should be close to your users — use `az account list-locations -o table` to see options
- The name must be globally unique across all Azure Static Web Apps

---

## 3. Get the Deployment Token

The deployment token authenticates the GitHub Actions workflow to upload files.

### Via Azure CLI

```bash
az staticwebapp secrets list \
  --name starterkit-expo-web-dev \
  --resource-group <RESOURCE_GROUP> \
  --query "properties.apiKey" \
  --output tsv
```

### Via Azure Portal

1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to your Static Web App resource (`starterkit-expo-web-dev`)
3. In the left sidebar, click **Manage deployment token**
4. Copy the token

### Add to GitHub

Go to your GitHub repo > **Settings** > **Environments** > **dev** > **Environment secrets** and add:

| Secret name | Value |
|---|---|
| `AZURE_STATIC_WEB_APPS_API_TOKEN_EXPO` | The deployment token from above |

---

## 4. Custom Domain (Optional)

### Add a custom domain

1. In Azure Portal > your Static Web App > **Custom domains**
2. Click **+ Add**
3. Enter your domain (e.g., `app.starterkit.dev`)
4. Azure provides a CNAME target — add this as a CNAME record with your DNS provider:

   ```text
   app.starterkit.dev  CNAME  <your-swa-hostname>.azurestaticapps.net
   ```

5. Azure automatically provisions a free SSL certificate once DNS propagates

### Via CLI

```bash
az staticwebapp hostname set \
  --name starterkit-expo-web-dev \
  --resource-group <RESOURCE_GROUP> \
  --hostname app.starterkit.dev
```

---

## 5. Local Testing

### Build and preview locally

```bash
cd apps/expo

# Export the web build
npx expo export --platform web

# Preview with a local static server
npx serve dist
```

Open `http://localhost:3000` to verify the app works.

### Test with Azure SWA CLI (optional)

The SWA CLI provides a local dev experience closer to production:

```bash
# Install SWA CLI
npm install -g @azure/static-web-apps-cli

# Serve the exported build
swa start apps/expo/dist
```

---

## 6. How the Pipeline Works

The `deploy-expo-web-azure-dev.yml` workflow:

1. **Triggers** on push to `dev` branch (when `apps/expo/` or `packages/shared/` files change)
   or via manual dispatch
2. **Installs** dependencies (`npm ci` at monorepo root)
3. **Exports** the Expo web build: `npx expo export --platform web` → `apps/expo/dist/`
4. **Copies** `staticwebapp.config.json` into `dist/` (SPA routing config)
5. **Uploads** the `dist/` directory to Azure Static Web Apps

The `staticwebapp.config.json` configures navigation fallback so all routes resolve to
`index.html`, which is required for Expo Router's client-side routing.

---

## 7. Environment Variables

If the Expo web app needs runtime environment variables (e.g., API base URL), you have two options:

### Option A: Build-time variables (current approach)

Environment variables are baked into the build via Expo's config system. Add them to
`app.json` > `extra` or convert `app.json` to `app.config.ts` for dynamic values:

```typescript
// app.config.ts (if converted from app.json)
export default {
  expo: {
    // ... existing config
    extra: {
      apiBaseUrl: process.env.API_BASE_URL ?? 'https://api-dev.starterkit.dev',
    },
  },
};
```

Access in code via `Constants.expoConfig?.extra?.apiBaseUrl`.

### Option B: Azure SWA environment variables

Azure Static Web Apps can inject environment variables, but they are only available to
API functions (not the static frontend). For a static site, Option A is the way to go.

---

## 8. Resource Summary

After completing this guide, you will have added:

| Azure Resource | Type | SKU | Purpose |
|---|---|---|---|
| `starterkit-expo-web-dev` | Static Web App | Free | Hosts the Expo web build |

| GitHub Secret | Environment | Purpose |
|---|---|---|
| `AZURE_STATIC_WEB_APPS_API_TOKEN_EXPO` | `dev` | Authenticates SWA deployments |

---

## 9. Troubleshooting

### "Deployment token is invalid"

- Regenerate the token in Azure Portal > Static Web App > Manage deployment token
- Update the `AZURE_STATIC_WEB_APPS_API_TOKEN_EXPO` secret in GitHub

### "404 on page refresh"

- Ensure `staticwebapp.config.json` is present in the `dist/` directory
- The pipeline copies it automatically; for local testing, copy it manually

### "Build fails: npx expo export"

- Run `npx expo export --platform web` locally to see the full error
- Common cause: a native module imported on web without a `.web.tsx` fallback
- Check the [Expo web compatibility docs](https://docs.expo.dev/workflow/web/)

### "Static Web App shows old content"

- Azure SWA has a CDN cache — it usually updates within minutes
- Force refresh in browser: Ctrl+Shift+R / Cmd+Shift+R
- Check the GitHub Actions run to confirm the latest deployment succeeded
