
interface Transfer {
    sender: string,
    assetId: number,
    amount: string
}

interface Deposited extends Transfer {}

interface Redeemed extends Transfer {}

interface Brrowed extends Transfer {}

interface RepaidBorrow extends Transfer {}

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

interface NewMarket extends AdminEvent {}

interface ActivatedMarket extends AdminEvent {}

interface UpdateMarket extends AdminEvent {}

interface ReservesReduced extends AdminEvent {
    reduceAmount: string,
    totalReserves: string
}

interface ReservesAdded extends AdminEvent {
    addAmount: string,
    totalReserves: string
}