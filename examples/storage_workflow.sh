#!/bin/bash
#
# Example: Complete Storage Workflow using Castari CLI
#
# This script demonstrates:
# 1. Creating and configuring storage buckets
# 2. Setting credentials for cloud providers
# 3. Mounting buckets to agents
# 4. Managing files
#
# Prerequisites:
# - Castari CLI installed: npm install -g @castari/cli
# - Logged in: cast login
# - An existing agent (or create one with: cast init && cast deploy)
#
# Usage:
#   ./storage_workflow.sh
#
# Environment variables (optional):
#   AWS_ACCESS_KEY_ID      - AWS access key for S3
#   AWS_SECRET_ACCESS_KEY  - AWS secret key for S3
#   AGENT_SLUG             - Agent to mount bucket to (default: my-agent)
#

set -e  # Exit on error

# Configuration
AGENT_SLUG="${AGENT_SLUG:-my-agent}"
BUCKET_SLUG="example-storage"
BUCKET_NAME="my-example-bucket"  # Your actual AWS bucket name

echo "============================================"
echo "Castari Storage Workflow Example"
echo "============================================"
echo ""

# -----------------------------------------------------------------------------
# Step 1: Create a bucket configuration
# -----------------------------------------------------------------------------

echo "Step 1: Creating bucket configuration..."
echo ""

# Interactive mode (prompts for provider, bucket name, etc.)
# cast buckets create "Example Storage"

# Non-interactive mode with all options
cast buckets create "Example Storage" \
  --slug "$BUCKET_SLUG" \
  --provider s3 \
  --bucket-name "$BUCKET_NAME" \
  --region us-east-1 \
  2>/dev/null || echo "  Bucket may already exist, continuing..."

echo ""

# -----------------------------------------------------------------------------
# Step 2: Set credentials
# -----------------------------------------------------------------------------

echo "Step 2: Setting credentials..."
echo ""

if [ -n "$AWS_ACCESS_KEY_ID" ] && [ -n "$AWS_SECRET_ACCESS_KEY" ]; then
  # Non-interactive mode with credentials from environment
  cast buckets credentials "$BUCKET_SLUG" \
    --access-key-id "$AWS_ACCESS_KEY_ID" \
    --secret-access-key "$AWS_SECRET_ACCESS_KEY"
else
  echo "  AWS credentials not set in environment."
  echo "  Run interactively with: cast buckets credentials $BUCKET_SLUG"
  echo "  Skipping credential setup..."
fi

echo ""

# -----------------------------------------------------------------------------
# Step 3: Test connection
# -----------------------------------------------------------------------------

echo "Step 3: Testing connection..."
echo ""

if [ -n "$AWS_ACCESS_KEY_ID" ]; then
  cast buckets test "$BUCKET_SLUG" || echo "  Connection test failed"
else
  echo "  Skipping (no credentials set)"
fi

echo ""

# -----------------------------------------------------------------------------
# Step 4: List all buckets
# -----------------------------------------------------------------------------

echo "Step 4: Listing all buckets..."
echo ""

cast buckets list

echo ""

# -----------------------------------------------------------------------------
# Step 5: Get bucket details
# -----------------------------------------------------------------------------

echo "Step 5: Getting bucket details..."
echo ""

cast buckets get "$BUCKET_SLUG"

echo ""

# -----------------------------------------------------------------------------
# Step 6: Mount bucket to agent
# -----------------------------------------------------------------------------

echo "Step 6: Mounting bucket to agent '$AGENT_SLUG'..."
echo ""

# Check if agent exists first
if cast agents get "$AGENT_SLUG" > /dev/null 2>&1; then
  # Add mount with read-only access
  cast mounts add "$AGENT_SLUG" \
    --bucket "$BUCKET_SLUG" \
    --path /data \
    --read-only \
    2>/dev/null || echo "  Mount may already exist, continuing..."
else
  echo "  Agent '$AGENT_SLUG' not found."
  echo "  Create an agent first with: cast init && cast deploy"
  echo "  Skipping mount..."
