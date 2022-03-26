# gowiny-uni-router

### 详细使用方法，可以查看演示项目

演示项目地址：https://gitee.com/gowiny/uni-example

### 介绍
uniapp 的 Vue 3版本的  路由守卫\
提供 `beforeEach` 和 `afterEach` 两个守卫\
跳转页面，尽量用官方提供的原生api，如果想用name形式跳转，可以用路由组件提供的以下方法

```javascript
this.$Router.push = uni.navigateTo
this.$Router.replace = uni.redirectTo
this.$Router.replaceAll = uni.reLaunch
this.$Router.pushTab = uni.switchTab
this.$Router.back = uni.navigateBack
```

在页面生命周期的事件内，可以调用this.$Route获取当前路由信息\
但还是强烈建议，直接用官方提供的 getCurrentPages 方法去获取路由信息

```javascript
this.$Route //获取当前路由对象
this.$Route.fullPath //完整的路径
this.$Route.path //以/开头的路径
this.$Route.query //参数

//pages.json 里配置page的其他信息，也会附加在此对象里
```

```xml
<router-link name="login" :query="{id:'myid'}">跳转到登录页</router-link>
<router-link path="/pages/index/index" :query="{name:'testname'}">跳转到首页</router-link>
```

### 安装教程

1.  安装：
```
npm install @gowiny/uni-router
```
2.  初始化
* router/index.ts
```javascript
import { createRouter,BeforeEachResult } from '@gowiny/uni-router'
import PAGE_DATA from '@/pages.json';

const router = createRouter({
    pageData:PAGE_DATA
})

router.beforeEach((to,from)=>{
    console.log('beforeEach 1 ,',to,from)
})

router.beforeEach((to,from)=>{
    console.log('beforeEach 2 begin',to,from)
	if(to.path != '/pages/login/login'){
        //如果返回的是Promise，则会等待执行完成才进行下一步
        return new Promise<BeforeEachResult>((success,fail)=>{
            setTimeout(function(){
                console.log('beforeEach 2 end')
                success({
                    path:'/pages/login/login'
                })
            },1000)
        })
    }
})


router.afterEach((to,from)=>{
    console.log('afterEach 1 ,',to,from)
})

router.afterEach(async (to,from)=>{
    console.log('afterEach 2 begin',to,from)
    return new Promise<BeforeEachResult>((success,fail)=>{
        setTimeout(function(){
            console.log('afterEach 2 end')
            success(true)
        },1000)
    })
})

export default router

```

* main.ts

```javascript
import { createSSRApp } from "vue";
import router from './router'
import App from "./App.vue";

export function createApp() {
  const app = createSSRApp(App);
  app.use(router)
  return {
    app,
  };
}

```
