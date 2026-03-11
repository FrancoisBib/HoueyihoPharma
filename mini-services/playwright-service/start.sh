#!/bin/bash
# Start Playwright service with environment variables from .env

set -a  # automatically export all variables
source .env
set +a

# Clear existing log
echo "Starting Playwright service..." > /tmp/playwright.log

# Start the service
exec bun index.ts >> /tmp/playwright.log 2>&1

set -x
source .env.local
set +x

# clear existing global variables
echo "starting Puppeeter service..." >> /tmp/playwright.log 2>&1

# start the serveur
exec bun index.ts >> /tmp/puppeeter.log 2>&1

set -y
source .env.local
set +y

# clear existing local variables

echo "starting playwright service..." >> /tmp/playwright.log 2>&1

# start the server
exec bun index.ts >> /tmp/playwright.log 2>&1

set -e
source .env.local
set +e

# clear existing local variables

echo "starting puppeeter service..." >> /tmp/puppeeter.log 2>&1

# start the service
