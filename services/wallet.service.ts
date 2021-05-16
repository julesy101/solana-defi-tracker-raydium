import { PriceService } from "./price.service";
import { FarmInfo } from "./../entities/farm.info";
import { AccountInfo, ParsedAccountData, PublicKey } from "@solana/web3.js";
import { Connection } from "@solana/web3.js";
import {
  STAKE_PROGRAM_ID_V4,
  STAKE_PROGRAM_ID_V5,
  TOKEN_PROGRAM_ID,
} from "../platform-constants/platform.identifiers";
import { TokenAmount } from "../entities/token.amount";
import { findTokenByMintAddress } from "../platform-constants/platform.helpers";
import { USER_STAKE_INFO_ACCOUNT_LAYOUT_V4 } from "../platform-constants/platform.stake.layouts";
import { FusionFarmService } from "./fusion.farm.service";
import { FarmService } from "./farms.service";
import { StakeAccount, Wallet } from "../entities/wallet";
import BigNumber from "bignumber.js";

export class WalletService {
  wallets: Wallet[];

  constructor(
    walletPublicKeys: string[],
    private conn: Connection,
    private fusionFarmService: FusionFarmService,
    private farmService: FarmService,
    private priceService: PriceService
  ) {
    this.wallets = [];
    walletPublicKeys.forEach((pubKey) => {
      this.wallets.push(new Wallet(pubKey));
    });
  }

  async initializeWallets() {
    const walletRunups = [];
    this.wallets.forEach(async (wallet) => {
      const walletTokenAccountSetup = this.getTokenAccounts(wallet);
      const walletStakeAccountSetup = this.getStakeAccounts(wallet);
      walletRunups.push(
        Promise.all([walletTokenAccountSetup, walletStakeAccountSetup]).then(
          () => (wallet.initialized = true)
        )
      );
    });
    await Promise.all(walletRunups);
  }

  private async getTokenAccounts(wallet: Wallet) {
    const parsedTokenAccounts = (
      await this.conn.getParsedTokenAccountsByOwner(
        wallet.address,
        {
          programId: new PublicKey(TOKEN_PROGRAM_ID),
        },
        "confirmed"
      )
    ).value;

    parsedTokenAccounts.forEach(
      (accInfo: {
        pubkey: PublicKey;
        account: AccountInfo<ParsedAccountData>;
      }) => {
        const tokenAccountAddress = accInfo.pubkey.toBase58();
        const parsedInfo = accInfo.account.data.parsed.info;
        const mintAddress = parsedInfo.mint;
        const balance = new TokenAmount(
          parsedInfo.tokenAmount.amount,
          parsedInfo.tokenAmount.decimals
        );
        const knownToken = findTokenByMintAddress(mintAddress);
        if (knownToken) {
          const { symbol, name, decimals } = knownToken;
          if (wallet.tokenAccounts.hasOwnProperty(mintAddress)) {
            wallet.tokenAccounts[mintAddress].balance = balance;
          } else {
            wallet.tokenAccounts[mintAddress] = {
              mintAddress,
              balance,
              tokenAccountAddress,
              symbol,
              name,
              decimals,
            };
          }
        }
      }
    );
  }
  private async getStakeAccounts(wallet: Wallet) {
    const stakeFiltersV4 = this.buildStakeFilters(
      wallet.address,
      USER_STAKE_INFO_ACCOUNT_LAYOUT_V4.span
    );

    const stakeAccountV4Infos = await this.getFilteredProgramAccounts(
      new PublicKey(STAKE_PROGRAM_ID_V4),
      stakeFiltersV4
    );
    const stakeAccountV5Infos = await this.getFilteredProgramAccounts(
      new PublicKey(STAKE_PROGRAM_ID_V5),
      stakeFiltersV4
    );
    const stakePositions = [];
    stakeAccountV4Infos.forEach((stakeAccountInfo) => {
      const stakeAccountAddress = stakeAccountInfo.pubkey.toBase58();
      const userStakeInfo = USER_STAKE_INFO_ACCOUNT_LAYOUT_V4.decode(
        stakeAccountInfo.account.data
      );
      const { poolId, depositBalance, rewardDebt, rewardDebtB } =
        this.buildStakeAccountInfo(userStakeInfo);

      const farm = this.farmService.getFarmByPoolId(poolId);
      const stakeAccount = this.buildWalletStakeAccount(
        farm,
        depositBalance,
        rewardDebt,
        rewardDebtB,
        stakeAccountAddress
      );
      if (stakeAccount) {
        wallet.stakeAccounts[poolId] = stakeAccount;
        stakePositions.push(
          this.calculateStakePosition(farm, stakeAccount, wallet)
        );
      }
    });

    stakeAccountV5Infos.forEach((stakeAccountInfo) => {
      const stakeAccountAddress = stakeAccountInfo.pubkey.toBase58();
      const userStakeInfo = USER_STAKE_INFO_ACCOUNT_LAYOUT_V4.decode(
        stakeAccountInfo.account.data
      );
      const { poolId, depositBalance, rewardDebt, rewardDebtB } =
        this.buildStakeAccountInfo(userStakeInfo);
      const farm = this.fusionFarmService.getFarmByPoolId(poolId);
      const stakeAccount = this.buildWalletStakeAccount(
        farm,
        depositBalance,
        rewardDebt,
        rewardDebtB,
        stakeAccountAddress
      );
      if (stakeAccount) {
        wallet.stakeAccounts[poolId] = stakeAccount;
        stakePositions.push(
          this.calculateStakePosition(farm, stakeAccount, wallet)
        );
      }
    });

    await Promise.all(stakePositions);
  }

