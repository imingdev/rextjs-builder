import path from 'path';
import webpack from 'webpack';
import WebpackDynamicEntryPlugin from 'webpack-dynamic-entry-plugin';
import UglifyJsPlugin from 'uglifyjs-webpack-plugin';
import OptimizeCSSPlugin from 'optimize-css-assets-webpack-plugin';
import { WebpackManifestPlugin } from 'webpack-manifest-plugin';
import WebpackBaseConfig from './base';
import { findPageFile } from '../utils/common';

export default class WebpackClientConfig extends WebpackBaseConfig {
  constructor(options) {
    super(options);
    this.name = 'client';
    this.isServer = false;
    this.isClient = true;
  }

  entry() {
    const { options, dev, loadDefaultPages } = this;
    const { dir, pattern } = options;

    return WebpackDynamicEntryPlugin.getEntry({
      pattern: [
        path.join(dir.root, dir.src, dir.page, pattern),
        path.join(dir.root, dir.src, dir.page, '_error.{js,jsx}'),
      ],
      generate: (entry) => {
        if (!entry._error) entry._error = loadDefaultPages._error;

        return Object.assign.apply(Object, Object.keys(entry)
          .map((name) => {
            const entryVal = [`${entry[name]}?rextClientPage`];

            if (dev) {
              entryVal.unshift(
                // https://github.com/webpack-contrib/webpack-hot-middleware/issues/53#issuecomment-162823945
                'eventsource-polyfill',
                // https://github.com/glenjamin/webpack-hot-middleware#config
                `webpack-hot-middleware/client?path=${options.build.publicPath}__rext__/hmr`,
              );
            }
            return { [name]: entryVal };
          }));
      },
    });
  }

  output() {
    const { assetsPath } = this;
    const output = super.output();
    return {
      ...output,
      filename: assetsPath.app,
      chunkFilename: assetsPath.chunk,
    };
  }

  nodeEnv() {
    return Object.assign(
      super.nodeEnv(),
      {
        'process.browser': true,
        'process.client': true,
        'process.server': false,
      },
    );
  }

  get rules() {
    const { loadDefaultPages, options } = this;
    const { dir, globals, dev } = options;

    const rules = super.rules;

    return rules.concat([{
      test: /\.(js|jsx)$/,
      resourceQuery: /rextClientPage/,
      use: [{
        loader: 'babel-loader',
      }, {
        loader: '@rextjs/client-page-loader',
        options: {
          app: findPageFile(path.join(dir.root, dir.src, dir.page, '_app'), ['js', 'jsx'], loadDefaultPages._app),
          id: globals.id,
          context: globals.context,
          useHot: dev,
        },
      }],
    }]);
  }

  plugins() {
    const { dev, options } = this;
    const { build, dir } = options;
    const { publicPath } = build;

    const plugins = super.plugins();
    plugins.push(
      new WebpackManifestPlugin({
        publicPath,
        fileName: path.join(dir.root, dir.build, build.dir.manifest),
        generate: (seed, files, entryPoints) => Object.assign
          .apply(Object, Object.keys(entryPoints)
            .sort((a, b) => a.lastIndexOf('index') - b.indexOf('index'))
            .sort((a, b) => a.lastIndexOf('_error') - b.indexOf('_error'))
            .map((name) => {
              const fileList = entryPoints[name]
                .map((file) => `${publicPath}${file}`)
                .filter((row) => /\.(js|css)$/.test(row));

              return {
                [name]: fileList,
              };
            })),
      }),
    );

    if (dev) plugins.push(new webpack.HotModuleReplacementPlugin());

    return plugins;
  }

  optimization() {
    const { options, dev } = this;
    if (dev) return {};

    return {
      splitChunks: {
        cacheGroups: {
          vendor: {
            name: 'vendor',
            chunks: 'initial',
            test: ({ resource }) => resource && /\.js$/.test(resource) && resource.indexOf(path.join(options.dir.root, 'node_modules')) === 0,
            priority: -10,
          },
          async: {
            name: 'async',
            chunks: 'async',
            minChunks: 3,
          },
        },
      },
      runtimeChunk: true,
      minimizer: [
        new OptimizeCSSPlugin({
          cssProcessorOptions: { safe: true },
        }),
        new UglifyJsPlugin({
          uglifyOptions: {
            output: {
              comments: false,
            },
            compress: {
              drop_debugger: true,
              drop_console: true,
            },
          },
          sourceMap: false,
          parallel: true,
        }),
      ],
    };
  }

  config() {
    const config = super.config();
    return {
      ...config,
      optimization: this.optimization(),
    };
  }
}
