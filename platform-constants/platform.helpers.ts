import { cloneDeep } from "lodash";
import { FARMS } from "./platform.farms";
import { TOKENS } from "./platform.tokens";
export function findTokenByMintAddress(mintAddress: string): any {
  for (let symbol in TOKENS) {
    const token = TOKENS[symbol];
    if (token.mintAddress === mintAddress) return token;
  }
  return null;
}
export function findFarmByPoolId(poolId: string) {
  const farm = FARMS.find((farm) => farm.poolId === poolId);

  if (farm) {
    return cloneDeep(farm);
  }

  return farm;
}
