import { PricesData } from "./../entities/price.data";
import axios from "axios";
import { TOKENS } from "../platform-constants/platform.tokens";

export class PriceService {
  private raydiumPriceApi = "https://api.raydium.io/coin/price";
  private timerHook: NodeJS.Timeout;
  private prices: PricesData;

  constructor() {}

  public async initialize() {
    await this.updatePrices();
    this.timerHook = setInterval(this.updatePrices, 60000);
  }

  public destroy() {
    clearInterval(this.timerHook);
  }

  public getPriceForCoin(coin: string): number {
    return this.prices[coin];
  }

  private async updatePrices() {
    const tokens = ["SOL"];

    for (const symbol of Object.keys({ ...TOKENS })) {
      tokens.push(symbol);
    }

    this.prices = await axios
      .get(this.raydiumPriceApi, {
        params: {
          coins: tokens.join(","),
        },
      })
      .then((x) => x.data);
  }
}
