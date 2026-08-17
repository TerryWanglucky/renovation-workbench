#!/usr/bin/env node
'use strict';
/*
  悠然 · 装修工作台 —— 本地部署服务（数据以 CSV 文件存储，Excel/Numbers 可直接打开）
  - 零依赖（仅 Node 内置模块）
  - 提供静态页面 + 本地 REST 接口，多人共用同一份数据（profile.csv / tasks.csv / budget.csv / inspiration.csv）
  - 启动： node server.js   （默认端口 8080，可用 PORT=9000 node server.js 改端口）
*/
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 8080;
const HOST = '0.0.0.0';
const DIR = __dirname;
const HTML_FILE = path.join(DIR, '装修工作台.html');
const COLLS = ['profile', 'tasks', 'budget', 'inspiration'];

// 与页面 FIELDS / SCHEMA 保持一致
const FIELDS = {
  profile: ['风格','面积','户型','总预算','装修方式','开工日期'],
  tasks: ['名称','阶段','优先级','分类','责任人','真实开始日','真实完成日','截止日','完成','备注'],
  budget: ['项目名称','预算分类','所属阶段','预算金额','实际花销','备注'],
  inspiration: ['标题','描述','风格标签','笔记','图片','收藏']
};
const TYPES = {
  profile: {风格:'text',面积:'number',户型:'text',总预算:'number',装修方式:'text',开工日期:'date'},
  tasks: {名称:'text',阶段:'text',优先级:'text',分类:'text',责任人:'text',真实开始日:'date',真实完成日:'date',截止日:'date',完成:'bool',备注:'text'},
  budget: {项目名称:'text',预算分类:'text',所属阶段:'text',预算金额:'number',实际花销:'number',备注:'text'},
  inspiration: {标题:'text',描述:'text',风格标签:'array',笔记:'text',图片:'array',收藏:'bool'}
};

