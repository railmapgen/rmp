import { Badge, IconButton, Popover, PopoverBody, PopoverContent, PopoverTrigger } from '@chakra-ui/react';
import { RmgAutoComplete, RmgLabel } from '@railmapgen/rmg-components';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { MdSearch } from 'react-icons/md';
import { StnId } from '../../constants/constants';
import { StationAttributes } from '../../constants/stations';
import { useRootDispatch } from '../../redux';
import { setSvgViewBoxMin, setSvgViewBoxZoom } from '../../redux/param/param-slice';
import { setSelected } from '../../redux/runtime/runtime-slice';
import { getCanvasSize, pointerPosToSVGCoord } from '../../util/helpers';
import { useWindowSize } from '../../util/hooks';

interface SearchData {
    id: StnId;
    value: string;
}

export const SearchPopover = () => {
    const [isOpen, setIsOpen] = React.useState(false);

    const { t } = useTranslation();
    const dispatch = useRootDispatch();
    const graph = React.useRef(window.graph);

    const size = useWindowSize();
    const { width, height } = getCanvasSize(size);

    const [data, setData] = React.useState<SearchData[]>([]);
    React.useEffect(() => {
        if (isOpen) {
            setData(
                graph.current
                    .nodes()
                    .filter(node => node.startsWith('stn'))
                    .map(stnId => {
                        const attr = graph.current.getNodeAttributes(stnId);
                        const type = attr.type;
                        const name = (attr[type] as StationAttributes).names.join('/');
                        return { id: stnId, value: name } as SearchData;
                    })
            );
        }
    }, [isOpen]);

    const moveCanvas = (stnId: StnId) => {
        dispatch(setSelected(new Set([stnId])));
        const newSvgViewBoxZoom = Math.max(0, Math.min(400, -0.132 * height + 117.772));
        const { x, y } = pointerPosToSVGCoord((width - 300) / 2, height / 2, newSvgViewBoxZoom, {
            x: -graph.current.getNodeAttribute(stnId, 'x'),
            y: -graph.current.getNodeAttribute(stnId, 'y'),
        });
        dispatch(setSvgViewBoxZoom(newSvgViewBoxZoom));
        dispatch(setSvgViewBoxMin({ x: -x, y: -y }));
    };

    return (
        <Popover isOpen={isOpen} onOpen={() => setIsOpen(true)} onClose={() => setIsOpen(false)}>
            <PopoverTrigger>
                <IconButton
                    aria-label="zoom"
                    variant="ghost"
                    size="sm"
                    icon={<MdSearch />}
                    onClick={() => setIsOpen(!isOpen)}
                />
            </PopoverTrigger>
            <PopoverContent>
                <PopoverBody>
                    <RmgLabel label={t('header.search')}>
                        <RmgAutoComplete
                            data={data}
                            displayHandler={item => <Badge>{item.value}</Badge>}
                            filter={(query, item) =>
                                item.value.toLowerCase().includes(query.toLowerCase()) ||
                                Object.values(item.value).some(name => name.toLowerCase().includes(query.toLowerCase()))
                            }
                            value=""
                            onChange={item => moveCanvas(item.id)}
                        />
                    </RmgLabel>
                </PopoverBody>
            </PopoverContent>
        </Popover>
    );
};
