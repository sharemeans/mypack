让我们写一个less文件
```
@bgColor: #acacac;
html,body {
  background-color: @bgColor;
  margin: 0;
  padding: 0;
}
```
webpack.config.js使用style-loader和less-loader
```
module: {
  rules: [
    {
      test: /\.less$/,
      use: [
        path.resolve(__dirname,'loader', 'style-loader'),
        path.resolve(__dirname,'loader', 'less-loader')
      ]
    }
  ]
}
```

这2个loader写在我们的业务项目webpack-dev中，而非mypack中。

## style-loader
```
function loader(source) {
  let style = 
  "style = document.createElement('style');"
  +"style.innerHTML = "
  + `${JSON.stringify(source).replace(/\\n/g,'')}`
  + ";document.head.appendChild(style)"
  return style
}
module.exports = loader
```
以上代码中，需要注意的一点，style.innerHTML赋值css时，换行符`\n`要么需要被删除，要么改成`\\n`，否则eval函数执行时会报错。

## less-loader
```
let less = require('less')
function loader(source) {
  let css = ''
  less.render(source, function(err, c){
    css = c.css
  })
  return css
}
module.exports = loader
```

## mypack中加入loader逻辑
loader工作阶段是在@babel/parser之前，即拿到模块文件中的sourcecode后立即执行loader。我们可以规定，针对同一个文件，如果有多个loader，那么loader是串行执行的，上一个loader的执行结果会传给下一个。我们可以用tapable库中的SyncWaterfallHook完成这个任务。
新的getSource方法：
```
getSource(modulePath) {
  let source = fs.readFileSync(modulePath, 'utf8')
  let hook = new tapable.SyncWaterfallHook(['source'])

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
```

这样我们就可以在webpack-dev的src/index.js中引入index.less
```
let str = require('./a')
require('./index.less')
console.log(str)
```

## parser
@babel/parse是一个js语法解析器，遇到css文件会报错。我们需要对parser做容错处理。
```
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
```
