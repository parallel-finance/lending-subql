import { SubstrateBlock, SubstrateEvent } from "@subql/types";
import { LendingAction } from "../types";
import { handleLastAccuredTimestap, handleAssetConfig, handleMarketConfig, handlePosition } from './queryHandler'

const BALANCE_CARE_EVNETS = [
    'Deposited',
    'Redeemed',
    'Borrowed',
    'RepaidBorrow',
    'LiquidatedBorrow',
]

/// TODO:
// handle block
// borrow_rate supply_rate
// total_earned 

export async function handleEvent(event: SubstrateEvent): Promise<void> {
    let { event: { data: [address, assetId, value], method } } = event;
    try {
        const ext = event.extrinsic
        const hash = ext.extrinsic.hash
        const blockNumber = ext.block.block.header.number.toNumber()
        const timestamp = ext.block.timestamp
        const addressStr = address.toString()
        const assetIdInt = Number(assetId.toString())

        if (BALANCE_CARE_EVNETS.includes(method)) {
            logger.info(`handle [${method}] action hash: ${hash.toString()}`)
            await LendingAction.create({
                id: hash.toString(),
                blockHeight: ext.block.block.header.number.toNumber(),
                address: addressStr,
                method,
                assetId: assetIdInt,
                value: value && value.toString(),
                timestamp: ext.block.timestamp
            }).save()

            await handlePosition(assetIdInt, addressStr, blockNumber, hash.toString(), timestamp)
        }
    } catch (e: any) {
        logger.error(`handle loans event error: %o`, e)
    }
}

export async function handleBlock(block: SubstrateBlock): Promise<void> {

    const blockNumber = block.block.header.number.toNumber()

    const timestamp = block.timestamp

    await handleAssetConfig(blockNumber)

    await handleLastAccuredTimestap(blockNumber)

    await handleMarketConfig(blockNumber, timestamp)
    
    // block.block.extrinsics.map(async ext => {
    //     if (ext.isSigned) {
    //         const { meta, method: { args, method, section } } = ext;
    //         // explicit display of name, args & documentation
    //         // logger.info(`${block.block.header.number} ${section}.${method}(${args.map((a) => a.toString()).join(', ')})`);
    //     }
    // })
}
