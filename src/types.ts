import { NavType } from "./enums";

export interface DebuggerArrayConfig{
    error?:boolean;
    warn?:boolean;
    info?:boolean;
    debug?:boolean;
}
export type DebuggerConfig=boolean|DebuggerArrayConfig;


export type UniLifecycleHook = 'onShow' | 'onLoad' | 'onInit' | 'onReady' | string

export const UniLifecycleHooks ={
    INIT : 'onInit',
    LOAD : 'onLoad',
    SHOW : 'onShow',
    READY : 'onReady'
}

export type RouterProxyMode = 'hook'|'method'|'not'

export interface RouterOptions{
    pageData:any,
    proxyMode?:RouterProxyMode,
    proxyMethods?:UniLifecycleHook[],
    routerPropName?:string,
    routePropName?:string,
    debugger?:DebuggerConfig
}


export interface RouteLocationBase{
    animationType?: 'auto' | 'none' | 'slide-in-right' | 'slide-in-left' | 'slide-in-top' | 'slide-in-bottom' | 'fade-in' | 'zoom-out' | 'zoom-fade-out' | 'pop-in',
    animationDuration?:number
}
export interface RouteNameLocation extends RouteLocationBase {name:string,params?:Object}
export interface RoutePathLocation extends RouteLocationBase {path:string,query?:object}
export type RouteUrlLocation = string
export type RouteLocationRaw = RouteUrlLocation | RouteNameLocation | RoutePathLocation
export type NavTarget = {
    to:RouteLocationRaw,
    navType:NavType
}
export type BeforeEachResult = boolean|undefined|NavTarget

export interface Route{
    fullPath?:string,
    options?:Record<string,any>,
    name?:string,
    params?:Object,
    path?:string,
    queryString?:string,
    query?:object
}
export interface RouteRule {
	path: string; // pages.json中的path 必须加上 '/' 开头
	name?: string; // 命名路由
	redirect?: string | Function; // H5端可用
	alias?: string | Array<string>; // H5端可用
	children?: Array<RouteRule>; // 嵌套路由，H5端可用
	meta?: any; // 其他格外参数
	[propName: string]: any;
}

export type HasNextGuardHookRule=(to: Route, from?: Route)=>void | Promise<any>;
export type NoNextGuardHookRule=(to: Route, from?: Route)=>void | Promise<any>;
export type GuardHookRule=HasNextGuardHookRule | NoNextGuardHookRule

export interface RouteRuleMap{
    nameMap:Record<string,RouteRule>,
    pathMap: Record<string,RouteRule>
}

export interface OriRoute{
    path?:string,
    fullPath?:string,
    options?:Record<string,any>
}

export type LifeCycleHooks = Record<string,Array<GuardHookRule | NoNextGuardHookRule>>

export interface Router{
    readonly routes:RouteRule[],
    readonly proxyMethods:string[],
    readonly routeMap:RouteRuleMap,
    route?:Route,
    readonly lifeCycleHooks:LifeCycleHooks,
    readonly options:RouterOptions,
    $locked:boolean,
    readonly indexRouteRule:RouteRule,
    setupRouter(app:any):void
    push(to:RouteLocationRaw):void,
    replace(to:RouteLocationRaw):void,
    replaceAll(to:RouteLocationRaw) :void,
    pushTab(to:RouteLocationRaw):void,
    beforeEach(userGuard:HasNextGuardHookRule): void; // 添加全局前置路由守卫
    afterEach(userGuard:NoNextGuardHookRule): void; // 添加全局后置路由
}
