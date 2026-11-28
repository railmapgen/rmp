import {
    Alert,
    AlertIcon,
    Badge,
    Box,
    Button,
    HStack,
    Image,
    Modal,
    ModalBody,
    ModalCloseButton,
    ModalContent,
    ModalFooter,
    ModalHeader,
    ModalOverlay,
    Stack,
    Tab,
    TabList,
    TabPanel,
    TabPanels,
    Tabs,
    Text,
} from '@chakra-ui/react';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { localMapStore, LocalMapRecord, notifyMapLibraryChanged, subscribeMapLibrary } from '../../map/local-map';
import { MAP_COMMON_ZOOM, MAP_MAX_VIEWBOX_ZOOM, MAP_TILE_SIZE, worldPixelToGraph } from '../../map/map-config';
import { importMapIntoLibrary, requestMapFromRmw } from '../../map/map-transfer';
import { useRootDispatch, useRootSelector } from '../../redux';
import { setMapEnabled, setMapStyle, setSvgViewport } from '../../redux/param/param-slice';

const Thumbnail = ({ blob }: { blob?: Blob }) => {
    const [url, setUrl] = React.useState<string>();
    React.useEffect(() => {
        if (!blob) return;
        const next = URL.createObjectURL(blob);
        setUrl(next);
        return () => URL.revokeObjectURL(next);
    }, [blob]);
    return url ? <Image src={url} alt="" width="96px" height="54px" objectFit="cover" borderRadius="md" /> : null;
};

