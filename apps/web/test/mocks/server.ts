import { HttpResponse, http } from 'msw';
import { setupServer } from 'msw/node';

// ─── Handlers ────────────────────────────────────────────────────────────────
// Add feature-specific handlers here as new features are built.
// Use factory fixtures from test/factories/ — never inline DTOs.

export const handlers = [
  // Health check — always passes
  http.get('http://localhost:5002/healthz', () => {
    return HttpResponse.json({ status: 'ok' });
  }),
];

export const server = setupServer(...handlers);
