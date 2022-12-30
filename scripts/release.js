const readline = require("readline");
const util = require('util');
const processExec = util.promisify(require('child_process').exec);
const exec2 = require('child_process').exec;

exec2("dd")

// 创建readline接口实例
let read = readline.createInterface({
    input: process.stdin,
    output: process.stdout
})

async function exec(cmd,msg,options){
    console.log(msg);
    console.log(cmd);
    const {stdout,stderr} = await processExec(cmd,options);
    console.log('stdout:', stdout);
    console.log('stderr:', stderr);
    return true;
}

let versionName;

function asyncRead(title){
    const result = new Promise((resolve,reject)=>{
        read.question(title, function (answer) {
            resolve(answer);
        })
    });
    return result; 
}

/*
const result = exec("npm test")
console.log(result.toString());
*/

function readVersion(){
    read.question("请输入需要发布的版本号:", function (answer) {
        if(answer){
            versionName = answer
            confirmVersion(versionName);
            
        }else{
            console.log(`输入错误，请重新输入！`, );
            readVersion();
        }
    })
}

function confirmVersion(versionName){
    read.question(`将要发布的版本号为:${versionName} - 请确认? (y/n)`, function (answer) {
        if(!answer || answer.toLowerCase() === 'y'){
            release(versionName)
        }else{
            read.close();
        }
    })
}

async function release(versionName){
    console.log(`正在发布:${versionName}`);
    await exec("npm test",'开始测试……');
    await exec("npm run clean",'正在清理……');
    await exec(`npm run build`,'正在构建……',{env:{VERSION:versionName}});
    await exec(`npm version ${versionName} --git-tag-version=false`,'更新版本号……');
    await exec(`npm run changelog`,'编辑变更日志……');
    await asyncRead("Please check the git history and the changelog and press enter");
    await exec(`git add -A`,'git add ……');
    await exec(`git commit -m "release: v${versionName}"`,'git commit ……');
    await exec(`git tag "v${versionName}"`,'git tag ……');
    await exec(`git push origin refs/tags/v${versionName}`,'git push tag ……');
    await exec(`git push`,'git push ……');
    await exec("npm publish --tag latest --access public --registry=https://registry.npmjs.org",'发布到 nmpjs ……');
    console.log("发布完成……");
    read.close();
}


readVersion();


