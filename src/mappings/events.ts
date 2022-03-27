import { GenericEventData } from "@polkadot/types"
import { SubstrateEvent } from "@subql/types"
import { LendingAction } from "../types"

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

export async function eventHandler(event: SubstrateEvent) {
    try {
        let { event: { data, method } } = event
        const ext = event.extrinsic
        const hash = ext.extrinsic.hash
        const blockHeight = ext.block.block.header.number.toNumber()
        const timestamp = ext.block.timestamp
        const evt = getEvtType(method)
        switch (evt) {
            case MmEvent.Transfer:
                let [sender, assetId, amount] = data
                LendingAction.create({
                    id: '',
                    address: sender.toString()
                })
                break
            case MmEvent.Liquidate:
                break
            case MmEvent.Market:
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