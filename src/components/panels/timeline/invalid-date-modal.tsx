import {
    Box,
    Button,
    HStack,
    Input,
    Modal,
    ModalBody,
    ModalCloseButton,
    ModalContent,
    ModalFooter,
    ModalHeader,
    ModalOverlay,
    Text,
    VStack,
} from '@chakra-ui/react';
import React from 'react';
import { useTranslation } from 'react-i18next';

interface InvalidEntry {
    /** Action row id (undefined for unsaved form data) */
    id?: string;
    /** The invalid date value */
    date: string;
    /** Context description (e.g. "动作 #3", "新动作输入框") */
    context: string;
}

interface InvalidDateModalProps {
    isOpen: boolean;
    invalidEntries: InvalidEntry[];
    onClearOne: (id: string | undefined) => void;
    onClearAll: () => void;
    onFix: (id: string | undefined, newDate: string) => void;
    onClose: () => void;
}

export default function InvalidDateModal(props: InvalidDateModalProps) {
    const { isOpen, invalidEntries, onClearOne, onClearAll, onFix, onClose } = props;
    const { t } = useTranslation();

    // Track inline edit state for each entry (keyed by id or index)
    const [editValues, setEditValues] = React.useState<Record<string, string>>({});
    const [savedIndices, setSavedIndices] = React.useState<Set<string>>(new Set());

    const getKey = (entry: InvalidEntry, index: number) => entry.id ?? `unsaved-${index}`;

    const remainingCount = invalidEntries.filter((entry, i) => !savedIndices.has(getKey(entry, i))).length;

    const handleFix = (entry: InvalidEntry, index: number) => {
        const key = getKey(entry, index);
        const newDate = editValues[key];
        if (newDate && /^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/.test(newDate)) {
            onFix(entry.id, newDate);
            setSavedIndices(prev => new Set(prev).add(key));
        }
    };

    const handleClearOne = (entry: InvalidEntry, index: number) => {
        const key = getKey(entry, index);
        onClearOne(entry.id);
        setSavedIndices(prev => new Set(prev).add(key));
    };

    const handleClearAll = () => {
        onClearAll();
        onClose();
    };

    // Reset state when modal opens
    React.useEffect(() => {
        if (isOpen) {
            setEditValues({});
            setSavedIndices(new Set());
        }
    }, [isOpen]);

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="lg" scrollBehavior="inside">
            <ModalOverlay />
            <ModalContent>
                <ModalHeader>{t('timeline.action.invalidDateTitle', '无效日期格式')}</ModalHeader>
                <ModalCloseButton />
                <ModalBody>
                    <Text fontSize="sm" mb={3} color="gray.600">
                        {t(
                            'timeline.action.invalidDateDescription',
                            '以下日期不符合 YYYY-MM-DD 或 YYYY/MM/DD 格式（支持 1-2 位月/日），请修正或清空：'
                        )}
                    </Text>
                    {remainingCount === 0 ? (
                        <Text color="green.500" fontWeight="bold">
                            {t('timeline.action.allDatesFixed', '所有日期已处理 ✓')}
                        </Text>
                    ) : (
                        <VStack align="stretch" spacing={3}>
                            {invalidEntries.map((entry, index) => {
                                const key = getKey(entry, index);
                                if (savedIndices.has(key)) return null;
                                return (
                                    <Box
                                        key={key}
                                        p={3}
                                        borderWidth="1px"
                                        borderRadius="md"
                                        borderColor="red.200"
                                        bg="red.50"
                                    >
                                        <Text fontSize="xs" color="gray.500" mb={1}>
                                            {entry.context}
                                        </Text>
                                        <Text fontSize="sm" mb={2} color="red.600">
                                            {t('timeline.action.currentDate', '当前值')}:{' '}
                                            <Text as="span" fontWeight="bold">
                                                {entry.date}
                                            </Text>
                                        </Text>
                                        <HStack spacing={2}>
                                            <Input
                                                size="xs"
                                                placeholder={t('timeline.action.fixDatePlaceholder', '输入正确日期')}
                                                value={editValues[key] ?? ''}
                                                onChange={e =>
                                                    setEditValues(prev => ({
                                                        ...prev,
                                                        [key]: e.target.value,
                                                    }))
                                                }
                                                flex={1}
                                            />
                                            <Button
                                                size="xs"
                                                colorScheme="blue"
                                                isDisabled={
                                                    !editValues[key] ||
                                                    !/^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/.test(editValues[key])
                                                }
                                                onClick={() => handleFix(entry, index)}
                                            >
                                                {t('timeline.action.fix', '修正')}
                                            </Button>
                                            <Button
                                                size="xs"
                                                colorScheme="red"
                                                variant="outline"
                                                onClick={() => handleClearOne(entry, index)}
                                            >
                                                {t('timeline.action.clear', '清空')}
                                            </Button>
                                        </HStack>
                                    </Box>
                                );
                            })}
                        </VStack>
                    )}
                </ModalBody>
                <ModalFooter>
                    <HStack spacing={2}>
                        {remainingCount > 0 && (
                            <Button colorScheme="red" size="sm" onClick={handleClearAll}>
                                {t('timeline.action.clearAll', '全部清空')}
                                {' ('}
                                {remainingCount}
                                {')'}
                            </Button>
                        )}
                        <Button size="sm" variant="ghost" onClick={onClose}>
                            {remainingCount === 0 ? t('close') : t('timeline.action.ignore', '忽略')}
                        </Button>
                    </HStack>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
}
