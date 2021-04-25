import { Container, CosmosClient } from "@azure/cosmos";
export interface DefiPlatformItem {
  name: string;
  tokenAddress: string;
  symbol: string;
}
export interface LiquidityPoolToken {
  symbol: string;
  name: string;

  mintAddress: string;
  decimals: number;
  totalSupply?: number;
}
export interface LiquidityPoolItem {
  name: string;
  id: string;
  poolAuthority: string;
  poolToken: LiquidityPoolToken;
  reward: LiquidityPoolToken;
  rewardB?: LiquidityPoolToken;
}
export interface LiquidityPoolPerformanceItem {
  poolId: string;
  apr: number;
  liquidityUsd: number;
  liquidityTokenValueUsd: number;
  timestamp: number;
}

export class DefiTrackerStorageService {
  private cosmosClient: CosmosClient;
  private liquidityPoolContainer: Container;
  private liquidityPoolPerformanceContainer: Container;
  constructor(connectionString: string) {
    this.cosmosClient = new CosmosClient(connectionString);
  }

  public async addLiquidityPool(liquidityPool: LiquidityPoolItem) {
    await this.liquidityPoolContainer.items.upsert(liquidityPool);
  }

  public async addLiquidityPoolPerformanceTick(
    liquidityPoolPerformanceTick: LiquidityPoolPerformanceItem
  ) {
    await this.liquidityPoolPerformanceContainer.items.upsert(
      liquidityPoolPerformanceTick
    );
  }

  public async setup() {
    const { database } = await this.cosmosClient.databases.createIfNotExists({
      id: "defi-tracker",
    });
    const liquidityPool = await database.containers.createIfNotExists({
      id: "liquidity-pools",
    });
    const liquidityPoolPerformance = await database.containers.createIfNotExists(
      {
        id: "liquidity-pools-performance",
      }
    );
    this.liquidityPoolContainer = liquidityPool.container;
    this.liquidityPoolPerformanceContainer = liquidityPoolPerformance.container;
  }
}
