import { GenericEventData } from "@polkadot/types"
import { SubstrateEvent } from "@subql/types"
import { LendingAction, LiquidatedEvent, MarketAction, MarketMeta, Position } from "../types"
import { bigIntStr, getMarketMetadata, handlePosition } from "./queryHandler"
import { startOf } from "./util"

interface Transfer {
    sender: string,
    assetId: number,
    amount: string
}

interface Deposited extends Transfer { }

interface Redeemed extends Transfer { }

interface Brrowed extends Transfer { }

interface RepaidBorrow extends Transfer { }

interface LiquidatedBorrow {
    liquidator: string,
    borrower: string,
    liquidateAssetId: number,
    collateralAssetId: number,
    repayAmount: string,
    collateralAmount: string
}

// Admin

interface AdminEvent {
    admin: string,
    assetId: number
}

interface NewMarket extends AdminEvent { }

interface ActivatedMarket extends AdminEvent { }

interface UpdateMarket extends AdminEvent { }

interface ReservesReduced extends AdminEvent {
    reduceAmount: string,
    totalReserves: string
}

interface ReservesAdded extends AdminEvent {
    addAmount: string,
    totalReserves: string
}

export enum MmEvent {
    Transfer,
    Liquidate,
    Reserve,
    Market,
    Unknow
}

export function getEvtType(method: string): MmEvent {
    switch (method) {
        case 'Deposited':
        case 'Redeemed':
        case 'Borrowed':
        case 'RepaidBorrow':
            return MmEvent.Transfer
        case 'LiquidatedBorrow':
            return MmEvent.Liquidate
        case 'NewMarket':
        case 'ActivateMarket':
        case 'UpdateMarket':
            return MmEvent.Market
        case 'ReservesAdded':
        case 'ReservesReduced':
            return MmEvent.Reserve
        default:
            logger.warn(`unknow method to handle: ${method}`)
            return MmEvent.Unknow

    }
}

async function handleTransfer(data: GenericEventData, method: string, hash: string, blockHeight: number, timestamp: Date) {
    try {
        let [sender, asset, amount] = data
        const address = sender.toString()
        const assetId = Number(asset.toString())

        const positionId = await handlePosition(assetId, address, blockHeight, timestamp)
        await LendingAction.create({
            id: hash,
            address: sender.toString(),
            positionId,
            method,
            assetId,
            value: amount.toString(),
            blockHeight,
            timestamp
        }).save()
    } catch (e: any) {
        logger.error(`handle transfer event error: ${e.message}`)
    }
}

export async function eventHandler(event: SubstrateEvent) {
    try {
        let { event: { data, method } } = event
        const ext = event.extrinsic
        const hash = ext.extrinsic.hash.toString()
        const blockHeight = ext.block.block.header.number.toNumber()
        const timestamp = ext.block.timestamp
        const day = startOf(timestamp).valueOf()
        const evt = getEvtType(method)
        switch (evt) {
            case MmEvent.Transfer:
                await handleTransfer(data, method, hash, blockHeight, timestamp)
                break
            case MmEvent.Liquidate:
                const [
                    liquidator,
                    borrower,
                    liquidateAsset,
                    collateralAsset,
                    repayAmount,
                    collateralAmount
                ] = data
                const liquidateAssetId = Number(liquidateAsset.toString())
                const collateralAssetId = Number(collateralAsset.toString())
                const address = borrower.toString()
                const [pid1, pid2] = await Promise.all([
                    handlePosition(liquidateAssetId, address, blockHeight, timestamp),
                    handlePosition(collateralAssetId, address, blockHeight, timestamp)
                ])
                await LiquidatedEvent.create({
                    id: hash,
                    blockHeight,
                    liquidator: liquidator.toString(),
                    borrower: borrower.toString(),
                    liquidateAssetId,
                    collateralAssetId,
                    repayAmount: repayAmount.toString(),
                    collateralAmount: collateralAmount.toString(),
                    positionsId: [pid1, pid2],
                    timestamp
                }).save()
                break
            case MmEvent.Market:
                const [sender, asset] = data
                const admin = sender.toString()
                const assetId = asset.toString()
                const {
                    collateralFactor,
                    reserveFactor,
                    closeFactor,
                    liquidateIncentive,
                    rateModel,
                    state,
                    borrowCap,
                    supplyCap,
                    ptokenId,
                    cap
                } = await getMarketMetadata(Number(assetId)) as any
                await MarketMeta.create({
                    id: assetId,
                    blockHeight,
                    collateralFactor: bigIntStr(collateralFactor),
                    reserveFactor: bigIntStr(reserveFactor),
                    closeFactor: bigIntStr(closeFactor),
                    liquidationIncentive: bigIntStr(liquidateIncentive),
                    rateModel: rateModel.toJSON(),
                    state: state.toString(),
                    supplyCap:  supplyCap ? bigIntStr(supplyCap) : bigIntStr(cap),
                    borrowCap: borrowCap ? bigIntStr(borrowCap) : '0',
                    pTokenId: Number(ptokenId.toString()),
                    timestamp
                }).save()
                MarketAction.create({
                    id: hash,
                    blockHeight,
                    action: method,
                    admin,
                    marketId: assetId,
                    timestamp
                }).save()
                break
            case MmEvent.Reserve:
                break
            case MmEvent.Unknow:
                logger.error(`unknow event to handler`)
        }
    } catch (e: any) {
        logger.error(`handle event error: ${e.message}`)
    }
}