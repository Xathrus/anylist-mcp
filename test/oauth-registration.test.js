import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { OAuthClientInformationFullSchema } from '@modelcontextprotocol/sdk/shared/auth.js';
import { buildRegistrationResponse } from '../src/http/auth/registration.js';

describe('Dynamic Client Registration response', () => {
  const response = buildRegistrationResponse({
    clientId: 'client-123',
    redirectUri: 'https://chatgpt.com/connector_platform_oauth_redirect',
    clientName: 'ChatGPT',
  });

  it('is accepted by the MCP SDK client schema', () => {
    const result = OAuthClientInformationFullSchema.safeParse(response);
    assert.ok(result.success, JSON.stringify(result.error?.issues));
  });

  it('omits client_secret for public clients instead of sending null', () => {
    assert.equal('client_secret' in response, false);
  });

  it('echoes the redirect URI and uses PKCE-only auth', () => {
    assert.deepEqual(response.redirect_uris, ['https://chatgpt.com/connector_platform_oauth_redirect']);
    assert.equal(response.token_endpoint_auth_method, 'none');
  });

  it('defaults client_name and redirect_uris when not provided', () => {
    const minimal = buildRegistrationResponse({ clientId: 'c' });
    assert.equal(minimal.client_name, 'MCP Client');
    assert.deepEqual(minimal.redirect_uris, []);
  });
});
