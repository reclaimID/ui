FROM node:8-alpine AS build

LABEL maintainer="Christian Banse <christian.banse@aisec.fraunhofer.de>"

EXPOSE 80

WORKDIR /tmp

# this should hopefully trigger Docker to only update yarn if dependencies have changed
ADD *.json ./
ADD *.lock ./
RUN yarn install

# add the rest of the files
ADD . .

# set environment to production
ENV NODE_ENV production

# lint
#RUN yarn lint

# build everything for production
RUN yarn run build --prod

FROM nginx:alpine

# copy to nginx
COPY --from=build /tmp/dist /usr/share/nginx/html/

ADD ./docker-entrypoint.sh /
ENTRYPOINT ["/bin/sh", "/docker-entrypoint.sh"]

EXPOSE 80
CMD ["nginx"]
