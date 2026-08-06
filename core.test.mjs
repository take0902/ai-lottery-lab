import assert from 'node:assert/strict';
function grade(g,m,b){if(g==='loto6'){if(m===6)return'1等';if(m===5&&b>=1)return'2等';if(m===5)return'3等';if(m===4)return'4等';if(m===3)return'5等';return'当せんなし'}if(m===7)return'1等';if(m===6&&b>=1)return'2等';if(m===6)return'3等';if(m===5)return'4等';if(m===4)return'5等';if(m===3&&b>=1)return'6等';return'当せんなし'}
assert.equal(grade('loto6',4,0),'4等');
assert.equal(grade('loto6',5,1),'2等');
assert.equal(grade('loto7',3,1),'6等');
console.log('core tests OK');
