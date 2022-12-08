import { isFunction,  isObject, isString, queueInvoke } from "@gowiny/js-utils"
import { BeforeEachResult, DebuggerArrayConfig,  NavTarget,  Route, RouteLocationRaw, Router, RouteRule } from "./types"
import qs from 'qs';
import { LifecycleHook, NavType } from "./enums";
import { StaticContext } from "./context";

export function getRouteByPage(page:Page.PageInstance){
    let path = page.route || "";
    if(!path.startsWith("/")){
        path = '/' + path
    }
    const result:Route = {
        fullPath:path,
        path
    }
    return result
}

export function info(router:Router,...args:any[]){
    const logConf = router.options.debugger
    if(logConf && (logConf === true || (logConf as DebuggerArrayConfig).info)){
        console.info(...args)
    }
}
export function error(router:Router,...args:any[]){
    const logConf = router.options.debugger
    if(logConf && (logConf === true || (logConf as DebuggerArrayConfig).info)){
        console.error(...args)
    }
}
export function debug(router:Router,...args:any[]){
    const logConf = router.options.debugger
    if(logConf && (logConf === true || (logConf as DebuggerArrayConfig).info)){
        console.debug(...args)
    }
}
export function warn(router:Router,...args:any[]){
    const logConf = router.options.debugger
    if(logConf && (logConf === true || (logConf as DebuggerArrayConfig).info)){
        console.warn(...args)
    }
}

export function getCurrentPagePath(){
    const page = getCurrentPage()
    return page && page.route ? '/' + page.route : undefined
}
export function getCurrentPage(){
    const pages =  getCurrentPages()
    return pages.length > 0 ? pages[pages.length - 1] : undefined
}

export function invokeHook(vm:any, name:string, args:any[]) {
    const hooks = vm.$[name];
    if(!hooks){
        return
    }
    const fns:Function[] = isFunction(hooks) ? [hooks] : hooks
    let ret;
    for (let i = 0; i < fns.length; i++) {
        ret = fns[i].call(vm,...args)
    }
    return ret;
}


export function getRouteByPath(router:Router,path:string,query:any,fullPath?:string){
    fullPath = fullPath || formatFullPath(path,query)
    const key = path.replace(/^\//,'')
    const routeRule = router.routeMap.pathMap[key]
    let result
    if(routeRule){
        result = {...routeRule ,fullPath,path,query : query}
    }else{
        result = {fullPath,path,query : query}
    }
    return result
}

export function getRouteByUrl(url:string,router:Router){
    const index = url.indexOf('?')
    let queryString,path;
    if(index > -1){
        path = url.substring(0,index)
        queryString = url.substring(index+1)
    }else{
        path = url
        queryString = ''
    }
    const query = queryString ? qs.parse(queryString) : {}
    const key = path.replace(/^\//,'')
    const routeRule = router.routeMap.pathMap[key]
    let result
    if(routeRule){
        result = {...routeRule ,fullPath:url,path,query}
    }else{
        result = {fullPath:url,path,query}
    }
    return result
}

export function formatFullPath(path:string,query:any){
    const queryString = qs.stringify(query)
    const fullPath = queryString ? `${path}?${queryString}` : path
    return fullPath
}


export function lockNavjump(to:RouteLocationRaw,router:Router,navType:NavType,force:boolean=false){
    const toParam:any = {}
    if(isString(to)){
        toParam.url = to
    }else{
        const toObj = to as any
        let path,query = toObj.query
        if(toObj.name){
            const nameMap = router.routeMap.nameMap
            const route = nameMap[toObj.name]
            path = route.path
        }else{
            path = toObj.path
            query = toObj.query
        }
        const fullPath = formatFullPath(path,query)
        const otherParams = {...toObj}
        delete otherParams.name
        delete otherParams.path
        delete otherParams.query
        Object.assign(toParam,otherParams)
        toParam.url = fullPath
    }
    toParam.$force = force
    let result
    switch(navType){
        case NavType.PUSH :
            result = uni.navigateTo(toParam)
            break;
        case NavType.REPLACE :
            result = uni.redirectTo(toParam)
            break;
        case NavType.PUSH_TAB :
            result = uni.switchTab(toParam)
            break;
        case NavType.REPLACE_ALL :
            result = uni.reLaunch(toParam)
            break;
        default :
            throw new Error('路由类型不正确')
    }
    return result
}


function appendPages(routes:RouteRule[],pathMap:Record<string,RouteRule>,pages:any[]){
    pages.forEach(item=>{
        const tempPath = item.path as string
        const path = tempPath.startsWith('/') ? tempPath : '/' + tempPath
        const route:RouteRule = {
            ...item,
            path
        }
        pathMap[path] = route
        routes.push(route)
    })
}


export function parseRoutesFromPages({pages,subPackages=[]}:{pages:any[],subPackages?:any[]}){
    const routes:RouteRule[] = []
    const pathMap:Record<string,RouteRule> = {}
    appendPages(routes,pathMap,pages)

    subPackages.forEach(item=>{
        appendPages(routes,pathMap,item.pages)
    })
    return routes
}



export async function callEachHooks(router:Router, hookType:LifecycleHook, to:Route,from?:Route):Promise<BeforeEachResult> {

    let hooks = router.lifeCycleHooks[hookType]
    const result = await queueInvoke(hooks,null,[to,from],(res)=>{
        if(res === false || isObject(res)){
            return false
        }else{
            return true
        }
    })

    return result
}


export async function invokeAfterEach(router:Router, to:Route,from?:Route) {
    return await callEachHooks(router,LifecycleHook.AFTER_EACH,to,from)
}

export async function invokeBeforeEach(router:Router, to:Route,from?:Route) {
    StaticContext.beforeEachLock = true
    try{
        const hookResult = await callEachHooks(router,LifecycleHook.BEFORE_EACH,to,from)
        if(hookResult === true || hookResult === undefined || hookResult === null){
            return true;
        }else{
            if(hookResult !== false){
                let to:RouteLocationRaw | undefined;
                let navType:NavType= NavType.PUSH;
                if(isString(hookResult)){
                    to = {path:hookResult as string};
                    navType = NavType.PUSH;
                }else if(isObject(hookResult)){
                    const navTarget = hookResult as NavTarget
                     to = navTarget.to;
                     navType = navTarget.navType;
                }
                if(to){
                    lockNavjump(to, router, navType,true);
                }
            }
            return false
        }
    }finally{
        StaticContext.beforeEachLock = false
    }
}

