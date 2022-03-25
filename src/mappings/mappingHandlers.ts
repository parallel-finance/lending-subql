import { SubstrateBlock, SubstrateEvent } from "@subql/types";
import { LendingAction } from "../types";
import { assetIdList, handleAssetConfig, handlePosition } from './queryHandler'
import { blockHandleWrapper } from "./util";

const BALANCE_CARE_EVNETS = [
    'Deposited',
    'Redeemed',
    'Borrowed',
    'RepaidBorrow',
    'LiquidatedBorrow',
]

export async function handleEvent(event: SubstrateEvent): Promise<void> {
    let { event: { data: [address, assetId, value], method } } = event;
    try {
        const ext = event.extrinsic
        const hash = ext.extrinsic.hash
        const blockHeight = ext.block.block.header.number.toNumber()
        const timestamp = ext.block.timestamp
        const addressStr = address.toString()
        const assetIdInt = Number(assetId.toString())

        if (BALANCE_CARE_EVNETS.includes(method)) {
            logger.info(`[${blockHeight}] handle [${method}] [${assetIdInt}] of ${addressStr} action hash: ${hash.toString()}`)

            const position = await handlePosition(assetIdInt, addressStr)
            const record = LendingAction.create({
                ...position,
                id: hash.toString(),
                blockHeight,
                address: addressStr,
                method,
                assetId: assetIdInt,
                value: value && value.toString(),
                timestamp
            })
            logger.debug(`dump new action at[${blockHeight}] method[${method}]: ${timestamp}`)
            await record.save()
        }
    } catch (e: any) {
        logger.error(`handle loans event error: %o`, e.message)
    }
}

async function handler(block: SubstrateBlock) {
    const blockNumber = block.block.header.number.toNumber()
    const timestamp = block.timestamp
    const ids = await assetIdList()
    logger.debug(`start to handle block[${blockNumber}-${timestamp}] id list: %o`, ids)
    await handleAssetConfig(ids, blockNumber, timestamp)
}

//
export async function handleBlock(block: SubstrateBlock): Promise<void> {
    await blockHandleWrapper(block, handler)
}
