import { createContext, Fragment, useContext, useRef, useState } from 'react'
import useSWR from 'swr'
import { unwrapDOMRef } from '@react-spectrum/utils'
import {
    ActionButton,
    Content,
    Flex,
    Form,
    Heading,
    Switch,
    Text,
    TextField,
    Button,
    Well,
    ToggleButton,
    View,
    DialogTrigger,
    Dialog,
    useDialogContainer,
    ButtonGroup,
} from '@adobe/react-spectrum'
import { useLayoutEffect } from '@react-aria/utils'
import { ClearButton } from '@react-spectrum/button'
import { Field } from '@react-spectrum/label'
import { useDeleteListItemAction, useEditListItemFormSubmit } from 'lib/client/data/util/list-data'
import { useKeyMapping } from 'lib/client/data/util/key-mapping-context'
import SpaceContext from 'components/space/SpaceContext'
import apiStructures from 'lib/common/api-structures'
import PropTypes from 'lib/common/react-util/prop-types'
import commonSchema from 'lib/server/data/schemas/common-schema'
import schema, { mergeSchemas } from 'lib/server/redis-util/redis-schema'
import Delete from '@spectrum-icons/workflow/Delete'
import GraphBarVertical from '@spectrum-icons/workflow/GraphBarVertical'
import Edit from '@spectrum-icons/workflow/Edit'

/** @type {import('lib/common/spaces').SpaceChoice} */
export const choice = {
    icon: GraphBarVertical,
    text: 'Voter',
    description: 'Groom Stories with Voter',
    order: 0,
}

export const roles = {
    user: ['voter'],
    creator: ['voter', 'admin'],
}

const voterSchema = mergeSchemas?.(commonSchema, schema?.(({ hash, set, range }) => ({
    collab: {
        spaces: set(hash({
            stories: range(hash()),
            users: set(hash({
                votes: hash(),
            })),
        })),
    },
})))

const roleContext = role => ({ context: { roles } }) => roles.has(role)

function requireRoleContext(...checks) {
    const stringChecks = checks.filter(check => typeof check === 'string')
    const otherChecks = checks.filter(check => typeof check !== 'string')

    checks = [...stringChecks, ...otherChecks]

    return async ({ context }, res) => {
        const satisified = (await Promise.all(checks.map(check => typeof check === 'string'
            ? context[check]
            : check(context)
        ))).every(Boolean)

        if (!satisified) {
            res.status(404).end(`not authorized`)
        }
    }
}

/** @type {import('lib/common/spaces').ApiMap<{ context: { user: string, roles: Set<string> } }>} */
export const api = {
    $context: {
        user({ query: { space, session } }) {
            return voterSchema.collab.spaces(space).sessions(session).$get('user')
        },
        roles({ context: { user }, query: { space } }) {
            return voterSchema.collab.spaces(space).users(user).roles.$get()
        },
        userinfo({ context: { user }, query: { space } }) {
            return voterSchema.collab.spaces(space).users(user).$get()
        },
        allUsers({ query: { space } }) {
            return voterSchema.collab.spaces(space).users.$items()
        },
        async allUsersWithRoles({ context: { allUsers }, query: { space } }) {
            await Promise.all(Object.entries(allUsers).map(async ([user, value]) => {
                value.roles = [...await voterSchema.collab.spaces(space).users(user).roles.$get()]
            }))
            return allUsers
        },
        adminRole: roleContext('admin'),
    },
    $mixin: { $delete: requireRoleContext('adminRole') },
    async $delete({ query: { space } }, res) {
        try {
            await voterSchema.collab.spaces(space).$del()
        } catch (ex) {
            console.warn('failed to delete space', ex)
            return res.status(500).end()
        }
        return res.status(204).end()
    },
    users: {
        $inherited: requireRoleContext('adminRole'),
        $get({ context: { allUsersWithRoles } }, res) {
            return res.json(allUsersWithRoles)
        },
        '[user]': {
            roles: {
                '[role]': {
                    async $get({ query: { space, user, role } }, res) {
                        if (!await voterSchema.collab.spaces(space).users(user).roles.$has(role)) {
                            return res.status(404).end(`user ${user} does not have role ${role}`)
                        }
                        return res.status(200).end(`user ${user} has role ${role}`)
                    },
                    async $post({ query: { space, user, role } }, res) {
                        await voterSchema.collab.spaces(space).users(user).roles.$add(role)
                        return res.end()
                    },
                    async $delete({ query: { space, user, role } }, res) {
                        await voterSchema.collab.spaces(space).users(user).roles.$rem(role)
                        return res.end()
                    },
                },
            },
            $delete({ query: { space, user } }, res) {
                voterSchema.collab.spaces(space).users(user).$del()
                return res.status(204).end()
            },
        },
    },
    stories: apiStructures.hashList(({ space }) => voterSchema.collab.spaces(space).stories, '[story]', {
        /** @type {import('lib/common/spaces').ApiMap<{ context: { user: string, roles: Set<string> } }>} */
        '[story]': {
            vote: {
                async $put({ body, context: { user }, query: { space, story } }, res) {
                    const { vote } = body
                    voterSchema.collab.spaces(space).users(user).votes.$set({ [story]: vote })
                    res.status(204).end()
                },
                async $get({ context: { user }, query: { space, story } }, res) {
                    const allUserIds = [...await voterSchema.collab.spaces(space).users.$get()]
                    const otherUsers = allUserIds.filter(id => id !== user)

                    let [vote, otherVotes] = await Promise.all([
                        voterSchema.collab.spaces(space).users(user).votes.$get(story),
                        Promise.all(otherUsers.map(async other =>
                            (await voterSchema.collab.spaces(space).users(other).votes.$get(story))
                        )),
                    ])

                    otherVotes = otherVotes.sort()

                    res.status(200).json({ vote, otherVotes })
                },
            },
        },
    }),
}

