/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_BNA_API_BASE_URL?: string;
  readonly VITE_REF_API_BASE_URL?: string;
  readonly VITE_DOMI_API_BASE_URL?: string;
  readonly VITE_MS_TR_API_BASE_URL?: string;
  readonly VITE_DEV_USER_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
