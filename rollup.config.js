import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import eslint from '@rollup/plugin-eslint';
import { dependencies } from './package.json';

export default {
  input: './src/Builder.js',
  output: {
    file: 'dist/Builder.js',
    format: 'cjs',
    exports: 'auto',
  },
  plugins: [
    // 支持第三方模块
    resolve(),
    // 支持 commonjs 格式
    commonjs(),
    // eslint
    eslint('.eslintrc.js'),
  ],
  // 第三方模块不会强行打包到输出中
  external: Object.keys(dependencies),
};
