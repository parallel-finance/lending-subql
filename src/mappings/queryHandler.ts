
import { BigNumber } from "bignumber.js"
import { MarketSnapshot, Position } from "../types"
import { startOf } from "./util"

type PositionData = {
    borrowBalance: string,
    borrowIndex: string
    supplyBalance: string,
    totalEarnedPrior: string,
    exchangeRatePrior: string,
    exchangeRate: string
}

/// assets.account  => address, assetId -> balance
/// assets.asset => assetId -> supply(100->223642594977875000)

/// loans
/// accountBorrows(assetId, address)
/*  {
        principal: 0
        borrowIndex: 1,000,007,903,379,496,778
    }
*/

async function getAccountBorrows(assetId: number, address) {
    return (await api.query.loans.accountBorrows(assetId, address)).toJSON()
}


/// ccountDeposits(u32, AccountId32): PalletLoansDeposits 
/*  {
    voucherBalance: 104,999,989,302,227,079
    isCollateral: true
}
*/
async function getAccountDeposits(assetId: number, address: string) {
    return (await api.query.loans.accountDeposits(assetId, address)).toJSON()
}

/// accountEarned(u32, AccountId32): PalletLoansEarnedSnapshot
/*
    {
        totalEarnedPrior: 101,883,562
        exchangeRatePrior: 20,000,002,037,671,240
    }
*/

async function getAccountEarned(assetId: number, address: string) {
    return (await api.query.loans.accountEarned(assetId, address)).toJSON()
}

/// borrowIndex(u32): u128
/*
    1,000,274,927,426,183,091
*/

/// borrowRate(u32): u128
/* 20000000000000000 */

/// exchangeRate(u32): u128
/* 20,000,002,037,671,240 */

/// lastAccruedTimestamp(): u64
/* 1,646,715,534 */

/// markets(u32)
/**
 * {
  collateralFactor: 50.00%
  reserveFactor: 15.00%
  closeFactor: 50.00%
  liquidateIncentive: 1,100,000,000,000,000,000
  rateModel: {
    Jump: {
      baseRate: 20,000,000,000,000,000
      jumpRate: 100,000,000,000,000,000
      fullRate: 320,000,000,000,000,000
      jumpUtilization: 80.00%
    }
  }
  state: Active
  cap: 100,000,000,000,000,000
  ptokenId: 2,100
}
 */
export async function getMarketMetadata(assetId: number) {
    return (await api.query.loans.markets(assetId)).toJSON()
}

/// supplyRate(u32): u128
/** 0 */

/// totalBorrows(u32)
/** 0 */

/// totalReserves(u32)
/** 17,979,451 */

/// totalSupply(u32)
/** 124,999,987,264,556,046 */

/// utilizationRatio(u32): Permill
/** 0.00% */


export function bigIntStr(hex: string): string {
    return BigInt(hex).toString(10)
}

async function getAssetBalance(assetId: number, address: string) {
    const { balance }: any = (await api.query.assets.account(assetId, address)).toJSON()
    return bigIntStr(balance)
}

async function getAssetSupply(assetId: number) {
    const { supply }: any = (await api.query.assets.asset(assetId)).toJSON()
    return bigIntStr(supply)
}

export async function getExchangeRate(assetId: number): Promise<string> {
    return bigIntStr((await api.query.loans.exchangeRate(assetId)).toString())
}

async function getLastAccruedTimestamp(): Promise<string> {
    try {
        return (await api.query.loans.lastAccruedTimestamp()).toString()
    } catch (e: any) {
        logger.error(`get last accrued timestamp error: %o`, e)
        return ''
    }
}

async function getTotalSupply(assetId: number) {
    return bigIntStr((await api.query.loans.totalSupply(assetId)).toString())
}

async function getTotalBorrows(assetId: number) {
    return bigIntStr((await api.query.loans.totalBorrows(assetId)).toString())
}

async function getTotalReserves(assetId: number) {
    return bigIntStr((await api.query.loans.totalReserves(assetId)).toString())
}

async function getBorrowIndex(assetId: number) {
    return bigIntStr((await api.query.loans.borrowIndex(assetId)).toString())
}

async function getBorrowRate(assetId: number) {
    return bigIntStr((await api.query.loans.borrowRate(assetId)).toString())
}

async function getSupplyRate(assetId: number) {
    return bigIntStr((await api.query.loans.supplyRate(assetId)).toString())
}

