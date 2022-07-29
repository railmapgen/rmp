import React from 'react';
import { IconButton, Menu, MenuButton, MenuList, MenuItem } from '@chakra-ui/react';
import { MdDownload } from 'react-icons/md';
import { useTranslation } from 'react-i18next';

export default function DownloadActions() {
    const { t } = useTranslation();

    const graph = React.useRef(window.graph);

    const handleDownloadJson = () => {
        downloadAs(`RMG_${new Date().valueOf()}.json`, 'application/json', JSON.stringify(graph.current.export()));
    };

    return (
        <Menu>
            <MenuButton as={IconButton} size="sm" variant="ghost" icon={<MdDownload />} />
            <MenuList>
                <MenuItem onClick={handleDownloadJson}>{t('header.download.config')}</MenuItem>
            </MenuList>
        </Menu>
    );
}

const downloadAs = (filename: string, type: string, data: any) => {
    const blob = new Blob([data], { type });
    downloadBlobAs(filename, blob);
};

const downloadBlobAs = (filename: string, blob: Blob) => {
    const url = window.URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();

    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
};
