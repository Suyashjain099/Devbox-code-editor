FROM node:22

# Install build essentials and additional language support
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    make \
    g++ \
    gcc \
    git \
    golang-go \
    rustc \
    cargo \
    default-jdk \
    && rm -rf /var/lib/apt/lists/*

RUN ln -sf /usr/bin/python3 /usr/bin/python

# Install TypeScript globally
RUN npm install -g typescript

WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Rebuild node-pty
RUN npm rebuild node-pty --update-binary

# Copy the rest of the application
COPY . .

# Create the user directory
RUN mkdir -p /app/user

# Expose the port the app runs on
EXPOSE 9000
EXPOSE 3001
EXPOSE 3002

# Command to run the application
CMD ["node", "index.js"]
