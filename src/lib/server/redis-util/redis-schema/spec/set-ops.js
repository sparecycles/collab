import { contextRedisClient } from '../../redis-context'
import { ContainerOps } from './container-ops'
import { createOps } from './spec-core'

export const SetOps = createOps('SetOps', { extends: ContainerOps }, {
    $has(key) {
        return contextRedisClient('ro').sIsMember(this.$path(), key)
    },
    async $add(key) {
        this.$$addToContainer()
        contextRedisClient('wo').sAdd(this.$path(), key)
    },
    async $get() {
        return new Set(await contextRedisClient('ro').sMembers(this.$path()))
    },
    $rem(key) {
        return contextRedisClient('wo').sRem(this.$path(), key)
    },
    $mapItems(keys, values) {
        return keys.reduce((map, key, index) => Object.assign(map, {
            [key]: values[index],
        }), {})
    },
})
