webpack的核心是compiler。compiler工作的各个阶段都插入了钩子（任务队列），plugins就是各个钩子中的任务。所有的钩子列表参考[plugins](https://webpack.js.org/api/compiler-hooks/)

webpack中的钩子都是基于tapable库的实例。首先安装tapable。

这里我们仅以`entryOption`,`compile`,`afterCompile`,`emit`为例。

## 钩子实例化
需要在compiler构造函数中定义以上钩子
```
let {SyncWaterfallHook, SyncHook} = require('tapable')

// 定义钩子
this.hooks = {
  entryOption: new SyncHook(),
  compile: new SyncHook(),
  afterCompile: new SyncHook(),
  afterPlugins: new SyncHook(),
  run: new SyncHook(),
  emit: new SyncHook(),
  done: new SyncHook()
}
```

## 将钩子埋入compiler工作流程中
```
/**
  * 创建模块
  */
run() {
  this.hooks.run.call()
  this.hooks.compile.call()
  this.buildModule(path.join(this.root, this.entry), true)
  this.hooks.afterCompile.call()
  this.emitFile()
  this.hooks.emit.call()
  this.hooks.done.call()
}
```

## 添加plugins配置
在webpack-dev项目中，我们定义一个插件，规定它在emit钩子中触发。
```
module.exports = class P {
  apply(compiler) {
    compiler.hooks.emit.tap('emit', function() {
      console.log('emit')
    })
  }
}
```
在webpack.config.js中配置该插件
```
// webpack.config.js
let emitConsolePlugin = require('./plugins/emit-console-plugin')

module.exports = {
  ...
  plugins: [
    new emitConsolePlugin()
  ]
}
```