function genId(){ return 'rec_' + Math.random().toString(36).slice(2,10) + Date.now().toString(36); }
function pad(n){ return (n<10?'0':'')+n; }
function dd(off){ const x=new Date(); x.setDate(x.getDate()+off); return x.getFullYear()+'-'+pad(x.getMonth()+1)+'-'+pad(x.getDate()); }
function ph(c,l){
  const s="<svg xmlns='http://www.w3.org/2000/svg' width='400' height='300'><rect width='400' height='300' fill='"+c+"'/><text x='50%' y='52%' fill='#fff' font-size='26' text-anchor='middle' font-family='sans-serif'>"+l+"</text></svg>";
  return 'data:image/svg+xml;utf8,'+encodeURIComponent(s);
}
function seedData(){
  const tasks = [
    { _id:genId(), '名称':'确认平面布局方案','阶段':'设计','优先级':'P0','分类':'设计','责任人':'设计师·王','真实开始日':dd(-16),'真实完成日':dd(-7),'完成':true,'备注':'与设计师对齐收纳' },
    { _id:genId(), '名称':'墙体拆除','阶段':'拆改','优先级':'P1','分类':'拆改','责任人':'工长·李','真实开始日':dd(-6),'真实完成日':dd(-3),'完成':true,'备注':'' },
    { _id:genId(), '名称':'水电点位交底','阶段':'水电','优先级':'P0','分类':'水电','责任人':'水电·张师傅','真实开始日':dd(-2),'截止日':dd(3),'完成':false,'备注':'现场定位' },
    { _id:genId(), '名称':'联系商家确认瓷砖到货时间','阶段':'','优先级':'P1','分类':'联系商家','责任人':'业主·自己','截止日':dd(-7),'完成':false,'备注':'逾期示例' },
    { _id:genId(), '名称':'预约橱柜复尺','阶段':'','优先级':'P2','分类':'预约','责任人':'橱柜商家','截止日':dd(8),'完成':false,'备注':'' },
    { _id:genId(), '名称':'泥木进场施工','阶段':'泥木','优先级':'P1','分类':'泥木','责任人':'工长·李','真实开始日':dd(4),'完成':false,'备注':'' },
    { _id:genId(), '名称':'油漆完工验收','阶段':'油漆','优先级':'P2','分类':'油漆','责任人':'油漆·赵师傅','完成':false,'备注':'' },
    { _id:genId(), '名称':'灯具安装','阶段':'安装','优先级':'P2','分类':'安装','责任人':'安装·刘师傅','完成':false,'备注':'' },
    { _id:genId(), '名称':'软装家具进场','阶段':'软装','优先级':'P2','分类':'软装','责任人':'业主·自己','完成':false,'备注':'' },
    { _id:genId(), '名称':'确认主材色卡与清单','阶段':'设计','优先级':'P1','分类':'设计','责任人':'设计师·王','真实开始日':dd(-14),'真实完成日':dd(-9),'完成':true,'备注':'' },
    { _id:genId(), '名称':'水电隐蔽工程验收','阶段':'水电','优先级':'P0','分类':'水电','责任人':'监理·陈','真实开始日':dd(0),'截止日':dd(4),'完成':false,'备注':'打压测试' },
    { _id:genId(), '名称':'瓷砖铺贴与美缝','阶段':'泥木','优先级':'P1','分类':'泥木','责任人':'泥工·周师傅','真实开始日':dd(5),'完成':false,'备注':'' },
    { _id:genId(), '名称':'墙面基层找平','阶段':'油漆','优先级':'P2','分类':'油漆','责任人':'油漆·赵师傅','完成':false,'备注':'' }
  ];
  const budget = [
    { _id:genId(), '项目名称':'全屋设计','预算分类':'设计费','所属阶段':'设计','预算金额':8000,'实际花销':8000,'备注':'' },
    { _id:genId(), '项目名称':'拆改人工','预算分类':'人工','所属阶段':'拆改','预算金额':5000,'实际花销':6200,'备注':'含垃圾清运' },
    { _id:genId(), '项目名称':'客厅瓷砖','预算分类':'主材','所属阶段':'泥木','预算金额':12000,'实际花销':9800,'备注':'' },
    { _id:genId(), '项目名称':'水电材料','预算分类':'主材','所属阶段':'水电','预算金额':9000,'实际花销':10500,'备注':'线管加量' },
    { _id:genId(), '项目名称':'全屋窗帘','预算分类':'软装','所属阶段':'软装','预算金额':4000,'实际花销':3500,'备注':'' },
    { _id:genId(), '项目名称':'中央空调','预算分类':'家电','所属阶段':'安装','预算金额':20000,'实际花销':20000,'备注':'' },
    { _id:genId(), '项目名称':'墙面油漆','预算分类':'硬装','所属阶段':'油漆','预算金额':6000,'实际花销':5500,'备注':'' }
  ];
  const inspiration = [
    { _id:genId(), '标题':'客厅中古柜参考','描述':'中古风胡桃木储物柜 藤编门 暖色灯光','风格标签':['中古','侘寂'],'笔记':'胡桃木+藤编，暖光','图片':[{imageUrl:ph('#b89b7a','中古柜'),title:'中古柜',width:400,height:300}],'收藏':true },
    { _id:genId(), '标题':'侘寂感玄关','描述':'侘寂风玄关 微水泥 留白 自然光','风格标签':['侘寂','极简'],'笔记':'微水泥地面，留白','图片':[{imageUrl:ph('#c9bfa8','侘寂玄关'),title:'玄关',width:400,height:300}],'收藏':false },
    { _id:genId(), '标题':'日式茶室角落','描述':'日式茶室 原木 矮桌 竹帘','风格标签':['日式'],'笔记':'原木地台','图片':[],'收藏':false }
  ];
  const profile = [ { _id:genId(), '风格':'中古侘寂','面积':89,'户型':'三室两厅','总预算':180000,'装修方式':'半包','开工日期':dd(-18) } ];
  return { profile, tasks, budget, inspiration };
}

