# Start from the official Dev Container base image, which has a proper init system
FROM mcr.microsoft.com/devcontainers/base:ubuntu-22.04

# Install all system-level dependencies as root
RUN apt-get update && export DEBIAN_FRONTEND=noninteractive \
    && apt-get -y install --no-install-recommends \
    git \
    procps \
    sudo \
    fzf \
    zsh \
    man-db \
    unzip \
    gnupg2 \
    gh \
    iptables \
    ipset \
    iproute2 \
    dnsutils \
    aggregate \
    jq \
    curl \
    build-essential

# Set a helpful environment variable
ENV DEVCONTAINER=true

# Create the workspace directory and set ownership to the default 'vscode' user
RUN mkdir -p /workspace && \
  chown -R vscode:vscode /workspace

# Install delta for git diffs (still as root)
RUN ARCH=$(dpkg --print-architecture) && \
  wget "https://github.com/dandavison/delta/releases/download/0.18.2/git-delta_0.18.2_${ARCH}.deb" && \
  dpkg -i "git-delta_0.18.2_${ARCH}.deb" && \
  rm "git-delta_0.18.2_${ARCH}.deb"

# Install mise as root
RUN curl https://mise.run | sh
ENV PATH="/root/.local/bin:$PATH"


# --- Now, switch to the non-root 'vscode' user for all subsequent commands ---
USER vscode
WORKDIR /workspace

ENV SHELL=/bin/zsh

# Install mise for the vscode user
RUN curl https://mise.run | sh


# Set up zsh theme and plugins
RUN sh -c "$(wget -O- https://github.com/deluan/zsh-in-docker/releases/download/v1.2.0/zsh-in-docker.sh)" -- \
  -p git \
  -p fzf \
  -a "source /usr/share/doc/fzf/examples/key-bindings.zsh" \
  -a "source /usr/share/doc/fzf/examples/completion.zsh" \
  -a "export HISTFILE=/commandhistory/.bash_history"

# Set up mise activation for zsh
RUN echo 'eval "$(/home/vscode/.local/bin/mise activate zsh)"' >> /home/vscode/.zshrc

# --- Switch back to root temporarily to set up sudo for the init script ---
USER root

COPY init.sh /usr/local/bin/
COPY start.sh /usr/local/bin/

USER root
RUN chmod +x /usr/local/bin/init.sh && \
  chmod +x /usr/local/bin/start.sh && \
  echo "node ALL=(root) NOPASSWD: /usr/local/bin/init.sh" > /etc/sudoers.d/vscode-init && \
  chmod 0440 /etc/sudoers.d/vscode-init && \
  \
  echo "Defaults !env_delete" >> /etc/sudoers.d/vscode-init && \
  echo "Defaults env_keep += \"OPENAI_API_KEY GEMINI_API_KEY\"" >> /etc/sudoers.d/vscode-init
USER vscode