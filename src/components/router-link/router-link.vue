<template>
    <view @click="gotoPage"
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
        options:{
            type:Object
        },
        params:{
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
            const handler = this.$Router[this.navType]
            if(this.navType == 'back'){
                handler({
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
                        options:this.options,
                        animationType:this.animationType,
                        animationDuration:this.animationDuration
                    }
                }else{
                    data = {
                        path:this.path,
                        options:this.options,
                        animationType:this.animationType,
                        animationDuration:this.animationDuration
                    }
                }
                handler(data)
            }
        }
    }
}
</script>
