// The game-quality renderer consumes the same canonical ArkRenderer contract.
// Keep the proven renderer exported as a fallback for debugging and recovery.
export { GameArkRenderer as ArkRenderer } from "./game-v2/GameArkRenderer";
export { ArkRenderer as FallbackArkRenderer } from "./ArkRenderer";
export type { ArkRendererConstructor, ArkRendererContract, ArkRendererOptions } from "./contract";
