import RedisContext, { contextRedisClient } from 'lib/server/redis-util/redis-context'

import {
    Scheme,
    createOps,
    isContainerInstance,
} from './spec-core'

export const CommonOps = createOps('CommonOps', { extends: Scheme }, {
    $exists() {
        return contextRedisClient('r').exists(this.$path())
    },
    $watch() {
        return contextRedisClient('i').watch(this.$path())
    },
    $$delThis() {
        return contextRedisClient('w').del(this.$path())
    },
    $expire(time) {
        return contextRedisClient('w').expire(this.$path(), time)
    },
    $$addToContainer() {
        const { _parent: parent, _key: key } = this

        if (isContainerInstance(parent)) {
            RedisContext.multi(() => {
                parent.$watch()
                parent.$add(key, ...this._itemArgs)
            }).exec()
        }

        parent?.$$addToContainer?.()
    },
})
