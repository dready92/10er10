FROM fedora:30

WORKDIR /usr/local/nvm

ENV NVM_DIR /usr/local/nvm
ENV NODE_VERSION 10.15.3
ENV MONGO_HOST localhost:27017

RUN dnf install -y https://download1.rpmfusion.org/free/fedora/rpmfusion-free-release-$(rpm -E %fedora).noarch.rpm https://download1.rpmfusion.org/nonfree/fedora/rpmfusion-nonfree-release-$(rpm -E %fedora).noarch.rpm
RUN dnf install -y git lame vorbis-tools flac faad2 GraphicsMagick

# Install nvm with node and npm
RUN curl https://raw.githubusercontent.com/creationix/nvm/v0.34.0/install.sh | bash \
  && . $NVM_DIR/nvm.sh \
  && nvm install $NODE_VERSION \
  && nvm alias default $NODE_VERSION \
  && nvm use default

ENV NODE_PATH $NVM_DIR/versions/node/v$NODE_VERSION/lib/node_modules
ENV PATH      $NVM_DIR/versions/node/v$NODE_VERSION/bin:$PATH

RUN curl https://raw.githubusercontent.com/vishnubob/wait-for-it/master/wait-for-it.sh > /wait-for-it.sh && chmod +x /wait-for-it.sh

RUN mkdir /d10
VOLUME /d10

RUN npm install --production

RUN cd /tmp && git clone https://github.com/dready92/d10-fixtures.git && mv d10-fixtures /fixtures

WORKDIR /d10/node
CMD /wait-for-it.sh "${MONGO_HOST}" -- node server.js
