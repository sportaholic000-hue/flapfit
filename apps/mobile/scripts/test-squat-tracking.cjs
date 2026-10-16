// Runs synchronous tracking regressions without loading the Expo/Jest native preset.
// Uses Node 22.13+/24 type stripping and Jest's real expect matchers.
const fs=require('node:fs');
const path=require('node:path');
const {stripTypeScriptTypes}=require('node:module');
require.extensions['.ts']=function(mod,filename){
 let source=stripTypeScriptTypes(fs.readFileSync(filename,'utf8'));
 const names=[...source.matchAll(/export (?:const|function) (\w+)/g)].map(m=>m[1]);
 source=source.replace(/import \{([^}]+)\} from ['"]([^'"]+)['"];?/g,(_,names,path)=>'const {'+names+'}=require('+JSON.stringify(path)+');');
 source=source.replace(/import (\w+) from ['"]([^'"]+)['"];?/g,(_,name,path)=>'const '+name+'=require('+JSON.stringify(path)+');');
 source=source.replace(/export (const|function) /g,'$1 ');
 mod._compile(source+'\n'+names.map(n=>'exports.'+n+'='+n+';').join('\n'),filename);
};
let passed=0,failed=0;
global.test=(name,fn)=>{try{const result=fn();if(result && typeof result.then==='function')throw Error('This runner only supports synchronous tests');passed++;}catch(error){failed++;console.error('FAIL '+name+'\n'+error.stack);}};
test.each=values=>(name,fn)=>{for(const value of values)test(name+' '+JSON.stringify(value),()=>fn(...(Array.isArray(value)?value:[value])));};
global.it=global.test;global.describe=(name,fn)=>fn();
global.expect=require('expect').expect;
for(const file of ['curl-control.test.js','curl-diagnostics.test.js','squat-foot-free.test.js','form-tracking.test.ts','continuous-gameplay.test.ts','pushup-top-entry.test.ts','pullup-gameplay-flow.test.js']) {
 require(path.resolve(__dirname,'../src/utils/game/__tests__',file));
 console.log(file,JSON.stringify({passed,failed}));
}
console.log(JSON.stringify({passed,failed}));process.exitCode=failed?1:0;
