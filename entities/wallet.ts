import { PublicKey } from "@solana/web3.js";
import { TokenAmount } from "./token.amount";
import { TokenInfo } from "./token.info";

export interface WalletTokenAccounts {
  [key: string]: TokenInfo;
}

export interface StakeAccount {
  depositBalance: TokenAmount;
  rewardDebt: TokenAmount;
  rewardDebtB: TokenAmount;
  stakeAccountAddress: string;
}

export interface StakePosition {
  name: string;
  lpTokens: number;
  lpTokenUsdValue: number;
  pendingReward: number;
  pendingRewardUsd: number;
  pendingRewardB?: number;
  pendingRewardBUsd?: number;
  totalPositionUsd: number;
  stakeAccount: StakeAccount;
}

export interface WalletStakeAccounts {
  [key: string]: StakeAccount;
}

export interface WalletStakePositions {
  [key: string]: StakePosition;
}

export class Wallet {
  address: PublicKey;
  tokenAccounts: WalletTokenAccounts;
  stakeAccounts: WalletStakeAccounts;
  stakePositions: WalletStakePositions;

  initialized: boolean;

  constructor(addressPubKey: string) {
    this.address = new PublicKey(addressPubKey);
    this.tokenAccounts = {};
    this.stakeAccounts = {};
    this.stakePositions = {};
    this.initialized = false;
  }
}
