const client = `"use client";
import { label } from "@/lib/label";
export const renderedLabel = label;`;

export const allowedSources: Record<string, string> = {
  "src/app/client.tsx": client,
  "src/lib/label.ts": 'export const label = "Homebrew";',
  "src/server/llm/provider.ts": `import "server-only";
import OpenAI from "openai";
export const adapter = OpenAI;`,
};

export const importViolations: Array<{ name: string; sources: Record<string, string> }> = [
  {
    name: "static openai import outside the LLM directory",
    sources: { "src/lib/provider.ts": 'import OpenAI from "openai"; export const adapter = OpenAI;' },
  },
  {
    name: "dynamic openai import outside the LLM directory",
    sources: { "src/app/api/example/route.ts": 'export const load = () => import("openai");' },
  },
  {
    name: "CommonJS openai import outside the LLM directory",
    sources: { "src/lib/provider.cjs": 'module.exports = require("openai");' },
  },
  {
    name: "openai re-export outside the LLM directory",
    sources: { "src/lib/provider.ts": 'export { default as OpenAI } from "openai";' },
  },
  {
    name: "openai package subpath outside the LLM directory",
    sources: { "src/lib/provider.ts": 'import { APIError } from "openai/error"; export const error = APIError;' },
  },
  {
    name: "lookalike llm directory",
    sources: { "src/server/llm-extra/provider.ts": 'import "server-only"; import OpenAI from "openai"; export const adapter = OpenAI;' },
  },
  {
    name: "LLM adapter missing a server-only boundary",
    sources: { "src/server/llm/provider.ts": 'import OpenAI from "openai"; export const adapter = OpenAI;' },
  },
  {
    name: "client importing openai directly",
    sources: { "src/app/client.tsx": '"use client"; import OpenAI from "openai"; export const adapter = OpenAI;' },
  },
  {
    name: "client importing the server-only LLM adapter",
    sources: {
      ...allowedSources,
      "src/app/client.tsx": '"use client"; import { adapter } from "@/server/llm/provider"; export const exposed = adapter;',
    },
  },
  {
    name: "transitive client import of privileged database operations through an alias and barrel",
    sources: {
      "src/app/client.tsx": '"use client"; import { createAccount } from "@/lib/barrel"; export const action = createAccount;',
      "src/lib/barrel.ts": 'export { createAccount } from "../server/accounts";',
      "src/server/accounts.ts": `import "server-only";
export function createAccount(client: any) { return client.auth.admin.createUser({ email: "synthetic@example.com" }); }`,
    },
  },
];

export const safeClientArtifacts = {
  ".next/static/chunks/public.js": 'window.config={url:"http://127.0.0.1:54321",key:"synthetic-public-local-key"};',
};

export const privilegedArtifacts = [
  { name: "openai code", content: 'var adapter = require("openai"); adapter.create();' },
  { name: "privileged database operations", content: 'function create(client){return client.auth.admin.createUser({email:"synthetic@example.com"});}' },
];
