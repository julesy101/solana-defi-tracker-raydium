import { nu64, struct, u8, blob } from "buffer-layout";
import { publicKey, u128, u64 } from "@project-serum/borsh";

export const STAKE_INFO_LAYOUT = struct([
  u64("state"),
  u64("nonce"),
  publicKey("poolLpTokenAccount"),
  publicKey("poolRewardTokenAccount"),
  publicKey("owner"),
  publicKey("feeOwner"),
  u64("feeY"),
  u64("feeX"),
  u64("totalReward"),
  u128("rewardPerShareNet"),
  u64("lastBlock"),
  u64("rewardPerBlock"),
]);

export const STAKE_INFO_LAYOUT_V4 = struct([
  u64("state"),
  u64("nonce"),
  publicKey("poolLpTokenAccount"),
  publicKey("poolRewardTokenAccount"),
  u64("totalReward"),
  u128("perShare"),
  u64("perBlock"),
  u8("option"),
  publicKey("poolRewardTokenAccountB"),
  blob(7),
  u64("totalRewardB"),
  u128("perShareB"),
  u64("perBlockB"),
  u64("lastBlock"),
  publicKey("owner"),
]);

export const USER_STAKE_INFO_ACCOUNT_LAYOUT = struct([
  u64("state"),
  publicKey("poolId"),
  publicKey("stakerOwner"),
  u64("depositBalance"),
  u64("rewardDebt"),
]);

export const USER_STAKE_INFO_ACCOUNT_LAYOUT_V4 = struct([
  u64("state"),
  publicKey("poolId"),
  publicKey("stakerOwner"),
  u64("depositBalance"),
  u64("rewardDebt"),
  u64("rewardDebtB"),
]);
