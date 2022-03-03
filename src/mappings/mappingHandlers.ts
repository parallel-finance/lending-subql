import { SubstrateEvent } from "@subql/types";
import { LoansAction } from "../types";

const AssetMap: Record<number, string> = {
    100: 'KSM',
    102: 'TUSDT',
    103: 'KUSD',
    107: 'KAR',
    109: 'LKSM',
    201: 'EUSDT',
    202: 'EUSDC',
    1000: 'XKSM',
    4000: 'CKSM-0-7',
    5000: 'LP-USDT/HKO',
    5001: 'LP-KSM/USDT',
    5002: 'LP-KSM/HKO'
}

const BALANCE_CARE_EVNETS = [
    'Deposited',
    'Redeemed',
    'Borrowed',
    'RepaidBorrow',
]

export async function handleEvent(event: SubstrateEvent): Promise<void> {
    const { event: { data: [account, assetId, value], method } } = event;
    try {
        const ext = event.extrinsic
        const hash = ext.extrinsic.hash
        const assetIdInt = Number(assetId.toString())
        const asset = AssetMap[assetIdInt]

        if (BALANCE_CARE_EVNETS.includes(method)) {
            await LoansAction.create({
                id: hash.toString(),
                blockHeight: ext.block.block.header.number.toNumber(),
                account: account.toString(),
                method,
                asset,
                assetId: assetIdInt,
                value: value && value.toString(),
                timestamp: ext.block.timestamp
            }).save()
        }
    } catch (e: any) {
        logger.error(`handle loans event error: %o`, e)
    }
}
