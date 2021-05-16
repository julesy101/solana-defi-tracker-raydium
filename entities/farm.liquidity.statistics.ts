import { BigNumber } from "bignumber.js";
import { FarmInfo } from "./farm.info";

export interface FarmLiquidityStatistics extends FarmInfo {
  apr: number;
  liquidityUsd: number;
  liquidityItemValue: number;
  perShare: BigNumber;
  perShareB: BigNumber;
}
