// Monaco editor worker entry. Wrapped in a local file so the bundler can
// resolve the `?worker` import without reaching into node_modules paths.
// (monaco's exports map translates `monaco-editor/*` -> `esm/vs/*.js`)
import 'monaco-editor/editor/editor.worker';
