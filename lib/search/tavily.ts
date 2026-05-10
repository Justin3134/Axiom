import { tavily } from "@tavily/core"

const primaryClient = process.env.TAVILY_API_KEY
  ? tavily({ apiKey: process.env.TAVILY_API_KEY })
  : null
const fallbackClient = process.env.TAVILY_API_KEY_FALLBACK
  ? tavily({ apiKey: process.env.TAVILY_API_KEY_FALLBACK })
  : null

export interface SearchResult {
  title: string
  url: string
  content: string
  score: number
}

// Search for scientific literature relevant to a hypothesis
export async function searchScientificContext(params: {
  hypothesis: string
  domain: string
  maxResults?: number
}): Promise<SearchResult[]> {
  const { hypothesis, domain, maxResults = 5 } = params

  const query = `${domain} research: ${hypothesis.slice(0, 200)}`
  const searchOptions = {
    searchDepth: "advanced" as const,
    maxResults,
    includeDomains: [
      "pubmed.ncbi.nlm.nih.gov",
      "arxiv.org",
      "nature.com",
      "science.org",
      "cell.com",
      "biorxiv.org",
      "scholar.google.com",
      "semanticscholar.org",
    ],
  }

  const toResults = (response: any) =>
    (response?.results || []).map((r: any) => ({
      title: r.title || "",
      url: r.url || "",
      content: r.content || "",
      score: r.score || 0,
    }))

  if (!primaryClient) {
    return []
  }

  try {
    return toResults(await primaryClient.search(query, searchOptions))
  } catch {
    if (fallbackClient) {
      try {
        return toResults(await fallbackClient.search(query, searchOptions))
      } catch {
        // Non-fatal — experiment proceeds without search context
      }
    }
    return []
  }
}

// Format search results into a concise context string for LLM consumption
export function formatSearchContext(results: SearchResult[]): string {
  if (results.length === 0) return ""

  return (
    "\n\nRecent scientific literature:\n" +
    results
      .map(
        (r, i) =>
          `[${i + 1}] ${r.title}\n${r.content.slice(0, 300)}...`
      )
      .join("\n\n")
  )
}
