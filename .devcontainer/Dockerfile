FROM ubuntu:22.04
ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y --no-install-recommends \
  curl wget unzip git ca-certificates openjdk-17-jdk gnupg2 zip && \
  rm -rf /var/lib/apt/lists/*

ENV ANDROID_SDK_ROOT=/opt/android-sdk
RUN mkdir -p ${ANDROID_SDK_ROOT}/cmdline-tools
WORKDIR /opt

# Download Android command line tools
RUN curl -fLO https://dl.google.com/android/repository/commandlinetools-linux-9477386_latest.zip \
  && unzip -q commandlinetools-linux-9477386_latest.zip -d ${ANDROID_SDK_ROOT}/cmdline-tools \
  && rm commandlinetools-linux-9477386_latest.zip

ENV PATH=${PATH}:${ANDROID_SDK_ROOT}/cmdline-tools/cmdline-tools/bin:${ANDROID_SDK_ROOT}/platform-tools

# Install required SDK components
RUN yes | sdkmanager --sdk_root=${ANDROID_SDK_ROOT} --install "platform-tools" "platforms;android-33" "build-tools;33.0.2"

WORKDIR /workspace

CMD ["/bin/bash"]
