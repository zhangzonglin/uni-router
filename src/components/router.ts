import {  invoke  } from '@gowiny/js-utils';
import { LifecycleHook, NavType,RouterProxyMode } from './enums';
import {GuardHookRule,  RouterOptions, RouteRule, RouteRuleMap,
    RouteLocationRaw, Route, UniLifecycleHook, UniLifecycleHooks,   OriRoute} from './types'
import { addNavInterceptor } from './uni-wapper';
import { Router } from './types';
import { StaticContext } from './context';
import {  formatFullPath, getCurrentPage,  getCurrentPagePath,  getRouteByPath, invokeAfterEach, invokeBeforeEach, lockNavjump, parseRoutesFromPages } from './router-utils';

const DEFAULT_PROXY_METHODS = [UniLifecycleHooks.INIT,UniLifecycleHooks.LOAD,UniLifecycleHooks.SHOW,UniLifecycleHooks.READY]
const MP_TYPE_PAGE = 'page';

function getRouterData(vm:any){
    if(!vm.__routerData){
        vm.__routerData = {}
    }
    return vm.__routerData
}
type OriHookData = {oldVal:Array<Function>,wapper?:Function,newVal?:Array<Function>}
function getOriHookDataMap(vm:any):Record<string,OriHookData>{
    const routerData = getRouterData(vm)
    if(!routerData.oriHookDataMap){
        routerData.oriHookDataMap = {}
    }
    return routerData.oriHookDataMap
}

function getOriHookData(vm:any,hookType:string):OriHookData{
    const dataMap = getOriHookDataMap(vm)
    let data = dataMap[hookType]
    if(!data){
        data = {
            oldVal:[]
        }
        dataMap[hookType] = data
    }
    return data
}



function invokeOriMethod(methodName:string,vm:any,args:any[]){
    const routerData = getRouterData(vm)
    const oldMethods = routerData.oldMethods || {}
    const method = oldMethods[methodName]
    if(method){
        return method.apply(vm,args)
    }
}


function invokeOriHooks(hookType:UniLifecycleHook,target:any,args:any[]){
    const oriHookData = getOriHookData(target,hookType)
    invoke(oriHookData.oldVal,target,args)
}

function saveOriRoute(vm:any,oriRoute:OriRoute){
    const routerData = getRouterData(vm)
    routerData.oriRoute = oriRoute
}

function getOriRoute(vm:any):OriRoute{
    const routerData = getRouterData(vm)
    if(!routerData.oriRoute){
        routerData.oriRoute = {}
    }
    return routerData.oriRoute
}

function saveCurrRouteByCurrPage(router:Router, vm:any,query:object={}){
    const page = getCurrentPage()
    if(!page || !page.route){
        return
    }
    const path = '/' + page.route
    saveOriRoute(vm,{
        path,
        query
    })
    const currRoute:Route = getRouteByPath(router,path,query)
    router.route = currRoute
}


function wapperMethod(router:Router,vm:any,methodName:string,args:any[]){
    return wapperFun(router,RouterProxyMode.METHOD, vm,methodName,args,invokeOriMethod)
}


async function wapperFun(router:Router,proxyMode:RouterProxyMode,vm:any,methodName:string,args:any[] ,successCallback:(methodName:string,vm:any,args:any[])=>any){

    const routerData = getRouterData(vm)
    const lock = routerData.hookLock || false
    if(lock === true){
        //console.log(`wapperFun 已被锁，等待解锁后执行,${methodName}`,vm)
        if(!routerData.hookListeners){
            routerData.hookListeners = []
        }
        const asyncFun = new Promise<boolean>((success,fail)=>{
            routerData.hookListeners.push({success,fail})
        })
        const asyncResult = await asyncFun
        let result
        if(asyncResult){
            //console.log(`wapperFun 已解锁，现在执行,${methodName}`,vm)
            result = successCallback(methodName,vm,args)
        }
        return result
    }
    routerData.hookLock = true
    //console.log(`wapperFun 加锁,${methodName}`,vm)
    let result
    try{
        const path = getCurrentPagePath()
        let query:any
        if(proxyMode === RouterProxyMode.HOOK && ( UniLifecycleHooks.INIT == methodName || UniLifecycleHooks.LOAD == methodName)){
            query = args[0] || {}
            const queryKeys = Object.keys(query);
            queryKeys.forEach(key => {
                const val = query[key];
                if(val){
                    query[key] = decodeURIComponent(val);
                }
            });

            saveOriRoute(vm,{
                path,query
            })
        }else{
            query = getOriRoute(vm).query || {}
        }
        let isOk = true
        if(path){
            const fullPath = formatFullPath(path,query)
            if(StaticContext.destFullPath != fullPath){
                //console.log(`当前路径跟最后路由路径不一致，需要执行守卫,${methodName}`,fullPath,StaticContext.lastFullPath)
                const to:Route = getRouteByPath(router,path,query,fullPath)
                const from:Route | undefined = StaticContext.route
                StaticContext.toRoute = to
                StaticContext.fromRoute = from

                isOk = await invokeBeforeEach(router,to,from)
                if(isOk){
                    StaticContext.route = to
                    router.route = to
                    StaticContext.lastFullPath = fullPath
                    await invokeAfterEach(router,to,from)
                }
            }else{
                //console.log(`当前路径跟最后路由路径一致，直接执行后续动作,${methodName}`,fullPath)
            }

        }

        if(isOk){
            result = successCallback(methodName,vm,args)
        }

        if(routerData.hookListeners){
            const hookListeners:{success:Function,fail:Function}[] = routerData.hookListeners
            for(let i=0;i<hookListeners.length;i++){
                const item = hookListeners[i]
                item.success(isOk)
            }
            routerData.hookListeners = []
        }
    }catch(err){
        if(routerData.hookListeners){
            const hookListeners:{success:Function,fail:Function}[] = routerData.hookListeners
            for(let i=0;i<hookListeners.length;i++){
                const item = hookListeners[i]
                item.fail(err)
            }
            routerData.hookListeners = []
        }
    }
    routerData.hookLock = false
    return result

}

