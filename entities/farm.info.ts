import { TokenInfo } from "./token.info";

export interface FarmInfo {
  name: string;
  lp: TokenInfo;
  reward: TokenInfo;
  rewardB?: TokenInfo;
  isStake: boolean;

  fusion: boolean;
  legacy: boolean;
  dual: boolean;
  version: number;
  programId: string;

  poolId: string;
  poolAuthority: string;

  poolLpTokenAccount: string;
  poolRewardTokenAccount: string;
  poolRewardTokenAccountB?: string;

  user?: object;
}
