import { AbstractActionReader, NotInitializedError } from "demux";
import { EthereumTransactionReaderOptions } from "./interfaces";
import request from "request-promise-native";
import { retry } from "./utils";
import { RetrieveBlockError, RetrieveHeadBlockError, RetrieveIrreversibleBlockError, MultipleBlockStateError } from "./errors";
import { EthereumBlock } from "./EthereumBlock";

export class EthereumTransactionReader extends AbstractActionReader {
  protected ethereumEndpoint: string;

  constructor(options: EthereumTransactionReaderOptions = {}) {
    super(options);
    this.ethereumEndpoint = options.ethereumEndpoint ? options.ethereumEndpoint : "http://localhost:8545";
  }

  public async getHeadBlockNumber(numRetries: number = 120, waitTimeMs: number = 250): Promise<number> {
    try {
      const blockNum = await retry(async () => {
        const blockInfo = await request.post({
          url: this.ethereumEndpoint,
          json: {
            jsonrpc: "2.0",
            method: "eth_blockNumber",
            params: [],
            id: 0,
          },
        });
        return parseInt(blockInfo.result, 16);
      }, numRetries, waitTimeMs);
      return blockNum;
    } catch (err) {
      throw new RetrieveHeadBlockError();
    }
  }

  public async getLastIrreversibleBlockNumber(numRetries: number = 120, waitTimeMs: number = 250): Promise<number> {
    try {
      // irreversibility is not guaranteed in proof-of-work consensus
      // consider 12 confirmations as irreversible in probabilistic view
      const blockNum = await this.getHeadBlockNumber(numRetries, waitTimeMs);
      return (blockNum - 12 >= 0) ? blockNum - 12 : 0;
    } catch (err) {
      throw new RetrieveIrreversibleBlockError();
    }
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

  protected async setup(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      await request.post({
        url: this.ethereumEndpoint,
        json: {
          jsonrpc: "2.0",
          method: "eth_chainId",
          params: [],
          id: 0,
        },
      })
    } catch (err) {
      throw new NotInitializedError("Cannot reach supplied ethereum endpoint.", err);
    }
  }
}
