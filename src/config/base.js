import path from 'path';
import WebpackDynamicEntryPlugin from 'webpack-dynamic-entry-plugin';
import webpack from 'webpack';
import consola from 'consola';
import cloneDeep from 'lodash/cloneDeep';
import WebpackBarPlugin from 'webpackbar';
import MiniCssExtractPlugin from 'mini-css-extract-plugin';
import { assetsLoaders, styleLoaders } from '../utils/loaders';

export default class WebpackBaseConfig {
  constructor(options) {
    this.options = options;

    this.nodeEnv = this.nodeEnv.bind(this);
    this.getBabelOptions = this.getBabelOptions.bind(this);
  }

  get assetsPath() {
    const { env, options: { dev, build: { dir, filenames } } } = this;
    const { app, chunk, css, img, font, video, cssModulesName } = filenames || {};

    const resolvePath = (_path) => path.posix.join(dev ? '.' : dir.static, _path);

    const loadFileNamePath = (name) => {
      let fileName;
      if (typeof name === 'string') fileName = resolvePath(name);
      if (typeof name === 'function') fileName = resolvePath(name(env));
      if (fileName && dev) {
        const hash = /\[(chunkhash|contenthash|hash)(?::(\d+))?]/.exec(fileName);
        if (hash) consola.warn(`Notice: Please do not use ${hash[1]} in dev mode to prevent memory leak`);
      }
      return fileName;
    };

    const loadCssModulesName = (name) => {
      let cssName;
      if (typeof name === 'string') cssName = name;
      if (typeof name === 'function') cssName = name(env);

      return cssName;
    };

    return {
      // eslint-disable-next-line
      app: loadFileNamePath(app) || (dev ? '[name].js' : resolvePath('js/[contenthash:8].js')),
      // eslint-disable-next-line
      chunk: loadFileNamePath(chunk) || (dev ? '[name].js' : resolvePath('js/[contenthash:8].js')),
      css: loadFileNamePath(css) || (dev ? '[name].css' : resolvePath('css/[contenthash:8].css')),
      img: loadFileNamePath(img) || (dev ? '[path][name].[ext]' : resolvePath('images/[contenthash:8].[ext]')),
      font: loadFileNamePath(font) || (dev ? '[path][name].[ext]' : resolvePath('fonts/[contenthash:8].[ext]')),
      video: loadFileNamePath(video) || (dev ? '[path][name].[ext]' : resolvePath('videos/[contenthash:8].[ext]')),
      cssModulesName: loadCssModulesName(cssModulesName) || (dev ? '[name]__[local]--[hash:base64:5]' : '_[hash:base64:10]'),
    };
  }

  // eslint-disable-next-line
  get loadDefaultPages() {
    return {
      _document: '@rextjs/client-page/Document',
      _app: '@rextjs/client-page/App',
      _error: '@rextjs/client-page/Error',
    };
  }

  get color() {
    const { name } = this;
    const colors = {
      client: 'green',
      server: 'orange',
    };

    return colors[name];
  }

  get dev() {
    return this.options.dev;
  }

  get env() {
    return {
      isDev: this.dev,
      isServer: this.isServer,
      isClient: this.isClient,
    };
  }

  get mode() {
    return this.dev ? 'development' : 'production';
  }

  get target() {
    return this.isServer ? 'node' : 'web';
  }

  get devtool() {
    const { dev, isServer } = this;
    if (!dev || isServer) return false;

    return 'source-map';
  }

  output() {
    const { options } = this;
    const { build, dir } = options;
    return {
      path: path.join(dir.root, dir.build),
      publicPath: build.publicPath,
    };
  }

  nodeEnv() {
    const env = {
      'process.env.NODE_ENV': JSON.stringify(this.mode),
      'process.mode': JSON.stringify(this.mode),
      'process.dev': this.dev,
    };

    Object.entries(this.options.env).forEach(([key, value]) => {
      const envPrefix = 'process.env.';
      const envKey = envPrefix + key.replace(new RegExp(`^${envPrefix}`), '');
      env[envKey] = ['boolean', 'number'].includes(typeof value) ? value : JSON.stringify(value);
    });

    return env;
  }

  getBabelOptions() {
    const { name: envName, env, options } = this;
    const { babel } = options.build;

    const opt = {
      ...babel,
      envName,
    };

    if (opt.configFile || opt.babelrc) return opt;

    const defaultPlugins = [
      '@babel/plugin-transform-runtime',
      '@babel/plugin-syntax-dynamic-import',
      '@babel/plugin-proposal-class-properties',
      '@babel/plugin-proposal-throw-expressions',
      '@rextjs/babel-plugin-auto-css-modules',
    ];
    if (typeof opt.plugins === 'function') opt.plugins = opt.plugins({ envName, ...env }, defaultPlugins);
    if (!opt.plugins) opt.plugins = defaultPlugins;

    const defaultPreset = [
      ['@babel/preset-env', { modules: false }],
      '@babel/preset-react',
    ];

    if (typeof opt.presets === 'function') opt.presets = opt.presets({ envName, ...env }, defaultPreset);
    if (!opt.presets) opt.presets = defaultPreset;

    return opt;
  }

  createLintingRule() {
    return {
      test: /\.(jsx?)$/,
      loader: 'eslint-loader',
      enforce: 'pre',
      options: {
        formatter: require('eslint-friendly-formatter'),
      },
    };
  }

  get rules() {
    const { env, assetsPath, getBabelOptions, createLintingRule, options } = this;
    const babelOptions = getBabelOptions();

    return [{
      test: /\.(js|jsx)$/,
      loader: 'babel-loader',
      include: [
        path.join(options.dir.root, options.dir.src),
        path.join(options.dir.root, 'node_modules/webpack-hot-middleware/client'),
      ],
      options: babelOptions,
    }, options.build.useEslint && createLintingRule()]
      .concat(styleLoaders({
        sourceMap: env.isDev,
        assetsPath,
      }))
      .concat(assetsLoaders({ emitFile: env.isClient, assetsPath }))
      .filter(Boolean);
  }

  plugins() {
    const { name, color, nodeEnv, assetsPath } = this;
    return [
      new MiniCssExtractPlugin({
        filename: assetsPath.css,
        chunkFilename: assetsPath.css,
      }),
      new WebpackDynamicEntryPlugin(),
      new WebpackBarPlugin({
        name,
        color,
      }),
      new webpack.DefinePlugin(nodeEnv()),
    ];
  }

  extendConfig(config) {
    const { options, env } = this;
    const { extend } = options.build;
    if (typeof extend === 'function') return extend(config, env) || config;
    return config;
  }

  config() {
    const alias = this.options.build.alias || {};
    if (this.options.dev) alias['react-dom'] = '@hot-loader/react-dom';

    const config = {
      name: this.name,
      target: this.target,
      mode: this.mode,
      devtool: this.devtool,
      entry: this.entry(),
      output: this.output(),
      module: {
        rules: this.rules,
      },
      resolve: {
        extensions: ['.js', '.jsx', '.json'],
        alias,
      },
      plugins: this.plugins(),
      performance: {
        hints: false,
      },
      stats: {
        colors: true,
        modules: false,
        children: false,
        chunks: false,
        chunkModules: false,
        entrypoints: false,
      },
    };

    return cloneDeep(this.extendConfig(config));
  }
}
