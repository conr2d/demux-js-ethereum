import { Action, ActionReaderOptions } from "demux";

export interface EthereumTransactionReaderOptions extends ActionReaderOptions {
  ethereumEndpoint?: string
}

export interface EthereumEventReaderOptions extends EthereumTransactionReaderOptions {
}

export interface EthereumTransaction extends Action {
}

