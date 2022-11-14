import {green, blue, yellow} from  "chalk"
import {remove, mkdir, mkdirSync, copyFileSync, writeFileSync} from "fs-extra"
import {sync} from "fast-glob"
import {resolve, parse} from "path"
import * as ProgressBar from 'progress'
import {readFileSync} from "fs";
import {merge} from "lodash"
import {createHash} from "crypto"
import {BuildServeConfig, TransformOptions} from "./types"
import {version, author} from "../package.json"
const log = console.log
class BuildServe {
    config:BuildServeConfig
    constructor(config:BuildServeConfig) {
        log(green(`
        ts-node-build 打包插件
        作者：${author}
        版本：${version}
        ======================`.split("\n").map(e=>e.trim()).join('\n')))
        this.mergeConfig(config)
    }
    mergeConfig(config:BuildServeConfig){
        this.config = merge<BuildServeConfig, BuildServeConfig>({
            cwd:process.cwd(),
            outDir:'dist',
            rules:[],
            inputFiles:[],
            inputFilesOptions:{},
            removeDistDir:true
        }, config)
    }

    async compile(){
        return new Promise((resolve1, reject) => {
            (async ()=>{
                try {
                    const distDir = resolve(this.config.cwd, this.config.outDir)
                    log(blue("正在扫描文件中，请稍等..."))
                    const files = sync(this.config.inputFiles, merge({
                        cwd:this.config.cwd
                    }, this.config.inputFilesOptions))
                    log(yellow(`已扫描文件：${files.length} \n打包对象：${
                        Object.prototype.toString.call(this.config.inputFiles) === '[object String]' ? this.config.inputFiles : (this.config.inputFiles as any).map((e,k)=> `\n      文件目标（${k+1}）=> ${e}`)
                    }\n当前工作目录：${this.config.cwd}`))
                    if(this.config.removeDistDir){
                        log(blue(`目录开始删除：${this.config.outDir}`))
                        await remove(distDir)
                        log(green(`目录删除完成：${this.config.outDir} `))
                        log(blue(`目录重新创建：${this.config.outDir} `))
                        await mkdir(distDir)
                        log(green(`目录创建完成：${this.config.outDir} `))
                    }
                    await this.config?.completeBeforeStart?.()
                    const bar = new ProgressBar(`${blue('当前打包进度')} ${green(':percent')} :bar 已处理(${green(':current')}/:total})文件\n`, {
                        total: files.length,
                        width: 50
                    })
                    const barNext = async ()=>{
                        bar.tick()
                        if (bar.complete) {
                            await this.config?.completeBeforeEnd?.()
                            log(green('代码打包完成'))
                            await this.config?.completeEnd?.()
                            resolve1(null)
                        }
                    }
                    await Promise.all(files.map((file, fileIndex) => {
                        return (async ()=>{
                            try {
                                const targetFilePath = resolve(distDir, file.replace(this.config.cwd, '.'))
                                const targetFilePathDir = resolve(targetFilePath, '..')
                                const targetFileParse = parse(file)
                                const code = readFileSync(file,"utf-8")
                                mkdirSync(targetFilePathDir, {recursive:true})
                                const isJson = /package\.json$/.test(file)
                                const isTs = /\.ts$/.test(file)
                                const isJs = /\.js$/.test(file)
                                const transformOptions:TransformOptions = {
                                    files,
                                    fileIndex,
                                    isTransformEnd:false,
                                    file,
                                    targetFilePath,
                                    targetFilePathDir,
                                    targetFileParse,
                                    isJson,
                                    isTs,
                                    isJs,
                                    code,
                                    config:this.config
                                }
                                if(fileIndex === 0){
                                    await this.config?.completeStart?.(transformOptions)
                                }
                                const rules = this.config.rules.filter(plug=>plug.rule.test(file)) || []
                                if(rules.length == 0){
                                    copyFileSync(file, targetFilePath)
                                    await barNext()
                                    return
                                }
                                let isFileWrite = false
                                let index = 0;
                                while (index < rules.length){
                                    const rulesMapPlugin = rules[index];
                                    const resCode = (await rulesMapPlugin?.transform?.(transformOptions))
                                    if(!['[object Undefined]', '[object Null]'].includes(Object.prototype.toString.call(resCode))){
                                        transformOptions.code = resCode
                                    }
                                    if(rulesMapPlugin.outFileDir || rulesMapPlugin.outFileName){
                                        const outFilePath = resolve(distDir, rulesMapPlugin.outFileDir || '', file)
                                        const outFilePathParse = parse(outFilePath)
                                        if(rulesMapPlugin.outFileDir){
                                            mkdirSync(outFilePathParse.dir, {recursive:true})
                                        }
                                        const outFileName = Object.keys(outFilePathParse).reduce((a, b)=>{
                                            return a.replace(new RegExp(`\\[${b}\\]`,"img"), outFilePathParse[b])
                                        }, (rulesMapPlugin.outFileName || '[name][ext]').replace(/\[hash\]/img,createHash('sha256').update(Date.now().toString()).digest('hex').slice(0,6)))
                                        writeFileSync(resolve(outFilePathParse.dir, outFileName), transformOptions.code)
                                        isFileWrite = true
                                    }
                                    index ++
                                }
                                if(!isFileWrite){
                                    writeFileSync(targetFilePath, transformOptions.code)
                                }
                                transformOptions.isTransformEnd = files.length === (fileIndex + 1)
                                await barNext()
                            }catch (e){
                                await barNext()
                                await this.config?.onError?.call(e)
                            }
                        })()
                    }))
                }catch (e){
                    await this.config?.onError?.(e)
                    reject(e)
                }
            })()
        })
    }
}
export default BuildServe
