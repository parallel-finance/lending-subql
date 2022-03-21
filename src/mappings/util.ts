import Mom from "moment"

const utcTime = (timestamp: Date, keepLocalTime: boolean = false) => Mom(timestamp).utc(keepLocalTime)

function now() {
    return Mom().utc(false)
}

type TimeUnit = 'months' | 'weeks'| 'days' | 'hours' | 'minutes' | 'seconds'

export function diffTime(timestamp: Date, unit: TimeUnit = 'days'): number {
    return now().diff(utcTime(timestamp), unit)
}

export function startOf(timestamp: Date, unit: TimeUnit = 'days') {
    return utcTime(timestamp).startOf(unit)
}

export function endOf(timestamp: Date, unit: TimeUnit = 'days') {
    return utcTime(timestamp).endOf(unit)
}

export function hitEndOfDay(timestamp: Date): boolean {
    return endOf(timestamp).diff(timestamp, 'seconds') <= 12
}

export function hitTime(timestamp: Date, off: number) {
    const startHour = startOf(timestamp, 'hours')
    const flag = utcTime(timestamp).diff(startHour, 'seconds') <= 12
    if (!flag) return flag
    if (off === 1 && flag) return true

    if (startHour.diff(now().startOf('days')) % off === 0) {
        return true
    }
    return false
}

export function hitBlockTime(timestamp: Date, unit: TimeUnit = 'days'): boolean {
    return utcTime(timestamp).diff(startOf(timestamp, unit), 'seconds') <= 12
}
