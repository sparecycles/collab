import redisClient from '../redis-client'
import RedisContext, { currentRedisClient } from './redis-context'

const commonOps = (path) => ({
    path: () => path,
    exists: () => currentRedisClient().exists(path),
    watch: () => currentRedisClient().watch(path),
    del: () => currentRedisClient().del(path),
})

/** @type {import('./redis-scheme').scheme} */
const scheme = {
    common: path => ({
        $path: () => path,
        $exists: () => currentRedisClient().exists(path),
        $watch: () => currentRedisClient().watch(path),
        $del: () => currentRedisClient().del(path),
    }),
    key: path => ({
        ...scheme.common(path),
        $value() { return currentRedisClient().get(path) },
    }),
    hash: path => ({
        ...scheme.common(path),
        $getAll: () => currentRedisClient().hGetAll(path),
        $get: (field) => currentRedisClient().hGet(path, field),
        $set: (...args) => currentRedisClient().hSet(path, ...args),
    }),
    hashSet: (path, subpaths = {}, itempaths = _id => ({})) => id => !id ? {
        ...scheme.common(path),
        ...scheme.set(path),
        async $allItems() {
            const ids = await scheme.set(path).$members()
            return (await Promise.all(ids.map(
                async id => ({ [id]: await scheme.hash(`${path}:${id}`).$getAll() })
            ))).reduce((map, data) => Object.assign(map, data), {})
        },
        $del() {
            const setOps = scheme.set(path)
            return RedisContext.isolated(async () => {
                const members = await setOps.$members()
                return { members }
            }).multi(({ members }) => {
                for (const member of members) {
                    commonOps(`${path}:${member}`).$del()
                }
                setOps.$del()
            }).exec()
        },
        ...subpaths,
    } : {
        ...scheme.common(`${path}:${id}`),
        ...scheme.hash(`${path}:${id}`),
        $set: (...data) => {
            return RedisContext.isolated(() => {
                scheme.common(path).$watch()
            }).multi(() => {
                scheme.set(path).$add(id)
                scheme.hash(`${path}:${id}`).$set(...data)
            }).exec()
        },
        $del: () => {
            return RedisContext.isolated(() => {
                scheme.common(path).$watch()
            }).multi(() => {
                scheme.set(path).$rem(id)
                scheme.hash(`${path}:${id}`).$del()
            }).exec()
        },
        ...itempaths(id),
    },
    set: path => ({
        ...scheme.common(path),
        $members: () => currentRedisClient().sMembers(path),
        $isMember: (member) => currentRedisClient().sIsMember(path, member),
        $add: (member) => currentRedisClient().sAdd(path, member),
        $rem: (member) => currentRedisClient().sRem(path, member),
    }),
    list: path => ({
        ...scheme.common(path),
        $range: ({ start = 0, stop = -1 } = {}) => currentRedisClient().lRange(path, start, stop),
        $unshift: (value) => currentRedisClient().lPush(path, value),
        $push: (value) => currentRedisClient().rPush(path, value),
        $shift: () => currentRedisClient().lPop(path),
        $pop: () => currentRedisClient().rPop(path),
        $rem: (element, { count = 0 } = {}) => currentRedisClient().lRem(path, count, element),
    }),
    hashList: (path, subpaths = {}, itempaths = _id => ({})) => id => !id ? {
        ...scheme.list(path),
        $allItems: async () => {
            const keys = await scheme.list(path).$range()
            const itemMap = (await Promise.all(keys.map(
                async key => ({ [key]: await scheme.hash(`${path}:${key}`).$getAll() })
            ))).reduce((acc, info) => Object.assign(acc, info), {})

            return keys.map(
                id => itemMap[id] && { id, ...itemMap[id] }
            ).filter(Boolean)
        },
        ...subpaths,
    } : {
        ...scheme.hash(`${path}:${id}`),
        $add: async (value, listmode = 'push') => {
            return await RedisContext.isolated(async () => {
                await scheme.list(path).$watch(path)
            }).multi(async () => {
                await scheme.list(path)[`$${listmode}`](id)
                await scheme.hash(`${path}:${id}`).$set(value)
            }).exec()
        },
        $del() {
            return RedisContext.isolated(() => {
                scheme.common(path).$watch()
            }).multi(() => {
                scheme.list(path).$rem(id)
                scheme.common(`${path}:${id}`).$del()
            }).exec()
        },
        ...itempaths(id),
    },
}

export default scheme
