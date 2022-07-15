

import {
    Fragment, createContext, useContext, useState,
} from 'react'
import useSWR from 'swr'

import {
    ActionButton,
    Button,
    ButtonGroup,
    Content,
    Dialog,
    DialogTrigger,
    Flex,
    Heading,
    Switch,
    Text,
    ToggleButton,
    View,
    Well,
} from '@adobe/react-spectrum'
import Delete from '@spectrum-icons/workflow/Delete'
import Edit from '@spectrum-icons/workflow/Edit'
import GraphBarVertical from '@spectrum-icons/workflow/GraphBarVertical'

import SpaceContext from 'components/space/SpaceContext'
import { useKeyMapping } from 'lib/client/data/util/key-mapping-context'
import { useDeleteListItemAction } from 'lib/client/data/util/list-data'
import apiStructures from 'lib/common/api-structures'
import PropTypes from 'lib/common/react-util/prop-types'
import commonSchema from 'lib/server/data/schemas/common-schema'
import schema, { mergeSchemas } from 'lib/server/redis-util/redis-schema'

import AddStoryForm from './components/AddStoryForm'
import EditStoryDialog from './components/EditStoryDialog'
import UserAdmin from './components/UserAdmin'


/** @type {import('lib/common/spaces').SpaceChoice} */
export const choice = {
    icon: GraphBarVertical,
    text: 'Voter',
    description: 'Groom Stories with Voter',
    order: 0,
}

