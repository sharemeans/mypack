webpack的核心就是compiler，它的任务就是
1. 读取口文件并解析依赖
2. 根据依赖树逐个生成模块并打包到bundle中
```
// bin/pack.js

// 1）找到当前要执行的命令所在路径，拿到webpack.config.js
let path = require('path')

// 配置文件
let config = require(path.resolve('webpack.config.js'))

let Compiler = require('../lib/Compiler.js')
let compiler = new Compiler(config)
// 编译运行
compiler.run()

// lib/Compiler
let fs = require('fs')
let path = require('path')

class Compiler {
  constructor(config) {
    this.config = config
    // 保存入口文件路径
    // 保存模块依赖
    this.entryId;
    // 所有模块
    this.modules = {}
    // 入口配置
    this.entry = config.entry
    // 项目根目录
    this.root = process.cwd()
  }
  /**
   * 创建模块
   */
  run() {
    this.buildModule(path.join(this.root, this.entry), true)
  }
  /**
   * 解析当前文件依赖，并解析源码
   * @param {*} modulePath 文件路径
   * @param {*} isEntry 是否是入口文件
   */
  buildModule(modulePath, isEntry) {
    // 获取入口模块代码
    // 解析入口模块代码
    // 递归解析文件依赖
  }
}

module.exports = Compiler
```

