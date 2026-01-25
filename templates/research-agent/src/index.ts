import Anthropic from "@anthropic-ai/sdk";
import * as fs from "fs";
import * as https from "https";
import * as http from "http";

const client = new Anthropic();

const tools: Anthropic.Tool[] = [
  {
    name: "web_search",
    description: "Search the web for information. Returns a list of relevant results with titles, URLs, and snippets.",
    input_schema: {
      type: "object" as const,
      properties: {
        query: {
          type: "string",
          description: "The search query",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "read_url",
    description: "Fetch and read the content of a web page. Returns the main text content.",
    input_schema: {
      type: "object" as const,
      properties: {
        url: {
          type: "string",
          description: "The URL to read",
        },
      },
      required: ["url"],
    },
  },
  {
    name: "save_report",
    description: "Save the research report to a markdown file",
    input_schema: {
      type: "object" as const,
      properties: {
        filename: {
          type: "string",
          description: "The filename for the report (e.g., 'report.md')",
        },
        content: {
          type: "string",
          description: "The report content in markdown format",
        },
      },
      required: ["filename", "content"],
    },
  },
  {
    name: "read_file",
    description: "Read a local file's contents",
    input_schema: {
      type: "object" as const,
      properties: {
        path: {
          type: "string",
          description: "The file path to read",
        },
      },
      required: ["path"],
    },
  },
];

// Mock web search - in production, integrate with SerpAPI, Brave Search, or similar
function mockWebSearch(query: string): string {
  // This is a mock implementation
  // To add real search, replace with API calls to:
  // - SerpAPI (https://serpapi.com)
  // - Brave Search API (https://brave.com/search/api/)
  // - Google Custom Search API
  return JSON.stringify({
    results: [
      {
        title: `Search result for: ${query}`,
        url: "https://example.com/result1",
        snippet: "This is a mock search result. Integrate with a real search API for production use.",
      },
      {
        title: `Another result for: ${query}`,
        url: "https://example.com/result2",
        snippet: "Consider using SerpAPI, Brave Search API, or similar services.",
      },
    ],
    note: "This is mock data. Set SEARCH_API_KEY environment variable and update this function for real results.",
  });
}

// Basic URL fetcher with HTML to text conversion
function fetchUrl(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith("https") ? https : http;

    const request = protocol.get(url, { timeout: 10000 }, (res) => {
      // Handle redirects
      if (res.statusCode === 301 || res.statusCode === 302) {
        const redirectUrl = res.headers.location;
        if (redirectUrl) {
          fetchUrl(redirectUrl).then(resolve).catch(reject);
          return;
        }
      }

      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode}`));
        return;
      }

      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        // Basic HTML to text conversion
        const text = data
          .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
          .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
          .replace(/<[^>]+>/g, " ")
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 10000); // Limit content length
        resolve(text || "(empty page)");
      });
    });

    request.on("error", reject);
    request.on("timeout", () => {
      request.destroy();
      reject(new Error("Request timed out"));
    });
  });
}

async function executeTool(name: string, input: Record<string, unknown>): Promise<string> {
  switch (name) {
    case "web_search":
      // Check for search API key for future integration
      if (process.env.SEARCH_API_KEY) {
        // TODO: Implement real search API call here
        // For now, still return mock data
      }
      return mockWebSearch(input.query as string);

    case "read_url":
      try {
        const content = await fetchUrl(input.url as string);
        return content;
      } catch (e) {
        return `Error fetching URL: ${e}`;
      }

    case "save_report":
      try {
        fs.writeFileSync(input.filename as string, input.content as string);
        return `Report saved to ${input.filename}`;
      } catch (e) {
        return `Error saving report: ${e}`;
      }

    case "read_file":
      try {
        return fs.readFileSync(input.path as string, "utf-8");
      } catch (e) {
        return `Error reading file: ${e}`;
      }

    default:
      return `Unknown tool: ${name}`;
  }
}

function loadSystemPrompt(): string {
  try {
    if (fs.existsSync("CLAUDE.md")) {
      return fs.readFileSync("CLAUDE.md", "utf-8");
    }
  } catch {
    // Ignore errors
  }
  return `You are a thorough research assistant.

## Process
1. Break down the research question into sub-topics
2. Search for relevant sources
3. Read and analyze each source
4. Synthesize findings into a coherent report
5. Always cite your sources

## Output Format
- Use markdown formatting
- Include a summary at the top
- Organize findings by theme
- End with a sources section`;
}

async function runAgent(prompt: string): Promise<string> {
  const messages: Anthropic.MessageParam[] = [
    { role: "user", content: prompt },
  ];

  const system = loadSystemPrompt();

  while (true) {
    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      system,
      tools,
      messages,
    });

    if (response.stop_reason === "end_turn") {
      const textBlock = response.content.find((b) => b.type === "text");
      return textBlock ? textBlock.text : "";
    }

    if (response.stop_reason === "tool_use") {
      messages.push({ role: "assistant", content: response.content });

      const toolResults: Anthropic.ToolResultBlockParam[] = [];
      for (const block of response.content) {
        if (block.type === "tool_use") {
          const result = await executeTool(block.name, block.input as Record<string, unknown>);
          toolResults.push({
            type: "tool_result",
            tool_use_id: block.id,
            content: result,
          });
        }
      }

      messages.push({ role: "user", content: toolResults });
    }
  }
}

async function main() {
  let prompt = "";
  for await (const chunk of process.stdin) {
    prompt += chunk;
  }

  if (!prompt.trim()) {
    console.error("No prompt provided");
    process.exit(1);
  }

  try {
    const response = await runAgent(prompt.trim());
    console.log(response);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

main();
