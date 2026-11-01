const fs=require('node:fs');const path=require('node:path');
const src=require.resolve('movi-player/element/global');
const base=path.join(process.cwd(),'dist-lib');
fs.mkdirSync(base,{recursive:true});fs.copyFileSync(src,path.join(base,'movi-element.js'));
const demo=path.join(process.cwd(),'dist');if(fs.existsSync(demo))fs.copyFileSync(src,path.join(demo,'movi-element.js'));
console.log('Bundled lazy-loaded original MKV decoder module into dist-lib and demo');
