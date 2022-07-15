import RedisContext, { contextRedisClient } from '../../redis-context'

import { ContainerOps } from './container-ops'
import { HashOps } from './hash-ops'
import { createOps } from './spec-core'

export const RangeOps = createOps('RangeOps', { extends: ContainerOps }, {
    $get(start = 0, stop = -1) {
        return contextRedisClient('r').lRange(this.$path(), start, stop)
    },
    $$addWatched(key) {
        return RedisContext.isolated(async () => {
            return await this.$pos(key) === null
        }).multi(
            doesNotExist => doesNotExist && contextRedisClient('w').rPush(this.$path(), key)
        ).exec()
    },
    $add(key) {
        return RedisContext.isolated(async () => {
            await this.$watch()
            return await this.$pos(key) === null
        }).multi(
            doesNotExist => doesNotExist && contextRedisClient('w').rPush(this.$path(), key)
        ).exec()
    },
    $pos(key, options = {}) {
        return contextRedisClient('r').lPos(this.$path(), key, options)
    },
    $rem(key, count = 0) {
        return contextRedisClient('w').lRem(this.$path(), count, key)
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
