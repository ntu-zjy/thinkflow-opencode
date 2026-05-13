/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_OPENCODE_WORKDIR: string
  readonly VITE_BUILD_SHA?: string
  readonly VITE_OPENCODE_SERVER_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
