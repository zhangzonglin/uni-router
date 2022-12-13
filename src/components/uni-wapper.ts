import { isNumber } from "@gowiny/js-utils";
import { StaticContext } from "./context";
import { getRouteByPage, getRouteByUrl,  warn,invokeAfterEach, invokeBeforeEach } from "./router-utils";
import { Route } from "./types";
let IS_WAPPED = false
const METHOD_NAME_NAVIGATE_TO = 'navigateTo'
const METHOD_NAME_REDIRECT_TO = 'redirectTo'
const METHOD_NAME_RELAUNCH = 'reLaunch'
const METHOD_NAME_SWITCH_TAB = 'switchTab'
const METHOD_NAME_NAVIGATE_BACK = 'navigateBack'

const oldMethods:Record<string,Function> = {
    [METHOD_NAME_NAVIGATE_TO]:uni.navigateTo,
    [METHOD_NAME_REDIRECT_TO]:uni.redirectTo,
    [METHOD_NAME_RELAUNCH]:uni.reLaunch,
    [METHOD_NAME_SWITCH_TAB]:uni.switchTab,
    [METHOD_NAME_NAVIGATE_BACK]:uni.navigateBack,
}

function callOldMethod(methodName:string,options:any){
    const method = oldMethods[methodName]
    if(method){
        method(options)
    }
}

function callNavError(unlock:boolean, options:any,err:any){
    if(options.fail){
        options.fail(err)
    }
    if(options.complete){
        options.complete()
    }
    if(unlock){
        StaticContext.navLock = false
    }
}
function callNavSuccess(methodName:string,options:any){
    const newArgs = {
        ...options,
        async success(...args:any[]){
            try{
                options.success && await options.success(...args)
            }finally{
                StaticContext.route = StaticContext.toRoute
                StaticContext.lastFullPath = StaticContext.route ? StaticContext.route.fullPath : undefined

                if(StaticContext.router &&
                    StaticContext.toRoute){
                    StaticContext.router.route = StaticContext.route
                    await invokeAfterEach(StaticContext.router,StaticContext.toRoute,StaticContext.fromRoute)
                }
                StaticContext.navLock = false

            }
        },
        async fail(...args:any[]){
            try{
                console.error(args && args[0] ? args[0].errMsg:'');
                options.fail && await options.fail(...args)
            }finally{
                StaticContext.navLock = false
            }
        },
        complete(...args:any[]){
            options.complete && options.complete(...args)
        }
    }

    callOldMethod(methodName,newArgs)
}
function createWapper(methodName:string){
    async function wapper(options:any){
        if((StaticContext.navLock || StaticContext.beforeEachLock) && !options.$force){
            StaticContext.router && warn(StaticContext.router,'当前页面正在处于跳转状态，请稍后再进行跳转....')
            return callNavError(false,options,'当前页面正在处于跳转状态，请稍后再进行跳转....')
        }
        StaticContext.navLock = true
        try{
            if(!StaticContext.router){
                return callNavSuccess(methodName,options)
            }
            const router = StaticContext.router
            let to:Route
            if(METHOD_NAME_NAVIGATE_BACK == methodName){
                const delta:number = isNumber(options.delta) ?  options.delta : 1
                const pages = getCurrentPages()
                const pageIndex = pages.length - delta - 1
                if(pageIndex  < 0){
                    to = getRouteByUrl(router.indexRouteRule.path,router)
                }else{
                    to = getRouteByPage(pages[pageIndex])
                }
            }else{
                const url = options.url
                to = getRouteByUrl(url,router)
            }

            const from:Route | undefined = StaticContext.route
            StaticContext.toRoute = to
            StaticContext.fromRoute = from
            StaticContext.destFullPath = to.fullPath
            
            const hookResult = await invokeBeforeEach(router,to,from)

            if(!hookResult){
                return callNavError(true,options,'路由守卫拦截')
            }
            return callNavSuccess(methodName,options)
        }catch(err){
            return callNavError(true,options,err)
        }
    }
    return wapper
}

export function addNavInterceptor(){
    if(IS_WAPPED){
        return
    }
    IS_WAPPED = true

    uni.navigateTo = createWapper(METHOD_NAME_NAVIGATE_TO)
    uni.redirectTo = createWapper(METHOD_NAME_REDIRECT_TO)
    uni.reLaunch = createWapper(METHOD_NAME_RELAUNCH)
    uni.switchTab = createWapper(METHOD_NAME_SWITCH_TAB)
    uni.navigateBack = createWapper(METHOD_NAME_NAVIGATE_BACK)

}
