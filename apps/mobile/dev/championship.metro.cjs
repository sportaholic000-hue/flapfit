// Used only by the standalone preview launcher, never by releases.
const config = require('../metro.config');
const resolve = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web' && context.originModulePath.replace(/\\/g, '/').includes('/polyfills/web/')) {
    return context.resolveRequest(context, moduleName, platform);
  }
  return resolve(context, moduleName, platform);
};
module.exports = config;
