## ts-node-build

ts-node 项目文件打包工具

## 使用教程

```typescript
import BuildServe from "ts-node-build"
new BuildServe({
    inputFiles:[
        '!(node_modules|.git|.idea|.DS_Store|dist|build|unit_test)/**/**',
    ],
    rules:[
        {
            rule:/package\.json$/,
            transform(transformOptions: TransformOptions){
                const json = readJSONSync(transformOptions.file)
                json.main = json.main.replace(/\.ts/img, '.js')
                json.scripts = Object.fromEntries(Object.entries(json.scripts || {}).map((e:any)=>[e[0],e[1].replace(/ts-node/img, 'node').replace(/\.ts/img, '.js')]))
                return JSON.stringify(json, null, 4)
            },
        },
        {
            rule:/\.ts$/,
            outFileName:"[name].js",
            transform(transformOptions: TransformOptions){
                transformOptions.targetFilePath
                /***
                 * ts代码编译
                 */
                const fileContent = tsNode({
                    cwd:transformOptions.config.cwd,
                    logError:true,
                    transpileOnly:true,
                    compilerOptions:{
                        "module": "commonjs",
                        "target": "esnext",
                        "sourceMap": false,
                    }
                }).compile(transformOptions.code, transformOptions.targetFileParse.base);
                const outCode = fileContent.replace(/(require\([^\n]+)(\.)(ts)([^\n]+?\))/g,'$1$2js$4')
                return outCode
                /**
                 * 代码加密
                 */
                // const obfuscationResult = obfuscate(outCode, {
                //     compact: true,
                //     numbersToExpressions: true,
                //     simplify: true,
                //     stringArrayShuffle: true,
                //     splitStrings: true,
                //     stringArrayThreshold: 1,
                //     unicodeEscapeSequence:true
                // })
                // return obfuscationResult.getObfuscatedCode()
            },
        },
    ],
}).compile()
```
