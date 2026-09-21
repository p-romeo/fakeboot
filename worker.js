// assets worker: serve a minimal MCP endpoint for Cloudflare's injected
// WebMCP bridge (it POSTs tools/list at /mcp on every page load); everything
// else falls through to the static assets binding.
export default {
  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === "/mcp") {
      return new Response(
        JSON.stringify({ jsonrpc: "2.0", id: null, result: { tools: [] } }) + "\n",
        { headers: { "content-type": "application/json", "cache-control": "no-store" } }
      );
    }
    return env.ASSETS.fetch(request);
  },
};
