import { contextRedisClient } from 'lib/server/redis-util/redis-context'
import { createOps, isContainerInstance } from './spec-core'

export const CommonOps = createOps('CommonOps', {}, {
    $exists() {
        return contextRedisClient('r').exists(this.$path())
    },
    $watch() {
        return contextRedisClient('i').watch(this.$path())
    },
    $del() {
        return Promise.all([
            this.$$removeFromContainer(),
            this.$$removeNested(),
            this.$$delContained?.(),
            this.$$delThis_UNSAFE(),
        ])
    },
    $$delThis_UNSAFE() {
        return contextRedisClient('w').del(this.$path())
    },
    $expire(time) {
        return contextRedisClient('w').expire(this.$path(), time)
    },
    $$addToContainer() {
        const { _parent: parent, _key: key } = this

        if (isContainerInstance(parent)) {
            parent.$add(key, ...this._itemArgs)
        }

        parent?.$$addToContainer?.()
    },
})
