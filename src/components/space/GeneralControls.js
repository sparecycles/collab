import {
    useContext, useEffect, useRef, useState,
} from 'react'
import useSWR from 'swr'

import {
    ActionButton,
    Button,
    ButtonGroup,
    Content,
    Dialog,
    DialogContainer,
    Divider,
    Flex,
    Heading,
    Image,
    ProgressCircle,
    Text,
    View,
    Well,
    useDialogContainer,
    useProvider,
} from '@adobe/react-spectrum'
import {
    Item, Menu, MenuTrigger,
} from '@react-spectrum/menu'
import Delete from '@spectrum-icons/workflow/Delete'
import Devices from '@spectrum-icons/workflow/Devices'
import PeopleGroup from '@spectrum-icons/workflow/PeopleGroup'
import ShowMenu from '@spectrum-icons/workflow/ShowMenu'

import { useQrImage } from 'lib/client/qr'
import PropTypes from 'lib/common/react-util/prop-types'

import SpaceContext from './SpaceContext'

GeneralControls.propTypes = {
    user: PropTypes.string.isRequired,
}

const controls = [
    {
        id: 'qr',
        text: 'Transfer Session',
        icon: Devices,
        action({ setDialog }) { setDialog(<XferQrDialog />) },
    },
    {
        id: 'another',
        text: 'Add another User',
        icon: PeopleGroup,
        action({ setDialog }) { setDialog(<AnotherDialog />) },
    },
    {
        id: 'delete-room',
        text: 'Delete Room',
        icon: Delete,
        action({ setDialog }) { setDialog(<DeleteRoomDialog />) },
    },
]

export default function GeneralControls({ ...props }) {
    const [dialog, setDialog] = useState(null)

    const actions = controls.reduce((actions, { id, action }) => Object.assign(actions, {
        [id]: action,
    }), {})

    return (
        <View>
            <MenuTrigger trigger='press' closeOnSelect>
                <ActionButton aria-label='General Controls' {...props} zIndex={1}>
                    <ShowMenu />
                </ActionButton>
                <Menu onAction={(action) => { actions[action]({ setDialog }) }}>
                    { controls.map(({ id, icon: Icon, text }) => (
                        <Item key={id} textValue={text}>
                            <Icon/>
                            <Text>{text}</Text>
                        </Item>
                    )) }
                </Menu>
            </MenuTrigger>
            <DialogContainer type={'modal'} onDismiss={() => setDialog(null)}>
                { dialog }
            </DialogContainer>
        </View>
    )
}

function useQrCodeOptions() {
    const lightTheme = useProvider()?.colorScheme?.includes('light')

    return {
        margin: 2,
        scale: 7,
        lightColor: '#00000000', // transparent
        darkColor: lightTheme ? '#000' : '#aaa',
    }
}

function resolveHref(href) {
    const link = document.createElement('a')
    link.href = href
    return link.href
}

function XferQrDialog() {
    const { space } = useContext(SpaceContext)
    const [xferId, setXferId] = useState()
    const swrKey = useRef(`xfer-${Date.now()}`)

    const { data: xferUsed } = useSWR(swrKey.current, async () => {
        if (!xferId) {
            return false
        }

        const status = (await fetch(`/api/xfer/${xferId}`)).status

        return status === 404
    }, { refreshInterval: 1500 })

    const { dismiss } = useDialogContainer()

    useEffect(() => { if (xferUsed) dismiss() }, [xferUsed, dismiss])

    useEffect(() => {
        (async () => {
            const { xfer } = await (await fetch('/api/xfer', {
                method: 'POST',
                body: new URLSearchParams({ space }),
            })).json()

            setXferId(xfer)
        })()
    }, [space])

    const { url: qrUrl } = useQrImage({
        data: xferId && resolveHref(`/xfer/${xferId}`),
        ...useQrCodeOptions(),
    })

    /* eslint-disable @next/next/no-img-element */
    return (
        <Dialog isDismissable>
            <Heading>Open Session on another Device</Heading>
            <Divider />
            <Content>
                { !qrUrl ? (<ProgressCircle isIndeterminate/>) : (
                    <Flex direction={'column'} alignItems={'center'}>
                        <Well>
                            <Image src={qrUrl} alt={`qr code`} />
                        </Well>
                        <code><a href={`/xfer/${xferId}`}>{ xferId }</a></code>
                    </Flex>
                )}
            </Content>
        </Dialog>
    )
}

function AnotherDialog() {
    const { url: qrUrl } = useQrImage({
        data: resolveHref(''),
        ...useQrCodeOptions(),
    })

    /* eslint-disable @next/next/no-img-element */
    return (
        <Dialog isDismissable>
            <Heading>Add another user</Heading>
            <Divider />
            <Content>
                { !qrUrl ? (<ProgressCircle isIndeterminate/>) : (
                    <Flex direction={'column'} alignItems={'center'}>
                        <Well><Image src={qrUrl} alt={`qr code`} /></Well>
                    </Flex>
                )}
            </Content>
        </Dialog>
    )
}

function DeleteRoomDialog() {
    const { dismiss } = useDialogContainer()
    const { space } = useContext(SpaceContext)

    return (
        <Dialog>
            <Heading>Are you sure you want to delete the room?</Heading>
            <Divider/>
            <Content>
                Delete the room entirely.
            </Content>
            <ButtonGroup>
                <Button variant='primary' onPress={async () => {
                    const response = await fetch(`/api/s/${space}`, { method: 'DELETE' })
                    if (response.status >= 200 && response.status < 300) {
                        window.location = '/?space-deleted'
                    }
                    dismiss()
                }}>Yes, delete the room</Button>
                <Button variant='secondary' onPress={dismiss}>No, keep the room</Button>
            </ButtonGroup>
        </Dialog>
    )
}
