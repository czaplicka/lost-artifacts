#!/usr/bin/env node
'use strict';
const {build}=require('./catalog-sources.cjs');
const args=process.argv.slice(2);
if(args.some(a=>a!=='--check')){console.error('Usage: node tools/build-manifests.cjs [--check]');process.exitCode=2;}
else try{const check=args.includes('--check'),result=build(process.cwd(),!check);console.log(JSON.stringify(result,null,2));if(check&&!result.upToDate)process.exitCode=1;}catch(e){console.error('[build-manifests] '+e.message);process.exitCode=2;}
