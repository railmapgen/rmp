import {
    Accordion,
    AccordionButton,
    AccordionIcon,
    AccordionItem,
    AccordionPanel,
    Badge,
    Box,
    Button,
    Checkbox,
    CheckboxGroup,
    Icon,
    Link,
    Modal,
    ModalBody,
    ModalCloseButton,
    ModalContent,
    ModalFooter,
    ModalHeader,
    ModalOverlay,
    Radio,
    RadioGroup,
    Stack,
    Text,
    Tooltip,
    useToast,
} from '@chakra-ui/react';
import { RmgFields, RmgFieldsField } from '@railmapgen/rmg-components';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { MdOpenInNew } from 'react-icons/md';
import { LineStyleType } from '../../constants/lines';
import { StationType } from '../../constants/stations';
import { useRootDispatch, useRootSelector } from '../../redux';
import { setUnlockSimplePath } from '../../redux/app/app-slice';
import { saveGraph } from '../../redux/param/param-slice';
import { setPalettePrevTheme, setRefreshEdges, setRefreshNodes } from '../../redux/runtime/runtime-slice';
import { changeStationsTypeInBatch } from '../../util/change-types';
import { shuffle } from '../../util/helpers';
import ThemeButton from '../panels/theme-button';
import stations from '../svgs/stations/stations';

