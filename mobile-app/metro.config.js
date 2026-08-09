const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// macOS TCC restricts Watchman from reading this project under ~/Documents
// ("Watchman error: open ... Operation not permitted"), which crashes Metro on
// startup. Force Metro's node filesystem crawler instead — it has the required
// access (verified via `expo export`). Remove if Watchman is granted Full Disk Access.
config.resolver.useWatchman = false;

module.exports = config;
