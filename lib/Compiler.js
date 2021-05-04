let fs = require('fs')
let path = require('path')
let ejs = require('ejs')
let {SyncWaterfallHook, SyncHook} = require('tapable')

// parser 源码转化成ast
// @babel/traverse 遍历ast节点树
// @babel/types 
// @babel/generator
let parser = require('@babel/parser')
let t = require('@babel/types')
let traverse = require('@babel/traverse').default
let generator = require('@babel/generator').default

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

    let plugins = this.config.plugins
    if (Array.isArray(plugins)) {
      plugins.forEach(plugin => {
        plugin.apply(this)
      })
    }
    this.hooks.afterPlugins.call()
  }
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
  /**
   * 根据路径获取文件内容（tapable）
   * @param {*} modulePath 
   * @returns 
   */
  getSource(modulePath) {
    let source = fs.readFileSync(modulePath, 'utf8')
    let hook = new SyncWaterfallHook(['source'])

    let rules = this.config.module.rules
    for(let i = 0; i < rules.length; i++) {
      let rule = rules[i]
      let {test, use} = rule
      if (use.length && test.test(modulePath)) {
        for (let index = use.length-1; index >= 0; index--) {
          const loaderPath = use[index];
          hook.tap(loaderPath, (source) => {
            return require(loaderPath)(source)
          })
        }
        
      }
    }
    if (hook.taps.length) {
      source = hook.call(source)
    }

    return source
  }
  /**
   * 根据路径获取文件内容（普通写法）
   * @param {*} modulePath 
   * @param {*} isEntry 
   */
  // getSource(modulePath) {
  //   let source = fs.readFileSync(modulePath, 'utf8')

  //   let rules = this.config.module.rules
  //   for(let i = 0; i < rules.length; i++) {
  //     let rule = rules[i]
  //     let {test, use} = rule
  //     if (test.test(modulePath)) {
  //       let loaderIndex = rule.use.length - 1
        
  //       function normalLoader() {
  //         let loader = require(use[loaderIndex--])
  //         source = loader(source)
  //         // 获取对应的loader函数
  //         if (loaderIndex>=0) {
  //           normalLoader()
  //         }
  //       }

  //       normalLoader()
  //     }
  //   }

  //   return source
  // }
  /**
   * 解析当前文件依赖，并解析源码
   * @param {*} modulePath 文件路径
   * @param {*} isEntry 是否是入口文件
   */
  buildModule(modulePath, isEntry=false) {
    // 拿到模块内容
    let source = this.getSource(modulePath)
    // 模块id
    let moduleName = './' + path.relative(this.root, modulePath)

    // 保存入口名称
    if(isEntry) {
      this.entryId = moduleName
    }
    // 解析源码，并返回依赖列表
    try {
      let {sourceCode, dependencies} = this.parse(source, path.dirname(moduleName))
      // 模块写入内存
      this.modules[moduleName] = sourceCode
      dependencies.forEach(dep => {
        this.buildModule(path.join(this.root, dep))
      })
    } 
    catch(err) {
      // not js source
      // do nothing
      this.modules[moduleName] = source
    }
  }
  /**
   * 解析源码 AST 解析语法树
   * @param {*} source 
   */
  parse(source, parentDir) {
    let ast = parser.parse(source)
    let dependencies = []
    traverse(ast, {
      CallExpression(p) {
        let node = p.node
        // 匹配require语法
        if (node.callee.name === 'require') {
          // 替换require方法
          node.callee.name = '__webpack_require__'
          // 路径处理（假设模块引入都是相对路径）
          let moduleName = node.arguments[0].value
          // 添加文件后缀
          moduleName = moduleName + (path.extname(moduleName) ? '' : '.js')
          // 引用路径带上模块名称
          moduleName = './' + path.join(parentDir, moduleName)
          // 传入新的模块路径，更新节点
          node.arguments[0] = t.stringLiteral(moduleName)
          // 将依赖添加到依赖数组
          dependencies.push(moduleName)
        }
      }
    })

    let sourceCode = generator(ast).code
    return {
      sourceCode,
      dependencies
    }
  }
  /**
   * 将modules生成打包结果
   */
  emitFile() {
    // 获取输出目录
    let mainPath = path.join(this.config.output.path, this.config.output.filename)
    let templateStr = this.getSource(path.resolve(__dirname, 'main.ejs'))
    let code = ejs.render(templateStr, {
      entryId: this.entryId,
      modules: this.modules
    })
    // 资源：代码映射
    this.assets = {
      main: code
    }

    fs.writeFileSync(mainPath, code)
  }
}

module.exports = Compiler