export function MapLibraryModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
    const { t } = useTranslation();
    const dispatch = useRootDispatch();
    const mapEnabled = useRootSelector(state => state.param.present.mapEnabled);
    const mapStyle = useRootSelector(state => state.param.present.mapStyle);
    const mapSource = mapStyle.mapSource;
    const [tabIndex, setTabIndex] = React.useState<number>();
    const selectedTab = tabIndex ?? (!mapEnabled ? 0 : mapSource ? 2 : 1);
    const [records, setRecords] = React.useState<LocalMapRecord[]>([]);
    const [error, setError] = React.useState('');
    const [busy, setBusy] = React.useState(false);
    const [bridgeId, setBridgeId] = React.useState<string>();
    const [fallbackBlob, setFallbackBlob] = React.useState<Blob>();
    const fileInput = React.useRef<HTMLInputElement>(null);
    const request = React.useRef<ReturnType<typeof requestMapFromRmw> | undefined>(undefined);
    const refresh = React.useCallback(() => {
        void localMapStore
            .list()
            .then(setRecords)
            .catch(cause => setError(String(cause)));
    }, []);
    React.useEffect(() => {
        if (!isOpen) {
            setTabIndex(undefined);
            return;
        }
        refresh();
        return subscribeMapLibrary(refresh);
    }, [isOpen, refresh]);
    React.useEffect(() => () => request.current?.cancel(), []);
    const close = () => {
        request.current?.cancel();
        setBridgeId(undefined);
        onClose();
    };
    const receive = async (blob: Blob) => {
        setBusy(true);
        setError('');
        try {
            await importMapIntoLibrary(blob);
            refresh();
        } catch (cause) {
            setError(cause instanceof Error ? cause.message : String(cause));
        } finally {
            setBusy(false);
        }
    };
    const pull = async () => {
        setBusy(true);
        setError('');
        setFallbackBlob(undefined);
        try {
            const operation = requestMapFromRmw(setBridgeId);
            request.current = operation;
            await operation.start();
            refresh();
        } catch (cause) {
            if (!(cause instanceof DOMException && cause.name === 'AbortError')) {
                setError(cause instanceof Error ? cause.message : String(cause));
                setFallbackBlob(request.current?.getBlob());
            }
        } finally {
            request.current = undefined;
            setBridgeId(undefined);
            setBusy(false);
        }
    };
    const useMap = (record?: LocalMapRecord) => {
        const nextStyle = { ...mapStyle };
        if (record) nextStyle.mapSource = { mapId: record.mapId, revision: record.revision, sha256: record.sha256 };
        else nextStyle.mapSource = undefined;
        dispatch(setMapStyle(nextStyle));
        dispatch(setMapEnabled(true));
    };
    const selectTab = (index: number) => {
        setTabIndex(index);
        if (index === 0) dispatch(setMapEnabled(false));
        else if (index === 1) useMap();
        else if (mapSource) dispatch(setMapEnabled(true));
    };
    const locate = (record: LocalMapRecord) => {
        useMap(record);
        const [longitude, latitude] = record.defaultView.center;
        const extent = 2 ** MAP_COMMON_ZOOM * MAP_TILE_SIZE;
        const radians = (latitude * Math.PI) / 180;
        const center = worldPixelToGraph({
            x: ((longitude + 180) / 360) * extent,
            y: ((1 - Math.asinh(Math.tan(radians)) / Math.PI) / 2) * extent,
        });
        const zoom = Math.max(
            0.1,
            Math.min(MAP_MAX_VIEWBOX_ZOOM, 100 / 2 ** (record.defaultView.zoom - MAP_COMMON_ZOOM))
        );
        const canvas = document.querySelector<SVGSVGElement>('svg#canvas');
        const width = canvas?.clientWidth || window.innerWidth;
        const height = canvas?.clientHeight || window.innerHeight;
        dispatch(
            setSvgViewport({ zoom, min: { x: center.x - (width * zoom) / 200, y: center.y - (height * zoom) / 200 } })
        );
    };
    const remove = async (record: LocalMapRecord) => {
        if (
            record.sha256 === mapSource?.sha256 ||
            !window.confirm(t('mapLibrary.deleteConfirm', { name: record.name }))
        )
            return;
        setBusy(true);
        setError('');
        try {
            await localMapStore.delete(record);
            notifyMapLibraryChanged();
            refresh();
        } catch (cause) {
            setError(String(cause));
        } finally {
            setBusy(false);
        }
    };
    const downloadFallback = () => {
        if (!fallbackBlob) return;
        const url = URL.createObjectURL(fallbackBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'map.rmpmap';
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    };
    return (
        <Modal isOpen={isOpen} onClose={close} size="xl" scrollBehavior="inside">
            <ModalOverlay />
            <ModalContent>
                <ModalHeader>{t('mapLibrary.title')}</ModalHeader>
                <ModalCloseButton />
                <ModalBody>
                    <Tabs
                        index={selectedTab}
                        onChange={selectTab}
                        variant="soft-rounded"
                        size="lg"
                        isFitted
                        isLazy
                        lazyBehavior="keepMounted"
                    >
                        <TabList mb="4" p="1" borderWidth="1px" borderRadius="xl">
                            <Tab px="2" py="3" fontSize={{ base: 'sm', sm: 'md' }} borderRadius="lg">
                                {t('mapLibrary.noMap')}
                            </Tab>
                            <Tab px="2" py="3" fontSize={{ base: 'sm', sm: 'md' }} borderRadius="lg">
                                {t('mapLibrary.realMap')}
                            </Tab>
                            <Tab px="2" py="3" fontSize={{ base: 'sm', sm: 'md' }} borderRadius="lg">
                                {t('mapLibrary.rmwMap')}
                            </Tab>
                        </TabList>
                        <TabPanels>
                            <TabPanel p="0">
                                <Text color="gray.500">{t('mapLibrary.noMapHint')}</Text>
                            </TabPanel>
                            <TabPanel p="0">
                                <Text color="gray.500">{t('mapLibrary.realMapHint')}</Text>
                            </TabPanel>
                            <TabPanel p="0">
                                <Stack spacing="4">
                                    <Text fontSize="sm">{t('mapLibrary.hint')}</Text>
                                    <HStack flexWrap="wrap">
                                        <Button onClick={() => fileInput.current?.click()} isDisabled={busy}>
                                            {t('mapLibrary.importFile')}
                                        </Button>
                                        <Button
                                            onClick={() => void pull()}
                                            isLoading={busy && !!request.current}
                                            isDisabled={busy}
                                        >
                                            {t('mapLibrary.fromRmw')}
                                        </Button>
                                        {busy && request.current && (
                                            <Button onClick={() => request.current?.cancel()}>{t('cancel')}</Button>
                                        )}
                                    </HStack>
                                    <input
                                        type="file"
                                        ref={fileInput}
                                        accept=".rmpmap,application/zip"
                                        hidden
                                        onChange={event => {
                                            const file = event.target.files?.[0];
                                            if (file) void receive(file);
                                            event.target.value = '';
                                        }}
                                    />
                                    {error && (
                                        <Alert status="error">
                                            <AlertIcon />
                                            <Box>
                                                <Text>{error}</Text>
                                                <Text fontSize="sm">{t('mapLibrary.transferHelp')}</Text>
                                            </Box>
                                        </Alert>
                                    )}
                                    {fallbackBlob && (
                                        <Button onClick={downloadFallback}>{t('mapLibrary.downloadPackage')}</Button>
                                    )}
                                    {bridgeId && (
                                        <Box
                                            as="iframe"
                                            title="Rail Map World"
                                            src={`/rmw/?bridge=${encodeURIComponent(bridgeId)}`}
                                            width="100%"
                                            height="180px"
                                            border="0"
                                        />
                                    )}
                                    {!records.length && <Text color="gray.500">{t('mapLibrary.empty')}</Text>}
                                    {records.map(record => (
                                        <Box key={record.sha256} borderWidth="1px" borderRadius="md" p="3">
                                            <HStack align="start">
                                                <Thumbnail blob={record.thumbnail} />
                                                <Box flex="1" minWidth="0">
                                                    <Text fontWeight="bold" overflowWrap="anywhere">
                                                        {record.name}
                                                    </Text>
                                                    <Text fontSize="sm">
                                                        {t('mapLibrary.revision', { revision: record.revision })} ·{' '}
                                                        {record.sha256.slice(0, 8)}
                                                    </Text>
                                                    {mapEnabled && mapSource?.sha256 === record.sha256 && (
                                                        <Badge>{t('mapLibrary.current')}</Badge>
                                                    )}
                                                </Box>
                                            </HStack>
                                            <HStack mt="2" flexWrap="wrap">
                                                <Button
                                                    size="sm"
                                                    onClick={() => useMap(record)}
                                                    isDisabled={
                                                        busy || (mapEnabled && record.sha256 === mapSource?.sha256)
                                                    }
                                                >
                                                    {t('mapLibrary.use')}
                                                </Button>
                                                <Button size="sm" onClick={() => locate(record)} isDisabled={busy}>
                                                    {t('mapLibrary.locate')}
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    colorScheme="red"
                                                    variant="ghost"
                                                    onClick={() => void remove(record)}
                                                    isDisabled={busy || record.sha256 === mapSource?.sha256}
                                                >
                                                    {t('remove')}
                                                </Button>
                                            </HStack>
                                        </Box>
                                    ))}
                                </Stack>
                            </TabPanel>
                        </TabPanels>
                    </Tabs>
                </ModalBody>
                <ModalFooter>
                    <Button onClick={close}>{t('close')}</Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
}
