import React from 'react';
import { useTranslation } from 'react-i18next';
import {
    Modal,
    ModalBody,
    ModalCloseButton,
    ModalContent,
    ModalHeader,
    ModalOverlay,
    Text,
    Badge,
    Tooltip,
    ModalFooter,
    Button,
    Input,
} from '@chakra-ui/react';
import { RmgLineBadge } from '@railmapgen/rmg-components';
import { exportToRmg, toRmg } from '../../util/to-rmg';
import { MonoColour } from '@railmapgen/rmg-palette-resources';
import { MdDownload } from 'react-icons/md';

export const ToRmgModal = (props: { isOpen: boolean; onClose: () => void }) => {
    const { isOpen, onClose } = props;
    const { t } = useTranslation();
    const graph = React.useRef(window.graph);

    const toRmgRes = toRmg(graph.current);

    const outputLineName = (theme: any) => {
        if (theme[0] == 'other' && theme[1] == 'other') {
            return theme[2];
        } else {
            return theme[1];
        }
    };

    const outputLineType = (type: any) => {
        if (type == 'LOOP') {
            return <RmgLineBadge name="Loop" bg="#ff6666" fg={MonoColour.white} />;
        } else if (type == 'LINE') {
            return <RmgLineBadge name="Line" bg="#33ccff" fg={MonoColour.white} />;
        } else if (type == 'BRANCH') {
            return <RmgLineBadge name="Branch" bg="#007B61" fg={MonoColour.white} />;
        }
    };

    const outputForm = () => {
        const result = [];
        for (const [param, type] of toRmgRes) {
            const theme = param.theme;
            result.push(
                <tr>
                    <td>
                        <RmgLineBadge
                            name={outputLineName(structuredClone(theme))}
                            bg={structuredClone(theme[2])}
                            fg={structuredClone(theme[3])}
                        />
                    </td>
                    <td>
                        <Input
                            placeholder="Chinese Name"
                            id={'nameCh_' + theme[0] + theme[1] + theme[2] + theme[3]}
                            size="sm"
                        />
                    </td>
                    <td>
                        <Input
                            placeholder="English Name"
                            id={'nameEn_' + theme[0] + theme[1] + theme[2] + theme[3]}
                            size="sm"
                        />
                    </td>
                    <td>
                        <Input
                            placeholder="Line Code"
                            id={'lineNum_' + theme[0] + theme[1] + theme[2] + theme[3]}
                            size="sm"
                        />
                    </td>
                    <td>{outputLineType(type)}</td>
                    <td>
                        <Button
                            colorScheme="blue"
                            variant="ghost"
                            mr="1"
                            onClick={() => {
                                const chName = document.getElementById(
                                    'nameCh_' + theme[0] + theme[1] + theme[2] + theme[3]
                                ) as HTMLInputElement;
                                const enName = document.getElementById(
                                    'nameEn_' + theme[0] + theme[1] + theme[2] + theme[3]
                                ) as HTMLInputElement;
                                const lineNum = document.getElementById(
                                    'lineNum_' + theme[0] + theme[1] + theme[2] + theme[3]
                                ) as HTMLInputElement;
                                exportToRmg(
                                    structuredClone(param),
                                    [chName.value as string, enName.value as string],
                                    lineNum.value as string
                                );
                            }}
                            size="sm"
                        >
                            <MdDownload />
                        </Button>
                    </td>
                </tr>
            );
        }
        return result;
    };

    const outputContent = () => {
        if (toRmgRes.length != 0) return <table>{outputForm()}</table>;
        else return <Text fontSize="md">No available lines found.</Text>;
    };

    /*
Chinese
本功能旨在将RMP保存文件转化为RMG保存文件。以下列表中的线路即为可以转化的线路。您可以在左侧的文本框中输入中文线路名称，在中间的输入英文线路名称，在右侧输入线路编号（供广州地铁样式使用），然后点击右侧下载按钮保存您的RMG保存文件。
    */

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="2xl" scrollBehavior="inside">
            <ModalOverlay />
            <ModalContent>
                <ModalHeader>
                    <Text as="b" fontSize="xl">
                        Generate RMG Saves
                    </Text>
                    <Tooltip label={t('header.settings.pro')}>
                        <Badge ml="1" color="gray.50" background="radial-gradient(circle, #3f5efb, #fc466b)">
                            TEST
                        </Badge>
                    </Tooltip>
                </ModalHeader>
                <ModalCloseButton />

                <ModalBody>
                    <Text fontSize="sm" mt="3" lineHeight="100%">
                        This function is designed to convert RMP saves into RMG saves.
                    </Text>
                    <Text fontSize="sm" mt="3" lineHeight="100%">
                        The lines in the list following are the available lines for converting. You can enter the
                        Chinese line name in the text box on the left, the English line name in the middle, the line
                        code (for Guangzhou Metro style) on the right, and then click the download button on the right
                        to save your RMG saves.
                    </Text>
                    <br />
                    {outputContent()}
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
