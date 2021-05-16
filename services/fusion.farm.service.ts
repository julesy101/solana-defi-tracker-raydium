import { cloneDeep } from "lodash";
import { FarmInfo } from "../entities/farm.info";
import { FarmLiquidityStatistics } from "../entities/farm.liquidity.statistics";
import { TokenAmount } from "../entities/token.amount";
import { FARMS } from "../platform-constants/platform.farms";
import { RaydiumFarmBaseService } from "./base.service";

export class FusionFarmService extends RaydiumFarmBaseService {
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
    const { perShare, perBlock, perShareB, perBlockB } =
      this.parsePoolAccountLayout(poolId, farm.version);
    const { reward, rewardB, lp } = farm;

    if (reward && rewardB && lp) {
      this.setLpTokenBalance(poolLpTokenAccount, farm.lp.balance);
      const rewardPerBlockAmount = new TokenAmount(
        perBlock.toNumber(),
        reward.decimals
      );
      const rewardBPerBlockAmount = new TokenAmount(
        perBlockB.toNumber(),
        rewardB.decimals
      );
      const rewardPerBlockTotal = this.rewardPerBlockTotalValue(
        rewardPerBlockAmount,
        reward.symbol
      );
      const rewardBPerBlockTotal = this.rewardPerBlockTotalValue(
        rewardBPerBlockAmount,
        rewardB.symbol
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
      const aprB = (rewardBPerBlockTotal / liquidityUsd) * 100;
      const aprTotal = apr + aprB;
      return {
        ...farm,
        apr: aprTotal,
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
        (x) =>
          x.name === name &&
          [4, 5].includes(x.version) &&
          x.fusion &&
          !x.isStake
      )
    );
  }
  public getFarmByPoolId(id: string): FarmInfo {
    return cloneDeep(
      FARMS.find(
        (x) =>
          x.poolId === id &&
          [4, 5].includes(x.version) &&
          x.fusion &&
          !x.isStake
      )
    );
  }

  public getFarms(): FarmInfo[] {
    return FARMS.filter(
      (x) => [4, 5].includes(x.version) && x.fusion && !x.isStake
    ).map((x) => cloneDeep(x));
  }
}
