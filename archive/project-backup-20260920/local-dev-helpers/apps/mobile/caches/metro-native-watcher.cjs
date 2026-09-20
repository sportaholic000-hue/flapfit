const Module = require("node:module");
const originalLoad = Module._load;
Module._load = function (request, parent, isMain) {
  const loaded = originalLoad.apply(this, arguments);
  if (request === "./watchers/NativeWatcher" && parent && parent.filename && parent.filename.includes("metro-file-map")) {
    const NativeWatcher = loaded && (loaded.default || loaded);
    NativeWatcher.isSupported = () => process.platform === "win32" || process.platform === "darwin";
  }
  return loaded;
};
