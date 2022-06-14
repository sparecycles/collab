import RedisContext, { contextRedisClient } from 'lib/server/redis-util/redis-context'

import { CommonOps } from './common-ops'
import { createOps } from './spec-core'


export const KeyOps = createOps('KeyOps', { isContainer: false, extends: CommonOps }, {
    $set(value) {
        RedisContext.multi(async () => {
            await this.$$addToContainer()
            contextRedisClient('w').set(this.$path(), value)
        })
    },
})
