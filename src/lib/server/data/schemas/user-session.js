import schema from 'lib/server/redis-util/redis-schema'

export default schema(({ set, hash }) => ({
    collab: {
        spaces: set(hash({
            users: set(hash()),
            sessions: set(hash({
                roles: set(),
            })),
        })),
    },
}))
