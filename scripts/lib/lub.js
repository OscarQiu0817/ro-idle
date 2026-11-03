/* 讀編譯過的 Lua 5.1 資料表（.lub）
   客戶端的 lub 只有「建表、塞值、設全域」，所以只解譯那幾個指令，不是完整的 Lua VM。
   回傳 { 全域名: 值 }；連續 1..n 的表轉成陣列；讀不到的全域（例：WORLD_MSGID.X）回傳字串 'WORLD_MSGID.X'。 */
const fs = require('fs');

function readLub(file) {
  const d = fs.readFileSync(file);
  let pos = 12;
  const sizeT = d[8];
  const u8 = () => d[pos++];
  const i32 = () => { const v = d.readInt32LE(pos); pos += 4; return v; };
  const szt = () => { const v = sizeT === 8 ? Number(d.readBigUInt64LE(pos)) : d.readUInt32LE(pos); pos += sizeT; return v; };
  const str = () => { const n = szt(); if (!n) return null; const s = d.toString('utf8', pos, pos + n - 1); pos += n; return s; };
  const func = () => {
    str(); i32(); i32(); u8(); u8(); u8(); u8();
    const code = []; for (let n = i32(); n > 0; n--) { code.push(d.readUInt32LE(pos)); pos += 4; }
    const k = [];
    for (let n = i32(); n > 0; n--) {
      const t = u8();
      if (t === 0) k.push(null);
      else if (t === 1) k.push(!!u8());
      else if (t === 3) { k.push(d.readDoubleLE(pos)); pos += 8; }
      else if (t === 4) k.push(str());
    }
    for (let n = i32(); n > 0; n--) func();
    { const n = i32(); pos += 4 * n; }
    for (let n = i32(); n > 0; n--) { str(); i32(); i32(); }
    for (let n = i32(); n > 0; n--) str();
    return { code, k };
  };
  const { code, k } = func();
  const G = {};
  const R = [];
  const RK = x => (x >= 256 ? k[x - 256] : R[x]);
  for (let pc = 0; pc < code.length;) {
    const i = code[pc++];
    const op = i & 63, A = (i >>> 6) & 255, C = (i >>> 14) & 511, B = (i >>> 23) & 511, Bx = i >>> 14;
    if (op === 0) R[A] = R[B];
    else if (op === 1) R[A] = k[Bx];
    else if (op === 2) { R[A] = !!B; if (C) pc++; }
    else if (op === 3) for (let j = A; j <= B; j++) R[j] = null;
    else if (op === 5) R[A] = k[Bx] in G ? G[k[Bx]] : { __global: k[Bx] };
    else if (op === 6) { const t = R[B]; R[A] = t && t.__global ? t.__global + '.' + RK(C) : (t ? t.get(RK(C)) : null); }
    else if (op === 7) G[k[Bx]] = R[A];
    else if (op === 9) R[A].set(RK(B), RK(C));
    else if (op === 10) R[A] = new Map();
    else if (op === 12) R[A] = RK(B) + RK(C);
    else if (op === 13) R[A] = RK(B) - RK(C);
    else if (op === 18) R[A] = -R[B];
    else if (op === 34) {
      let c = C; if (c === 0) c = code[pc++];
      for (let j = 1; j <= B; j++) R[A].set((c - 1) * 50 + j, R[A + j]);
    } else if (op === 30) break;
    else throw new Error(`lub：不支援的指令 ${op}（${file}）`);
  }
  const plain = v => {
    if (!(v instanceof Map)) return v;
    const keys = [...v.keys()];
    if (keys.every((x, i) => x === i + 1)) return [...v.values()].map(plain);
    return Object.fromEntries(keys.map(x => [x, plain(v.get(x))]));
  };
  return Object.fromEntries(Object.entries(G).map(([a, b]) => [a, plain(b)]));
}

module.exports = { readLub };
