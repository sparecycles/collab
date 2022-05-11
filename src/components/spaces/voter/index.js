import { createContext, Fragment, useContext, useRef, useState } from 'react'
import useSWR from 'swr'
import { useLongPress } from '@react-aria/interactions'
import { mergeProps } from '@react-aria/utils'
import { unwrapDOMRef } from '@react-spectrum/utils'
import {
    Content,
    Flex,
    Form,
    Heading,
    RangeSlider,
    Slider,
    Switch,
    Text,
    TextField,
    useProvider,
    Well,
} from '@adobe/react-spectrum'
import { useLayoutEffect } from '@react-aria/utils'
import { ClearButton } from '@react-spectrum/button'
import { range } from './math'

import { useDeleteListItem, useEditListItem } from 'lib/client/data/util/list-data'
import { useKeyMapping } from 'lib/client/data/util/key-mapping-context'
import SpaceContext from 'components/space/SpaceContext'
import GraphBullet from '@spectrum-icons/workflow/GraphBullet'
import apiStructures from 'lib/server/api/api-structures'
import PropTypes from 'lib/common/react-util/prop-types'
import scheme from 'lib/server/redis-util/scheme'
import userSessionSchema from 'lib/server/data/schemas/user-session'

/** @type {import('lib/common/spaces').SpaceChoice} */
export const choice = {
    icon: (<GraphBullet size={'XL'}/>),
    text: 'Voter',
    description: 'Groom Stories with Voter',
    order: 0,
}

export const roles = {
    user: ['voter'],
    creator: ['voter', 'admin'],
}

const voterScheme = {
    spaces: space => ({
        path: () => `spaces:${space}`,
        stories: scheme.hashList(`spaces:${space}:stories`),
        users: user => ({
            votes: () => scheme.hash(`spaces:${space}:users:${user}:votes`),
        }),
    }),
}

function roleContext(...checks) {
    return ({ context: { roles } }) => checks.every(role => typeof role === 'string'
        ? roles.has(role)
        : role(roles)
    )
}

function requireRoleContext(...checks) {
    return ({ context }, res) => {
        const satisified = checks.map(check => typeof check === 'string'
            ? context[check]
            : check(context)
        ).every(Boolean)

        if (!satisified) {
            res.status(404).end(`not authorized`)
        }
    }
}

