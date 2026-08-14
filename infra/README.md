# Infrastructure as Code

Bicep templates for Azure resources that support the StarterKit platform.

## Modules

### `dns-wildcard.bicep`

Provisions wildcard DNS and custom domain binding for subdomain-based tenant routing
(`*yourapp.example.com`).

**Resources created:**

| Resource | Purpose |
|---|---|
| Azure DNS Zone | Public zone for `yourapp.example.com` |
| Wildcard CNAME record | `*yourapp.example.com` → `<webAppName>.azurewebsites.net` |
| TXT verification record | `yourapp.example.com` for App Service domain verification |
| Custom domain binding | Binds `*yourapp.example.com` to the Web App Service |

**Deployment:**

```bash
az deployment group create \
  --resource-group rg-starterkit-dev \
  --template-file infra/dns-wildcard.bicep \
  --parameters @infra/dns-wildcard.parameters.dev.json
```

**Post-deployment steps:**

1. **Delegate NS records** — Copy the `nameServers` output and update your domain registrar's
   NS records for `yourapp.example.com` to point to the Azure DNS Zone.

2. **Provision wildcard TLS certificate** — App Service Managed Certificates do not support
   wildcards. Choose one of:
   - Import a CA-issued wildcard certificate into Azure Key Vault
   - Purchase an App Service Certificate via the Azure portal
   - Automate Let's Encrypt renewal via an Azure Function

3. **Bind the certificate** — Once the cert is available, update the hostname binding:

   ```bash
   az webapp config ssl bind \
     --resource-group rg-starterkit-dev \
     --name <webAppName> \
     --certificate-thumbprint <thumbprint> \
     --ssl-type SNI
   ```
