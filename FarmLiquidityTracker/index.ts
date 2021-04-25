import { TokenInfo } from "./../entities/token.info";
import { FarmService } from "./../services/farms.service";
import { AzureFunction, Context } from "@azure/functions";
import { Connection } from "@solana/web3.js";
import { PriceService } from "../services/price.service";
import { LiquidityPoolService } from "../services/liquidity.service";
import { FusionFarmService } from "../services/fusion.farm.service";
import {
  DefiTrackerStorageService,
  LiquidityPoolItem,
  LiquidityPoolPerformanceItem,
  LiquidityPoolToken,
} from "../services/storage.service";
import { FarmLiquidityStatistics } from "../entities/farm.liquidity.statistics";
import moment = require("moment");

const timerTrigger: AzureFunction = async function (
  context: Context,
  myTimer: any
): Promise<void> {
  const conn: Connection = new Connection(
    "https://solana-api.projectserum.com"
  );
  const storageService = new DefiTrackerStorageService(
    process.env["CosmosDbConnectionString"]
  );
  const priceService = new PriceService();
  const liquidityService = new LiquidityPoolService(conn);
  const farmService = new FarmService(conn, priceService, liquidityService);
  const fusionFarmService = new FusionFarmService(
    conn,
    priceService,
    liquidityService
  );

  const farmStats: Promise<FarmLiquidityStatistics>[] = [];
  const fusionStats: Promise<FarmLiquidityStatistics>[] = [];

  context.log("initializing dependencies");
  await priceService.initialize();
  await storageService.setup();

  context.log("fetching yield farms & fusion yield farms");
  const farms = farmService.getFarms();
  const fusionFarms = fusionFarmService.getFarms();
  context.log(
    `yield farms (${farms.length}) | fusion yield farms (${fusionFarms.length})`
  );

  farms.forEach((farm) => {
    farmStats.push(farmService.getFarmStatistics(farm));
  });
  fusionFarms.forEach((farm) => {
    fusionStats.push(fusionFarmService.getFarmStatistics(farm));
  });

  const results = await Promise.all([...farmStats, ...fusionStats]);
  context.log("destroying price service");
  priceService.destroy();

  const transformedPools: Promise<void>[] = [];
  const transformedTicks: Promise<void>[] = [];

  context.log("transforming results for storage");
  results.forEach((farmStats) => {
    const {
      name,
      poolId,
      poolAuthority,
      lp,
      reward,
      apr,
      liquidityUsd,
      liquidityItemValue,
    } = farmStats;
    const poolToken: LiquidityPoolToken = transformTokenInfo(lp);
    const rewardToken: LiquidityPoolToken = transformTokenInfo(reward);
    transformedPools.push(
      storageService.addLiquidityPool({
        name,
        id: poolId,
        poolAuthority,
        poolToken,
        reward: rewardToken,
      })
    );
    transformedTicks.push(
      storageService.addLiquidityPoolPerformanceTick({
        poolId,
        apr,
        liquidityUsd,
        liquidityTokenValueUsd: liquidityItemValue,
        timestamp: moment().unix(),
      })
    );
  });

  await Promise.all([...transformedPools, ...transformedTicks]);
  context.log("results stored");
};
function transformTokenInfo(input: TokenInfo): LiquidityPoolToken {
  const { symbol, name, mintAddress, decimals, totalSupply } = input;
  return {
    symbol,
    name,
    mintAddress,
    decimals,
    totalSupply: totalSupply?.toEther().toNumber(),
  };
}
export default timerTrigger;