export const initialRoles = {
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

function requireContext(...checks) {
    const stringChecks = checks.filter(check => typeof check === 'string')
    const otherChecks = checks.filter(check => typeof check !== 'string')

    checks = [...stringChecks, ...otherChecks]

    return async ({ context }, res) => {
        const satisified = (await Promise.all(checks.map(check => typeof check === 'string'
            ? context[check]
            : check(context)
        ))).every(Boolean)

        if (!satisified) {
            res.status(403).end(`not authorized`)
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
    $mixin: { $delete: requireContext('adminRole') },
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
        $inherited: requireContext('adminRole'),
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
            async $delete({ query: { space, user } }, res) {
                await voterSchema.collab.spaces(space).users(user).$del()
                return res.status(204).end()
            },
        },
    },
    stories: apiStructures.hashList(({ space }) => voterSchema.collab.spaces(space).stories, '[story]', {
        /** @type {import('lib/common/spaces').ApiMap<{ context: { user: string, roles: Set<string> } }>} */
        '[story]': {
            vote: {
                reveal: {
                    $inherited: requireContext('adminRole'),
                    async $put({ query: { space, story } }, res) {
                        await voterSchema.collab.spaces(space).stories(story).$set({ revealed: true })

                        const allUserIds = [...await voterSchema.collab.spaces(space).users.$get()]
                        const votingUsers = (await Promise.all(
                            allUserIds.map(
                                async user => await voterSchema.collab.spaces(space).users(user).roles.$has('voter')
                                && user
                            )
                        )).filter(Boolean)

                        let voteSnapshot = await Promise.all(votingUsers.map(other =>
                            voterSchema.collab.spaces(space).users(other).votes.$get(story)
                        ))

                        voterSchema.collab.spaces(space).stories(story).$set({
                            voteSnapshot: voteSnapshot.sort().join(','),
                        })

                        return res.end()
                    },
                    async $delete({ query: { space, story } }, res) {
                        await voterSchema.collab.spaces(space).stories(story).$rem('revealed')
                        return res.end()
                    },
                },
                async $put({ body, context: { user }, query: { space, story } }, res) {
                    const { vote } = body
                    if (await voterSchema.collab.spaces(space).stories(story).$get('revealed')) {
                        return res.status(409).end()
                    }
                    voterSchema.collab.spaces(space).users(user).votes.$set({ [story]: vote })
                    res.status(204).end()
                },
                async $get({ context: { user }, query: { space, story } }, res) {
                    const userIdsPromise = voterSchema.collab.spaces(space).users.$get()
                    const storyInfoPromise = voterSchema.collab.spaces(space).stories(story).$get()
                    const votePromise = voterSchema.collab.spaces(space).users(user).votes.$get(story)

                    const allUserIds = [...await userIdsPromise]
                    const votingUsers = (await Promise.all(
                        allUserIds.map(
                            async user =>
                                await voterSchema.collab.spaces(space).users(user).roles.$has('voter') && user
                        )
                    )).filter(Boolean)

                    const votedCount = (await Promise.all(votingUsers.map(user =>
                        voterSchema.collab.spaces(space).users(user).votes.$get(story)
                    ))).filter(Boolean).length

                    const total = votingUsers.length

                    const { revealed, voteSnapshot } = await storyInfoPromise

                    res.status(200).json({
                        vote: await votePromise,
                        voteSnapshot: voteSnapshot?.split(',') || [],
                        count: votedCount,
                        total,
                        revealed: Boolean(revealed),
                    })
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

const HideMyVoteContext = createContext()

Voter.propTypes = {
    space: PropTypes.string.isRequired,
    user: PropTypes.string.isRequired,
    roles: PropTypes.instanceOf(Set),
    userinfo: PropTypes.shape({
        username: PropTypes.string.isRequired,
    }),
    stories: PropTypes.arrayOf(PropTypes.shape({
        id: PropTypes.string,
    })).isRequired,
}

export default function Voter({ space, roles, stories: initialStories, user, userinfo: { username } }) {
    let { data: stories } = useSWR('stories', async () => (await fetch(`/api/s/${space}/stories`)).json(), {
        fallbackData: initialStories,
        refreshInterval: 1000,
    })

    const keyMapping = useKeyMapping()

    const [hideMyVotes, setHideMyVotes] = useState(false)

    return (
        <Fragment>
            <HideMyVoteContext.Provider value={hideMyVotes}>
                <Flex
                    position={'relative'}
                    direction={'column'}
                    alignSelf={'center'}
                    minWidth={'80vw'}
                    margin={'size-200'}
                    gap={'size-300'}
                >
                    <Heading level={1}><Text>Groom Stories {username}</Text></Heading>
                    <Flex direction={'row'} alignItems='end' gap='size-115'>
                        { roles.has('admin') ? <UserAdmin user={user} minWidth='size-2000' /> : null }
                        <View flex />
                        { roles.has('voter') ? (
                            <Switch defaultSelected={hideMyVotes} onChange={setHideMyVotes}
                                value={hideMyVotes} minWidth={'size-1600'}>
                                Hide my votes
                            </Switch>
                        ) : null }
                    </Flex>
                    { stories?.map(({ id, ...props }) => (
                        <StoryItem key={keyMapping(id)} story={id} {...props} />
                    )) }
                    <AddStoryForm autoFocus />
                </Flex>
            </HideMyVoteContext.Provider>
        </Fragment>
    )
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
    const { space, roles } = useContext(SpaceContext)

    const fallbackData = { vote: null, voteSnapshot: [], count: 0, total: 0 }
    const { data: {
        vote,
        voteSnapshot,
        revealed,
        count: votedCount,
        total: totalVoters,
    }, mutate } = useSWR(`stories:${story}:vote`, async () => {
        if (story.startsWith('local-')) {
            return fallbackData
        }

        const response = await fetch(`/api/s/${space}/stories/${story}/vote`)
        return await response.json()
    }, {
        refreshInterval: 1000,
        fallbackData,
    })

    const hideMyVotes = useContext(HideMyVoteContext)

    const voteCounts = voteSnapshot.reduce((counts, vote) => Object.assign(counts, {
        [vote]: (counts[vote] || 0) + 1,
        max: Math.max((counts[vote] || 0) + 1, counts.max),
    }), { max: 1 })

    const voteHeightMaxPx = 40
    const voteHeightScalePx = 37

    function voteHeightPx(ivote) {
        return (voteCounts[ivote] || 0) * voteHeightScalePx / Math.max(totalVoters, 1) + 1
    }

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
                    <View width={'size-0'} height={`${voteHeightMaxPx}px`} />
                    { [...storySizes, 'abstain'].map(ivote => (
                        <View key={`vote-count-${ivote}`}
                            position='relative'
                            minWidth={'size-600'}
                            backgroundColor={'gray-500'}
                            UNSAFE_style={{
                                transition: 'min-height 1s ease',
                            }}
                            minHeight={`${voteHeightPx(ivote)}px`} >
                            <View position={'absolute'} bottom='size-0'>
                                <ToggleButton position={'absolute'}
                                    isSelected={vote === String(ivote) && !hideMyVotes}
                                    isDisabled={!roles.has('voter') || revealed}
                                    onPress={async () => {
                                        mutate(({ ...data }) => ({ ...data, vote: ivote }), false)
                                        await fetch(`/api/s/${space}/stories/${story}/vote`, {
                                            method: 'put',
                                            body: new URLSearchParams({ vote: ivote }),
                                        })
                                        mutate()
                                    }}
                                    type='button'
                                    height={'size-600'}
                                    width={'size-600'}
                                    top={'size-50'}
                                >{ivote === 'abstain' ? '?' : ivote}</ToggleButton>
                            </View>
                        </View>
                    ))}
                    <View flex/>
                    <Flex direction='column'>
                        { roles.has('admin') ? (<>
                            <Switch
                                onChange={value => mutate(async () => {
                                    return fetch(`/api/s/${space}/stories/${story}/vote/reveal`, {
                                        method: value ? 'put' : 'delete',
                                    })
                                }, {
                                    populateCache: false,
                                    rollbackOnError: true,
                                    optimisticData: data => ({
                                        ...data,
                                        revealed: value,
                                    }),
                                })}
                                isSelected={revealed}
                            >Reveal and lock votes?</Switch>
                        </>) : null }
                        <View>{votedCount}/{totalVoters} voted</View>
                    </Flex>
                </Flex>
            </Content>
            <DeleteStoryButton story={story} title={title} position={'absolute'} top={'size-0'} right={'size-0'} />
            <EditStoryButton story={story} title={title} position={'absolute'} top={'size-0'} left={'size-0'} />
        </Well>
    )
}
