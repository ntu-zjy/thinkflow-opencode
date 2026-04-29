/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_OPENCODE_WORKDIR: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
