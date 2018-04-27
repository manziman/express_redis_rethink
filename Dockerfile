FROM mhart/alpine-node

WORKDIR /srv/node-app

RUN npm i -g npm

COPY ./package.json .

RUN npm install --production

COPY . .

EXPOSE 9090

CMD ["npm", "start"]
