// Shim for historical entry point. All real code lives in ./src/.
// This file is kept so that `node index.js` (Dockerfile CMD) still works.
require('./src/server');
