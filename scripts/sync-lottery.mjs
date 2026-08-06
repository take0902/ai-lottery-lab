import fs from 'node:fs/promises';

const configs = {
  loto6: {
    url: 'https://takarakuji.rakuten.co.jp/backnumber/loto6/lastresults/',
    pick: 6, bonus: 1, max: 43,
    source: '楽天×宝くじ ロト6直近10回'
  },
  loto7: {
    url: 'https://takarakuji.rakuten.co.jp/backnumber/loto7/lastresults/',
    pick: 7, bonus: 2, max: 37,
    source: '楽天×宝くじ ロト7直近10回'
  }
};

function ints(s){ return [...String(s).matchAll(/\d+/g)].map(m=>Number(m[0])); }
function decodeHtml(s){
  return String(s)
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,' ')
    .replace(/<br\s*\/?>/gi,'\n')
    .replace(/<\/(?:tr|td|th|div|p|li|section|article|h[1-6])>/gi,'\n')
    .replace(/<[^>]+>/g,' ')
    .replace(/&nbsp;|&#160;/gi,' ')
    .replace(/&amp;/gi,'&').replace(/&lt;/gi,'<').replace(/&gt;/gi,'>')
    .replace(/&#x([0-9a-f]+);/gi,(_,h)=>String.fromCodePoint(parseInt(h,16)))
    .replace(/&#(\d+);/g,(_,d)=>String.fromCodePoint(Number(d)))
    .replace(/\u3000/g,' ')
    .replace(/[ \t]+/g,' ')
    .replace(/\n{2,}/g,'\n');
}
function validDraw(d,c){
  const all=[...d.nums,...d.bonus];
  return Number.isInteger(d.no)&&d.no>0&&
    d.nums.length===c.pick&&d.bonus.length===c.bonus&&
    new Set(all).size===c.pick+c.bonus&&all.every(n=>Number.isInteger(n)&&n>=1&&n<=c.max);
}
function normalizeDate(y,m,d){ return `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`; }
function parseRakutenText(input,c){
  const text=decodeHtml(input).replace(/\r/g,'');
  // 楽天の表は「回号 第xxxx回 / 抽せん日 yyyy/mm/dd / 本数字 ... / ボーナス数字 (...)」の順。
  const starts=[...text.matchAll(/(?:回号\s*)?第\s*(\d{1,5})\s*回/g)];
  const found=[];
  for(let i=0;i<starts.length;i++){
    const no=Number(starts[i][1]);
    const from=starts[i].index;
    const to=i+1<starts.length?starts[i+1].index:Math.min(text.length,from+1800);
    const block=text.slice(from,to);
    const dm=block.match(/抽せん日\s*(20\d{2})[\/年.\-]\s*(\d{1,2})[\/月.\-]\s*(\d{1,2})日?/);
    const mm=block.match(/本数字\s*([\s\S]*?)\s*ボーナス数字/);
    const bm=block.match(/ボーナス数字\s*\(?\s*([\s\S]*?)(?=\s*(?:1等|キャリーオーバー|回号|第\s*\d+\s*回|$))/);
    if(!mm||!bm)continue;
    const nums=ints(mm[1]).filter(n=>n>=1&&n<=c.max).slice(0,c.pick).sort((a,b)=>a-b);
    const bonus=ints(bm[1]).filter(n=>n>=1&&n<=c.max).slice(0,c.bonus).sort((a,b)=>a-b);
    const draw={no,date:dm?normalizeDate(dm[1],dm[2],dm[3]):'',nums,bonus};
    if(validDraw(draw,c))found.push(draw);
  }
  found.sort((a,b)=>b.no-a.no);
  return found[0]||null;
}
async function fetchText(url){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),30000);
  try{
    const r=await fetch(url,{redirect:'follow',signal:controller.signal,headers:{
      'user-agent':'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/127 Safari/537.36',
      'accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'accept-language':'ja,en-US;q=0.7,en;q=0.3',
      'cache-control':'no-cache'
    }});
    if(!r.ok)throw new Error(`HTTP ${r.status}`);
    return await r.text();
  }finally{clearTimeout(timer)}
}
async function scrape(game){
  const c=configs[game];
  const html=await fetchText(c.url);
  const d=parseRakutenText(html,c);
  if(!d)throw new Error(`${game}: 楽天ページを解析できませんでした`);
  return {...d,verified:true,source:c.source,sourceUrl:c.url,checkedAt:new Date().toISOString()};
}

async function main(){
  const manualGame=process.env.MANUAL_GAME;
  const manualNo=Number(process.env.MANUAL_NO||0);
  const manualNums=ints(process.env.MANUAL_NUMS||'');
  const manualBonus=ints(process.env.MANUAL_BONUS||'');
  const manualDate=process.env.MANUAL_DATE||'';
  const latest=JSON.parse(await fs.readFile('latest.json','utf8'));
  let changed=false;
  for(const game of ['loto6','loto7']){
    const c=configs[game]; let d=null;
    if(manualGame===game&&manualNo){
      d={no:manualNo,date:manualDate,nums:manualNums.sort((a,b)=>a-b),bonus:manualBonus.sort((a,b)=>a-b),verified:true,source:'GitHub Actions 手動公式照合',checkedAt:new Date().toISOString()};
      if(!validDraw(d,c))throw new Error(`${game}: 手動入力が不正です`);
    }else{
      try{ d=await scrape(game); console.log(`${game}: 第${d.no}回を取得`); }
      catch(e){ console.error(e.message); }
    }
    const oldNo=Number(latest[game]?.no||0);
    if(d && Number(d.no)>=oldNo){
      const before=JSON.stringify(latest[game]||null);
      latest[game]=d;
      if(JSON.stringify(d)!==before)changed=true;
    }
  }
  if(changed){
    latest.updatedAt=new Date().toISOString();
    await fs.writeFile('latest.json',JSON.stringify(latest,null,2)+'\n');
    console.log('latest.jsonを更新しました');
  }else console.log('更新対象なし');


}

if(import.meta.url===`file://${process.argv[1]}`){
  main().catch(e=>{console.error(e);process.exit(1)});
}

export { parseRakutenText, validDraw };
