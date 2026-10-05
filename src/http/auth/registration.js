/**
 * Builds the RFC 7591 Dynamic Client Registration response for a public
 * client. `client_secret` is omitted rather than set to null: RFC 7591 defines
 * it as a string when present, and strict clients (including the MCP SDK's
 * OAuthClientInformationFullSchema) reject a null value and abort the flow.
 */
export function buildRegistrationResponse({ clientId, redirectUri, clientName }) {
  return {
    client_id: clientId,
    redirect_uris: redirectUri ? [redirectUri] : [],
    client_name: clientName || "MCP Client",
    token_endpoint_auth_method: "none",
    grant_types: ["authorization_code", "refresh_token"],
    response_types: ["code"],
  };
}
