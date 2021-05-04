#! /usr/bin/env node

// 1）找到当前要执行的命令所在路径，拿到webpack.config.js
let path = require('path')

// 配置文件
let config = require(path.resolve('webpack.config.js'))

let Compiler = require('../lib/Compiler.js')
let compiler = new Compiler(config)
compiler.hooks.entryOption.call()
// 编译运行
compiler.run()
