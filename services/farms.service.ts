import { FarmInfo } from "./../entities/farm.info";
import { RaydiumFarmBaseService } from "./base.service";
import { PriceService } from "./price.service";
import { Connection } from "@solana/web3.js";
import { TokenAmount } from "../entities/token.amount";
import { FARMS } from "../platform-constants/platform.farms";
import { LiquidityPoolService } from "./liquidity.service";
import { cloneDeep } from "lodash";
import { FarmLiquidityStatistics } from "../entities/farm.liquidity.statistics";

export class FarmService extends RaydiumFarmBaseService {
  constructor(
    connection: Connection,
    priceService: PriceService,
    liquidityPoolService: LiquidityPoolService
  ) {
    super(connection, priceService, liquidityPoolService);
  }

  public async getFarmStatistics(
    farm: FarmInfo
  ): Promise<FarmLiquidityStatistics> {
    if (!farm) return;

    const hydratedLiquidityPool =
      await this.liquidityPoolService.getLiquidityPoolByMintAddress(
        farm.lp.mintAddress
      );
    if (!hydratedLiquidityPool) return;

    const poolId = await this.getAccount(farm.poolId);
    const poolLpTokenAccount = await this.getAccount(farm.poolLpTokenAccount);

    farm.lp.balance = new TokenAmount(0, farm.lp.decimals);
    const { reward, lp } = farm;
    if (reward && lp) {
      this.setLpTokenBalance(poolLpTokenAccount, farm.lp.balance);
      const { perShare, perShareB } = this.parsePoolAccountLayout(
        poolId,
        farm.version
      );
      const rewardPerBlockAmount = this.getRewardPerBlock(
        poolId,
        farm.version,
        reward.decimals
      );
      const rewardPerBlockTotal = this.rewardPerBlockTotalValue(
        rewardPerBlockAmount,
        reward.symbol
      );
      const liquidityCoinValue = this.getTokenValue(
        hydratedLiquidityPool.coin.balance,
        hydratedLiquidityPool.coin.symbol
      );
      const liquidityPcValue = this.getTokenValue(
        hydratedLiquidityPool.pc.balance,
        hydratedLiquidityPool.pc.symbol
      );
      const liquidityTotalValue = liquidityPcValue + liquidityCoinValue;
      const liquidityTotalSupply = hydratedLiquidityPool.lp.totalSupply
        .toEther()
        .toNumber();
      const liquidityItemValue = liquidityTotalValue / liquidityTotalSupply;

      const liquidityUsd = lp.balance.toEther().toNumber() * liquidityItemValue;
      const apr = (rewardPerBlockTotal / liquidityUsd) * 100;
      return {
        ...farm,
        apr,
        liquidityUsd,
        liquidityItemValue,
        perShare,
        perShareB,
      };
    }
  }
  public getFarmByName(name: string): FarmInfo {
    return cloneDeep(
      FARMS.find(
        (x) => x.name === name && ![4, 5].includes(x.version) && !x.isStake
      )
    );
  }

  public getFarmByPoolId(id: string): FarmInfo {
    return cloneDeep(
      FARMS.find(
        (x) => x.poolId === id && ![4, 5].includes(x.version) && !x.isStake
      )
    );
  }

  public getFarms(): FarmInfo[] {
    return FARMS.filter((x) => ![4, 5].includes(x.version) && !x.isStake).map(
      (x) => cloneDeep(x)
    );
  }
}
