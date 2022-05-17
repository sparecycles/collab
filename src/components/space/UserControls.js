import {
    ActionButton,
    ButtonGroup,
    Content,
    Dialog,
    DialogContainer,
    Divider,
    Flex,
    Heading,
    ProgressCircle,
    Text,
    useDialogContainer,
    View,
    Button,
} from '@adobe/react-spectrum'
import { MenuTrigger, Menu, Item } from '@react-spectrum/menu'
import Devices from '@spectrum-icons/workflow/Devices'
import PeopleGroup from '@spectrum-icons/workflow/PeopleGroup'
import ShowMenu from '@spectrum-icons/workflow/ShowMenu'
import PropTypes from 'lib/common/react-util/prop-types'
import { toDataURL } from 'qrcode'
import { useContext, useEffect, useMemo, useRef, useState } from 'react'
import useSWR from 'swr'
import SpaceContext from './SpaceContext'

UserControls.propTypes = {
    user: PropTypes.string.isRequired,
}

export default function UserControls({ user, ...props }) {
    const [dialog, setDialog] = useState(null)

    const actions = {
        qr() { setDialog(<XferQrDialog />) },
        another() { setDialog(<AnotherDialog />) },
    }

    return (
        <View>
            <MenuTrigger trigger='press' closeOnSelect>
                <ActionButton aria-label='Crop tool' {...props} zIndex={1}>
                    <ShowMenu />
                </ActionButton>
                <Menu onAction={action => actions[action]()}>
                    <Item key={'qr'} textValue={'Transfer Session'} >
                        <Devices size='XXL'/>
                        <Text>{'Transfer Session'}</Text>
                    </Item>
                    <Item key={'another'} textValue={'Add another User'} >
                        <PeopleGroup size='XXL'/>
                        <Text>{'Add another user'}</Text>
                    </Item>
                </Menu>
            </MenuTrigger>
            <DialogContainer type={'modal'} onDismiss={() => setDialog(null)}>
                { dialog }
            </DialogContainer>
        </View>
    )
}

function XferQrDialog() {
    const { space } = useContext(SpaceContext)
    const [qrUrl, setQrUrl] = useState('')
    const [xferId, setXferId] = useState()
    const xferIdRef = useRef()
    const swrKey = useRef(`xfer-${Date.now()}`)

    xferIdRef.current = xferId

    const { data: xferUsed } = useSWR(swrKey.current, async () => {
        if (!xferIdRef.current) {
            return false
        }

        const status = (await fetch(`/api/xfer/${xferIdRef.current}`)).status

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

            const link = document.createElement('a')
            link.href = `/xfer/${xfer}`
            toDataURL(link.href, (_error, url) => {
                setQrUrl(url)
            })
        })()
    }, [space])

    /* eslint-disable @next/next/no-img-element */
    return (
        <Dialog isDismissable>
            <Heading>Open Session on another Device</Heading>
            <Divider />
            <Content>
                { !qrUrl ? (<ProgressCircle isIndeterminate/>) : (
                    <Flex direction={'column'} alignItems={'center'}>
                        <Flex direction={'row'}><img src={qrUrl} alt={`qr code`} /></Flex>
                        <code><a href={`/xfer/${xferId}`}>{ xferId }</a></code>
                    </Flex>
                )}
            </Content>
        </Dialog>
    )
}

function AnotherDialog() {
    const [qrUrl, setQrUrl] = useState('')

    useEffect(() => {
        (async () => {
            const link = document.createElement('a')

            link.href = ``

            toDataURL(link.href, (error, url) => {
                setQrUrl(url)
            })
        })()
    }, [])

    /* eslint-disable @next/next/no-img-element */
    return (
        <Dialog isDismissable>
            <Heading>Add another user</Heading>
            <Divider />
            <Content>
                { !qrUrl ? (<ProgressCircle isIndeterminate/>) : (
                    <Flex direction={'column'} alignItems={'center'}>
                        <Flex direction={'row'}><img src={qrUrl} alt={`qr code`} /></Flex>
                    </Flex>
                )}
            </Content>
        </Dialog>
    )
}
