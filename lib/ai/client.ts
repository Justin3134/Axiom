import OpenAI from "openai"

// Single OpenAI-compatible client pointed at DigitalOcean Serverless Inference
export const doClient = new OpenAI({
  apiKey: process.env.DO_API_KEY!,
  baseURL: "https://inference.do-ai.run/v1",
})

// Models — DO-hosted, billed directly by DigitalOcean (no BYO key required)
export const REASONING_MODEL = "openai-gpt-oss-120b"
export const CODE_MODEL = "openai-gpt-oss-20b"
