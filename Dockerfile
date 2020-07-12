FROM node:12.18.1-alpine3.12
MAINTAINER Selvedin Dokara <selvedin.dokara@gmail.com>

WORKDIR /opt/app

COPY package*.json ./
COPY yarn.lock ./
RUN yarn

ADD . .

EXPOSE 3000
ENTRYPOINT [ "./start.sh" ]
