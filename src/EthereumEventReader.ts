import { EthereumEventReaderOptions } from "./interfaces";
import request from "request-promise-native";
import { retry } from "./utils";
import { RetrieveBlockError, MultipleBlockStateError } from "./errors";
import { EthereumTransactionReader } from "./EthereumTransactionReader";
import { EthereumBlock } from "./EthereumBlock";

export class EthereumEventReader extends EthereumTransactionReader {
  constructor(options: EthereumEventReaderOptions = {}) {
    super(options);
  }

  public async getBlock(blockNumber: number, numRetries: number = 120, waitTimeMs: number = 250): Promise<EthereumBlock> {
    try {
      const block = await retry(async () => {
        const blockNumberHex = `0x${blockNumber.toString(16)}`;
        const rawBlock = await request.post({
          url: this.ethereumEndpoint,
          json: {
            jsonrpc: "2.0",
            method: "eth_getBlockByNumber",
            params: [blockNumberHex, true],
            id: 0,
          },
        });
        const logs = await request.post({
          url: this.ethereumEndpoint,
          json: {
            jsonrpc: "2.0",
            method: "eth_getLogs",
            params: [{fromBlock: blockNumberHex, toBlock: blockNumberHex}],
            id: 0,
          },
        });
        if (logs.result.length && rawBlock.result.hash !== logs.result[0].blockHash) {
          throw new MultipleBlockStateError(blockNumber);
        }
        return new EthereumBlock({...rawBlock.result, logs: logs.result});
      }, numRetries, waitTimeMs);
      return block;
    } catch (err) {
      this.log.error(err);
      throw new RetrieveBlockError();
    }
  }
}
