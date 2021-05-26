import WebpackClientConfig from './client';
import WebpackServerConfig from './server';

export default (options) => ({
  client: (new WebpackClientConfig(options)).config(),
  server: (new WebpackServerConfig(options)).config(),
});
