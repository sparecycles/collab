import { contextRedisClient } from '../../redis-context'

import { ContainerOps } from './container-ops'
import { createOps } from './spec-core'

export const SetOps = createOps('SetOps', { extends: ContainerOps }, {
    $has(key) {
        return contextRedisClient('r').sIsMember(this.$path(), key)
    },
    async $add(key) {
        await this.$$addToContainer()
        contextRedisClient('w').sAdd(this.$path(), key)
    },
    async $get() {
        return new Set(await contextRedisClient('r').sMembers(this.$path()))
    },
    $rem(key) {
        return contextRedisClient('w').sRem(this.$path(), key)
    },
    $mapItems(keys, values) {
        return keys.reduce((map, key, index) => Object.assign(map, {
            [key]: values[index],
        }), {})
    },
})
