import fs from 'node:fs/promises';
import { chromium } from 'playwright';

const configs = {
  loto6: { url:'https://www.paypay-bank.co.jp/lottery/loto/loto6recent.html', pick:6, bonus:1, max:43 },
  loto7: { url:'https://www.paypay-bank.co.jp/lottery/loto/loto7recent.html', pick:7, bonus:2, max:37 }
};

function ints(s){ return [...String(s).matchAll(/\d+/g)].map(m=>Number(m[0])); }
function validDraw(d,c){
  return Number.isInteger(d.no)&&d.no>0&&d.nums.length===c.pick&&d.bonus.length===c.bonus&&
    new Set([...d.nums,...d.bonus]).size===c.pick+c.bonus&&[...d.nums,...d.bonus].every(n=>n>=1&&n<=c.max);
}
function parseBody(text,c){
  const compact=String(text).replace(/\u3000/g,' ').replace(/\r/g,'');
  const blocks=compact.split(/(?=第?\s*\d{3,5}\s*回)/);
  const found=[];
  for(const b of blocks){
    const noM=b.match(/第?\s*(\d{3,5})\s*回/); if(!noM)continue;
    const dateM=b.match(/(20\d{2})[年\/.\-]\s*(\d{1,2})[月\/.\-]\s*(\d{1,2})日?/);
    const mainM=b.match(/本数字[^\d]{0,30}((?:\d{1,2}[^\d]+){5,8}\d{1,2})/s);
    const bonusM=b.match(/ボーナス数字[^\d]{0,30}((?:\d{1,2}[^\d]*){1,3})/s);
    if(!mainM||!bonusM)continue;
    const nums=ints(mainM[1]).slice(0,c.pick).sort((a,b)=>a-b);
    const bonus=ints(bonusM[1]).slice(0,c.bonus).sort((a,b)=>a-b);
    const date=dateM?`${dateM[1]}-${String(dateM[2]).padStart(2,'0')}-${String(dateM[3]).padStart(2,'0')}`:'';
    const d={no:Number(noM[1]),date,nums,bonus}; if(validDraw(d,c))found.push(d);
  }
  found.sort((a,b)=>b.no-a.no); return found[0]||null;
}
async function scrape(game){
  const c=configs[game]; const browser=await chromium.launch({headless:true});
  try{
    const page=await browser.newPage({locale:'ja-JP',userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile Safari/604.1'});
    await page.goto(c.url,{waitUntil:'networkidle',timeout:60000});
    await page.waitForTimeout(3000);
    let texts=[await page.locator('body').innerText()];
    for(const f of page.frames().slice(1)){ try{texts.push(await f.locator('body').innerText())}catch{} }
    for(const t of texts){ const d=parseBody(t,c); if(d)return {...d,verified:true,source:'PayPay銀行 過去10回号',checkedAt:new Date().toISOString()}; }
    throw new Error(`${game}: 抽選結果を解析できませんでした`);
  } finally { await browser.close(); }
}

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
  } else {
    try{ d=await scrape(game); }catch(e){ console.error(e.message); }
  }
  if(d && (!latest[game] || Number(d.no)>=Number(latest[game].no||0))){ latest[game]=d; changed=true; }
}
if(changed){ latest.updatedAt=new Date().toISOString(); await fs.writeFile('latest.json',JSON.stringify(latest,null,2)+'\n'); }
else console.log('更新対象なし');
