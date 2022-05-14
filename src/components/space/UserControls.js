import { ActionButton, Text } from '@adobe/react-spectrum'
import { MenuTrigger, Menu, Item } from '@react-spectrum/menu'
import CloneStamp from '@spectrum-icons/workflow/CloneStamp'
import CropRotate from '@spectrum-icons/workflow/CropRotate'
import ShowMenu from '@spectrum-icons/workflow/ShowMenu'
import Slice from '@spectrum-icons/workflow/Slice'
import PropTypes from 'lib/common/react-util/prop-types'

UserControls.propTypes = {
    user: PropTypes.string.isRequired,
}

export default function UserControls({ user, ...props }) {
    return (
        <MenuTrigger trigger='press'>
            <ActionButton aria-label='Crop tool' {...props} zIndex={1}>
                <ShowMenu />
            </ActionButton>
            <Menu>
                <Item textValue='Crop Rotate'>
                    <CropRotate size='XXL'/>
                    <Text>Crop Rotate</Text>
                </Item>
                <Item textValue='Slice'>
                    <Slice />
                    <Text>Slice</Text>
                </Item>
                <Item textValue='Clone stamp'>
                    <CloneStamp />
                    <Text>Clone Stamp</Text>
                </Item>
            </Menu>
        </MenuTrigger>
    )
}