/** @type {import('next').GetServerSideProps} */
export async function getServerSideProps({ params: { space } }) {
    return { props: {
        pageTitle: 'Grooming',
        stories: await voterSchema.collab.spaces(space).stories.$items(),
    } }
}

function useDeleteUser(onComplete = Function.prototype) {
    const { space } = useContext(SpaceContext)
    return user => async () => {
        try {
            await fetch(`/api/s/${space}/users/${user}`, { method: 'delete' })
        } finally {
            onComplete()
        }
    }
}

function UserAdmin() {
    const { space } = useContext(SpaceContext)

    const {
        data: allUsers,
        mutate,
    } = useSWR('all-users', async () => (await fetch(`/api/s/${space}/users`)).json())

    const deleteUser = useDeleteUser(mutate)

    return (
        <Flex direction={'column'}>
            { Object.entries(allUsers || {}).sort()
                .map(([user, { username }]) => (
                    <Well key={user} position='relative'>
                        {username}
                        <ClearButton position={'absolute'} top={'-7px'} right={'-7px'} onPress={deleteUser(user)} />
                    </Well>
                ))
            }
        </Flex>
    )
}

Voter.propTypes = {
    space: PropTypes.string.isRequired,
    roles: PropTypes.instanceOf(Set),
    userinfo: PropTypes.shape({
        username: PropTypes.string.isRequired,
    }),
    stories: PropTypes.arrayOf(PropTypes.shape({
        id: PropTypes.string,
    })).isRequired,
}

const ShowYourVoteContext = createContext()

export default function Voter({ space, roles, stories: initialStories, userinfo: { username } }) {
    let { data: stories } = useSWR('stories', async () => (await fetch(`/api/s/${space}/stories`)).json(), {
        fallbackData: initialStories,
        refreshInterval: 1000,
    })

    const keyMapping = useKeyMapping()

    const [showYourVotes, setShowYourVotes] = useState(true)

    return (
        <Fragment>
            <ShowYourVoteContext.Provider value={showYourVotes}>
                <Flex
                    position={'relative'}
                    direction={'column'}
                    alignSelf={'center'}
                    minWidth={'80vw'}
                    margin={'size-200'}
                    gap={'size-300'}
                >
                    <Heading level={1}><Text>Groom Stories {username}</Text></Heading>
                    { roles.has('admin') ? <UserAdmin/> : null }
                    <View position={'relative'} width='100vw' height={'single-line-height'}>
                        <Field label='show votes' labelPosition='side'
                            position={'absolute'} top='size-50' right='size-50'
                            width='size-1600'>
                            <Switch defaultSelected={showYourVotes} onChange={setShowYourVotes} value={showYourVotes}/>
                        </Field>
                    </View>
                    { stories?.map(({ id, ...props }) => (
                        <StoryItem key={keyMapping(id)} story={id} {...props} />
                    )) }
                    <StoryEditItem autofocus />
                </Flex>
            </ShowYourVoteContext.Provider>
        </Fragment>
    )
}

EditStoryDialog.propTypes = {
    story: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
}

function EditStoryDialog({ story, title }) {
    const { dismiss } = useDialogContainer()
    const { onSubmit } = useEditListItemFormSubmit('stories', {
        id: story,
        validate({ title }) { return Boolean(title) },
        afterMutate() { dismiss() },
    })

    const textfield = useRef()
    const form = useRef()

    useLayoutEffect(() => {
        textfield?.current?.focus?.()
    }, [textfield])

    return (
        <Dialog>
            <Heading>Edit Story Title</Heading>
            <Content>
                <Form ref={form} onSubmit={(event) => {
                    onSubmit(event)
                    dismiss()
                }}>
                    <TextField ref={textfield} name={'title'} defaultValue={title} />
                </Form>
            </Content>
            <ButtonGroup>
                <Button variant='cta' onPress={event => fakeSubmit(event, form)}>Save</Button>
                <Button variant='secondary' onPress={dismiss}>Cancel</Button>
            </ButtonGroup>
        </Dialog>
    )
}

function fakeSubmit(event, formref) {
    unwrapDOMRef(formref).current.dispatchEvent(new SubmitEvent('submit', {
        submitter: event.target,
        bubbles: true,
        cancelable: true,
    }))
}

EditStoryButton.propTypes = {
    story: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
}

