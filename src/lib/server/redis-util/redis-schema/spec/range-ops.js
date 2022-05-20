import { contextRedisClient } from '../../redis-context'
import { ContainerOps } from './container-ops'
import { HashOps } from './hash-ops'
import { createOps } from './spec-core'

export const RangeOps = createOps('RangeOps', { extends: ContainerOps }, {
    $get(start = 0, stop = -1) {
        return contextRedisClient('ro').lRange(this.$path(), start, stop)
    },
    $add(key) {
        return contextRedisClient('wo').rPush(this.$path(), key)
    },
    $rem(key, count = 0) {
        return contextRedisClient('wo').lRem(this.$path(), 0, key)
    },
    $mapItems(keys, values) {
        if (this._containedType === HashOps) {
            return keys.map((key, index) => {
                return { id: key, ...values[index] }
            })
        }

        return keys.map((key, index) => {
            return { id: key, data: values[index] }
        })
    },
})
