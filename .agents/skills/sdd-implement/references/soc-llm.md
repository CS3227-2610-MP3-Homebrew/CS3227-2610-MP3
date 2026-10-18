# SoC LLM implementation

Use for features that call SoC or process its output. The authoritative transport,
prompt, schema, configuration and failure contracts are in
[INTEGRATION-SPEC.md](../../../../workflow/specs/INTEGRATION-SPEC.md#soclaas-transport).
Read its applicable sections before implementing; this reference does not extend
provider capabilities or override the contract.

- Route all calls through server-only `src/server/llm/` to the configured
  OpenAI-compatible `/v1/chat/completions` endpoint, with exactly one `/v1`.
  Use the configured destination/model and `SOCLAAS_API_KEY`; never substitute
  OpenAI's public API or accept caller-selected transport configuration.
- Use non-streaming requests, no tools, no `response_format`, and zero automatic
  retries, including SDK retries. Follow the contract's action/attempt limits,
  admission checks, cancellation, timeouts and safe role fallbacks; failure stops
  the action. Do not probe live capabilities to change these rules.
- Keep fixed prompts separate from untrusted data. Parse and validate complete
  plain JSON output with the contract's server-side Zod schemas and permitted
  source IDs. Authorization and database mutations remain deterministic;
  model output cannot grant permissions.
- Keep credentials and private prompts out of client bundles, logs and errors.
  Verify only with mocks or the fake provider; report acceptance-coverage gaps
  to the testing agent. Never make a live LLM call.
