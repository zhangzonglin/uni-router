<template>
    <view class="router-link" @click="gotoPage"
    :hover-class="hoverClass"
    :hover-stop-propagation="hoverStopPropagation"
    :hover-start-time="hoverStartTime"
    :hover-stay-time="hoverStayTime"><slot></slot></view>
</template>
<script>
export default {
    props:{
        name:{
            type:String
        },
        path:{
            type:String
        },
        query:{
            type:Object
        },
        navType:{
            type:String,
            default:'push'
        },
        hoverStopPropagation:{
            type:Boolean
        },
        hoverClass	:{
            type:String
        },
        hoverStartTime:{
            type:Number
        },
        hoverStayTime:{
            type:Number
        },
        animationType:{
            type:String
        },
        animationDuration:{
            type:Number
        },
        delta:{
            type:Number
        }
    },
    methods:{
        gotoPage(){
            if(this.navType == 'back'){
                this.$Router[this.navType]({
                    delta:this.delta,
                    animationType:this.animationType,
                    animationDuration:this.animationDuration
                })
            }else{
                let data = {
                    animationType:this.animationType,
                    animationDuration:this.animationDuration
                }
                if(this.name){
                    data = {
                        name:this.name,
                        query:this.query,
                        animationType:this.animationType,
                        animationDuration:this.animationDuration
                    }
                }else{
                    data = {
                        path:this.path,
                        query:this.query,
                        animationType:this.animationType,
                        animationDuration:this.animationDuration
                    }
                }
                this.$Router[this.navType](data)
            }
        }
    }
}
</script>
<style>
.router-link{
    display: inline-block;
}
</style>
