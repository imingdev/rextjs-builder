import pify from 'pify';
import webpack from 'webpack';
import webpackDevMiddleware from 'webpack-dev-middleware';
import webpackHotMiddleware from 'webpack-hot-middleware';
import fs from 'fs';
import MFS from 'memory-fs';
import getWebpackConfig from './config';
import events from './utils/events';

export default class Builder {
  constructor(options) {
    this.options = options;
    this.webpackConfig = getWebpackConfig(options);

    // Initialize shared MFS for dev
    this.mfs = options.dev ? new MFS() : fs;

    this.webpackCompile = this.webpackCompile.bind(this);
    this.middleware = this.middleware.bind(this);
  }

  on(name, cb) {
    return events.on(name, cb)
  }

  emit(name, ...args) {
    return events.emit(name, ...args)
  }

  async build() {
    const {client, server} = this.webpackConfig;

    await Promise.all([client, server].map((c) => this.webpackCompile(webpack(c))));
  }

  async webpackCompile(compiler) {
    const {options, mfs, emit} = this;
    const {name} = compiler.options;

    // compile done
    compiler.hooks.done.tap('rext-done', (stats) => emit('done', {name, compiler, stats}));

    if (options.dev) {
      // Client Build, watch is started by dev-middleware
      if (name === 'client') {
        // In dev, write files in memory FS
        compiler.outputFileSystem = mfs;

        return new Promise((resolve) => {
          compiler.hooks.done.tap('rext-dev', () => resolve());
          return this.webpackDev(compiler);
        });
      }

      // Server, build and watch for changes
      if (name === 'server') {
        return new Promise((resolve, reject) => {
          compiler.watch(options.build.watch, (err) => {
            if (err) return reject(err);

            resolve();
          });
        });
      }
    }

    compiler.run = pify(compiler.run);
    const stats = await compiler.run();

    if (stats.hasErrors()) {
      const error = new Error('rext build error');
      error.stack = stats.toString('errors-only');
      throw error;
    }
  }

  webpackDev(compiler) {
    const {middleware, emit} = this;
    // Create webpack dev middleware
    this.devMiddleware = pify(
      webpackDevMiddleware(compiler, {
        stats: false
      })
    );
    // Create webpack hot middleware
    this.hotMiddleware = pify(
      webpackHotMiddleware(compiler, {
        log: false,
        heartbeat: 10000,
        path: '/__rext__/hmr'
      })
    );

    // Register devMiddleware
    emit('middleware', middleware);
  }

  // dev middle
  async middleware(req, res, next) {
    const {devMiddleware, hotMiddleware} = this;
    if (devMiddleware) await devMiddleware(req, res);

    if (hotMiddleware) await hotMiddleware(req, res);

    next();
  }
}
