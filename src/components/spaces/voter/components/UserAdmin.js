import {
    useContext, useRef, useState,
} from 'react'
import useSWR from 'swr'

import {
    ActionButton,
    ButtonGroup,
    Content,
    Dialog,
    DialogTrigger,
    Flex,
    Heading,
    Item,
    Picker,
    Switch,
    Text,
    Well,
} from '@adobe/react-spectrum'

import SpaceContext from 'components/space/SpaceContext'
import PropTypes from 'lib/common/react-util/prop-types'

function useDeleteUser() {
    const { space } = useContext(SpaceContext)
    return user => fetch(`/api/s/${space}/users/${user}`, { method: 'delete' })
}

UserAdmin.propTypes = {
    user: PropTypes.string.isRequired,
}

export default function UserAdmin({ user: selfUser, ...props }) {
    const { space } = useContext(SpaceContext)

    const {
        data: allUsers,
        mutate,
    } = useSWR('all-users', async () => (await fetch(`/api/s/${space}/users`)).json())

    const deleteUser = useDeleteUser()

    const [user, setUser] = useState(null)

    const lastUser = useRef()

    lastUser.current = user || lastUser.current

    return (
        <DialogTrigger isOpen={user !== null} isDismissable>
            <Picker label={'Manage a user'} placeholder={'select a user'}
                selectedKey={user}
                onSelectionChange={setUser}
                {...props}>
                { Object.entries(allUsers || {}).sort()
                    .map(([user, { username, roles }]) => (
                        <Item key={user} value={user}>
                            <Text>{username}</Text>
                            <Text slot={'description'}>{roles.join(', ')}</Text>
                        </Item>
                    ))
                }
            </Picker>
            <Dialog onDismiss={() => setUser(null)}>
                <Heading>
                    Admin user - {allUsers?.[lastUser.current]?.username}?
                </Heading>
                <Content>
                    <Flex direction='row' alignItems={'end'}>
                        <ButtonGroup flex align='center'>
                            <ActionButton type='secondary' onPress={() => {
                                mutate(() => deleteUser(user), {
                                    populateCache: false,
                                    rollbackOnError: true,
                                    revalidate: true,
                                    optimisticData: ({ [user]: _selected, ...users }) => users,
                                })
                                setUser(null)
                            }}>Kick User</ActionButton>
                        </ButtonGroup>
                        <Well>
                            Roles
                            <Flex direction={'column'}>
                                { ['admin', 'voter'].map(role => (
                                    <Switch key={`role-${role}`}
                                        defaultSelected={allUsers?.[user]?.roles.includes(role)}
                                        isSelected={allUsers?.[lastUser.current]?.roles.includes(role)}
                                        isDisabled={lastUser.current === selfUser && role === 'admin'}
                                        onChange={(selected) => {
                                            mutate(() => fetch(`/api/s/${space}/users/${user}/roles/${role}`, {
                                                method: selected ? 'post' : 'delete',
                                            }), {
                                                populateCache: false,
                                                optimisticData: allUsers => ({
                                                    ...allUsers,
                                                    [user]: {
                                                        ...allUsers[user],
                                                        roles: selected
                                                            ? [...allUsers[user].roles, role]
                                                            : allUsers[user].roles.filter(_role => role !== _role),
                                                    },
                                                }),
                                            })
                                        }}
                                    >
                                        {role}
                                    </Switch>
                                )) }
                            </Flex>
                        </Well>
                    </Flex>
                </Content>
            </Dialog>
        </DialogTrigger>
    )
}
