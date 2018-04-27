FROM mhart/alpine-node

WORKDIR /srv/node-app

RUN npm i -g npm

COPY . .

RUN npm install

EXPOSE 9090

CMD ["npm", "start"]
