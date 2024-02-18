import React from 'react';
import { Badge, IconButton, Popover, PopoverBody, PopoverContent, PopoverTrigger } from '@chakra-ui/react';
import { MdSearch } from 'react-icons/md';
import { RmgAutoComplete, RmgFields, RmgFieldsField } from '@railmapgen/rmg-components';
import { StnId } from '../../constants/constants';
import { useRootDispatch } from '../../redux';
import { setSvgViewBoxMin, setSvgViewBoxZoom } from '../../redux/param/param-slice';
import { setSelected } from '../../redux/runtime/runtime-slice';
import { getCanvasSize, pointerPosToSVGCoord } from '../../util/helpers';
import { useWindowSize } from '../../util/hooks';
import { StationAttributes } from '../../constants/stations';

interface SearchData {
    id: StnId;
    value: string;
}

export const SearchPopover = () => {
    const [isOpen, setIsOpen] = React.useState(false);

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
    });

    const handleSearch = (stnId: StnId) => {
        dispatch(setSelected(new Set([stnId])));
        const newSvgViewBoxZoom = Math.max(0, Math.min(400, -0.132 * height + 117.772));
        const { x, y } = pointerPosToSVGCoord((width - 300) / 2, height / 2, newSvgViewBoxZoom, {
            x: -graph.current.getNodeAttribute(stnId, 'x'),
            y: -graph.current.getNodeAttribute(stnId, 'y'),
        });
        dispatch(setSvgViewBoxZoom(newSvgViewBoxZoom));
        dispatch(setSvgViewBoxMin({ x: -x, y: -y }));
    };

    const fields: RmgFieldsField[] = [
        {
            type: 'custom',
            label: '',
            component: (
                <RmgAutoComplete
                    data={data}
                    displayHandler={item => <Badge>{item.value}</Badge>}
                    filter={(query, item) =>
                        item.value.toLowerCase().includes(query.toLowerCase()) ||
                        Object.values(item.value).some(name => name.toLowerCase().includes(query.toLowerCase()))
                    }
                    value=""
                    onChange={item => handleSearch(item.id)}
                />
            ),
        },
    ];

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
                    <RmgFields fields={fields} noLabel />
                </PopoverBody>
            </PopoverContent>
        </Popover>
    );
};
