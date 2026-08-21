import { HStack, Icon, Link } from '@chakra-ui/react';
import { useTranslation } from 'react-i18next';
import { IconContext } from 'react-icons';
import { MdCode, MdOpenInNew } from 'react-icons/md';

interface LearnHowToAddProps {
    type: 'station' | 'misc-node' | 'line-styles';
    expand: boolean;
}

const DOCUMENT_BY_TYPE: Record<LearnHowToAddProps['type'], string> = {
    station: 'stations.md',
    'misc-node': 'nodes.md',
    'line-styles': 'line-styles.md',
};

const LearnHowToAdd = (props: LearnHowToAddProps) => {
    const { type, expand } = props;
    const { t } = useTranslation();

    return (
        <HStack>
            <IconContext.Provider value={{ style: { padding: 5 }, size: '40px' }}>
                <MdCode />
            </IconContext.Provider>
            {expand && (
                <>
                    <Link
                        color="teal.500"
                        href={`https://github.com/railmapgen/rmp/blob/main/docs/${DOCUMENT_BY_TYPE[type]}`}
                        isExternal
                    >
                        {t(`panel.tools.learnHowToAdd.${type}`)}
                    </Link>
                    <Icon as={MdOpenInNew} color="teal.500" mr="auto" />
                </>
            )}
        </HStack>
    );
};

export default LearnHowToAdd;
