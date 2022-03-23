# gowiny-uni-router

#### 介绍
uniapp 的 Vue 3版本的  路由守卫
提供 beforeEach和 afterEach 2个守卫


#### 安装教程

* 安装：
npm install @gowiny/uni-router


* 初始化
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

router.beforeEach(async (to,from)=>{
    console.log('beforeEach 2 begin',to,from)
	if(to.path != '/pages/login/login'){
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
