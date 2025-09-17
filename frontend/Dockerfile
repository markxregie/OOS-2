FROM node:20-alpine

WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./
RUN npm install

# Install dependencies
RUN npm ci --only=production=false

# Copy source code
COPY . .
RUN npm run build

EXPOSE 5000

CMD ["sh", "-c", "HOST=0.0.0.0 PORT=5000 npm start"]