function wapperHook(router:Router,vm:any,hookType:string,args:any[]){
    return wapperFun(router,RouterProxyMode.HOOK,vm,hookType,args,invokeOriHooks)
}

function wapperUniHooks(router:Router,vm:any, hookType:UniLifecycleHook){

    function result(...args:any[]){
        wapperHook(router, vm,hookType,args)
    }

    return result
}


function appendRoutes(router: Router,routeMap:RouteRuleMap,root:string='',routes: RouteRule[] | undefined){
    if(!routes || routes.length == 0){
        return
    }
    const pathMap = routeMap.pathMap
    const nameMap = routeMap.nameMap
    routes.forEach(route => {
        const { alias, path,name} = route;
        if (path == null) {
            throw new Error(`请提供一个完整的路由对象，包括以绝对路径开始的 ‘path’ 字符串 ${JSON.stringify(route)}`);
        }
        const fullPath = root  + path
        pathMap[fullPath] = route
        if(name){
            nameMap[name] = route
        }
        if(alias){
            if(Array.isArray(alias)){
                alias.forEach(item=>{
                    const fullPath = root  + item
                    pathMap[fullPath] = route
                })
            }else{
                const fullPath = root  + alias
                pathMap[fullPath] = route
            }
        }
        appendRoutes(router,routeMap,route.path,route.children)
    })
}

export function createRouteMap(
    router: Router,
    routes: RouteRule[],
): RouteRuleMap {
    const pathMap = Object.create(null)
    const nameMap = Object.create(null)
    const routeMap:RouteRuleMap = {
        pathMap: pathMap,
        nameMap: nameMap
    }
    appendRoutes(router,routeMap,'',routes)
    return routeMap;
}





export function registerEachHooks(router:Router, hookType:LifecycleHook, userGuard:GuardHookRule) {
    let hooks = router.lifeCycleHooks[hookType]
    if(!hooks){
        hooks = []
        router.lifeCycleHooks[hookType] = hooks
    }
    hooks.push(userGuard)
}

function isPageHook(vm:any){
    return vm.$mpType === MP_TYPE_PAGE
}

