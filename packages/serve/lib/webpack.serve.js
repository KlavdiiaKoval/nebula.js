/* eslint global-require: 0 */
const path = require('path');
const chalk = require('chalk');

const webpack = require('webpack');
const WebpackDevServer = require('webpack-dev-server');

const nm = require.resolve('leonardo-ui');
const nmPath = nm.substring(0, nm.lastIndexOf('node_modules') + 12);

module.exports = async ({
  host,
  port,
  enigmaConfig,
  snPath,
  dev = false,
}) => {
  let config;
  let contentBase;

  if (dev) {
    const webpackConfig = require('./webpack.build.js');
    const srcDir = path.resolve(__dirname, '../web');
    const distDir = path.resolve(srcDir, '../dist');
    contentBase = distDir;
    config = webpackConfig({
      srcDir,
      distDir,
      dev: true,
      snPath,
    });
  } else {
    const webpackConfig = require('./webpack.prod.js');
    const srcDir = path.resolve(__dirname, '../dist');
    contentBase = srcDir;
    config = webpackConfig({
      srcDir,
      snPath,
    });
  }

  const options = {
    clientLogLevel: 'none',
    hot: true,
    host,
    port,
    overlay: {
      warnings: false,
      errors: true,
    },
    quiet: true,
    open: true,
    contentBase: [
      contentBase,
      nmPath,
    ],
    historyApiFallback: {
      index: '/eHub.html',
    },
    proxy: [{
      context: '/render',
      target: `http://${host}:${port}/eRender.html`,
      ignorePath: true,
    }, {
      context: '/dev',
      target: `http://${host}:${port}/eDev.html`,
      ignorePath: true,
    }, {
      context: '/engine',
      ignorePath: true,
      ws: true,
      target: `ws://${enigmaConfig.host || 'localhost'}:${enigmaConfig.port}`,
    }],
  };

  console.log('Starting development server...');

  WebpackDevServer.addDevServerEntrypoints(config, options);
  const compiler = webpack(config);
  const server = new WebpackDevServer(compiler, options);

  const close = () => {
    server.close(() => {
      process.exit(0);
    });
  };

  ['SIGINT', 'SIGTERM'].forEach((signal) => {
    process.on(signal, close);
  });

  let initiated = false;

  return new Promise((resolve, reject) => { // eslint-disable-line consistent-return
    compiler.hooks.done.tap('nebula serve', (stats) => {
      if (!initiated) {
        initiated = true;
        const url = `http://${host}:${port}`;
        console.log(`...running at ${chalk.green(url)}`);

        resolve({
          context: '',
          url,
          close,
        });

        if (stats.hasErrors()) {
          stats.compilation.errors.forEach((e) => {
            console.log(chalk.red(e));
          });
          process.exit(1);
        }
      }
    });

    server.listen(port, host, (err) => {
      if (err) {
        reject(err);
      }
    });
  });
};
