import schema from 'lib/server/redis-util/redis-schema'

export default schema(({ set, hash }) => ({
    collab: {
        spaces: set(hash({
            users: set(hash({
                roles: set(),
            })),
            sessions: set(hash()),
        })),
    },
}))
