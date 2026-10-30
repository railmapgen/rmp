import { useTranslation } from 'react-i18next';
import {
    Icon,
    Link,
    ListItem,
    Modal,
    ModalOverlay,
    ModalContent,
    ModalHeader,
    ModalCloseButton,
    ModalBody,
    OrderedList,
} from '@chakra-ui/react';
import { MdOpenInNew } from 'react-icons/md';

const TermsAndConditionsModal = (props: { isOpen: boolean; onClose: () => void }) => {
    const { isOpen, onClose } = props;
    const { t } = useTranslation();

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="xl" scrollBehavior="inside">
            <ModalOverlay />
            <ModalContent>
                <ModalHeader>{t('header.download.termsAndConditions')}</ModalHeader>
                <ModalCloseButton />

                <ModalBody>
                    <OrderedList>
                        <ListItem>
                            The layout of the elements on the signage or rail map, is designed by{' '}
                            <Link color="teal.500" href="https://www.shmetro.com/" isExternal={true}>
                                Shanghai Shentong Metro Group <Icon as={MdOpenInNew} />
                            </Link>
                            {', '}
                            <Link color="teal.500" href="https://www.gzmtr.com/" isExternal={true}>
                                Guangzhou Metro Group <Icon as={MdOpenInNew} />
                            </Link>
                            {' or '}
                            <Link color="teal.500" href="https://www.mtr.com.hk/" isExternal={true}>
                                MTR Corporation <Icon as={MdOpenInNew} />
                            </Link>
                            , depending on your selection. You shall grant appropriate permit or license from the
                            relevant company above before using the generated images for commercial purposes, if it is
                            required to do so.
                            <br />
                            标志版或路线图的元素或布局，基于你所选择的风格，为
                            <Link color="teal.500" href="https://www.shmetro.com/" isExternal={true}>
                                上海申通地铁集团 <Icon as={MdOpenInNew} />
                            </Link>
                            ，
                            <Link color="teal.500" href="https://www.gzmtr.com/" isExternal={true}>
                                广州地铁集团公司 <Icon as={MdOpenInNew} />
                            </Link>
                            或
                            <Link color="teal.500" href="https://www.mtr.com.hk/" isExternal={true}>
                                港铁公司 <Icon as={MdOpenInNew} />
                            </Link>
                            所设计。在产生的图像用作商业用途前，你应向相关公司取得适当之许可证或授权。
                        </ListItem>
                        <ListItem>
                            The elements including shapes and lines on the image are drawn by{' '}
                            <Link color="teal.500" href="https://www.github.com/thekingofcity" isExternal={true}>
                                thekingofcity <Icon as={MdOpenInNew} />
                            </Link>
                            {' and '}
                            <Link color="teal.500" href="https://www.github.com/wongchito" isExternal={true}>
                                Chito Wong <Icon as={MdOpenInNew} />
                            </Link>
                            , based on the design standards or rules of the companies listed above. You may use them for
                            any purposes, but it is recommended to state the name and the link of software alongside.
                            <br />
                            图像的元素，包括图形及线条，均由
                            <Link color="teal.500" href="https://www.github.com/thekingofcity" isExternal={true}>
                                thekingofcity <Icon as={MdOpenInNew} />
                            </Link>
                            及
                            <Link color="teal.500" href="https://www.github.com/wongchito" isExternal={true}>
                                Chito Wong <Icon as={MdOpenInNew} />
                            </Link>
                            基于上述公司设计标准或准则绘制。你可将其用于任何目的，但我们建议你于使用同时附以我们的名字以及本网站地址。
                        </ListItem>
                        <ListItem>
                            Due to copyright, licensing and other legal restrictions, Rail Map Painter uses{' '}
                            <Link color="teal.500" href="https://github.com/ButTaiwan/genyo-font" isExternal={true}>
                                GenYoMin provided by ButTaiwan <Icon as={MdOpenInNew} />
                            </Link>
                            , and Vegur instead of MTRSung and Myriad Pro respectively to display and generate MTR-style
                            signage. You shall grant appropriate permit or license from the manufacturers before using
                            those generated images for commercial purposes.
                            <br />
                            由于著作权及其他法律限制，铁路路线图绘制器使用由
                            <Link color="teal.500" href="https://github.com/ButTaiwan/genyo-font" isExternal={true}>
                                ButTaiwan提供的源樣明體 <Icon as={MdOpenInNew} />
                            </Link>
                            ，以及Vegur，以代替港铁样式标志牌所使用的地铁宋及Myriad
                            Pro。在产生之图像用作商业用途前，你应向字型生产厂商取得适当之许可证或授权。
                        </ListItem>
                        <ListItem>
                            The exported images in PNG or SVG format may be modified, published, or used for other
                            purposes except commercial use, under the conditions above.
                            <br />
                            输出的PNG或SVG图像可基于上述条款，在非商业使用时，用于修改、发行或其他用途。
                        </ListItem>
                        <ListItem>
                            All flag emojis shown on Windows platforms are designed by{' '}
                            <Link color="teal.500" href="https://openmoji.org/" isExternal={true}>
                                OpenMoji <Icon as={MdOpenInNew} />
                            </Link>{' '}
                            – the open-source emoji and icon project. License:
                            <Link
                                color="teal.500"
                                href="https://creativecommons.org/licenses/by-sa/4.0/"
                                isExternal={true}
                            >
                                CC BY-SA 4.0 <Icon as={MdOpenInNew} />
                            </Link>
                            <br />
                            于Windows作业系统上显示的国旗Emoji为
                            <Link color="teal.500" href="https://openmoji.org/" isExternal={true}>
                                OpenMoji <Icon as={MdOpenInNew} />
                            </Link>
                            所设计。许可证：
                            <Link
                                color="teal.500"
                                href="https://creativecommons.org/licenses/by-sa/4.0/"
                                isExternal={true}
                            >
                                CC BY-SA 4.0 <Icon as={MdOpenInNew} />
                            </Link>
                        </ListItem>
                        <ListItem>
                            We reserve the rights, without prior notice, to modify, add, or remove these terms. The
                            Chinese translation is for reference only. In case of any discrepancy between the English
                            version and the Chinese version, the English version shall prevail.
                            <br />
                            我们保留修改、新增或移除上述条款之权利，而无需另行通知。中文译本仅供参考，文义如与英文有歧异，概以英文本为准。
                        </ListItem>
                    </OrderedList>
                </ModalBody>
            </ModalContent>
        </Modal>
    );
};

export default TermsAndConditionsModal;
