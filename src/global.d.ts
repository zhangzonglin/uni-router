declare var uni:any;
declare function getCurrentPages(isAll:boolean|undefined=false):any;
declare namespace Page{
    declare interface PageInstance{
        route?:string
    }
}

