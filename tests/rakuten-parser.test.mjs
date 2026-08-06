import assert from 'node:assert/strict';
import {parseRakutenText,validDraw} from '../scripts/sync-lottery.mjs';
const c={pick:6,bonus:1,max:43};
const sample=`<div>回号 第2126回</div><div>抽せん日 2026/08/06</div><div>本数字 01 05 12 23 34 43</div><div>ボーナス数字 (19)</div><div>1等</div>`;
const d=parseRakutenText(sample,c);
assert.deepEqual(d,{no:2126,date:'2026-08-06',nums:[1,5,12,23,34,43],bonus:[19]});
assert.equal(validDraw(d,c),true);
console.log('rakuten-parser.test: OK');
