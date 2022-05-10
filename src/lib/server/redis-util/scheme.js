import RedisContext, { currentRedisClient } from './redis-context'

const commonOps = (path) => ({
    path: () => path,
    exists: () => currentRedisClient().exists(path),
    watch: () => currentRedisClient().watch(path),
    del: () => currentRedisClient().del(path),
})

const scheme = {
    hash: path => ({
        ...commonOps(path),
        getAll: () => currentRedisClient().hGetAll(path),
        get: (field) => currentRedisClient().hGet(path, field),
        set: (...args) => currentRedisClient().hSet(path, ...args),
    }),
    setSet: (path, subpaths = {}) => ({
        ...commonOps(path),
        ...scheme.set(path),
        ...subpaths,
        async getAllItems() {
            const ids = await scheme.set(path).getMembers()
            return (await Promise.all(ids.map(
                async id => ({ [id]: await scheme.hash(`${path}:${id}`).getAll() })
            ))).reduce((map, data) => Object.assign(map, data), {})
        },
        del() {
            const setOps = scheme.set(path)
            return RedisContext.isolated(async () => {
                const members = await setOps.getMembers()
                return { members }
            }).multi(({ members }) => {
                for (const member of members) {
                    commonOps(`${path}:${member}`).del()
                }
                setOps.del()
            }).exec()
        },
        item: id => ({
            ...commonOps(`${path}:${id}`),
            getAll: () => scheme.hash(`${path}:${id}`).getAll(),
            rem: () => {
                return RedisContext.isolated(() => {
                    commonOps(path).watch()
                }).multi(() => {
                    scheme.set(path).rem(id)
                    scheme.hash(`${path}:${id}`).del()
                }).exec()
            },
            set: (...data) => {
                return RedisContext.isolated(() => {
                    commonOps(path).watch()
                }).multi(() => {
                    scheme.set(path).add(id)
                    scheme.hash(`${path}:${id}`).set(...data)
                }).exec()
            },
        }),
    }),
    set: path => ({
        ...commonOps(path),
        getMembers: () => currentRedisClient().sMembers(path),
        isMember: (member) => currentRedisClient().sIsMember(path, member),
        add: (member) => currentRedisClient().sAdd(path, member),
        rem: (member) => currentRedisClient().sRem(path, member),
    }),
    list: path => ({
        ...commonOps(path),
        range: ({ start = 0, stop = -1 } = {}) => currentRedisClient().lRange(path, start, stop),
        unshift: (value) => currentRedisClient().lPush(path, value),
        push: (value) => currentRedisClient().rPush(path, value),
        shift: () => currentRedisClient().lPop(path),
        pop: () => currentRedisClient().rPop(path),
        rem: (element, { count = 0 } = {}) => currentRedisClient().lRem(path, count, element),
    }),
    hashList: path => ({
        ...scheme.list(path),
        getItem: id => scheme.hash(`${path}:${id}`),
        updateItem: async (id, value, listmode = 'push') => {
            return scheme.hash(`${path}:${id}`).set(value)
        },
        addItem: async (id, value, listmode = 'push') => {
            return await RedisContext.isolated(async () => {
                await scheme.list(path).watch(path)
            }).multi(async () => {
                await scheme.list(path)[listmode](id)
                await scheme.hash(`${path}:${id}`).set(value)
            }).exec()
        },
        remItem: id => {
            return Promise.all([
                scheme.list(path).rem(id),
                commonOps(`${path}:${id}`).del(),
            ])
        },
        allItems: async () => {
            const keys = await scheme.list(path).range()
            const itemMap = (await Promise.all(keys.map(
                async key => ({ [key]: await scheme.hash(`${path}:${key}`).getAll() })
            ))).reduce((acc, info) => Object.assign(acc, info), {})

            return keys.map(
                id => itemMap[id] && { id, ...itemMap[id] }
            ).filter(Boolean)
        },
    }),
}

export default scheme
