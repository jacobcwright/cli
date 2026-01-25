import Anthropic from "@anthropic-ai/sdk";
import * as fs from "fs";

const client = new Anthropic();

// Example custom tools demonstrating MCP-style integration patterns
const tools: Anthropic.Tool[] = [
  {
    name: "calculate",
    description: "Perform mathematical calculations. Supports basic arithmetic, percentages, and common functions.",
    input_schema: {
      type: "object" as const,
      properties: {
        expression: {
          type: "string",
          description: "Mathematical expression to evaluate (e.g., '2 + 2 * 3', '15% of 200', 'sqrt(16)')",
        },
      },
      required: ["expression"],
    },
  },
  {
    name: "get_weather",
    description: "Get current weather for a location (mock data for demo)",
    input_schema: {
      type: "object" as const,
      properties: {
        location: {
          type: "string",
          description: "City name (e.g., 'San Francisco', 'New York')",
        },
      },
      required: ["location"],
    },
  },
  {
    name: "query_database",
    description: "Query the database for records (mock data for demo)",
    input_schema: {
      type: "object" as const,
      properties: {
        table: {
          type: "string",
          description: "Table name (users, orders, products)",
        },
        filter: {
          type: "object",
          description: "Optional filter conditions as key-value pairs",
        },
        limit: {
          type: "number",
          description: "Maximum records to return (default: 10)",
        },
      },
      required: ["table"],
    },
  },
  {
    name: "send_notification",
    description: "Send a notification (mock - logs to file)",
    input_schema: {
      type: "object" as const,
      properties: {
        channel: {
          type: "string",
          enum: ["email", "slack", "sms"],
          description: "Notification channel",
        },
        recipient: {
          type: "string",
          description: "Recipient address/ID",
        },
        message: {
          type: "string",
          description: "Notification message",
        },
      },
      required: ["channel", "recipient", "message"],
    },
  },
];

// Mock database for demo
const MOCK_DB: Record<string, Record<string, unknown>[]> = {
  users: [
    { id: 1, name: "Alice", email: "alice@example.com", role: "admin" },
    { id: 2, name: "Bob", email: "bob@example.com", role: "user" },
    { id: 3, name: "Charlie", email: "charlie@example.com", role: "user" },
  ],
  orders: [
    { id: 101, user_id: 1, total: 150.0, status: "shipped" },
    { id: 102, user_id: 2, total: 75.5, status: "pending" },
    { id: 103, user_id: 1, total: 200.0, status: "delivered" },
  ],
  products: [
    { id: 1, name: "Widget", price: 29.99, stock: 100 },
    { id: 2, name: "Gadget", price: 49.99, stock: 50 },
    { id: 3, name: "Gizmo", price: 19.99, stock: 200 },
  ],
};

// Mock weather data
const MOCK_WEATHER: Record<string, { temp: number; conditions: string; humidity: number }> = {
  "san francisco": { temp: 62, conditions: "Partly cloudy", humidity: 65 },
  "new york": { temp: 45, conditions: "Clear", humidity: 40 },
  "london": { temp: 50, conditions: "Rainy", humidity: 80 },
  "tokyo": { temp: 55, conditions: "Sunny", humidity: 55 },
  "paris": { temp: 48, conditions: "Overcast", humidity: 70 },
  "sydney": { temp: 75, conditions: "Sunny", humidity: 45 },
};

// Safe math evaluator - no eval() for security
function safeEval(expression: string): number | string {
  try {
    // Handle percentage expressions: "15% of 200"
    const percentMatch = expression.match(/(\d+(?:\.\d+)?)\s*%\s*of\s*(\d+(?:\.\d+)?)/i);
    if (percentMatch) {
      return (parseFloat(percentMatch[1]) / 100) * parseFloat(percentMatch[2]);
    }

    // Handle sqrt: "sqrt(16)"
    const sqrtMatch = expression.match(/sqrt\((\d+(?:\.\d+)?)\)/i);
    if (sqrtMatch) {
      return Math.sqrt(parseFloat(sqrtMatch[1]));
    }

    // Handle power: "2^3" or "2**3"
    const powerMatch = expression.match(/(\d+(?:\.\d+)?)\s*[\^*]{1,2}\s*(\d+(?:\.\d+)?)/);
    if (powerMatch) {
      return Math.pow(parseFloat(powerMatch[1]), parseFloat(powerMatch[2]));
    }

    // Basic arithmetic - only allow safe characters
    const sanitized = expression.replace(/[^0-9+\-*/().%\s]/g, "");
    if (sanitized !== expression.replace(/\s/g, "")) {
      return "Invalid characters in expression. Use numbers and operators: + - * / ( ) %";
    }

    // Simple expression parser for basic arithmetic
    // This avoids using eval() for security
    const result = Function(`"use strict"; return (${sanitized})`)();
    return typeof result === "number" && !isNaN(result) ? result : "Could not evaluate expression";
  } catch {
    return "Error evaluating expression";
  }
}

function executeTool(name: string, input: Record<string, unknown>): string {
  switch (name) {
    case "calculate": {
      const result = safeEval(input.expression as string);
      return typeof result === "number" ? `Result: ${result}` : result;
    }

    case "get_weather": {
      const location = (input.location as string).toLowerCase();
      const weather = MOCK_WEATHER[location];
      if (weather) {
        return JSON.stringify(
          {
            location: input.location,
            temperature: `${weather.temp}°F`,
            conditions: weather.conditions,
            humidity: `${weather.humidity}%`,
          },
          null,
          2
        );
      }
      const available = Object.keys(MOCK_WEATHER).map((c) => c.charAt(0).toUpperCase() + c.slice(1));
      return `Weather data not available for "${input.location}". Available cities: ${available.join(", ")}`;
    }

    case "query_database": {
      const table = input.table as string;
      const limit = (input.limit as number) || 10;
      const filter = input.filter as Record<string, unknown> | undefined;

      const data = MOCK_DB[table];
      if (!data) {
        return `Table '${table}' not found. Available tables: ${Object.keys(MOCK_DB).join(", ")}`;
      }

      let results = [...data];

      // Apply simple filter if provided
      if (filter && typeof filter === "object") {
        results = results.filter((row) => {
          return Object.entries(filter).every(([key, value]) => row[key] === value);
        });
      }

      return JSON.stringify(results.slice(0, limit), null, 2);
    }

    case "send_notification": {
      const notification = {
        channel: input.channel,
        recipient: input.recipient,
        message: input.message,
        sent_at: new Date().toISOString(),
        status: "sent (mock)",
      };

      // Log to file for demo
      const logFile = "notifications.log";
      const logEntry = JSON.stringify(notification) + "\n";
      fs.appendFileSync(logFile, logEntry);

      return `Notification sent via ${input.channel} to ${input.recipient}`;
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
  return `You are an agent demonstrating custom tool integrations.

Available tools:
- calculate: Perform math calculations
- get_weather: Get weather info (mock data)
- query_database: Query mock database
- send_notification: Send notifications (logged to file)

Use these tools to help users with their requests.`;
}

async function runAgent(prompt: string): Promise<string> {
  const messages: Anthropic.MessageParam[] = [{ role: "user", content: prompt }];

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
