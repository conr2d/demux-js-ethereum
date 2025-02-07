import { Block, BlockInfo } from "demux";
import { EthereumTransaction } from "./interfaces";

export class EthereumBlock implements Block {
  public actions: EthereumTransaction[];
  public blockInfo: BlockInfo;

  constructor(
    rawBlock: any,
  ) {
    this.blockInfo = {
      blockNumber: parseInt(rawBlock.number, 16),
      blockHash: rawBlock.hash,
      previousBlockHash: rawBlock.parentHash,
      timestamp: new Date(parseInt(rawBlock.timestamp, 16) * 1000),
    };
    this.actions = this.collectTransactionsFromBlock(rawBlock);
  }

  protected collectTransactionsFromBlock(rawBlock: any): EthereumTransaction[] {
    const transactions: EthereumTransaction[] = this.flattenArray(rawBlock.transactions.map((transaction: any, _: number) => {
      const tx = {
        type: `T::${transaction.to}::${transaction.input.slice(0,10)}`,
        payload: transaction,
      };
      return tx;
    }));
    const events: EthereumTransaction[] = this.flattenArray(rawBlock.logs.map((log: any, _: number) => {
      const tx = {
        type: `E::${log.address}::${log.topics[0]}`,
        payload: log,
      };
      return tx;
    }));
    return transactions.concat(events);
  }

  private flattenArray(arr: any[]): any[] {
    return arr.reduce((flat, toFlatten) =>
      flat.concat(Array.isArray(toFlatten) ? this.flattenArray(toFlatten) : toFlatten), []);
  }
}
