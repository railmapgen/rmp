import {
    Badge,
    Button,
    Input,
    Modal,
    ModalBody,
    ModalCloseButton,
    ModalContent,
    ModalFooter,
    ModalHeader,
    ModalOverlay,
    Stack,
    Text,
    Tooltip,
} from '@chakra-ui/react';
import { RmgLineBadge } from '@railmapgen/rmg-components';
import { MonoColour } from '@railmapgen/rmg-palette-resources';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { MdDownload } from 'react-icons/md';
import { exportToRmg, newParamTemplate, ToRmg, toRmg } from '../../util/to-rmg';

const TYPE_COLOR: { [k in 'LINE' | 'BRANCH' | 'LOOP']: `#${string}` } = {
    LINE: '#33ccff',
    BRANCH: '#007B61',
    LOOP: '#ff6666',
};

export const ToRmgModal = (props: { isOpen: boolean; onClose: () => void }) => {
    const { isOpen, onClose } = props;
    const { t } = useTranslation();
    const graph = React.useRef(window.graph);
    const [isToRmgEndSelectOpen, setIsToRmgEndSelectOpen] = React.useState(false);

    const [paramArr, setParamArr] = React.useState<ToRmg['param']>([[newParamTemplate, '', '']]);
    const [nameArr, setNameArr] = React.useState<[string, string, string]>(['', '', '']);

    const [toRmgRes, setToRmgRes] = React.useState<ToRmg[]>([]);
    React.useEffect(() => {
        if (isOpen) setToRmgRes(toRmg(graph.current));
    }, [isOpen]);

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="2xl" scrollBehavior="inside">
            <ModalOverlay />
            <ModalContent>
                <ModalHeader>
                    <Text as="b" fontSize="xl">
                        {t('header.download.2rmg.title')}
                    </Text>
                </ModalHeader>
                <ModalCloseButton />

                <ModalBody>
                    <Text fontSize="sm" mt="3" lineHeight="100%">
                        {t('header.download.2rmg.info1')}
                    </Text>
                    <Text fontSize="sm" mt="3" lineHeight="100%">
                        {t('header.download.2rmg.info2')}
                    </Text>
                    <br />
                    {toRmgRes.length === 0 ? (
                        <Text fontSize="md">{t('header.download.2rmg.noline')}</Text>
                    ) : (
                        <table>
                            {toRmgRes.map(({ theme, param, type }) => (
                                <tr key={JSON.stringify(theme)}>
                                    <td>
                                        <RmgLineBadge
                                            name={theme[0] == 'other' && theme[1] == 'other' ? theme[2] : theme[1]}
                                            bg={theme[2]}
                                            fg={theme[3]}
                                        />
                                    </td>
                                    <td>
                                        <Input
                                            placeholder={t('header.download.2rmg.placeholder.chinese')}
                                            id={'nameCh_' + JSON.stringify(theme)}
                                            size="sm"
                                        />
                                    </td>
                                    <td>
                                        <Input
                                            placeholder={t('header.download.2rmg.placeholder.english')}
                                            id={'nameEn_' + JSON.stringify(theme)}
                                            size="sm"
                                        />
                                    </td>
                                    <td>
                                        <Input
                                            placeholder={t('header.download.2rmg.placeholder.lineCode')}
                                            id={'lineNum_' + JSON.stringify(theme)}
                                            size="sm"
                                        />
                                    </td>
                                    <td>
                                        <RmgLineBadge
                                            name={t(`header.download.2rmg.type.${type.toLowerCase()}`)}
                                            bg={TYPE_COLOR[type]}
                                            fg={MonoColour.white}
                                        />
                                    </td>
                                    <td>
                                        <Button
                                            colorScheme="blue"
                                            variant="ghost"
                                            mr="1"
                                            onClick={() => {
                                                const chName = document.getElementById(
                                                    'nameCh_' + JSON.stringify(theme)
                                                ) as HTMLInputElement;
                                                const enName = document.getElementById(
                                                    'nameEn_' + JSON.stringify(theme)
                                                ) as HTMLInputElement;
                                                const lineNum = document.getElementById(
                                                    'lineNum_' + JSON.stringify(theme)
                                                ) as HTMLInputElement;
                                                setParamArr(param);
                                                setNameArr([
                                                    chName.value.trim(),
                                                    enName.value.trim(),
                                                    lineNum.value.trim(),
                                                ]);
                                                setIsToRmgEndSelectOpen(true);
                                            }}
                                            size="sm"
                                        >
                                            <MdDownload />
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                        </table>
                    )}
                </ModalBody>

                <ModalFooter>
                    <Button colorScheme="blue" variant="outline" mr="1" onClick={onClose}>
                        {t('close')}
                    </Button>
                </ModalFooter>
            </ModalContent>
            <ToRmgEndSelectModal
                isOpen={isToRmgEndSelectOpen}
                onClose={() => setIsToRmgEndSelectOpen(false)}
                param={paramArr}
                nameList={nameArr}
            />
        </Modal>
    );
};

export const ToRmgEndSelectModal = (props: {
    isOpen: boolean;
    onClose: () => void;
    param: ToRmg['param'];
    nameList: [string, string, string];
}) => {
    const { isOpen, onClose, param, nameList } = props;
    const { t } = useTranslation();

    const [title, setTitle] = React.useState('');
    React.useEffect(() => {
        if (nameList[0] != '' && nameList[1] != '') setTitle(nameList[0] + '/' + nameList[1]);
        else if (nameList[0] != '') setTitle(nameList[0]);
        else if (nameList[1] != '') setTitle(nameList[1]);
    }, [...nameList]);

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="md" scrollBehavior="inside">
            <ModalOverlay />
            <ModalContent>
                <ModalHeader>
                    <Text as="b" fontSize="xl">
                        {t('header.download.2rmg.download')} {title}
                    </Text>
                </ModalHeader>
                <ModalCloseButton />

                <ModalBody>
                    <Stack>
                        <Text fontSize="sm" mb="2" lineHeight="100%">
                            {t('header.download.2rmg.downloadInfo')}
                        </Text>
                        {param.map(([newParam, name1, name2]) => (
                            <Button
                                key={`${name1}${name2}`}
                                onClick={() => {
                                    exportToRmg(newParam, [nameList[0], nameList[1]], nameList[2]);
                                }}
                            >
                                {name1}/{name2}
                            </Button>
                        ))}
                    </Stack>
                </ModalBody>

                <ModalFooter>
                    <Button colorScheme="blue" variant="outline" mr="1" onClick={onClose}>
                        {t('close')}
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
};
