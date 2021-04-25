import { Fees } from "./fees";
import { TokenInfo } from "./token.info";

export interface LiquidityPoolInfo {
  name: string;
  coin: TokenInfo;
  pc: TokenInfo;
  lp: TokenInfo;

  version: number;
  programId: string;

  ammId: string;
  ammAuthority: string;
  ammOpenOrders: string;
  ammTargetOrders: string;
  ammQuantities: string;

  poolCoinTokenAccount: string;
  poolPcTokenAccount: string;
  poolWithdrawQueue: string;
  poolTempLpTokenAccount: string;

  serumProgramId: string;
  serumMarket: string;
  serumBids?: string;
  serumAsks?: string;
  serumEventQueue?: string;
  serumCoinVaultAccount: string;
  serumPcVaultAccount: string;
  serumVaultSigner: string;

  fees?: Fees;
}
