import OpenAI from "openai"

// OpenAI-compatible client pointed at Blaxel sandbox-openai model endpoint.
// The BL_API_KEY is passed as the standard Authorization header (apiKey field).
// Sending a separate X-Blaxel-Authorization header alongside Authorization
// causes Blaxel to reject with 401 — the Authorization header takes precedence.
export const doClient = new OpenAI({
  apiKey: process.env.BL_API_KEY,
  baseURL: "https://run.blaxel.ai/axiom/models/sandbox-openai/v1",
  defaultHeaders: {
    "X-Blaxel-Workspace": process.env.BL_WORKSPACE ?? "axiom",
  },
})

export const REASONING_MODEL = "gpt-4o"
export const CODE_MODEL = "gpt-4o-mini"