export const TranslateNodesModal = (props: { isOpen: boolean; onClose: () => void }) => {
    const { isOpen, onClose } = props;
    const dispatch = useRootDispatch();
    const { t } = useTranslation();
    const graph = React.useRef(window.graph);

    const [x, setX] = React.useState(0);
    const [y, setY] = React.useState(0);
    const fields: RmgFieldsField[] = [
        {
            type: 'input',
            label: t('header.settings.procedures.translate.x'),
            value: x.toString(),
            variant: 'number',
            onChange: val => setX(Number(val)),
            minW: 'full',
        },
        {
            type: 'input',
            label: t('header.settings.procedures.translate.y'),
            value: y.toString(),
            variant: 'number',
            onChange: val => setY(Number(val)),
            minW: 'full',
        },
    ];

    const handleChange = () => {
        graph.current.forEachNode((node, attr) => {
            graph.current.updateNodeAttribute(node, 'x', val => (val ?? 0) + x);
            graph.current.updateNodeAttribute(node, 'y', val => (val ?? 0) + y);
        });
        dispatch(setRefreshNodes());
        dispatch(setRefreshEdges());
        dispatch(saveGraph(graph.current.export()));
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="xl" scrollBehavior="inside">
            <ModalOverlay />
            <ModalContent>
                <ModalHeader>{t('header.settings.procedures.translate.title')}</ModalHeader>
                <ModalCloseButton />

                <ModalBody>
                    {t('header.settings.procedures.translate.content')}
                    <RmgFields fields={fields} />
                </ModalBody>

                <ModalFooter>
                    <Button colorScheme="blue" variant="outline" mr="1" onClick={onClose}>
                        {t('cancel')}
                    </Button>
                    <Button colorScheme="red" onClick={handleChange}>
                        {t('apply')}
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
};

export const ScaleNodesModal = (props: { isOpen: boolean; onClose: () => void }) => {
    const { isOpen, onClose } = props;
    const dispatch = useRootDispatch();
    const { t } = useTranslation();
    const graph = React.useRef(window.graph);

    const [scale, setScale] = React.useState(1);
    const fields: RmgFieldsField[] = [
        {
            type: 'input',
            label: t('header.settings.procedures.scale.factor'),
            value: scale.toString(),
            variant: 'number',
            onChange: val => setScale(Number(val)),
            minW: 'full',
        },
    ];

    const handleChange = () => {
        graph.current.forEachNode((node, attr) => {
            graph.current.updateNodeAttribute(node, 'x', val => (val ?? 0) * scale);
            graph.current.updateNodeAttribute(node, 'y', val => (val ?? 0) * scale);
        });
        dispatch(setRefreshNodes());
        dispatch(setRefreshEdges());
        dispatch(saveGraph(graph.current.export()));
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="xl" scrollBehavior="inside">
            <ModalOverlay />
            <ModalContent>
                <ModalHeader>{t('header.settings.procedures.scale.title')}</ModalHeader>
                <ModalCloseButton />

                <ModalBody>
                    {t('header.settings.procedures.scale.content')}
                    <RmgFields fields={fields} />
                </ModalBody>

                <ModalFooter>
                    <Button colorScheme="blue" variant="outline" mr="1" onClick={onClose}>
                        {t('cancel')}
                    </Button>
                    <Button colorScheme="red" onClick={handleChange}>
                        {t('apply')}
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
};

export const ChangeTypeModal = (props: { isOpen: boolean; onClose: () => void }) => {
    const { isOpen, onClose } = props;
    const dispatch = useRootDispatch();
    const { t } = useTranslation();
    const graph = React.useRef(window.graph);

    const availableStationOptions = Object.fromEntries(
        Object.entries(stations).map(([key, val]) => [key, t(val.metadata.displayName).toString()])
    ) as { [k in StationType]: string };
    const [oldStnType, setOldStnType] = React.useState(Object.keys(stations).at(0)! as StationType);
    const [newStnType, setNewStnType] = React.useState(Object.keys(stations).at(1)! as StationType);

    const fields: RmgFieldsField[] = [
        {
            type: 'select',
            label: t('header.settings.procedures.changeType.changeFrom'),
            value: oldStnType as StationType,
            options: availableStationOptions,
            disabledOptions: [newStnType],
            onChange: (val: string | number) => setOldStnType(val as StationType),
            minW: 'full',
        },
        {
            type: 'select',
            label: t('header.settings.procedures.changeType.changeTo'),
            value: newStnType as StationType,
            options: availableStationOptions,
            disabledOptions: [oldStnType],
            onChange: (val: string | number) => setNewStnType(val as StationType),
            minW: 'full',
        },
    ];

    const handleChange = () => {
        changeStationsTypeInBatch(graph.current, oldStnType, newStnType);
        dispatch(setRefreshNodes());
        dispatch(saveGraph(graph.current.export()));
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="xl" scrollBehavior="inside">
            <ModalOverlay />
            <ModalContent>
                <ModalHeader>
                    <Text as="b" fontSize="xl">
                        {t('header.settings.procedures.changeType.title')}
                    </Text>
                    <Tooltip label={t('header.settings.pro')}>
                        <Badge ml="1" color="gray.50" background="radial-gradient(circle, #3f5efb, #fc466b)">
                            PRO
                        </Badge>
                    </Tooltip>
                </ModalHeader>
                <ModalCloseButton />

                <ModalBody>
                    <RmgFields fields={fields} />
                    <Text fontSize="sm" mt="3" lineHeight="100%" color="red.500">
                        {t('header.settings.procedures.changeType.info')}
                    </Text>
                </ModalBody>

                <ModalFooter>
                    <Button colorScheme="blue" variant="outline" mr="1" onClick={onClose}>
                        {t('cancel')}
                    </Button>
                    <Button colorScheme="red" onClick={handleChange}>
                        {t('apply')}
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
};

export const RemoveLinesWithSingleColorModal = (props: { isOpen: boolean; onClose: () => void }) => {
    const { isOpen, onClose } = props;
    const dispatch = useRootDispatch();
    const {
        theme: runtimeTheme,
        paletteAppClip: { nextTheme },
    } = useRootSelector(state => state.runtime);
    const { t } = useTranslation();
    const graph = React.useRef(window.graph);

    const [theme, setTheme] = React.useState(runtimeTheme);

    const [isThemeRequested, setIsThemeRequested] = React.useState(false);
    React.useEffect(() => {
        if (isThemeRequested && nextTheme) {
            setTheme(nextTheme);
            setIsThemeRequested(false);
        }
    }, [nextTheme?.toString()]);

    const handleChange = () => {
        graph.current
            .filterEdges(
                (edge, attr, source, target, sourceAttr, targetAttr, undirected) =>
                    attr.style === LineStyleType.SingleColor &&
                    JSON.stringify(attr[LineStyleType.SingleColor]!.color) === JSON.stringify(theme)
            )
            .forEach(edge => graph.current.dropEdge(edge));
        dispatch(setRefreshEdges());
        dispatch(saveGraph(graph.current.export()));
        onClose();
    };

    /** FIXME: We shouldn't remove the focus trap as this breaks the accessibility.
     *         However this seems to be the only workaround to prevent the focus
     *         of Palette App Clip being stolen by this modal.
     *         Instead of fixing the focus trap, we should avoid rendering modal/portal
     *         one on top of another, as it's a bad UX design. :(
     */
    return (
        <Modal isOpen={isOpen} onClose={onClose} size="xl" scrollBehavior="inside" trapFocus={false}>
            <ModalOverlay />
            <ModalContent>
                <ModalHeader>{t('header.settings.procedures.removeLines.title')}</ModalHeader>
                <ModalCloseButton />

                <ModalBody>
                    {t('header.settings.procedures.removeLines.content')}
                    <ThemeButton
                        theme={theme}
                        onClick={() => {
                            setIsThemeRequested(true);
                            dispatch(setPalettePrevTheme(theme));
                        }}
                    />
                </ModalBody>

                <ModalFooter>
                    <Button colorScheme="blue" variant="outline" mr="1" onClick={onClose}>
                        {t('cancel')}
                    </Button>
                    <Button colorScheme="red" onClick={handleChange}>
                        {t('remove')}
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
};

export const UnlockSimplePathModal = (props: { isOpen: boolean; onClose: () => void }) => {
    const { isOpen, onClose } = props;
    const dispatch = useRootDispatch();
    const {
        preference: { unlockSimplePathAttempts },
    } = useRootSelector(state => state.app);
    const toast = useToast();
    const { t } = useTranslation();

    const [questions, setQuestions] = React.useState<{ question: string; choices: string[]; answers: string[] }[]>([]);
    const [answers, setAnswers] = React.useState<string[][]>([[], [], []]);
    React.useEffect(() => {
        if (isOpen) {
            const singleChoiceQuestions = shuffle([
                {
                    question:
                        "What is one reason why Beck's original design of the Underground map is sometimes overestimated in terms of its innovation?",
                    choices: [
                        'It introduced a completely new way of representing railway networks.',
                        'It was created by George Dow, a renowned map designer.',
                        'It evolved from previous map designs and was influenced by existing schematic railway maps.',
                        'It was the first map to include detailed surface information.',
                    ],
                    answers: [
                        'It evolved from previous map designs and was influenced by existing schematic railway maps.',
                    ],
                },
                {
                    question: 'What is the main argument of the paragraph 4?',
                    choices: [
                        "Beck's original design was an isolated stroke of genius.",
                        "Schematic maps were not in use before Beck's design.",
                        'Evaluating an innovation is easier for innovators than for observers.',
                        "Beck's map is an evolution of previous Underground maps.",
                    ],
                    answers: ["Beck's map is an evolution of previous Underground maps."],
                },
                {
                    question:
                        "According to Roberts, what was the key factor contributing to the usability of Beck's map?",
                    choices: [
                        'The inclusion of intricate geographical details',
                        'The use of a wide range of colors',
                        'The adoption of octolinearit',
                        'The incorporation of 45° and 90° angles',
                    ],
                    answers: ['The adoption of octolinearit'],
                },
                {
                    question:
                        "According to the passage, what is the significance of octolinearity in Beck's map design?",
                    choices: [
                        'It enhances the complexity of the network.',
                        'It simplifies line trajectories and improves usability.',
                        'It increases the disorientation for passengers.',
                        'It offers the most effective solution.',
                    ],
                    answers: ['It simplifies line trajectories and improves usability.'],
                },
                {
                    question:
                        "According to the paragraph 9, what aspect of Beck's map design helped create a perception of flow and ease of navigation?",
                    choices: [
                        'Use of angular joins',
                        'Inconsistent station spacing',
                        'Tight curves in lines',
                        'Irregular angles',
                    ],
                    answers: ['Tight curves in lines'],
                },
                {
                    question:
                        "What was the central transformative possibility offered by Beck's map according to Pike?",
                    choices: [
                        'Replacing negative connotations of the Underground with positive connotations',
                        'Aligning individual behavior with the dynamic system of the Underground',
                        'Creating an abstract representation of the Underground network',
                        'Introducing escalators in 1924 to regulate passenger movement',
                    ],
                    answers: ['Replacing negative connotations of the Underground with positive connotations'],
                },
            ]).slice(0, 2);
            const multipleChoicesQuestions = shuffle([
                {
                    question:
                        "What were the successive innovations incorporated into Beck's design of the Underground map? Choose all that apply.",
                    choices: [
                        'Introduction of flamboyant calligraphic letters',
                        'Enlargement of the central area',
                        'Use of Johnston-style lettering',
                        "Expansion of the map's periphery",
                        'Removal of surface detail',
                        'Inclusion of detailed geographical features',
                    ],
                    answers: [
                        'Enlargement of the central area',
                        'Use of Johnston-style lettering',
                        'Removal of surface detail',
                    ],
                },
                {
                    question:
                        "What factors contributed to the success of Beck's design for the transit map? Choose all that apply.",
                    choices: [
                        'Excessive geographical distortion',
                        'Complex and winding line trajectories',
                        'Enhanced usability due to straightened lines and limited directional changes',
                        'Positive reception by society due to aesthetic appeal',
                        'Inclusion of intricate surface features',
                        'Incorporation of a wide range of colors',
                        'Sole reliance on geographical accuracy',
                    ],
                    answers: [
                        'Enhanced usability due to straightened lines and limited directional changes',
                        'Positive reception by society due to aesthetic appeal',
                    ],
                },
                {
                    question:
                        "How did Beck's subway map influence users' behavior and perception of the Underground system? Choose all that apply.",
                    choices: [
                        'It introduced vibrant colors and abstract forms.',
                        'It reinforced the organic and representative design of its predecessors.',
                        'It aligned with the Art Deco style of design.',
                        'It provided users with a sense of control and mastery over the vast network.',
                        "It encouraged passengers to focus on the intricate details of the map's design.",
                        "It presented a chaotic and confusing representation of the Underground's routes.",
                    ],
                    answers: [
                        'It aligned with the Art Deco style of design.',
                        'It provided users with a sense of control and mastery over the vast network.',
                    ],
                },
                {
                    question:
                        "What aspects of Beck's map design contributed to its favorability during the 1930s and in the modern era? Choose all that apply.",
                    choices: [
                        'The use of vibrant colors that reflected the Art Deco style',
                        "The map's intricate cartographic symbols and detailed topographic representation",
                        "The incorporation of chaotic design elements to match the city's character",
                        'The inclusion of historical Classicism elements',
                        'The alignment with the machine aesthetic and modern industrial functionalism',
                        "An emphasis on organic, flowing lines to represent the city's natural features",
                    ],
                    answers: [
                        'The use of vibrant colors that reflected the Art Deco style',
                        'The alignment with the machine aesthetic and modern industrial functionalism',
                    ],
                },
            ]).slice(0, 1);
            setQuestions([...singleChoiceQuestions, ...multipleChoicesQuestions]);
            setAnswers([[], [], []]);
        }
    }, [isOpen]);

    const handleChange = () => {
        if (
            questions
                .map(q => q.answers)
                .flat()
                .join('') === answers.flat().join('')
        ) {
            dispatch(setUnlockSimplePath(-1));
        } else {
            dispatch(setUnlockSimplePath(unlockSimplePathAttempts - 1));
            toast({
                title: t('header.settings.procedures.unlockSimplePath.fail'),
                status: 'error' as const,
                duration: 9000,
                isClosable: true,
            });
            onClose();
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="5xl" scrollBehavior="inside">
            <ModalOverlay />
            <ModalContent>
                <ModalHeader>{t('header.settings.procedures.unlockSimplePath.title')}</ModalHeader>
                <ModalCloseButton />

                <ModalBody>
                    <Text mb="2">{t('header.settings.procedures.unlockSimplePath.content1')}</Text>
                    <Text mb="2">{t('header.settings.procedures.unlockSimplePath.content2')}</Text>
                    <Text mb="2">{t('header.settings.procedures.unlockSimplePath.content3')}</Text>
                    <Text mb="2">{t('header.settings.procedures.unlockSimplePath.content4')}</Text>
                    <Text mb="2">
                        {t('header.settings.procedures.unlockSimplePath.content5')}
                        {unlockSimplePathAttempts >= 0 ? unlockSimplePathAttempts : ''}
                    </Text>

                    <Accordion defaultIndex={[]} allowMultiple>
                        <AccordionItem>
                            <h2>
                                <AccordionButton>
                                    <Box as="span" flex="1" textAlign="left">
                                        Passage
                                    </Box>
                                    <AccordionIcon />
                                </AccordionButton>
                            </h2>
                            <AccordionPanel pb={4}>
                                <Link
                                    color="teal.500"
                                    href="https://www.tandfonline.com/doi/full/10.1080/00087041.2021.1953765"
                                    isExternal={true}
                                >
                                    <Text as="b">
                                        When Topology Trumped Topography: Celebrating 90 Years of Beck’s Underground Map
                                    </Text>{' '}
                                    <Icon as={MdOpenInNew} />
                                </Link>
                                <Text mt="2">
                                    The year 1931 saw the inception of what has become arguably the world’s most
                                    successful cartographic design. Henry C. Beck, a technical draughtsman who had been
                                    laid off by the Underground Electric Railways of London (UERL), devised a new
                                    diagrammatic map of the network in his spare time. Beck’s radical approach favoured
                                    topology over topography – connectivity over geographical fidelity – which he
                                    achieved primarily by straightening out the lines and limiting changes in their
                                    direction to 45° and 90°. Beck submitted a presentation copy of his map to the board
                                    of the Publicity Office of the UERL that same year, and, although his solution was
                                    initially rejected as being too revolutionary, Beck re-submitted his design in 1932
                                    and it was accepted. The map was eventually issued as a pocket edition in January
                                    1933; its first print run of 750,000 copies reflecting the board’s new-found
                                    confidence in its design and an enthusiastic reception by the public secured a
                                    further printing of 100,000 copies in February and a poster edition in March.
                                </Text>
                                <Text mt="2">
                                    Today, the ‘Tube map’ needs hardly any introduction. It has been hailed as a supreme
                                    example of information design; it has been implemented in transit mapping around the
                                    globe (with varying levels of success); it has been venerated, analysed and
                                    parodied; and it has been transformed into countless artefacts, souvenirs and
                                    merchandise – from mugs to face masks. Instantly recognizable and used by millions
                                    of travellers daily, it came second only to Concorde in a BBC poll in 2006 of
                                    favourite British designs of the twentieth century and is widely regarded as an icon
                                    of London itself. If the success of a cartographic design is measured by its use
                                    over space and time, Beck’s map certainly hits the mark with its worldwide imitation
                                    and marathon longevity. Ninety years after its inception, it is worth reflecting on
                                    how and why his design became an icon, and whether this can offer some insights
                                    about the nature of cartographic innovation that can inspire us today.
                                </Text>
                                <Text mt="2">
                                    In terms of bringing public recognition to Beck and his contribution to the map’s
                                    design, much is owed to graphic designer Ken Garland. He interviewed Beck in 1965, a
                                    year after Garbutt’s homage was published, and Garland championed the man and his
                                    map in an article for The Penrose Annual and later in his seminal contribution Mr
                                    Beck’s Underground Map: A History. Garland’s photographs of Beck and of his initial
                                    sketch map were included in the exhibition ‘Classics of Modern Design’ at Camden
                                    Arts Centre in 1977, along with later editions of the map. At the time, the map was
                                    ‘only just beginning to be recognized as a classic of twentieth century graphic
                                    design’, and Harry Beck – as he became more commonly known – gradually gained renown
                                    as the creator of ‘a masterpiece of twentieth century graphic art’. Beck and his map
                                    were featured in a 25-minute BBC documentary Design Classics in 1987 and were
                                    highlighted in a 1990 exhibition entitled ‘Finding the Way – 100 Years of London’s
                                    Transport Maps’ at the London Transport Museum. This official recognition was
                                    galvanized by their naming of the Museum’s new map gallery after Beck in 1993, and
                                    today, a large display in the Museum’s ‘London by Design’ exhibition is devoted to
                                    maps of the Underground and emphasizes Beck’s role in their evolution. In
                                    recognizing the debt owed to Beck after his death in 1974, Walker urged London
                                    Transport to acknowledge him by printing a credit to Beck on the then-current design
                                    by Garbutt. Yet it was not until 2001 that Transport for London (TfL) incorporated
                                    the statement ‘This diagram is an evolution of the original design conceived in 1931
                                    by Harry Beck’ on the Tube map, cementing his association with the map and his
                                    unique role in its creation.
                                </Text>
                                <Text mt="2">
                                    Beck’s original design, however, was itself an evolution of the designs of previous
                                    maps of the Underground, particularly in their migration towards a more diagrammatic
                                    approach. Schematic maps of railway networks were already in use by the late
                                    nineteenth century and linear route diagrams, such as those designed by George Dow,
                                    were commonplace in commuter trains – including those used by Beck. This tends to be
                                    overlooked by appraisals of Beck’s design that exaggerate the scope of its
                                    innovation, promulgating the myth that his map emerged fully fledged as an isolated,
                                    single stroke of genius. Beck’s map is regularly lauded as a radical departure from
                                    previous Underground maps with their confusing surface detail and poor legibility.
                                    It is, however, always easier to evaluate an innovation from our perspective looking
                                    back, rather than from the innovator’s perspective looking forward.
                                </Text>
                                <Text mt="2">
                                    The UERL was formed in 1902 and had produced its first map showing the Underground
                                    as a coordinated system by 1908. Beck’s design incorporated several successive
                                    innovations, which included the removal of surface detail, the enlargement of the
                                    central area, and the use of Johnston-style lettering. In 1920, the map’s first
                                    named designer, MacDonald (Max) Gill, who had been commissioned to create several
                                    striking pictorial maps for the Underground in the previous, had taken the bold step
                                    to remove all surface features (including the River Thames) from the map. This
                                    achieved a greater sense of clarity and freed the map from any reference to
                                    street-level detail – a transformative move in directing the evolution of its design
                                    away from maintaining geographical fidelity. Gill also gave the map its own
                                    distinctive visual style and identity, focusing its purpose and strengthening its
                                    association with its subject. Following Gill’s removal of all surface features, Fred
                                    H. Stingemore (a draughtsman in the Publicity Manager’s Office) expanded the map’s
                                    central area slightly and compressed its periphery. His re-insertion of the Thames
                                    restored the map’s geographical context, which aided orientation and renewed its
                                    visual association with London. But it was Stingemore’s introduction of the Johnston
                                    typeface (with his simple, hand-drawn uppercase letters replacing Gill’s flamboyant
                                    calligraphic style), which perhaps signalled a new aesthetic direction that would
                                    align the map to the wider visual language of the Underground, including Charles
                                    Holden’s architecture of 1923–1942.
                                </Text>
                                <Text mt="2">
                                    Gill’s omission of surface features and Stingemore’s approach to lettering had
                                    therefore set the stage for a radical re-arrangement of the map. If its predecessors
                                    were ‘tied to the geography of London above ground’, Beck’s first published design
                                    of 1933 finally tipped the balance towards topology and embraced the new
                                    cartographic possibilities that this offered. As Beck himself justified, it simply
                                    ‘seemed common sense. If you’re going underground, why do you need to bother about
                                    geography? It’s not so important. Connections are the thing’. Gill and Stingemore
                                    also allowed scope for a more holistic aesthetic to emerge – one that could mimic
                                    the bold geometry of the uppercase letters of Johnston’s sans serif typeface. The
                                    close visual association between the microaesthetics of the lettering and the
                                    macroaesthetics of the map’s structure utilizes their similar vertical, horizontal
                                    and diagonal forms to create a sense of unity and conformity that permeates from the
                                    first impression to closer reading. As Gill’s calligraphic lettering had echoed the
                                    organic, fluid form of what Beck had called the ‘vermicelli’ of Underground lines,
                                    so Johnston’s modern typeface heralded a new approach that would be based upon
                                    clarity, directness and simplicity.
                                </Text>
                                <Text mt="2">
                                    There are many reasons for the success of Beck’s design and the magnitude of its
                                    enduring impact. When it was first published in 1933, the map presented a sufficient
                                    departure from previous designs to warrant an official plea for user feedback. Its
                                    enthusiastic reception by the public, however, not only expunged any lingering
                                    doubts, but managed to eclipse the impact of its previous designers. Garland
                                    described the map as ‘so obviously useful’, with Roberts identifying that its
                                    usability is ultimately derived from the simplicity of its design. Others, such as
                                    Pike, ascribe the success of the map to the colour-coding of its lines: ‘the primary
                                    feature that Beck borrowed from the failed attempts of his predecessors to
                                    conceptualize the Underground as a modernist space’. Certainly, the success of
                                    Beck’s design is due to a combination of factors, which include an internal
                                    structure that offered enhanced usability; an aesthetic appeal that resonated
                                    sufficiently with society to facilitate its positive reception; and its agency to
                                    transform the negative image of the Underground within the minds of its would-be
                                    users. Beck therefore produced the right map at the right time and in the right
                                    place, but he also ensured that it would affect its users in the right way by
                                    promising a modern experience of urban travel that they desired.
                                </Text>
                                <Text mt="2">
                                    Bain considers the most significant trait of transit maps to be their geographical
                                    distortion, which is what makes them practical. For Garland, the distortion in
                                    Beck’s map was ‘purposeful, straightforward and skilful’. The exclusion of surface
                                    features allowed Beck to introduce a level of distortion that could achieve greater
                                    clarity and balance without incurring excessive disorientation (for a geometric
                                    analysis). Indeed, passengers can sometimes find too much distortion unacceptable,
                                    with the 1972 subway map of New York City abandoned for this reason. More
                                    specifically, the architecture of Beck’s design, as constructed by straightening the
                                    lines and limiting changes in their direction to 45° and 90° angles (termed
                                    octolinearity), served to reduce the inherent complexity of the network, enhancing
                                    the map’s usability. As Roberts explains, ‘[b]y casting away irrelevant details,
                                    [Beck] presented the routes as simple, straight lines, minimising their kinks,
                                    maintaining interchanges, and making overall trajectories […] easier to identify’.
                                    Since straighter lines induce a lower cognitive load than twisting ones, journeys
                                    become easier to plan and remember. In addition, maps with the simplest line
                                    trajectories tend to be judged as the most usable, although octolinearity does not
                                    always offer the most effective solution. Beck’s map was not the first octolinear
                                    transit map to be published, e.g. Cartwright presents a map of the Berlin S-Bahn
                                    that was published in 1931, but the global influence of Beck’s design has ensured
                                    that octolinearity remains the most frequent choice for schematic maps in which line
                                    trajectories are depicted as linear.
                                </Text>
                                <Text mt="2">
                                    Regardless of the source of his inspiration, Beck’s design principles created a
                                    graphic identity and ensured a continuity that remains unparalleled in any other
                                    metropolitan subway diagram. They also exhibit an aesthetic appeal that generates
                                    positive connotations for would-be users of the Underground. Walker identified
                                    principles that are historically associated with Classicism, i.e. order, unity,
                                    harmony, stability, purity, clarity, economy, anonymity of finish, and rationality.
                                    More recently, Roberts et al. define the principles of successful transit map design
                                    as simplicity, coherence, balance, harmony, and topographicity. If Beck knew
                                    intuitively that the most elementary and simple of forms, if well-proportioned and
                                    of graceful contour, are the most pleasing, he applied a graphical approach that
                                    tempered the visual harshness of lines changing their direction by using tight
                                    curves instead of angular joins (unlike the later attempt by Hutchison), to create a
                                    perception of flow. Together with the regularity of straight lines and evenly spaced
                                    stations, this presented an image of London for the modern era.
                                </Text>
                                <Text mt="2">
                                    The public welcomed this new, utopian image of the city. In the grip of an economic
                                    depression, the financial argument for modern industrial design grew and a machine
                                    aesthetic began to emerge in the design vocabulary of British products; clean modern
                                    lines reflected a new industrial functionalism. Beck’s regular angles and vibrant
                                    colours met the public taste for the machine aesthetic and were in step with the Art
                                    Deco style. For London in the 1930s, the requirements of mass-production had
                                    elevated efficiency, functionality, and standardization as new social values to
                                    which Beck’s map presented ‘an ideal image of modern time and space: orderly, lucid,
                                    regular, efficient, and entirely functional’. Central to the map’s success, then,
                                    was the transformative possibility it offered to re-imagine the Underground, and,
                                    ultimately, London itself. As Pike puts it, the ‘outmoded, filthy underground of
                                    mining and slums’ gave way to the ‘inorganic, ordered space of modernism’. To those
                                    encountering the map, it therefore communicated in that first half-second a fresh
                                    and positive image of the city as a whole. For Garland, the map transcends its
                                    navigational purpose, since ‘the optimistic vision it offered of a city that was not
                                    chaotic […]. Its bright, clean and colourful design exuded confidence in every
                                    line’. The map, therefore, served to replace negative connotations of the
                                    Underground with positive connotations, affecting users’ perceptions and behaviour.
                                    More simply, the image of the map aligned to what users of the Underground wanted it
                                    to be – a clean, straightforward and efficient way of getting around the city.
                                </Text>
                                <Text mt="2">
                                    Giving people confidence to use the Underground was the ultimate purpose of Beck’s
                                    map, and this particular motivation – to give users confidence – perhaps lies at the
                                    very heart of cartographic design. As Berger noted, Beck’s map gives ‘mastery and
                                    power’, providing the user with ‘the illusion of control, somehow of this vast
                                    entity’. Beyond this, Hornsey believes that the map ‘sought to revise how individual
                                    passengers responded to the corporate built environment, so that they might learn to
                                    align their behaviour with the spatial requirements of the dynamic system’, drawing
                                    a comparison, for example, with the introduction of escalators in 1924 to regulate
                                    passenger movement. Penrice suggests that map and traveller become a working model
                                    of the railway, and not a static representation. Indeed, although maps can empower
                                    users, their performative function includes their agency to influence user
                                    behaviour, and the map’s continued serves to reinforce this agency. Perhaps more so
                                    for Beck’s map than for its predecessors, this agency is derived from an impression
                                    of unauthoredness; its inorganic, abstract form contrasts with their organic,
                                    representative design while its rationalization of the chaos of the Underground
                                    network and machine aesthetic suggest that the map is a product of the Underground
                                    network itself. As Walker observed, passengers look through it rather than at it
                                    (emphasis original). For them, the map is the network.
                                </Text>
                            </AccordionPanel>
                        </AccordionItem>

                        <AccordionItem>
                            <h2>
                                <AccordionButton>
                                    <Box as="span" flex="1" textAlign="left">
                                        Questions
                                    </Box>
                                    <AccordionIcon />
                                </AccordionButton>
                            </h2>
                            <AccordionPanel pb={4}>
                                {unlockSimplePathAttempts > 0 &&
                                    questions.map((q, i) => (
                                        <Box key={q.question}>
                                            <Text mt="2" mb="2">
                                                {q.question}
                                            </Text>
                                            {q.answers.length === 1 ? (
                                                <RadioGroup
                                                    onChange={val => {
                                                        const ans = structuredClone(answers);
                                                        ans[i] = [val];
                                                        setAnswers(ans);
                                                    }}
                                                    value={answers[i][0]}
                                                >
                                                    <Stack direction="column">
                                                        {q.choices.map(c => (
                                                            <Radio key={c} value={c}>
                                                                {c}
                                                            </Radio>
                                                        ))}
                                                    </Stack>
                                                </RadioGroup>
                                            ) : (
                                                <CheckboxGroup
                                                    colorScheme="green"
                                                    onChange={val => {
                                                        const ans = structuredClone(answers);
                                                        ans[i] = val as string[];
                                                        setAnswers(ans);
                                                    }}
                                                    value={answers[i]}
                                                >
                                                    <Stack direction="column">
                                                        {q.choices.map(c => (
                                                            <Checkbox key={c} value={c}>
                                                                {c}
                                                            </Checkbox>
                                                        ))}
                                                    </Stack>
                                                </CheckboxGroup>
                                            )}
                                        </Box>
                                    ))}
                            </AccordionPanel>
                        </AccordionItem>
                    </Accordion>
                </ModalBody>

                <ModalFooter>
                    <Button onClick={handleChange} isDisabled={unlockSimplePathAttempts === 0}>
                        {unlockSimplePathAttempts < 0
                            ? t('header.settings.procedures.unlockSimplePath.unlocked')
                            : unlockSimplePathAttempts === 0
                            ? t('header.settings.procedures.unlockSimplePath.maximumAttemptsExceed')
                            : t('header.settings.procedures.unlockSimplePath.check')}
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
};