  private async calculateStakePosition(
    farm: FarmInfo,
    stakeAccount: StakeAccount,
    wallet: Wallet
  ) {
    if (farm.fusion) {
      const stats = await this.fusionFarmService.getFarmStatistics(farm);
      const tokenValue =
        stakeAccount.depositBalance.toEther().toNumber() *
        stats.liquidityItemValue;
      const d = this.setDivisionForFarm(farm);
      const pendingReward = stakeAccount.depositBalance.wei
        .multipliedBy(stats.perShare.toNumber())
        .dividedBy(d)
        .minus(stakeAccount.rewardDebt.wei);
      const pendingRewardB = stakeAccount.depositBalance.wei
        .multipliedBy(parseInt(stats.perShareB.toString()))
        .dividedBy(d)
        .minus(stakeAccount.rewardDebtB.wei);

      const pendingTokenValue = new TokenAmount(
        pendingReward,
        stats.reward.decimals
      );
      const pendingBTokenValue = new TokenAmount(
        pendingRewardB,
        stats.rewardB.decimals
      );
      const totalPositionUsd =
        tokenValue +
        this.tokenValueToUsd(pendingTokenValue, stats.reward.symbol) +
        this.tokenValueToUsd(pendingBTokenValue, stats.rewardB.symbol);

      wallet.stakePositions[farm.poolId] = {
        name: stats.name,
        lpTokens: stakeAccount.depositBalance.toEther().toNumber(),
        lpTokenUsdValue: tokenValue,
        pendingReward: !pendingTokenValue.isNullOrZero()
          ? this.tokenValue(pendingBTokenValue)
          : this.tokenValue(pendingTokenValue),
        pendingRewardB: !pendingTokenValue.isNullOrZero()
          ? this.tokenValue(pendingBTokenValue)
          : null,
        pendingRewardUsd: !pendingTokenValue.isNullOrZero()
          ? this.tokenValueToUsd(pendingTokenValue, stats.reward.symbol)
          : this.tokenValueToUsd(pendingBTokenValue, stats.rewardB.symbol),
        pendingRewardBUsd: !pendingTokenValue.isNullOrZero()
          ? this.tokenValueToUsd(pendingBTokenValue, stats.rewardB.symbol)
          : null,
        totalPositionUsd,
        stakeAccount,
      };
    } else {
    }
  }

  private setDivisionForFarm(farm: FarmInfo): number {
    let d = 0;
    if (farm.version === 5) {
      d = 1e15;
    } else {
      d = 1e9;
    }
    return d;
  }

  private tokenValueToUsd(tokenValue: TokenAmount, symbol: string): number {
    return (
      this.priceService.getPriceForCoin(symbol) *
      tokenValue.toEther().toNumber()
    );
  }

  private tokenValue(tokenValue: TokenAmount) {
    return tokenValue.toEther().toNumber();
  }

  private buildWalletStakeAccount(
    farm: FarmInfo,
    depositBalance: string | number | BigNumber,
    rewardDebt: string | number | BigNumber,
    rewardDebtB: string | number | BigNumber,
    stakeAccountAddress: string
  ): StakeAccount {
    if (farm) {
      return {
        depositBalance: new TokenAmount(depositBalance, farm.lp.decimals),
        rewardDebt: new TokenAmount(rewardDebt, farm.reward.decimals),
        rewardDebtB: new TokenAmount(rewardDebtB, farm.rewardB.decimals),
        stakeAccountAddress,
      };
    }

    return null;
  }

  private buildStakeAccountInfo(userStakeInfo) {
    const poolId = userStakeInfo.poolId.toBase58();
    const depositBalance = userStakeInfo.depositBalance.toNumber();
    const rewardDebt = userStakeInfo.rewardDebt.toNumber();
    const rewardDebtB = userStakeInfo.rewardDebtB.toNumber();

    return {
      poolId,
      depositBalance,
      rewardDebt,
      rewardDebtB,
    };
  }

  private buildStakeFilters(address: PublicKey, span: any) {
    return [
      {
        memcmp: {
          offset: 40,
          bytes: address.toBase58(),
        },
      },
      {
        dataSize: span,
      },
    ];
  }

  private async getFilteredProgramAccounts(
    programId: PublicKey,
    filters: any
  ): Promise<{ pubkey: PublicKey; account: AccountInfo<Buffer> }[]> {
    const resp = await this.conn.getProgramAccounts(programId, {
      commitment: this.conn.commitment,
      filters,
      encoding: "base64",
    });

    return resp;
  }
}
