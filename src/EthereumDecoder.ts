import { AbiItem } from "web3-utils";

const AbiCoder = require("web3-eth-abi");

export abstract class EthereumDecoder {
  constructor(protected abi: AbiItem) {}

  abstract decode(payload: any): any;
  abstract signature(): string;
}

export class EthereumMethod extends EthereumDecoder {
  decode(payload: any): any {
    return AbiCoder.decodeParameters(this.abi.inputs, `0x${payload.input.slice(10)}`);
  }

  signature(): string {
    return AbiCoder.encodeFunctionSignature(this.abi);
  }
}

export class EthereumEvent extends EthereumDecoder {
  decode(payload: any): any {
    // TODO: support anonymous event
    return AbiCoder.decodeLog(this.abi.inputs, payload.data, payload.topics.slice(1));
  }

  signature(): string {
    return AbiCoder.encodeEventSignature(this.abi);
  }
}

export class EthereumAbi {
  protected abi: AbiItem[];

  constructor(abi: any) {
    if (abi.abi) {
      this.abi = abi.abi;
      return;
    }
    this.abi = abi;
  }

  private getAbiItem(name: string, type: string): AbiItem {
    const found = this.abi.find((e) => {
      return e.name === name && e.type === type;
    }) as AbiItem;
    return found;
  }

  // TODO: support overloaded methods
  method(name: string): EthereumDecoder {
    const abi = this.getAbiItem(name, "function");
    return new EthereumMethod(abi);
  }

  event(name: string): EthereumDecoder {
    const abi = this.getAbiItem(name, "event");
    return new EthereumEvent(abi);
  }
}
