import { SolanaBaseService } from "./base.service";
import {
  AMM_INFO_LAYOUT,
  AMM_INFO_LAYOUT_V3,
  AMM_INFO_LAYOUT_V4,
} from "./../platform-constants/platform.amm.layout";
import { OpenOrders } from "@project-serum/serum";
import { Connection, PublicKey, AccountInfo } from "@solana/web3.js";
import { cloneDeep } from "lodash";

import { LiquidityPoolInfo } from "../entities/liquidity.pool.info";
import { TokenAmount } from "../entities/token.amount";
import {
  ACCOUNT_LAYOUT,
  MINT_LAYOUT,
} from "../platform-constants/platform.account.layout";
import { LIQUIDITY_POOLS } from "../platform-constants/platform.liquidity.pools";

export class LiquidityPoolService extends SolanaBaseService {
  constructor(connection: Connection) {
    super(connection);
  }

  public async getLiquidityPoolByMintAddress(
    mintAddress: string,
    hydrate: boolean = true
  ): Promise<LiquidityPoolInfo> {
    const lqPool = cloneDeep(
      LIQUIDITY_POOLS.find((x) => x.lp.mintAddress === mintAddress)
    );
    lqPool.coin.balance = new TokenAmount(0, lqPool.coin.decimals);
    lqPool.pc.balance = new TokenAmount(0, lqPool.pc.decimals);
    if (hydrate) {
      const tokenAccount = await this.getAccount(lqPool.poolCoinTokenAccount);
      const pcTokenAccount = await this.getAccount(lqPool.poolPcTokenAccount);
      const ammOpenOrders = await this.getAccount(lqPool.ammOpenOrders);
      const ammId = await this.getAccount(lqPool.ammId);
      const lpMintAddress = await this.getAccount(lqPool.lp.mintAddress);

      // pool coin balances:
      this.addTokenBalance(tokenAccount, lqPool.coin.balance);
      this.addTokenBalance(pcTokenAccount, lqPool.pc.balance);
      // amm balances:
      this.addAmmOpenOrders(
        ammOpenOrders,
        lqPool.serumProgramId,
        lqPool.coin.balance,
        lqPool.pc.balance
      );
      this.setFeesAndTakePnl(ammId, lqPool);
      // total supply:
      this.setLiquidityTokenTotalSupply(lpMintAddress, lqPool);
    }
    return lqPool;
  }

  private addTokenBalance(
    poolCoinTokenAccount: AccountInfo<Buffer>,
    balance: TokenAmount
  ): void {
    const parsed = ACCOUNT_LAYOUT.decode(poolCoinTokenAccount.data);
    balance.wei = balance.wei.plus(parsed.amount.toNumber());
  }

  private addAmmOpenOrders(
    ammOpenOrdersAccount: AccountInfo<Buffer>,
    serumProgramId: string,
    poolCoinBalance: TokenAmount,
    poolPcBalance: TokenAmount
  ): void {
    const OPEN_ORDERS_LAYOUT = OpenOrders.getLayout(
      new PublicKey(serumProgramId)
    );
    const parsed = OPEN_ORDERS_LAYOUT.decode(ammOpenOrdersAccount.data);
    const { baseTokenTotal, quoteTokenTotal } = parsed;

    poolCoinBalance.wei = poolCoinBalance.wei.plus(baseTokenTotal.toNumber());
    poolPcBalance.wei = poolPcBalance.wei.plus(quoteTokenTotal.toNumber());
  }

  private setFeesAndTakePnl(
    ammAccount: AccountInfo<Buffer>,
    liquidityPool: LiquidityPoolInfo
  ): void {
    let parsed;
    if (liquidityPool.version === 2) {
      parsed = AMM_INFO_LAYOUT.decode(ammAccount.data);
    } else if (liquidityPool.version === 3) {
      parsed = AMM_INFO_LAYOUT_V3.decode(ammAccount.data);
    } else {
      parsed = AMM_INFO_LAYOUT_V4.decode(ammAccount.data);
      const { swapFeeNumerator, swapFeeDenominator } = parsed;
      liquidityPool.fees = {
        swapFeeNumerator: swapFeeNumerator.toNumber(),
        swapFeeDenominator: swapFeeDenominator.toNumber(),
      };
    }

    const { needTakePnlCoin, needTakePnlPc } = parsed;
    liquidityPool.coin.balance.wei = liquidityPool.coin.balance.wei.minus(
      needTakePnlCoin.toNumber()
    );
    liquidityPool.pc.balance.wei = liquidityPool.pc.balance.wei.minus(
      needTakePnlPc.toNumber()
    );
  }

  private setLiquidityTokenTotalSupply(
    mintAccount: AccountInfo<Buffer>,
    liquidityPool: LiquidityPoolInfo
  ): void {
    const parsed = MINT_LAYOUT.decode(mintAccount.data);
    liquidityPool.lp.totalSupply = new TokenAmount(
      parsed.supply.toNumber(),
      liquidityPool.lp.decimals
    );
  }
}
