import { FusionFarmService } from "./../services/fusion.farm.service";
import { Connection } from "@solana/web3.js";
import { AzureFunction, Context, HttpRequest } from "@azure/functions";
import { FarmService } from "../services/farms.service";
import { LiquidityPoolService } from "../services/liquidity.service";
import { PriceService } from "../services/price.service";
import { WalletService } from "../services/wallet.service";

const httpTrigger: AzureFunction = async function (
  context: Context,
  req: HttpRequest
): Promise<void> {
  const conn: Connection = new Connection(
    "https://solana-api.projectserum.com"
  );

  const priceService = new PriceService();
  const liquidityService = new LiquidityPoolService(conn);
  const farmService = new FarmService(conn, priceService, liquidityService);
  const fusionFarmService = new FusionFarmService(
    conn,
    priceService,
    liquidityService
  );
  const walletService = new WalletService(
    ["2tHszSuxPHz2aaeGrgM4cbSQAzioZMJy5XSSB2i3RtyN"],
    conn,
    fusionFarmService,
    farmService,
    priceService
  );
  context.log("initializing dependencies");
  await priceService.initialize();
  await walletService.initializeWallets();
  priceService.destroy();
  context.res = {
    // status: 200, /* Defaults to 200 */
    body: {
      wallets: walletService.wallets,
    },
  };
};

export default httpTrigger;