function EditStoryButton({ story, title, ...props }) {
    return (
        <DialogTrigger>
            <ActionButton variant='secondary' isQuiet
                {...props}>
                <Edit/>
            </ActionButton>
            <EditStoryDialog story={story} title={title} />
        </DialogTrigger>
    )
}

DeleteStoryButton.propTypes = {
    story: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
}

function DeleteStoryButton({ story, title, ...props }) {
    const deleteAction = useDeleteListItemAction('stories', { id: story })
    return (
        <DialogTrigger>
            <ActionButton variant='secondary' isQuiet {...props}>
                <Delete/>
            </ActionButton>
            {dismiss => (
                <Dialog>
                    <Heading>Delete Story?</Heading>
                    <Content>
                        Are you sure you want to stop grooming story {title}?
                    </Content>
                    <ButtonGroup>
                        <Button variant='secondary' onPress={dismiss}>Keep it</Button>
                        <Button variant='primary' onPress={deleteAction}>Discard it</Button>
                    </ButtonGroup>
                </Dialog>
            )}
        </DialogTrigger>
    )
}

const storySizes = [1, 2, 3, 5, 8, 13]

StoryItem.propTypes = {
    story: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
}
function StoryItem({ story, title }) {
    const { space } = useContext(SpaceContext)

    const { data: { vote, otherVotes }, mutate } = useSWR(`stories:${story}:vote`, async () => {
        const response = await fetch(`/api/s/${space}/stories/${story}/vote`)
        const { vote, otherVotes } = await response.json()
        return { vote, otherVotes }
    }, { refreshInterval: 1000, fallbackData: { vote: null, otherVotes: [] } })

    const showYourVotes = useContext(ShowYourVoteContext)

    const totalVoters = otherVotes.length + 1

    const voted = [vote, ...otherVotes].filter(Boolean)

    const voteCounts = voted.reduce((counts, vote) => Object.assign(counts, {
        [vote]: (counts[vote] || 0) + 1,
        max: Math.max((counts[vote] || 0) + 1, counts.max),
    }), { max: 1, totalVoters })

    return (
        <Well position={'relative'} role='region'>
            <Heading level={3} margin='size-0' marginStart={'size-300'}>{title}</Heading>
            <Content>
                <Flex
                    marginY={'size-200'}
                    height={'size-800'}
                    direction={'row'}
                    gap={'size-100'}
                    alignItems={'baseline'}>
                    <View width={'size-0'} height={'40px'} />
                    { [...storySizes, 'abstain'].map(ivote => (
                        <View key={`vote-count-${ivote}`}
                            position='relative'
                            minWidth={'size-500'}
                            backgroundColor={'gray-500'}
                            UNSAFE_style={{
                                transition: 'min-height 1s ease',
                            }}
                            minHeight={`${(voteCounts[ivote] || 0) * 40 / voteCounts.totalVoters + 1}px`} >
                            <View position={'absolute'} bottom='size-0'>
                                <ToggleButton position={'absolute'}
                                    isSelected={showYourVotes && vote === String(ivote)}
                                    onPress={async () => {
                                        mutate(({ ...data }) => ({ ...data, vote: ivote }), false)
                                        await fetch(`/api/s/${space}/stories/${story}/vote`, {
                                            method: 'put',
                                            body: new URLSearchParams({ vote: ivote }),
                                        })
                                        mutate()
                                    }}
                                    type='button'
                                    height={'size-500'}
                                    width={'size-500'}
                                    top={'size-50'}
                                >{ivote === 'abstain' ? '?' : ivote}</ToggleButton>
                            </View>
                        </View>
                    ))}
                    <View>{voted.length}/{totalVoters}</View>
                </Flex>
            </Content>
            <DeleteStoryButton story={story} title={title} position={'absolute'} top={'size-0'} right={'size-0'} />
            <EditStoryButton story={story} title={title} position={'absolute'} top={'size-0'} left={'size-0'} />
        </Well>
    )
}

StoryEditItem.propTypes = {
    story: PropTypes.string,
    autofocus: PropTypes.bool,
    autocommit: PropTypes.bool,
    afterMutate: PropTypes.func,
    title: PropTypes.string,
}

function StoryEditItem({
    autofocus,
    afterMutate = Function.prototype,
    title: initialTitle = '',
    ...props
}) {
    const [title, setTitle] = useState(initialTitle)
    const form = useRef()
    const field = useRef()

    useLayoutEffect(() => autofocus && field.current?.focus?.())

    const { onSubmit } = useEditListItemFormSubmit('stories', {
        validate({ title }) {
            return Boolean(title)
        },
        afterMutate() {
            setTitle('')
            afterMutate()
        },
    })

    return (
        <Form ref={form} isQuiet onSubmit={onSubmit}>
            <Flex direction={'row'}>
                <TextField ref={field}
                    flex
                    aria-label={'Story Title'}
                    description={'Add Story for Grooming'}
                    name={'title'}
                    onChange={setTitle}
                    value={title}
                    {...props}
                />
                <Button variant='primary' isQuiet>{'Add Story'}</Button>
            </Flex>
        </Form>
    )
}
