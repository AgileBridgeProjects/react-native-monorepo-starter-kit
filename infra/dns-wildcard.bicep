// ─── Wildcard DNS + TLS for subdomain-based tenant routing ────────────────────
//
// This module provisions:
//   1. An Azure DNS Zone for the base domain (yourapp.example.com)
//   2. A wildcard CNAME record (*yourapp.example.com → Web App Service)
//   3. A wildcard custom domain binding on the Web App Service
//
// NOTE: TLS certificate provisioning is NOT included here.
// App Service Managed Certificates do not support wildcards — see the
// "Note on wildcard TLS" section below for the available options.
//
// Prerequisites:
//   - The domain's NS records must be delegated to the Azure DNS Zone name servers.
//   - The Web App Service must already exist (referenced by name).
//
// Usage:
//   az deployment group create \
//     --resource-group <rg> \
//     --template-file infra/dns-wildcard.bicep \
//     --parameters baseDomain=yourapp.example.com webAppName=<app-service-name>
//
// Note on wildcard TLS:
//   Azure App Service Managed Certificates do NOT support wildcard domains.
//   This template sets up the DNS zone and custom domain binding. For the TLS
//   certificate, choose one of:
//     a) Import a CA-issued wildcard cert into Key Vault (recommended for prod)
//     b) Use an App Service Certificate (purchased through Azure portal)
//     c) Automate Let's Encrypt via a Function App or external renewal tool
//   Once the certificate is in Key Vault, uncomment the sslBinding section below.
// ──────────────────────────────────────────────────────────────────────────────

@description('Base domain for the StarterKit admin portal (e.g. yourapp.example.com)')
param baseDomain string

@description('Name of the existing Web App Service hosting the admin portal')
param webAppName string

// ─── DNS Zone ─────────────────────────────────────────────────────────────────

resource dnsZone 'Microsoft.Network/dnsZones@2023-07-01-preview' = {
  name: baseDomain
  location: 'global'
  properties: {
    zoneType: 'Public'
  }
}

// ─── Wildcard CNAME → Web App default hostname ───────────────────────────────

resource wildcardCname 'Microsoft.Network/dnsZones/CNAME@2023-07-01-preview' = {
  parent: dnsZone
  name: '*'
  properties: {
    TTL: 3600
    CNAMERecord: {
      cname: '${webAppName}.azurewebsites.net'
    }
  }
}

// ─── TXT verification record (required by App Service custom domain binding) ─

resource verificationTxt 'Microsoft.Network/dnsZones/TXT@2023-07-01-preview' = {
  parent: dnsZone
  name: 'asuid'
  properties: {
    TTL: 3600
    TXTRecords: [
      {
        value: [
          webApp.properties.customDomainVerificationId
        ]
      }
    ]
  }
}

// ─── Reference to existing Web App ───────────────────────────────────────────

resource webApp 'Microsoft.Web/sites@2023-12-01' existing = {
  name: webAppName
}

// ─── Wildcard custom domain binding on the Web App ───────────────────────────

resource wildcardHostname 'Microsoft.Web/sites/hostNameBindings@2023-12-01' = {
  parent: webApp
  name: '*.${baseDomain}'
  properties: {
    siteName: webAppName
    hostNameType: 'Verified'
    // SSL binding is configured separately after the certificate is provisioned.
    // Uncomment the following once a wildcard certificate is available in Key Vault:
    // sslState: 'SniEnabled'
    // thumbprint: <certificate-thumbprint>
  }
}

// ─── Outputs ─────────────────────────────────────────────────────────────────

@description('Azure DNS Zone name servers — delegate these at your domain registrar')
output nameServers array = dnsZone.properties.nameServers

@description('Custom domain verification ID for the Web App')
output domainVerificationId string = webApp.properties.customDomainVerificationId

@description('Wildcard hostname bound to the Web App')
output wildcardHostname string = '*.${baseDomain}'
