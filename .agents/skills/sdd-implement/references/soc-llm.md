# SoC LLM implementation

Use for features that call SoC or process its output.

- Call the configured SoC endpoint with OpenAI-compatible POST
  `/v1/chat/completions` from server-only code. Read base URL, model, and credential
  configuration from existing code; do not invent model identifiers or substitute
  OpenAI's public API. Compose the URL with exactly one `/v1` segment.
- Verify provider capabilities before relying on streaming, tool calling, or
  structured output. Do not assume Responses API support.
- Handle timeouts, cancellation, non-success responses, rate limits, and malformed
  output; bound retries and return safe errors.
- Treat prompts and model output as untrusted data. Validate structured output
  with Zod. Authorization and database mutations belong in deterministic code;
  model output cannot grant permissions.
- Keep credentials out of client bundles, logs, and error responses. Do not log
  private prompts. Do not make paid/live requests for verification; run existing
  mocked checks where available and hand missing coverage to the testing agent.
