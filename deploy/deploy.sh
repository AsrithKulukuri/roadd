#!/bin/bash

# ROAD Deployment Script for Hetzner VPS

echo "Starting deployment for ROAD..."

# Navigate to project directory (update this to your actual app directory)
# cd /var/www/road

# 1. Pull the latest code from the repository
echo "Pulling latest code from git..."
git pull origin main

# 2. Install dependencies
echo "Installing dependencies..."
npm ci

# 3. Build the Next.js application (output: 'standalone' should be in next.config.js)
echo "Building the application..."
npm run build

# 4. Copy the standalone files
echo "Preparing standalone server..."
# The Next.js standalone output puts necessary files in .next/standalone
# You might need to copy the public and .next/static folders into the standalone folder
cp -r public .next/standalone/
cp -r .next/static .next/standalone/.next/

# 5. Restart PM2 process
echo "Restarting PM2 process..."
cd .next/standalone
pm2 reload ../../deploy/ecosystem.config.js --env production || pm2 start ../../deploy/ecosystem.config.js --env production

# 6. Save PM2 list
pm2 save

echo "Deployment complete! ROAD is now live."
