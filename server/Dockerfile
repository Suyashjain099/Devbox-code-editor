FROM node:20-alpine

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy the rest of the application
COPY . .

# Expose the port the auth server runs on
EXPOSE 5000

# Start the server
CMD ["node", "index.js"]
