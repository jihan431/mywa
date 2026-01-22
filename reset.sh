#!/bin/bash
echo "🔄 Resetting bot..."

# Kill processes
echo "Killing Node.js processes..."
pkill -f "node index.js"
pkill -f "puppeteer"
pkill -f "chrome"

# Wait a moment
sleep 2

# Remove lock files
echo "Cleaning up lock files..."
rm -rf .wwebjs_auth/session/Singleton*

echo "✅ Reset complete! Now try running: npm start"