/** @type {import('lib/common/spaces').ApiMap<{ context: { user: string, roles: Set<string> } }>} */
export const api = {
    $context: {
        user({ query: { space, session } }) {
            return userSessionSchema.spaces(space).sessions(session).get('user')
        },
        async roles({ query: { space, session } }) {
            return new Set(await userSessionSchema.spaces(space).sessions(session).roles().getMembers('user'))
        },
        userinfo({ context: { user }, query: { space } }) {
            return userSessionSchema.spaces(space).users(user).getAll()
        },
        allUsers({ query: { space } }) {
            return userSessionSchema.spaces(space).users().getAllItems()
        },
        adminRole: roleContext('admin'),
    },
    users: {
        $inherited: { $get: requireRoleContext('adminRole') },
        $get({ context: { allUsers } }, res) {
            return res.json(allUsers)
        },
        '[userId]': {
            $delete({ query: { space, userId } }, res) {
                userSessionSchema.spaces(space).users(userId).del()
                return res.status(204).end()
            },
        },
    },
    stories: apiStructures?.hashList?.(({ space }) => voterScheme.spaces(space).stories(), '[story]', {
        /** @type {import('lib/common/spaces').ApiMap<{ context: { user: string, roles: Set<string> } }>} */
        '[story]': {
            vote: {
                async $put({ body, context: { user }, query: { space, story } }, res) {
                    const { vote } = body
                    voterScheme.spaces(space).users(user).votes().set({ [story]: vote })
                    res.status(204).end()
                },
                async $get({ context: { user }, query: { space, story } }, res) {
                    const allUserIds = await userSessionSchema.spaces(space).users().getMembers()

                    const otherUsers = allUserIds.filter(id => id !== user)

                    let [vote, otherVotes] = await Promise.all([
                        voterScheme.spaces(space).users(user).votes().get(story),
                        Promise.all(otherUsers.map(async other =>
                            (await voterScheme.spaces(space).users(other).votes().get(story)) || 3
                        )),
                    ])

                    vote = Number(vote || 3)
                    otherVotes = otherVotes.map(Number)

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
        stories: await voterScheme.spaces(space).stories().allItems(),
    } }
}

function UserAdmin() {
    const { space } = useContext(SpaceContext)

    const {
        data: allUsers,
        mutate,
    } = useSWR('all-users', async () => (await fetch(`/api/s/${space}/users`)).json())

    return (
        <Flex>
            { Object.entries(allUsers || {}).sort()
                .map(([id, { username }]) => (
                    <Well key={id} position='relative'>
                        {username}
                        <ClearButton position={'absolute'} top={'-7px'} right={'-7px'} onPress={async () => {
                            await fetch(`/api/s/${space}/users/${id}`, { method: 'delete' })
                            mutate()
                        }} />
                    </Well>
                ))
            }
        </Flex>
    )
}

Voter.propTypes = {
    space: PropTypes.string.isRequired,
    stories: PropTypes.arrayOf(PropTypes.shape({
        id: PropTypes.string,
    })).isRequired,
}

const ShowVoteContext = createContext()

export default function Voter({ space, roles, stories: initialStories, userinfo: { username } }) {
    let { data: stories } = useSWR('stories', async () => (await fetch(`/api/s/${space}/stories`)).json(), {
        fallbackData: initialStories,
        refreshInterval: 1000,
    })

    let hasRole = Set.prototype.has.bind(useRef(new Set(roles)).current)

    const keyMapping = useKeyMapping()

    const [showVotes, setShowVotes] = useState(true)

    return (
        <Fragment>
            <ShowVoteContext.Provider value={showVotes}>
                <Flex
                    direction={'column'}
                    alignSelf={'center'}
                    minWidth={'80vw'}
                    margin={'size-200'}
                    gap={'size-300'}
                    position={'relative'}
                >
                    <Switch label='show vote' position={'absolute'} top='size-130' right='size-130'
                        defaultSelected onChange={setShowVotes} value={showVotes}/>
                    <Heading level={1}><Text>Groom Stories {username}</Text></Heading>
                    { hasRole('admin') ? <UserAdmin/> : null }
                    { stories?.map(({ id, ...props }) => (
                        <StoryItem key={keyMapping(id)} story={id} {...props} />
                    )) }
                    <StoryEditItem/>
                </Flex>
            </ShowVoteContext.Provider>
        </Fragment>
    )
}

DeleteStoryButton.propTypes = {
    story: PropTypes.string.isRequired,
}

function DeleteStoryButton({ story, ...props }) {
    return <ClearButton {...props} onPress={useDeleteListItem('stories', { id: story })} />
}

const storyTitleOffsetPx = -4
const storySizes = [1, 2, 3, 5, 8, 13, 13]
const storyMin = storySizes[0]
const storyMax = storySizes[storySizes.length - 1]

const goldenRatio = (Math.sqrt(5) + 1) / 2
const goldenRatioInv = goldenRatio - 1
function closestStorySize(value) {
    return storySizes.find((s, i, ss) => value <= (ss[i + 1] * (goldenRatioInv) + s) / goldenRatio) || storyMax
}

StoryDisplayItem.propTypes = {
    story: PropTypes.string.isRequired,
    title: PropTypes.string,
    setEditMode: PropTypes.func.isRequired,
}

function StoryDisplayItem({ story, title, setEditMode }) {
    const { space } = useContext(SpaceContext)
    const { longPressProps } = useLongPress({
        onLongPress(_event) {
            setEditMode(true)
        },
    })

    const { data: { vote, otherVotes }, mutate } = useSWR(`stories:${story}:vote`, async () => {
        const response = await fetch(`/api/s/${space}/stories/${story}/vote`)
        const { vote, otherVotes } = await response.json()
        return { vote, otherVotes }
    }, { refreshInterval: 1000, fallbackData: { vote: 3, otherVotes: [] } })

    const {
        low, high,
    } = range(...otherVotes, vote, vote)

    const consensus = {
        start: low,
        end: high,
    }

    const gradient = {
        start: Math.min(vote, consensus.start),
        end: Math.max(vote, consensus.end),
    }

    const lightTheme = useProvider()?.colorScheme?.includes('light')

    function percent(s) {
        const ratio = (s - storyMin) / (storyMax - storyMin)

        return `${Math.min(Math.max(0, ratio), 1) * 100}%`
    }

    const showVotes = useContext(ShowVoteContext)

    return (
        <div {...longPressProps}>
            <Well position={'relative'}>
                <Content position={'relative'} top={`${storyTitleOffsetPx}px`}>{title}</Content>
                <RangeSlider position={'absolute'} left={'10%'} top={'-17.5px'} minValue={storyMin} maxValue={storyMax}
                    width={'80vw'}
                    value={{ start: closestStorySize(consensus.start), end: closestStorySize(consensus.end) }}
                    isDisabled
                    label={<Flex width={'size-500'} justifyContent={'end'}>Size</Flex>}
                    labelPosition={'side'}
                />
                <Slider isHidden={!showVotes}
                    position={'absolute'}
                    left={'10%'}
                    bottom={'0'}
                    width={'80vw'}
                    value={vote}
                    minValue={storyMin}
                    maxValue={storyMax}
                    onChange={vote => {
                        mutate({ vote, otherVotes }, false)
                    }}
                    onBlur={() => {
                        mutate()
                    }}
                    label={<Flex width={'size-500'} justifyContent={'end'}>Vote</Flex>}
                    labelPosition={'side'}
                    /* extra spaces are to align label sizes */
                    getValueLabel={value => `${closestStorySize(value)}${' '.repeat(5)}`}
                    onChangeEnd={async value => {
                        const closest = closestStorySize(value)
                        mutate({ vote: closest, otherVotes }, false)
                        await fetch(`/api/s/${space}/stories/${story}/vote`, {
                            method: 'put',
                            body: new URLSearchParams({ vote: closest }),
                        })
                        mutate()
                    }}
                    trackGradient={lightTheme || false ? [
                        `rgba(0, 0, 0, 0.0) ${percent(gradient.start)}`,
                        `rgba(180, 180, 180, 0.5) ${percent((gradient.start * 3 + gradient.end) / 4)}`,
                        `rgba(180, 180, 180, 1.0) ${percent((gradient.start + gradient.end) / 2)}`,
                        `rgba(180, 180, 180, 0.5) ${percent((gradient.start + gradient.end * 3) / 4)}`,
                        `rgba(0, 0, 0, 0.0) ${percent(gradient.end)}`,
                    ] : [
                        `rgba(0, 0, 0, 0.0) ${percent(gradient.start)}`,
                        `rgba(128, 128, 128, 0.5) ${percent((gradient.start * 3 + gradient.end) / 4)}`,
                        `rgba(128, 128, 128, 1.0) ${percent((gradient.start + gradient.end) / 2)}`,
                        `rgba(128, 128, 128, 0.5) ${percent((gradient.start + gradient.end * 3) / 4)}`,
                        `rgba(0, 0, 0, 0.0) ${percent(gradient.end)}`,
                    ]}
                />
                <DeleteStoryButton story={story} position={'absolute'} top={'-7px'} right={'-7px'}/>
            </Well>
        </div>
    )
}

StoryItem.propTypes = {
    story: PropTypes.string.isRequired,
    title: PropTypes.string,
}

function StoryItem({ story, title }) {
    const [editMode, setEditMode] = useState(false)

    if (editMode) {
        return (<StoryEditItem
            autofocus
            autocommit
            title={title}
            story={story}
            afterMutate={() => setEditMode(false)}
        />)
    } else {
        return <StoryDisplayItem story={story} title={title} setEditMode={setEditMode} />
    }
}

StoryEditItem.propTypes = {
    story: PropTypes.string,
    autofocus: PropTypes.bool,
    autocommit: PropTypes.bool,
    afterMutate: PropTypes.func,
    title: PropTypes.string,
}

function StoryEditItem({
    story,
    autofocus,
    autocommit,
    afterMutate = Function.prototype,
    title: initialTitle = '',
    ...props
}) {
    const [title, setTitle] = useState(initialTitle)
    const form = useRef()
    const field = useRef()
    const autoCommitCancelled = useRef(false)

    useLayoutEffect(() => autofocus && field.current?.focus?.())

    if (autocommit) {
        props = mergeProps(props, {
            /** @type {import('react').FocusEventHandler} */
            onBlur(event) {
                if (autoCommitCancelled.current) {
                    autoCommitCancelled.current = false
                    afterMutate()
                    return
                }

                // fake a submit so that uncommitted changes also take effect
                unwrapDOMRef(form)?.current?.dispatchEvent(new SubmitEvent('submit', {
                    submitter: event.target,
                    bubbles: true,
                    cancelable: true,
                }))
            },
            /** @type {import('react').KeyboardEventHandler} */
            onKeyDown(event) {
                if (event.key === 'Escape') {
                    autoCommitCancelled.current = true
                    event.target.blur()
                }
            },
        })
    }

    const onSubmit = useEditListItem('stories', {
        id: story,
        validate({ title }) {
            return Boolean(title)
        },
        afterMutate() {
            setTitle('')
            afterMutate()
        },
    })

    return (
        <Well>
            <Form ref={form} isQuiet onSubmit={onSubmit}>
                <TextField ref={field} margin={'size-0'} marginBottom={'-11px'}
                    position={'relative'}
                    top={`${-4 + storyTitleOffsetPx}px`}
                    name={'title'}
                    aria-label={'Story Title'}
                    placeholder={'Enter a story for Grooming'}
                    onChange={setTitle}
                    value={title}
                    {...props} />
            </Form>
        </Well>
    )
}
