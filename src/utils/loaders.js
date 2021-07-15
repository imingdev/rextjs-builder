import MiniCssExtractPlugin from 'mini-css-extract-plugin';

export const cssLoaders = (options = {}) => {
  const cssLoader = {
    loader: 'css-loader',
    options: {
      modules: {
        auto: options.useCssModules ? undefined : /\.module\.\w+$/i,
        localIdentName: options.assetsPath?.cssModulesName,
      },
      sourceMap: options.sourceMap,
    },
  };

  const postcssLoader = {
    loader: 'postcss-loader',
    options: {
      sourceMap: options.sourceMap,
    },
  };

  // generate loader string to be used with extract text plugin
  const generateLoaders = (loader, loaderOptions) => {
    const loaders = [cssLoader, postcssLoader];

    if (loader) {
      loaders.push({
        loader: `${loader}-loader`,
        options: {
          ...loaderOptions,
          sourceMap: options.sourceMap,
        },
      });
    }
    return [MiniCssExtractPlugin.loader].concat(loaders);
  };

  return {
    css: generateLoaders(),
    postcss: generateLoaders(),
    less: generateLoaders('less'),
    sass: generateLoaders('sass', { indentedSyntax: true }),
    scss: generateLoaders('sass'),
    stylus: generateLoaders('stylus'),
    styl: generateLoaders('stylus'),
  };
};

export const styleLoaders = (options = {}) => {
  const output = [];
  const normalLoaders = cssLoaders(options);
  const cssModulesLoaders = cssLoaders({ ...options || {}, useCssModules: true });

  for (const extension in normalLoaders) {
    const test = new RegExp(`\\.${extension}$`);
    output.push({
      oneOf: [{
        test,
        resourceQuery: /modules/,
        use: cssModulesLoaders[extension],
      }, {
        test,
        use: normalLoaders[extension],
      }],
    });
  }

  return output;
};

export const assetsLoaders = ({ emitFile = true, assetsPath } = {}) => {
  const loader = 'url-loader';
  const limit = 1000;

  return [{
    test: /\.(png|jpe?g|gif|svg|webp|avif)$/i,
    loader,
    options: {
      limit,
      emitFile,
      name: assetsPath.img,
    },
  }, {
    test: /\.(webm|mp4|ogv)$/i,
    loader,
    options: {
      limit,
      emitFile,
      name: assetsPath.video,
    },
  }, {
    test: /\.(woff2?|eot|ttf|otf)(\?.*)?$/i,
    loader,
    options: {
      limit,
      emitFile,
      name: assetsPath.font,
    },
  }];
};
