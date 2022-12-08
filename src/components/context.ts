import { Route, Router } from './types'

export const StaticContext:{app?:any,router?:Router,route?:Route,
    toRoute?:Route,
    fromRoute?:Route,
    navLock:boolean,
    taskId?:string,
    beforeEachLock:boolean,
    lastFullPath?:string,
    destFullPath?:string,//准备跳转的路径
    lastPath?:string,
    firstRequestListeners:{
        success:(value:any)=>void,
        fail:()=>void
    }[],
    handleFirstRequestResult:(success:boolean)=>void,
    firstRequestState:'not'|'ok'|'ing'} = {
    navLock:false,
    beforeEachLock:false,
    firstRequestState:'not',
    firstRequestListeners:[],
    handleFirstRequestResult(success:boolean){
        StaticContext.firstRequestListeners.forEach(item=>{
            item.success(success)
        })
        StaticContext.firstRequestListeners = []
    },
    app: undefined,
    route:undefined,
    toRoute:undefined,
    fromRoute:undefined,
    router:undefined
}
