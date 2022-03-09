
/// assets.account  => address, assetId -> balance
/// assets.asset => assetId -> supply(100->223642594977875000)
import { BigNumber } from "bignumber.js"
import { LendingAssetConfigure, LastAccruedTimestamp, LendingMarketConfigure, LendingPosition } from "../types"

const LQ = api.query.loans

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
    return (await LQ.accountDeposits(assetId, address)).toJSON()
}

/// accountEarned(u32, AccountId32): PalletLoansEarnedSnapshot
/*
    {
        totalEarnedPrior: 101,883,562
        exchangeRatePrior: 20,000,002,037,671,240
    }
*/

async function getAccountEarned(assetId: number, address: string) {
    return (await LQ.accountEarned(assetId, address)).toJSON()
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
async function getLendingMarket(assetId: number) {
    return (await LQ.markets(assetId)).toJSON()
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


function bigIntStr(hex: string): string {
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
    return (await api.query.loans.lastAccruedTimestamp()).toString()
}

async function getTotalSupply(assetId: number) {
    return bigIntStr((await api.query.loans.totalSupply(assetId)).toString())
}

async function getTotalBorrows(assetId: number) {
    return bigIntStr((await LQ.totalBorrows(assetId)).toString())
}

async function getTotalReserves(assetId: number) {
    return bigIntStr((await LQ.totalReserves(assetId)).toString())
}

async function getBorrowIndex(assetId: number) {
    return bigIntStr((await LQ.borrowIndex(assetId)).toString())
}

async function getBorrowRate(assetId: number) {
    return bigIntStr((await LQ.borrowRate(assetId)).toString())
}

async function getSupplyRate(assetId: number) {
    return bigIntStr((await LQ.supplyRate(assetId)).toString())
}

async function getUtilizationRatio(assetId: number) {
    return bigIntStr((await LQ.utilizationRatio(assetId)).toString())
}

export async function handlePosition(assetId: number, address: string, blockHeight: number, hash: string, timestamp: Date) {
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

    LendingPosition.create({
        id: `${hash}`,
        blockHeight,
        assetId,
        address,
        borrowIndex,
        borrowBalance,
        supplyBalance,
        totalEarnedPrior: totalEarned.totalEarnedPrior,
        exchangeRatePrior: bigIntStr(totalEarned.exchangeRatePrior),
        exchangeRate,
        timestamp
    }).save()
}

export async function handleAssetConfig(blockHeight: number) {
    const ids = await assetIdList()
    ids.map(async assetId => {

        const [
            totalSupply,
            totalBorrows,
            totalReserves,
            borrowIndex,
            exchangeRate,
            borrowRate,
            supplyRate,
            utilizationRatio
        ] = await Promise.all([
            getTotalSupply(assetId),
            getTotalBorrows(assetId),
            getTotalReserves(assetId),
            getBorrowIndex(assetId),
            getExchangeRate(assetId),
            getBorrowRate(assetId),
            getSupplyRate(assetId),
            getUtilizationRatio(assetId)
        ])
        const re = LendingAssetConfigure.create({
            id: `${blockHeight}-${assetId}`,
            assetId,
            blockHeight,
            totalBorrows: totalBorrows,
            totalSupply: totalSupply,
            totalReserves: totalReserves,
            exchangeRate: exchangeRate,
            borrowRate: borrowRate,
            supplyRate: supplyRate,
            borrowIndex: borrowIndex,
            utilizationRatio: utilizationRatio
        }).save()
    })
}

async function assetIdList(): Promise<number[]> {
    const re = await LQ.markets.keys()
    return re.map(k => {
        let s: string = k.toHuman()[0]
        if (s.includes(',')) {
            s = s.replace(',', '')
        }
        return Number(s)
    })
}

export async function handleLastAccuredTimestap(blockHeight: number) {
    const lastAccruedTimestamp = await getLastAccruedTimestamp()
    LastAccruedTimestamp.create({
        id: `${blockHeight}`,
        blockHeight,
        lastAccruedTimestamp
    }).save()
}

export async function handleMarketConfig(blockHeight: number, timestamp: Date) {
    const ids = await assetIdList()
    ids.map(async assetId => {
        const re: any = await getLendingMarket(assetId)
        const {
            collateralFactor,
            reserveFactor,
            closeFactor,
            liquidateIncentive,
            cap
        } = re
        LendingMarketConfigure.create({
            id: `${blockHeight}-${assetId}`,
            blockHeight,
            assetId,
            collateralFactor,
            reserveFactor,
            closeFactor,
            liquidationIncentive: bigIntStr(liquidateIncentive),
            borrowCap: bigIntStr(cap),
            timestamp
        }).save()
    })
}