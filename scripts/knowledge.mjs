#!/usr/bin/env node
import { getDb } from './lib/db.mjs';
import { run, help } from './lib/knowledge.mjs';
import { table } from './lib/format.mjs';
const flags={},args=[];
for(const token of process.argv.slice(2)){if(token.startsWith('--')){const i=token.indexOf('=');flags[token.slice(2,i<0?undefined:i)]=i<0?true:token.slice(i+1);}else args.push(token);}
const cmd=flags.help?'help':args.shift()||'help';
function format(value){if(Array.isArray(value)){if(!value.length)return '(none)';if(value[0]?.question)return value.map(x=>x.question+'\n'+format(x.rows)).join('\n\n');if(typeof value[0]==='object')return table(value.map(x=>Object.fromEntries(Object.entries(x).map(([k,v])=>[k,v!==null&&typeof v==='object'?JSON.stringify(v):v]))),Object.keys(value[0]).map(k=>({key:k,label:k,width:k==='title'?42:k==='finding'||k==='reason'?64:90})));}return JSON.stringify(value,null,2);}
if(cmd==='help'){console.log(flags.json?JSON.stringify(help):Object.values(help).join('\n'));}else{
 let db;try{db=await getDb();const result=await run(db,cmd,args,flags);console.log(flags.json?JSON.stringify(result):format(result));}catch(e){console.error(e.message);process.exitCode=1;}finally{await db?.close();}
}