export class RouterImpl implements Router {
    readonly proxyMode!:RouterProxyMode
    readonly proxyMethods!:UniLifecycleHook[]
    readonly routes!:RouteRule[]
    readonly indexRouteRule!:RouteRule
    lifeCycleHooks={}
    $locked:boolean = false
    options!:RouterOptions
    readonly routeMap!:RouteRuleMap
    route?:Route
    constructor(options:RouterOptions){
        this.options = options

        this.proxyMode = options.proxyMode || RouterProxyMode.HOOK;
        this.proxyMethods = options.proxyMethods || DEFAULT_PROXY_METHODS

        this.routes = parseRoutesFromPages(options.pageData)
        this.indexRouteRule = this.routes[0]
        this.routeMap = createRouteMap(this,this.routes)
    }
    setupRouter(app:any){
        app.use(this)
    }
    push(to:RouteLocationRaw) {
        return lockNavjump(to, this, NavType.PUSH);
    }
    replace(to:RouteLocationRaw) {
        return lockNavjump(to, this, NavType.REPLACE);
    }
    replaceAll(to:RouteLocationRaw) {
        return lockNavjump(to, this, NavType.REPLACE_ALL);
    }
    pushTab(to:RouteLocationRaw) {
        return lockNavjump(to, this, NavType.PUSH_TAB);
    }
    back(...args:any[]){
        return uni.navigateBack(...args)
    }
    beforeEach(userGuard:GuardHookRule):void {
        registerEachHooks(this, LifecycleHook.BEFORE_EACH, userGuard);
    }
    afterEach(userGuard:GuardHookRule):void {
        registerEachHooks(this, LifecycleHook.AFTER_EACH, userGuard);
    }
    async install(app:any,...options: any[]){
        const router = this;
        StaticContext.app = app;
        StaticContext.router = router
        Object.defineProperty(app.config.globalProperties, "$Router", {
            get() {
                return router;
            }
        });

        Object.defineProperty(app.config.globalProperties, "$Route", {
            get() {
                return router.route;
            }
        });

        let mixinOptions:any
        if(router.proxyMode === RouterProxyMode.HOOK){
            mixinOptions = {
                beforeCreate(){
                    
                    if(!isPageHook(this)){
                        return
                    }

                    const vm = this
                    router.proxyMethods.forEach(hookName=>{
                        const oriHookData = getOriHookData(vm,hookName)
                        const oldHooks = vm.$[hookName] || []
                        const oldVal:Array<Function> = Array.isArray(oldHooks) ? oldHooks : [oldHooks]
                        oriHookData.oldVal = oldVal

                        oriHookData.wapper = wapperUniHooks(router,vm, hookName)

                        const newVal = [oriHookData.wapper]
                        const newValObj:any = newVal

                        newVal.push = function(...args:Function[]):number{
                            oriHookData.oldVal.push(...args)
                            return newVal.length
                        }
                        newVal.pop = function():Function | undefined{
                            return oriHookData.oldVal.pop()
                        }
                        newVal.shift = function():Function | undefined{
                            return oriHookData.oldVal.shift()
                        }

                        newVal.unshift = function(...args:Function[]):number{
                            oriHookData.oldVal.unshift(...args)
                            return newVal.length
                        }

                        newValObj.splice = function(...args:any[]):Function[]{
                            return (oriHookData.oldVal as any).splice(...args)
                        }

                        newVal.reverse = function():Function[]{
                            return oriHookData.oldVal.reverse()
                        }
                        newVal.sort = function():Function[]{
                            return oriHookData.oldVal.sort()
                        }

                        oriHookData.newVal = newVal

                        Object.defineProperty(vm.$, hookName, {
                            get() {
                                return oriHookData.newVal
                            },
                            set(val:any){
                                if(val === oriHookData.newVal || val === oriHookData.wapper){
                                    return
                                }

                                if(!val){
                                    oriHookData.oldVal = []
                                }else if(Array.isArray(val)){
                                    if(val.indexOf(oriHookData.wapper) > -1){
                                        if(val.length > 1){
                                            val.forEach(item=>{
                                                if(item !== oriHookData.wapper){
                                                    oriHookData.oldVal.push(item)
                                                }
                                            })
                                        }
                                    }else{
                                        oriHookData.oldVal = val
                                    }
                                }else{
                                    oriHookData.oldVal = [val]
                                }
                            }
                        });
                    })
                }
            }
        }else if(router.proxyMode === RouterProxyMode.METHOD){
            mixinOptions = {
                created(){
                    if(!isPageHook(this)){
                        return
                    }

                    const vm = this
                    const routerData = getRouterData(vm)
                    const oldMethods:Record<string,Function> = {}
                    routerData.oldMethods = oldMethods
                    router.proxyMethods.forEach(methodName=>{
                        const oldMethod = vm[methodName]
                        if(!oldMethod){
                            console.warn(`此页面没有方法:${methodName}`)
                            return;
                        }
                        oldMethods[methodName] = oldMethod
                        //console.warn(`设置代理:${methodName}`)
                        vm[methodName] = (...args:any[])=>{
                            //console.warn(`执行代理:${methodName}`)
                            return wapperMethod(router,vm,methodName,args)
                        }
                    })
                },
                onInit(query:any){
                    if(!isPageHook(this)){
                        return
                    }
                    saveCurrRouteByCurrPage(router,this,query)
                },
                onLoad(query:any){
                    if(!isPageHook(this)){
                        return
                    }
                    saveCurrRouteByCurrPage(router,this,query)
                }
            }
        }
        mixinOptions && app.mixin(mixinOptions)


        addNavInterceptor()

    }
}

export function createRouter(options:RouterOptions){
    const router:Router = new RouterImpl(options);
    return router
}
