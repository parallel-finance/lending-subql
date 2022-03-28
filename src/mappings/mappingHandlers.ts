import { SubstrateBlock, SubstrateEvent } from "@subql/types";
import { eventHandler, handleMarketMeta } from "./events";
import { assetIdList, handleMarketSnapshot } from './queryHandler'
import { blockHandleWrapper } from "./util";

export async function handleEvent(event: SubstrateEvent): Promise<void> {
    await eventHandler(event)
}

async function handler(block: SubstrateBlock) {
    const blockNumber = block.block.header.number.toNumber()
    const timestamp = block.timestamp
    const ids = await assetIdList()
    logger.debug(`start to handle block[${blockNumber}-${timestamp}] id list: %o`, ids)
    await handleMarketSnapshot(ids, blockNumber, timestamp)

    if (blockNumber % 24 === 0) {
        // fetch about daily
        for (let assetId of ids) {
            await handleMarketMeta(assetId, blockNumber, timestamp)
        }
    }
}

//
export async function handleBlock(block: SubstrateBlock): Promise<void> {
    await blockHandleWrapper(block, handler)
}
