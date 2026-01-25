import Anthropic from "@anthropic-ai/sdk";
import * as fs from "fs";

const client = new Anthropic();

// Mock data - in production, integrate with your database/CRM
const MOCK_USERS: Record<string, { name: string; email: string; plan: string; created: string }> = {
  "user_123": { name: "Alice Smith", email: "alice@example.com", plan: "Pro", created: "2025-06-15" },
  "alice@example.com": { name: "Alice Smith", email: "alice@example.com", plan: "Pro", created: "2025-06-15" },
  "user_456": { name: "Bob Jones", email: "bob@example.com", plan: "Free", created: "2025-12-01" },
  "bob@example.com": { name: "Bob Jones", email: "bob@example.com", plan: "Free", created: "2025-12-01" },
  "user_789": { name: "Carol White", email: "carol@example.com", plan: "Enterprise", created: "2025-01-10" },
  "carol@example.com": { name: "Carol White", email: "carol@example.com", plan: "Enterprise", created: "2025-01-10" },
};

const MOCK_ORDERS: Record<string, { id: string; user: string; status: string; total: number; items: string[] }> = {
  "ORD-001": { id: "ORD-001", user: "alice@example.com", status: "delivered", total: 99.99, items: ["Widget Pro"] },
  "ORD-002": { id: "ORD-002", user: "bob@example.com", status: "processing", total: 49.99, items: ["Widget Basic"] },
  "ORD-003": { id: "ORD-003", user: "carol@example.com", status: "shipped", total: 299.99, items: ["Widget Pro", "Widget Plus", "Accessory Pack"] },
};

const tools: Anthropic.Tool[] = [
  {
    name: "lookup_user",
    description: "Look up a user by email address or user ID",
    input_schema: {
      type: "object" as const,
      properties: {
        identifier: {
          type: "string",
          description: "User email or user ID",
        },
      },
      required: ["identifier"],
    },
  },
  {
    name: "lookup_order",
    description: "Look up an order by order ID",
    input_schema: {
      type: "object" as const,
      properties: {
        order_id: {
          type: "string",
          description: "The order ID (e.g., ORD-001)",
        },
      },
      required: ["order_id"],
    },
  },
  {
    name: "create_ticket",
    description: "Create a support ticket for human review. Use this when you cannot resolve the issue or need to escalate.",
    input_schema: {
      type: "object" as const,
      properties: {
        subject: {
          type: "string",
          description: "Brief subject line for the ticket",
        },
        description: {
          type: "string",
          description: "Detailed description of the issue and what you've tried",
        },
        priority: {
          type: "string",
          enum: ["low", "medium", "high", "urgent"],
          description: "Ticket priority",
        },
        user_email: {
          type: "string",
          description: "Customer's email address",
        },
      },
      required: ["subject", "description", "priority"],
    },
  },
  {
    name: "send_response",
    description: "Send a response message to the customer",
    input_schema: {
      type: "object" as const,
      properties: {
        message: {
          type: "string",
          description: "The response message to send",
        },
      },
      required: ["message"],
    },
  },
];

function executeTool(name: string, input: Record<string, unknown>): string {
  switch (name) {
    case "lookup_user": {
      const identifier = (input.identifier as string).toLowerCase();
      const user = MOCK_USERS[identifier];
      if (user) {
        return JSON.stringify(user, null, 2);
      }
      return "User not found. Please verify the email or user ID.";
    }

    case "lookup_order": {
      const orderId = (input.order_id as string).toUpperCase();
      const order = MOCK_ORDERS[orderId];
      if (order) {
        return JSON.stringify(order, null, 2);
      }
      return "Order not found. Please verify the order ID.";
    }

    case "create_ticket": {
      const ticket = {
        id: `TKT-${Date.now()}`,
        subject: input.subject,
        description: input.description,
        priority: input.priority,
        user_email: input.user_email || "unknown",
        status: "open",
        created_at: new Date().toISOString(),
      };

      // Save to tickets.json
      const ticketsFile = "tickets.json";
      let tickets: unknown[] = [];
      try {
        if (fs.existsSync(ticketsFile)) {
          tickets = JSON.parse(fs.readFileSync(ticketsFile, "utf-8"));
        }
      } catch {
        // Ignore parse errors, start fresh
      }
      tickets.push(ticket);
      fs.writeFileSync(ticketsFile, JSON.stringify(tickets, null, 2));

      return `Ticket created: ${ticket.id}\nA support agent will review this shortly.`;
    }

    case "send_response": {
      // In production, this would send an actual email/message
      // For now, log to a file
      const responseLog = {
        message: input.message,
        sent_at: new Date().toISOString(),
      };

      const logFile = "responses.log";
      fs.appendFileSync(logFile, JSON.stringify(responseLog) + "\n");

      return `Response sent: "${input.message}"`;
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
  return `You are a friendly customer support agent.

## Guidelines
- Be polite, empathetic, and helpful
- Look up relevant information before responding
- If you can't resolve an issue, create a ticket
- Never make up information about orders or accounts

## Escalation Triggers
- Refund requests over $100
- Security or privacy concerns
- Customer explicitly asks for human support`;
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

    // Handle completion (including max_tokens to avoid infinite loop)
    if (response.stop_reason === "end_turn" || response.stop_reason === "max_tokens") {
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
