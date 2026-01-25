import Anthropic from "@anthropic-ai/sdk";
import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";

const client = new Anthropic();

const tools: Anthropic.Tool[] = [
  {
    name: "read_file",
    description: "Read the contents of a file at the given path",
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
  {
    name: "write_file",
    description: "Write content to a file at the given path",
    input_schema: {
      type: "object" as const,
      properties: {
        path: {
          type: "string",
          description: "The file path to write to",
        },
        content: {
          type: "string",
          description: "The content to write",
        },
      },
      required: ["path", "content"],
    },
  },
  {
    name: "bash",
    description: "Execute a bash command and return the output",
    input_schema: {
      type: "object" as const,
      properties: {
        command: {
          type: "string",
          description: "The bash command to execute",
        },
      },
      required: ["command"],
    },
  },
  {
    name: "list_files",
    description: "List files in a directory",
    input_schema: {
      type: "object" as const,
      properties: {
        path: {
          type: "string",
          description: "The directory path to list (defaults to current directory)",
        },
      },
      required: [],
    },
  },
];

function executeTool(name: string, input: Record<string, unknown>): string {
  switch (name) {
    case "read_file":
      try {
        return fs.readFileSync(input.path as string, "utf-8");
      } catch (e) {
        return `Error reading file: ${e}`;
      }

    case "write_file":
      try {
        const filePath = input.path as string;
        const dir = path.dirname(filePath);
        if (dir && !fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(filePath, input.content as string);
        return `Successfully wrote to ${filePath}`;
      } catch (e) {
        return `Error writing file: ${e}`;
      }

    case "bash":
      try {
        const output = execSync(input.command as string, {
          encoding: "utf-8",
          timeout: 30000,
          maxBuffer: 10 * 1024 * 1024,
        });
        return output || "(no output)";
      } catch (e: unknown) {
        const error = e as { message?: string; stderr?: string };
        return `Error: ${error.message || ""}\n${error.stderr || ""}`;
      }

    case "list_files":
      try {
        const dirPath = (input.path as string) || ".";
        const files = fs.readdirSync(dirPath);
        return files.join("\n") || "(empty directory)";
      } catch (e) {
        return `Error listing directory: ${e}`;
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
  return `You are a helpful coding assistant with access to the filesystem and bash.
You can read and write files, execute commands, and help with programming tasks.
Always explain what you're about to do before taking actions.`;
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

    // Check if we're done
    // Handle completion
    if (response.stop_reason === "end_turn" || response.stop_reason === "max_tokens") {
      const textBlock = response.content.find((b) => b.type === "text");
      return textBlock ? textBlock.text : "";
    }

    // Handle tool use
    if (response.stop_reason === "tool_use") {
      messages.push({ role: "assistant", content: response.content });

      const toolResults: Anthropic.ToolResultBlockParam[] = [];
      for (const block of response.content) {
        if (block.type === "tool_use") {
          const result = executeTool(block.name, block.input as Record<string, unknown>);
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
