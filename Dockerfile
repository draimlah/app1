# Use the official Playwright image which includes all necessary browser dependencies
FROM mcr.microsoft.com/playwright:v1.41.0-jammy

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application
COPY . .

# Build the frontend
RUN npm run build

# Expose the port the app runs on
EXPOSE 3000

# Set environment to production
ENV NODE_ENV=production

# Command to start the server
# We use tsx to run the server.ts directly
CMD ["npx", "tsx", "server.ts"]
