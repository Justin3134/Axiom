import OpenAI from "openai"

// OpenAI-compatible client pointed at Blaxel sandbox-openai model endpoint.
// The BL_API_KEY is passed as the standard Authorization header (apiKey field).
// Sending a separate X-Blaxel-Authorization header alongside Authorization
// causes Blaxel to reject with 401 — the Authorization header takes precedence.
const apiKey = process.env.BL_API_KEY ?? process.env.OPENAI_API_KEY
const defaultHeaders = {
  "X-Blaxel-Workspace": process.env.BL_WORKSPACE ?? "axiom",
}

let openAiClient: OpenAI | null = null
function getOpenAiClient() {
  if (!openAiClient) {
    if (!apiKey) {
      return null
    }
    openAiClient = new OpenAI({
      apiKey,
      baseURL: "https://run.blaxel.ai/axiom/models/sandbox-openai/v1",
      defaultHeaders,
    })
  }
  return openAiClient
}

export const doClient = new Proxy({} as OpenAI, {
  get(_target, prop) {
    const client = getOpenAiClient()
    if (!client) {
      throw new Error(
        "Missing OpenAI credentials. Set BL_API_KEY or OPENAI_API_KEY to use AI functionality.",
      )
    }
    const value = (client as any)[prop]
    return typeof value === "function" ? value.bind(client) : value
  },
}) as OpenAI

export const REASONING_MODEL = "gpt-4o"
export const CODE_MODEL = "gpt-4o-mini"