/* ===== CSV 读写（零依赖，正确处理引号/逗号/数组） ===== */
function csvCell(v){
  if(v===null||v===undefined) return '';
  if(typeof v==='object') v=JSON.stringify(v); else v=String(v);
  if(/[",\n\r]/.test(v)) return '"'+v.replace(/"/g,'""')+'"';
  return v;
}
function parseCSV(text){
  const rows=[]; let row=[]; let field=''; let i=0; let inQ=false;
  while(i<text.length){
    const c=text[i];
    if(inQ){
      if(c==='"'){ if(text[i+1]==='"'){ field+='"'; i+=2; continue; } inQ=false; i++; continue; }
      field+=c; i++;
    } else {
      if(c==='"'){ inQ=true; i++; }
      else if(c===','){ row.push(field); field=''; i++; }
      else if(c==='\n'){ row.push(field); rows.push(row); row=[]; field=''; i++; }
      else if(c==='\r'){ i++; }
      else { field+=c; i++; }
    }
  }
  if(field!=='' || row.length){ row.push(field); rows.push(row); }
  return rows;
}
function csvToRows(coll, text){
  const rows=parseCSV(text); if(rows.length<2) return [];
  const header=rows[0];
  return rows.slice(1).map(function(r){
    const obj={};
    header.forEach(function(h,idx){
      const v=(r[idx]!==undefined)?r[idx]:'';
      const ty=TYPES[coll][h];
      if(ty==='number') obj[h]=Number(v)||0;
      else if(ty==='bool') obj[h]=(v==='true'||v==='1'||v===true);
      else if(ty==='array'){ try{ obj[h]=JSON.parse(v||'[]'); }catch(e){ obj[h]=[]; } if(!Array.isArray(obj[h])) obj[h]=[]; }
      else obj[h]=v;
    });
    return obj;
  });
}
function rowsToCsv(coll, rows){
  const header=['_id'].concat(FIELDS[coll]);
  const lines=[header.map(csvCell).join(',')];
  rows.forEach(function(r){
    const cells=['_id'].concat(FIELDS[coll]).map(function(f){ return f==='_id'? csvCell(r._id) : csvCell(r[f]); });
    lines.push(cells.join(','));
  });
  return lines.join('\r\n');
}

/* ===== 数据加载 / 持久化 ===== */
function csvPath(coll){ return path.join(DIR, coll+'.csv'); }
let data;
function loadData(){
  let any=false; const d={};
  COLLS.forEach(function(coll){
    try{ const t=fs.readFileSync(csvPath(coll),'utf8'); const rows=csvToRows(coll,t); d[coll]=rows; if(rows.length) any=true; }
    catch(e){ d[coll]=[]; }
  });
  // 兼容旧版 data.json：首次迁移
  if(!any){
    const jf=path.join(DIR,'data.json');
    if(fs.existsSync(jf)){ try{ const j=JSON.parse(fs.readFileSync(jf,'utf8')); COLLS.forEach(function(c){ if(j[c]) d[c]=j[c]; }); any=true; }catch(e){} }
  }
  if(!any){ const s=seedData(); d.profile=s.profile; d.tasks=s.tasks; d.budget=s.budget; d.inspiration=s.inspiration; }
  saveSync(d);
  return d;
}
function saveSync(d){
  COLLS.forEach(function(coll){ fs.writeFileSync(csvPath(coll), rowsToCsv(coll, d[coll]||[])); });
}
let writeChain=Promise.resolve();
function persist(){
  writeChain=writeChain.then(function(){ return new Promise(function(res,rej){
    try{
      COLLS.forEach(function(coll){
        const tmp=csvPath(coll)+'.tmp';
        fs.writeFileSync(tmp, rowsToCsv(coll, data[coll]||[]));
        fs.renameSync(tmp, csvPath(coll));
      });
      res();
    }catch(e){ rej(e); }
  }); });
  return writeChain.catch(function(e){ console.error('保存失败', e); });
}
data=loadData();

/* ===== HTTP ===== */
function readBody(req, cap){
  cap=cap||50*1024*1024;
  return new Promise((resolve,reject)=>{
    const chunks=[]; let size=0;
    req.on('data',c=>{ size+=c.length; if(size>cap){ reject(new Error('body too large')); req.destroy(); } else chunks.push(c); });
    req.on('end',()=>resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error',reject);
  });
}
function serveHTML(res){
  fs.readFile(HTML_FILE,(err,buf)=>{
    if(err){ res.writeHead(404,{'Content-Type':'text/plain; charset=utf-8'}); return res.end('HTML 文件未找到：'+HTML_FILE); }
    res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'}); res.end(buf);
  });
}
function handleApi(req,res,u){
  const parts=u.pathname.split('/').filter(Boolean);
  if(parts[0]!=='api'){ res.writeHead(404); return res.end('not found'); }
  const coll=parts[1]; const id=parts[2];
  if(!COLLS.includes(coll)){ res.writeHead(400,{'Content-Type':'application/json'}); return res.end(JSON.stringify({error:'bad collection'})); }
  if(req.method==='GET'){
    if(id){ const rec=(data[coll]||[]).find(r=>r._id===id); if(!rec){ res.writeHead(404,{'Content-Type':'application/json'}); return res.end(JSON.stringify({error:'not found'})); } res.writeHead(200,{'Content-Type':'application/json'}); return res.end(JSON.stringify(rec)); }
    res.writeHead(200,{'Content-Type':'application/json'}); return res.end(JSON.stringify(data[coll]||[]));
  }
  if(req.method==='POST'){
    return readBody(req).then(body=>{
      let obj; try{ obj=JSON.parse(body||'{}'); }catch(e){ res.writeHead(400); return res.end(JSON.stringify({error:'bad json'})); }
      delete obj._id; obj._id=genId();
      if(!data[coll]) data[coll]=[];
      data[coll].push(obj);
      return persist().then(()=>{ res.writeHead(200,{'Content-Type':'application/json'}); res.end(JSON.stringify({id:obj._id})); });
    }).catch(err=>{ res.writeHead(413,{'Content-Type':'application/json'}); res.end(JSON.stringify({error:err.message})); });
  }
  if(req.method==='PUT'){
    if(!id){ res.writeHead(400); return res.end('need id'); }
    return readBody(req).then(body=>{
      let obj; try{ obj=JSON.parse(body||'{}'); }catch(e){ res.writeHead(400); return res.end(JSON.stringify({error:'bad json'})); }
      const arr=data[coll]||[]; const idx=arr.findIndex(r=>r._id===id);
      if(idx<0){ res.writeHead(404); return res.end(JSON.stringify({error:'not found'})); }
      arr[idx]=Object.assign({},arr[idx],obj,{_id:id});
      return persist().then(()=>{ res.writeHead(200,{'Content-Type':'application/json'}); res.end(JSON.stringify({ok:true})); });
    }).catch(err=>{ res.writeHead(413,{'Content-Type':'application/json'}); res.end(JSON.stringify({error:err.message})); });
  }
  if(req.method==='DELETE'){
    if(!id){ res.writeHead(400); return res.end('need id'); }
    const arr=data[coll]||[]; const before=arr.length;
    data[coll]=arr.filter(r=>r._id!==id);
    return persist().then(()=>{ res.writeHead(200,{'Content-Type':'application/json'}); res.end(JSON.stringify({ok:true,removed:before-data[coll].length})); });
  }
  res.writeHead(405); res.end('method not allowed');
}
const server=http.createServer((req,res)=>{
  const u=new URL(req.url,'http://localhost');
  const p=u.pathname;
  if(req.method==='GET'&&(p==='/'||p==='/index.html')) return serveHTML(res);
  if(p.startsWith('/api/')) return handleApi(req,res,u);
  res.writeHead(404,{'Content-Type':'text/plain; charset=utf-8'}); res.end('Not found');
});
server.listen(PORT,HOST,()=>{
  console.log('悠然装修工作台 本地服务已启动（数据存储：CSV 文件）');
  console.log('本机访问： http://localhost:'+PORT);
  console.log('同一 WiFi 其他人： http://<你的内网IP>:'+PORT+'  （查内网 IP： ipconfig getifaddr en0）');
  console.log('公网访问： 另开终端运行  cloudflared tunnel --url http://localhost:'+PORT);
});
