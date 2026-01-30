#!/bin/bash

# Navigate to project root
cd "/Users/kalakatski/Documents/Event Car booking System " || exit

# Add all changes
git add .

# Commit changes
git commit -m "Implement Admin Approval System (Backend + Frontend)"

# Push to main to trigger Vercel deployment
git push origin main

echo "✅ Admin System Deployment Triggered!"
