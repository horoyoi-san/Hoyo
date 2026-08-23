/// <reference types="vite/client" />

declare module '*.css' {
  const content: Record<string, string>;
  export default content;
}

declare module 'monaco-editor/editor/editor.worker';
declare module 'monaco-editor/languages/definitions/lua/register';
