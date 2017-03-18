FROM node

# Create app directory
RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

# Install app dependencies
COPY package.json /usr/src/app/
RUN npm install

# Bundle app source
COPY . /usr/src/app

# Create media directory
RUN mkdir -p /usr/media/app

# Copy test media to directory
COPY meida/ /usr/media/app

CMD [ "npm", "start" ]
