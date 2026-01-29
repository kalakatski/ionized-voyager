#!/bin/bash
echo "🚀 Starting Deployment..."
git add .
git commit -m "fix: layout and vercel config (V2)"
git push origin main
echo "✅ Deployment triggered! Check Vercel dashboard."
