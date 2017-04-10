let webpack = require('webpack');
let HtmlPlugin = require('html-webpack-plugin');
let CleanWebpackPlugin = require('clean-webpack-plugin');
let ExtractTextPlugin = require('extract-text-webpack-plugin');
let loaders = require('./webpack.config.loaders')();
// let path = require('./src');

loaders.push({
    test: /\.css$/,
    loader: ExtractTextPlugin.extract({
        fallbackLoader: 'style-loader',
        loader: 'css-loader'
    })
});

module.exports = {
    entry: {
        main: './src/index.js',
    },
    output: {
        filename: '[chunkhash].js',
        path: './dist'
    },
    devtool: 'source-map',
    module: {
        loaders
    },
    /*resolve: {
        root: path.resolve('/templates'),
        extensions: '.hbs'
    },*/
    plugins: [
        new webpack.optimize.UglifyJsPlugin({
            sourceMap: true,
            compress: {
                drop_debugger: false
            }
        }),
        new ExtractTextPlugin('styles.css'),
        new HtmlPlugin({
            title: 'Chat',
            template: 'index.hbs',
            filename: 'index.html',
            chunks: ['main']
        }),
        new CleanWebpackPlugin(['dist'])
    ]
};
