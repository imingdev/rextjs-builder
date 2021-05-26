import path from 'path';
import WebpackNodeExternals from 'webpack-node-externals';
import WebpackDynamicEntryPlugin from 'webpack-dynamic-entry-plugin';
import WebpackBaseConfig from './base';

export default class WebpackServerConfig extends WebpackBaseConfig {
  constructor(options) {
    super(options);
    this.name = 'server';
    this.isServer = true;
    this.isClient = false;
  }

  entry() {
    const {options, loadDefaultPages} = this;
    const {build, dir, pattern} = options;

    return WebpackDynamicEntryPlugin.getEntry({
      pattern: [
        path.join(dir.root, dir.src, dir.page, pattern),
        path.join(dir.root, dir.src, dir.page, '{_document,_app,_error}.{js,jsx}')
      ],
      generate: (entry) => {
        if (!entry._document) entry._document = loadDefaultPages._document;
        if (!entry._app) entry._app = loadDefaultPages._app;
        if (!entry._error) entry._error = loadDefaultPages._error;

        return Object.assign.apply(Object, Object.keys(entry)
          .map((name) => {
            const key = `${build.dir.server}/${name}`
              .split('/')
              .filter(Boolean)
              .join('/');
            return {[key]: entry[name]};
          }));
      }
    });
  }

  output() {
    const output = super.output();
    return {
      ...output,
      filename: '[name].js',
      chunkFilename: '[name].js',
      libraryTarget: 'commonjs2'
    };
  }

  nodeEnv() {
    return Object.assign(
      super.nodeEnv(),
      {
        'process.browser': false,
        'process.client': false,
        'process.server': true
      }
    );
  }

  config() {
    const config = super.config();
    return {
      ...config,
      externals: WebpackNodeExternals()
    };
  }
}