async function getUtilizationRatio(assetId: number) {
    return bigIntStr((await api.query.loans.utilizationRatio(assetId)).toString())
}

function keyLength(assetId: number, keys: any[]): number {
    return keys.filter((k: any) => {
        let id = k.toHuman()[0].replace(/\,/g, '')
        if (Number(id) === assetId) {
            return true
        }
        return false
    }).length
}

async function getBorrowerCounts(assetId: number) {
    const keys = await api.query.loans.accountBorrows.keys()
    return keyLength(assetId, keys)
}

async function getSupplierCounts(assetId: number) {
    const keys = await api.query.loans.accountDeposits.keys()
    return keyLength(assetId, keys)
}

export async function handlePosition(assetId: number, address: string, blockHeight: number, timestamp: Date): Promise<string> {
    const re: any = await Promise.all([
        getAccountBorrows(assetId, address),
        getBorrowIndex(assetId),
        getAccountDeposits(assetId, address),
        getAccountEarned(assetId, address),
        getExchangeRate(assetId)
    ])
    const [
        borrows,
        borrowIndex,
        supplys,
        totalEarned,
        exchangeRate
    ] = re
    let borrowBalance = '0'
    const isZero = borrows.principal != 0
    if (isZero) {
        borrowBalance = new BigNumber(borrowIndex)
            .dividedBy(new BigNumber(borrows.borrowIndex))
            .multipliedBy(new BigNumber(borrows.principal))
            .integerValue().toString()
        logger.warn(`borrows princal not zero: get borrow balance: ${borrowBalance}`)
    }

    let supplyBalance = bigIntStr(supplys.voucherBalance.toString())
    const day = startOf(timestamp).valueOf()
    const positionId = `${address}-${assetId}-${day}`
    await Position.create({
        id: positionId,
        blockHeight,
        address,
        assetId,
        borrowBalance,
        supplyBalance,
        borrowIndex,
        totalEarnedPrior: String(totalEarned.totalEarnedPrior),
        exchangeRatePrior: bigIntStr(totalEarned.exchangeRatePrior),
        exchangeRate,
        timestamp
    }).save()

    logger.info(`new position record: ${positionId}`)
    return positionId
}

export async function assetIdList(): Promise<number[]> {
    try {
        const keys = await api.query.loans.markets.keys()
        return keys.map(k => {
            let s: string = k.toHuman()[0]
            if (s.includes(',')) {
                s = s.replaceAll(',', '')
            }
            return Number(s)
        })
    } catch (e: any) {
        logger.error(`get asset id list error: %o`, e)
    }
}

export async function handleMarketSnapshot(assetIdList: number[], blockHeight: number, timestamp: Date) {
    try {
        if (assetIdList.length < 1) {
            return
        }
        const lastAccruedTimestamp = await getLastAccruedTimestamp()
        let assetQueries = []

        assetIdList.map(assetId => {
            assetQueries.push(Promise.all([
                getTotalSupply(assetId),
                getTotalBorrows(assetId),
                getTotalReserves(assetId),
                getBorrowIndex(assetId),
                getExchangeRate(assetId),
                getBorrowRate(assetId),
                getSupplyRate(assetId),
                getUtilizationRatio(assetId),
                getBorrowerCounts(assetId),
                getSupplierCounts(assetId)
            ]))
        })
        const assetRes = await Promise.all(assetQueries)
        for (let ind in assetRes) {
            const assetId = assetIdList[ind]
            const [
                totalSupply,
                totalBorrows,
                totalReserves,
                borrowIndex,
                exchangeRate,
                borrowRate,
                supplyRate,
                utilizationRatio,
                numberOfBorrow,
                numberOfSupply
            ] = assetRes[ind]
            const record = MarketSnapshot.create({
                id: `${blockHeight}-${assetId}`,
                assetId,
                blockHeight,
                totalBorrows: totalBorrows,
                totalSupply: totalSupply,
                totalReserves: totalReserves,
                exchangeRate: exchangeRate,
                borrowRate: borrowRate,
                supplyRate: supplyRate,
                numberOfBorrow,
                numberOfSupply,
                borrowIndex: borrowIndex,
                utilizationRatio: utilizationRatio,
                lastAccruedTimestamp,
                timestamp
            })
            logger.debug(`dump new asset config at[${blockHeight}] assetId[${assetId}]: ${timestamp}`)
            await record.save()
        }
    } catch (e: any) {
        logger.error(`handle asset error: ${e.message}`)
    }
}