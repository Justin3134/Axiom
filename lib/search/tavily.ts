import { tavily } from "@tavily/core"

const client = tavily({ apiKey: process.env.TAVILY_API_KEY! })

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

  try {
    const response = await client.search(
      `${domain} research: ${hypothesis.slice(0, 200)}`,
      {
        searchDepth: "advanced",
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
    )

    return (response.results || []).map((r) => ({
      title: r.title || "",
      url: r.url || "",
      content: r.content || "",
      score: r.score || 0,
    }))
  } catch {
    // Non-fatal — experiment proceeds without search context
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
