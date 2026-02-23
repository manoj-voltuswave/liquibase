FROM liquibase/liquibase:latest

USER root
# Add MySQL driver so Liquibase can talk to RDS MySQL
RUN lpm add mysql --global

# Install Node.js 20 (for the Express server) on top of Liquibase image
RUN apt-get update \
  && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
  && apt-get install -y nodejs \
  && apt-get clean \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY index.js openapi.json ./
COPY utils ./utils

EXPOSE 3000
ENV NODE_ENV=production

CMD ["node", "index.js"]
