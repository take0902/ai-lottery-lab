import assert from 'node:assert/strict';
function rankLoto6(mainMatches, bonusMatches){
  if(mainMatches===6)return '1等';
  if(mainMatches===5&&bonusMatches>=1)return '2等';
  if(mainMatches===5)return '3等';
  if(mainMatches===4)return '4等';
  if(mainMatches===3)return '5等';
  return 'はずれ';
}
assert.equal(rankLoto6(6,0),'1等');
assert.equal(rankLoto6(5,1),'2等');
assert.equal(rankLoto6(5,0),'3等');
assert.equal(rankLoto6(4,0),'4等');
assert.equal(rankLoto6(3,0),'5等');
assert.equal(rankLoto6(2,1),'はずれ');
console.log('core.test: OK');
