// Placeholder agent - will be replaced with full implementation in Phase 2
// This minimal version validates the template scaffolding works

async function main() {
  // Read prompt from stdin
  let prompt = "";
  for await (const chunk of process.stdin) {
    prompt += chunk;
  }

  if (!prompt.trim()) {
    console.error("No prompt provided");
    process.exit(1);
  }

  // Echo back the prompt for testing
  console.log(`Template initialized successfully! Received: "${prompt.trim()}"`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
