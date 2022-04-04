import userSessionSchema from './schemas/user-session'

export function loadCurrentUser({ space, session }) {
    return userSessionSchema.spaces(space).sessions(session).info().get('user')
}

export function loadUserInfo({ space, user }) {
    return userSessionSchema.spaces(space).users().item(user).getAll()
}
