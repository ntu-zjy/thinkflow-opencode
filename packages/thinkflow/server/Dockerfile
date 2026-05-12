FROM oven/bun:1-alpine

WORKDIR /app

# 只复制 server 包自身的依赖文件
COPY package.json ./

RUN bun install

# 复制源码
COPY src/ ./src/

ENV PORT=3456
EXPOSE 3456

CMD ["bun", "run", "src/index.ts"]
