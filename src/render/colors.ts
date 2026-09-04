export const PALETTE = {
  abyss: 0x090d18,
  nightBlue: 0x111a2a,
  hullInk: 0x1c2431,
  warmShadow: 0x3b2c32,
  terracotta: 0x7b4036,
  brass: 0xa66a38,
  ember: 0xd85b3f,
  sunAmber: 0xf1ad52,
  warmCream: 0xf3dfc0,
  mossDark: 0x244a3c,
  moss: 0x5f8f58,
  lifeMint: 0x9bcb83,
  coolantDark: 0x14545e,
  coolantTeal: 0x37afa5,
  coolantLight: 0x8be0c9,
  alarmRed: 0xd83c3e,
  whiteHeat: 0xfff0c9,
  ionViolet: 0x6f5a91,
} as const;

export function mixColor(left: number, right: number, amount: number): number {
  const t = Math.max(0, Math.min(1, amount));
  const lr = (left >> 16) & 0xff;
  const lg = (left >> 8) & 0xff;
  const lb = left & 0xff;
  const rr = (right >> 16) & 0xff;
  const rg = (right >> 8) & 0xff;
  const rb = right & 0xff;
  return (
    (Math.round(lr + (rr - lr) * t) << 16) |
    (Math.round(lg + (rg - lg) * t) << 8) |
    Math.round(lb + (rb - lb) * t)
  );
}
