import { PriceService } from "./price.service";
import { LiquidityPoolService } from "./liquidity.service";
import { Connection, PublicKey, AccountInfo } from "@solana/web3.js";
import { FarmLiquidityStatistics } from "../entities/farm.liquidity.statistics";
import { FarmInfo } from "../entities/farm.info";
import { TokenAmount } from "../entities/token.amount";
import { ACCOUNT_LAYOUT } from "../platform-constants/platform.account.layout";
import {
  STAKE_INFO_LAYOUT,
  STAKE_INFO_LAYOUT_V4,
} from "../platform-constants/platform.stake.layouts";

export class SolanaBaseService {
  constructor(protected connection: Connection) {}

  protected async getAccount(publickKey: string): Promise<AccountInfo<Buffer>> {
    return await this.connection.getAccountInfo(new PublicKey(publickKey));
  }
}

export abstract class RaydiumFarmBaseService extends SolanaBaseService {
  constructor(
    conn: Connection,
    protected priceService: PriceService,
    protected liquidityPoolService: LiquidityPoolService
  ) {
    super(conn);
  }

  public abstract getFarmStatistics(
    farm: FarmInfo
  ): Promise<FarmLiquidityStatistics>;

  public abstract getFarmByName(name: string): FarmInfo;
  public abstract getFarmByPoolId(id: string): FarmInfo;
  public abstract getFarms(): FarmInfo[];
  protected parsePoolAccountLayout(
    poolAccount: AccountInfo<Buffer>,
    version: number
  ): any {
    let parsed;
    if ([4, 5].includes(version)) {
      parsed = STAKE_INFO_LAYOUT_V4.decode(poolAccount.data);
    } else {
      parsed = STAKE_INFO_LAYOUT.decode(poolAccount.data);
    }
    return parsed;
  }

  protected setLpTokenBalance(
    poolLpTokenAccount: AccountInfo<Buffer>,
    poolLpToken: TokenAmount
  ) {
    const parsed = ACCOUNT_LAYOUT.decode(poolLpTokenAccount.data);
    poolLpToken.wei = poolLpToken.wei.plus(parsed.amount.toNumber());
  }

  protected getRewardPerBlock(
    poolAccount: AccountInfo<Buffer>,
    version: number,
    rewardDecimals: number
  ): TokenAmount {
    // let parsed;
    // if ([4, 5].includes(version)) {
    //   parsed = STAKE_INFO_LAYOUT_V4.decode(poolAccount.data);
    // } else {
    //   parsed = STAKE_INFO_LAYOUT.decode(poolAccount.data);
    // }
    const { rewardPerBlock } = this.parsePoolAccountLayout(
      poolAccount,
      version
    );
    return new TokenAmount(rewardPerBlock.toNumber(), rewardDecimals);
  }

  protected rewardPerBlockTotalValue(
    rewardPerBlockAmount: TokenAmount,
    rewardSymbol: string
  ): number {
    return (
      rewardPerBlockAmount.toEther().toNumber() *
      2 *
      60 *
      60 *
      24 *
      365 *
      this.priceService.getPriceForCoin(rewardSymbol)
    );
  }
  protected getTokenValue(
    liquidityPoolTokenBalance: TokenAmount,
    tokenSymbol: string
  ): number {
    return (
      liquidityPoolTokenBalance.toEther().toNumber() *
      this.priceService.getPriceForCoin(tokenSymbol)
    );
  }
}
