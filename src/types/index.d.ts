import {ParsedPath} from "path";
import {Options as OptionsInternal, Pattern as PatternInternal} from "fast-glob";
import BuildServe from "../index";

export type TransformOptions = {
    files:string[]
    file:string
    fileIndex:number
    isTransformEnd:boolean
    targetFilePath:string
    targetFilePathDir:string
    targetFileParse:ParsedPath
    isJson:boolean
    isTs:boolean
    isJs:boolean
    code:any
    config:BuildServeConfig
}
export type RulesMap = Array<RulesMapPlugin>
export type RulesMapPlugin = {
    rule:RegExp
    outFileDir?:string,
    outFileName?:string,
    transform?(transformOptions:TransformOptions):Promise<string | void> | string | void
}
export type BuildServeConfig = Partial<BuildServeConfigOptions>
export interface BuildServeConfigOptions {
    rules:RulesMap
    cwd:string
    outDir:string
    removeDistDir:boolean
    inputFiles:PatternInternal | PatternInternal[]
    inputFilesOptions:OptionsInternal
    completeEnd?(): Promise<any> | void
    completeBeforeEnd?(): Promise<any> | void
    onError?(error:Error): Promise<any> | void
    completeBeforeStart?(): Promise<any> | void
    completeStart?(transformOptions:TransformOptions): Promise<any> | void
}

export default BuildServe
