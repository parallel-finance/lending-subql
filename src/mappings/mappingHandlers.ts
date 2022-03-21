import { SubstrateBlock, SubstrateEvent } from "@subql/types";
import { LendingAction } from "../types";
import { assetIdList, handleAssetConfig, handleMarketConfig, handlePosition } from './queryHandler'
import { diffTime, endOf, hitBlockTime, hitEndOfDay, hitTime, startOf } from "./util";

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

            await LendingAction.create({
                ...position,
                id: hash.toString(),
                blockHeight,
                address: addressStr,
                method,
                assetId: assetIdInt,
                value: value && value.toString(),
                timestamp
            }).save()
        }
    } catch (e: any) {
        logger.error(`handle loans event error: %o`, e)
    }
}
enum SnapshotPolicy {
    Daily,
    Hour4,
    Hourly,
    Blockly
}

function getPolicy(timestamp: Date): SnapshotPolicy {
    const diffMonths = diffTime(timestamp, 'months')
    if (diffMonths >= 1) {
        // keep daily snapshot at startOf-day & endof-day
        return SnapshotPolicy.Daily
    }
    const diffDays = diffTime(timestamp, 'days')
    if (diffDays > 7) {
        // keep 4-hour snapshot
        return SnapshotPolicy.Hour4
    }
    const diffHours = diffTime(timestamp, 'hours')
    if (diffDays <= 7 && diffHours > 12) {
        // keep hourly snapshot
        return SnapshotPolicy.Hourly
    }
    // keep block snapshot
    return SnapshotPolicy.Blockly
}

function handlePolicy(timestamp: Date): boolean {
    try {
        // day snapshot may be loss for block blocked over 12 seconds
        if (hitEndOfDay(timestamp)) return true
        const policy = getPolicy(timestamp)
        switch (policy) {
            case SnapshotPolicy.Daily:
                if (hitBlockTime(timestamp)) {
                    logger.debug(`daily snapshot policy`)
                    return true
                }
                break
            case SnapshotPolicy.Hour4:
                if (hitTime(timestamp, 4)) {
                    logger.debug(`hour-4 snapshot policy`)
                    return true
                }
                break
            case SnapshotPolicy.Hourly:
                if (hitTime(timestamp, 1)) {
                    logger.debug(`hourly snapshot policy`)
                    return true
                }
                break
            case SnapshotPolicy.Blockly:
                logger.debug(`blockly snapshot policy`)
                return true
        }
        return false
    } catch (e: any) {
        logger.error(`handle block policy error: ${e.message}`)
        return true
    }
}

//
export async function handleBlock(block: SubstrateBlock): Promise<void> {

    const blockNumber = block.block.header.number.toNumber()
    const timestamp = block.timestamp
    if (!handlePolicy(timestamp)) {
        return
    }
    logger.debug(`start to handle block: ${timestamp}`)
    const ids = await assetIdList()

    handleAssetConfig(ids, blockNumber, timestamp)
    handleMarketConfig(ids, blockNumber, timestamp)
}
