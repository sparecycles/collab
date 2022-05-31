import RedisContext, { contextRedisClient } from 'lib/server/redis-util/redis-context'
import { CommonOps } from './common-ops'
import { createOps } from './spec-core'

export const HashOps = createOps('HashOps', { isContainer: false, extends: CommonOps }, {
    async $set(value) {
        return await RedisContext.multi(async () => {
            await this.$$addToContainer()
            contextRedisClient('w').hSet(this.$path(), value)
        }).exec()
    },
    async $get(key) {
        if (arguments.length === 0) {
            return contextRedisClient('r').hGetAll(this.$path())
        }
        return contextRedisClient('r').hGet(this.$path(), key)
    },
    async $rem(...keys) {
        if (keys.length === 0) {
            return
        }

        return contextRedisClient('r').hDel(this.$path(), keys)
    },
})
