# Nodejs 8.0.0 alpine 3.6.0
FROM node:16.16.0-alpine

# Label for tracking
LABEL nl.openstad.container="api_container" nl.openstad.version="0.0.1-beta" nl.openstad.release-date="2020-05-07"

ENV API_URL=""
ENV API_HOSTNAME=""
ENV API_DATABASE_USER=""
ENV API_DATABASE_PASSWORD=""
ENV API_DATABASE_DATABASE=""
ENV API_DATABASE_HOST=""
ENV API_EMAILADDRESS=""
ENV API_EXPRESS_PORT=""
ENV API_MAIL_FROM=""
ENV API_MAIL_TRANSPORT_SMTP_PORT=""
ENV API_MAIL_TRANSPORT_SMTP_HOST=""
ENV API_MAIL_TRANSPORT_SMTP_REQUIRESSL=""
ENV API_MAIL_TRANSPORT_SMTP_AUTH_USER=""
ENV API_MAIL_TRANSPORT_SMTP_AUTH_PASS=""
ENV API_NOTIFICATIONS_ADMIN_EMAILADDRESS=""
ENV API_SECURITY_SESSIONS_COOKIENAME=""
ENV API_SECURITY_SESSIONS_ONLYSECURE=""
ENV API_AUTHORIZATION_JWTSECRET=""
ENV API_AUTHORIZATION_FIXEDAUTHTOKENS=""
ENV AUTH_API_URL=""


# Install all base dependencies.# add perl for shell scripts
RUN apk add --no-cache --update g++ make python3 musl-dev bash perl perl-dbd-mysql perl-posix-strftime-compiler

RUN echo 'http://dl-cdn.alpinelinux.org/alpine/v3.6/main' >> /etc/apk/repositories
RUN echo 'http://dl-cdn.alpinelinux.org/alpine/v3.6/community' >> /etc/apk/repositories
RUN apk update
RUN apk add mongodb=3.4.4-r0
RUN apk add mongodb-tools

# Set the working directory to the root of the container
WORKDIR /home/app

# Bundle app source
COPY . /home/app

# Install node dependencies
RUN npm install

RUN npm install -g nodemon

# Remove unused packages only used for building.
RUN apk del g++ make python3 && rm -rf /var/cache/apk/*

# Set node ownership to /home/app
RUN chown -R node:node /home/app
USER node


# ----------------------------------------------
# Already present in dockerfile:

# # Must execute on run instead of build
#create database
#script forcing wait for mysql needs to be set
# RUN node reset.js


# Already present in dockerfile:
# Mount persistent storage
# ----------------------------------------------


# Exposed ports for application
EXPOSE 8111/tcp
EXPOSE 8111/udp

# Run the application
CMD [ "npm", "start" ]
