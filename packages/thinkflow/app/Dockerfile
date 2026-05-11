# ─── Stage 1: Build ───────────────────────────────────────────────────────────
FROM oven/bun:1-alpine AS builder

WORKDIR /app

# 复制 monorepo 根配置
COPY package.json bun.lock* ./
COPY patches patches/

# 复制所有 workspace package.json（bun install 需要）
COPY packages/opencode/package.json packages/opencode/
COPY packages/plugin/package.json packages/plugin/
COPY packages/script/package.json packages/script/
COPY packages/sdk/js/package.json packages/sdk/js/
COPY packages/util/package.json packages/util/

# stub 其余 workspace，避免 bun 报缺失
RUN mkdir -p packages/app packages/console/app packages/console/core \
    packages/console/function packages/console/mail packages/console/resource \
    packages/desktop packages/enterprise packages/function packages/slack \
    packages/ui packages/web packages/thinkflow/desktop \
    packages/thinkflow/video-nextjs packages/thinkflow/video-renderer
RUN echo '{"name":"@stub/app","version":"0.0.0"}' > packages/app/package.json
RUN echo '{"name":"@stub/console-app","version":"0.0.0"}' > packages/console/app/package.json
RUN echo '{"name":"@stub/console-core","version":"0.0.0"}' > packages/console/core/package.json
RUN echo '{"name":"@stub/console-function","version":"0.0.0"}' > packages/console/function/package.json
RUN echo '{"name":"@stub/console-mail","version":"0.0.0"}' > packages/console/mail/package.json
RUN echo '{"name":"@stub/console-resource","version":"0.0.0"}' > packages/console/resource/package.json
RUN echo '{"name":"@stub/desktop","version":"0.0.0"}' > packages/desktop/package.json
RUN echo '{"name":"@stub/enterprise","version":"0.0.0"}' > packages/enterprise/package.json
RUN echo '{"name":"@stub/function","version":"0.0.0"}' > packages/function/package.json
RUN echo '{"name":"@stub/slack","version":"0.0.0"}' > packages/slack/package.json
RUN echo '{"name":"@stub/ui","version":"0.0.0"}' > packages/ui/package.json
RUN echo '{"name":"@stub/web","version":"0.0.0"}' > packages/web/package.json
RUN echo '{"name":"@stub/thinkflow-desktop","version":"0.0.0"}' > packages/thinkflow/desktop/package.json
RUN echo '{"name":"@stub/video-nextjs","version":"0.0.0"}' > packages/thinkflow/video-nextjs/package.json
RUN echo '{"name":"@stub/video-renderer","version":"0.0.0"}' > packages/thinkflow/video-renderer/package.json

# 复制 thinkflow/app 的 package.json
COPY packages/thinkflow/app/package.json packages/thinkflow/app/

RUN bun install

# 复制源码
COPY packages/thinkflow/app/ packages/thinkflow/app/
COPY packages/opencode/ packages/opencode/
COPY packages/plugin/ packages/plugin/
COPY packages/sdk/js/ packages/sdk/js/
COPY packages/util/ packages/util/

# 构建时注入环境变量（运行时通过 nginx envsubst 注入 API key）
# VITE_OPENCODE_SERVER_URL 在构建时必须知道（前端打包后无法动态修改）
ARG VITE_OPENCODE_SERVER_URL
ENV VITE_OPENCODE_SERVER_URL=${VITE_OPENCODE_SERVER_URL}

WORKDIR /app/packages/thinkflow/app
RUN bun run build

# ─── Stage 2: Serve ───────────────────────────────────────────────────────────
FROM nginx:alpine

# 安装 envsubst（gettext 包含）
RUN apk add --no-cache gettext

COPY --from=builder /app/packages/thinkflow/app/dist /usr/share/nginx/html
COPY packages/thinkflow/app/nginx.conf /etc/nginx/templates/default.conf.template

# 启动时用 envsubst 替换 nginx 配置中的环境变量，再启动 nginx
CMD ["/bin/sh", "-c", "envsubst '${OPENROUTER_API_KEY} ${FRONTEND_URL}' < /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf && nginx -g 'daemon off;'"]

EXPOSE 80
