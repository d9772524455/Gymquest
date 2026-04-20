// Root entrypoint. Boots the Gym Quest API (server/index.js) on port 80.
// PORT env and a provided .env still take precedence.

const path = require("path");

process.env.PORT = process.env.PORT || "80";

// cwd -> ./server so dotenv picks up server/.env and relative paths resolve.
process.chdir(path.join(__dirname, "server"));

require("./server/index.js");
