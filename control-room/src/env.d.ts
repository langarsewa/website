/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly PUBLIC_MOCK?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
