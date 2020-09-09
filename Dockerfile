FROM node:8

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
COPY package*.json ./
COPY yarn.lock ./
RUN yarn

COPY . .

EXPOSE 8000
CMD [ "npm", "start" ]