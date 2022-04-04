/** produces a consensus range for the values supplied */
export function range(...values) {
    const min = Math.min(...values)
    const max = Math.max(...values)

    if (values.length <= 2) {
        return {
            low: min,
            high: max,
        }
    }

    const average = values.reduce((a, b) => a + b) / values.length
    const sq = x => x * x
    const stddev = Math.sqrt(
        values.reduce((a, v) => a + sq(v - average), 0) /
        (values.length - 1)
    )

    const power = 2

    const low = Math.max(min, blend(1 / power, ...values) - stddev / 2)
    const high = Math.min(max, blend(power, ...values) + stddev / 2)

    return { low, high }
}

function blend(power, ...values) {
    const inverse = 1 / power

    return Math.pow(
        values.map(value => Math.pow(value, power)).reduce((a, b) => a + b, 0) / values.length,
        inverse
    )
}