fi

echo ""

# -----------------------------------------------------------------------------
# Step 7: List mounts
# -----------------------------------------------------------------------------

echo "Step 7: Listing mounts for agent '$AGENT_SLUG'..."
echo ""

if cast agents get "$AGENT_SLUG" > /dev/null 2>&1; then
  cast mounts list "$AGENT_SLUG"
else
  echo "  Agent not found, skipping..."
fi

echo ""

# -----------------------------------------------------------------------------
# Step 8: File operations
# -----------------------------------------------------------------------------

echo "Step 8: File operations..."
echo ""

if [ -n "$AWS_ACCESS_KEY_ID" ]; then
  echo "  Listing files in bucket:"
  cast files list "$BUCKET_SLUG" --prefix "" 2>/dev/null || echo "  (bucket may be empty)"

  echo ""
  echo "  Getting upload URL:"
  cast files upload-url "$BUCKET_SLUG" "uploads/example.txt" 2>/dev/null || true

  echo ""
  echo "  Getting download URL:"
  cast files download-url "$BUCKET_SLUG" "data/example.txt" 2>/dev/null || true
else
  echo "  Skipping (no credentials set)"
fi

echo ""

# -----------------------------------------------------------------------------
# Summary
# -----------------------------------------------------------------------------

echo "============================================"
echo "Storage Workflow Complete!"
echo "============================================"
echo ""
echo "What was configured:"
echo "  - Bucket: $BUCKET_SLUG"
echo "  - Provider: S3"
echo "  - Mount path: /data (read-only)"
echo ""
echo "Next steps:"
echo "  1. Redeploy agent: cast deploy $AGENT_SLUG"
echo "  2. Your agent can now access files at /data"
echo ""
echo "Useful commands:"
echo "  cast buckets list              # List all buckets"
echo "  cast buckets test $BUCKET_SLUG      # Test connection"
echo "  cast mounts list $AGENT_SLUG        # List agent mounts"
echo "  cast files list $BUCKET_SLUG        # List bucket files"
echo ""
echo "To clean up:"
echo "  cast mounts remove $AGENT_SLUG <mount-id>  # Remove mount"
echo "  cast buckets delete $BUCKET_SLUG           # Delete bucket"
echo ""

# -----------------------------------------------------------------------------
# Additional examples (commented out)
# -----------------------------------------------------------------------------

# Example: Create GCS bucket
# cast buckets create "GCS Storage" \
#   --slug gcs-storage \
#   --provider gcs \
#   --bucket-name my-gcs-bucket
# cast buckets credentials gcs-storage --service-account-file key.json

# Example: Create R2 bucket
# cast buckets create "R2 Storage" \
#   --slug r2-storage \
#   --provider r2 \
#   --bucket-name my-r2-bucket \
#   --endpoint https://accountid.r2.cloudflarestorage.com
# cast buckets credentials r2-storage \
#   --access-key-id $R2_ACCESS_KEY_ID \
#   --secret-access-key $R2_SECRET_ACCESS_KEY

# Example: Mount with read-write access for outputs
# cast mounts add my-agent \
#   --bucket my-bucket \
#   --path /data
# Then use API to set permission rules:
# curl -X PATCH https://api.castari.com/api/v1/agents/my-agent/mounts/<id> \
#   -H "Authorization: Bearer $API_KEY" \
#   -d '{"permission_rules": [{"path": "/", "mode": "ro"}, {"path": "/outputs", "mode": "rw"}]}'

# Example: Upload a file using presigned URL
# UPLOAD_URL=$(cast files upload-url my-bucket uploads/data.csv --format json | jq -r '.url')
# curl -X PUT -T data.csv "$UPLOAD_URL"

# Example: Download a file using presigned URL
# DOWNLOAD_URL=$(cast files download-url my-bucket data/report.csv --format json | jq -r '.url')
# curl -o report.csv "$DOWNLOAD_URL"
