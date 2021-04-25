import { TokenAmount } from "./token.amount";

export interface TokenInfo {
  symbol: string;
  name: string;

  mintAddress: string;
  decimals: number;
  totalSupply?: TokenAmount;

  referrer?: string;

  tokenAccountAddress?: string;
  balance?: TokenAmount;
}
