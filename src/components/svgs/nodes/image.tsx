import { RmgButtonGroup, RmgFields, RmgFieldsField } from '@railmapgen/rmg-components';
import { Input, Image as ChakraImage } from '@chakra-ui/react';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { nanoid } from 'nanoid';
import { AttrsProps, MiscNodeId } from '../../../constants/constants';
import { Node, NodeComponentProps } from '../../../constants/nodes';
import { imageStoreIndexedDB } from '../../../util/image-store-indexed-db';

const Image = (props: NodeComponentProps<ImageAttributes>) => {
    const { id, x, y, attrs, handlePointerDown, handlePointerMove, handlePointerUp } = props;
    const {
        label = defaultImageAttributes.label,
        type = defaultImageAttributes.type,
        href = defaultImageAttributes.href,
        scale = defaultImageAttributes.scale,
        rotate = defaultImageAttributes.rotate,
    } = attrs ?? defaultImageAttributes;

    const onPointerDown = React.useCallback(
        (e: React.PointerEvent<SVGElement>) => handlePointerDown(id, e),
        [id, handlePointerDown]
    );
    const onPointerMove = React.useCallback(
        (e: React.PointerEvent<SVGElement>) => handlePointerMove(id, e),
        [id, handlePointerMove]
    );
    const onPointerUp = React.useCallback(
        (e: React.PointerEvent<SVGElement>) => handlePointerUp(id, e),
        [id, handlePointerUp]
    );

    const [imgHref, setImgHref] = React.useState<string | undefined>(undefined);
    React.useEffect(() => {
        let ignore = false;
        if (href) {
            imageStoreIndexedDB.get(id).then(src => {
                if (!ignore) setImgHref(src);
            });
        } else {
            setImgHref(undefined);
        }
        return () => {
            ignore = true;
        };
    }, [id, href]);

    return (
        <g id={id} transform={`translate(${x}, ${y})`}>
            {href === undefined || !imageStoreIndexedDB.has(id) ? (
                <g
                    transform="translate(-5, -5)"
                    className="removeMe"
                    onPointerDown={onPointerDown}
                    onPointerMove={onPointerMove}
                    onPointerUp={onPointerUp}
                    style={{ cursor: 'move' }}
                >
                    <circle cx="5" cy="5" r="5" fill="yellow" stroke="black" stroke-width="0.2" />
                    <rect x="4.6" y="2" width="0.8" height="4" fill="black" stroke="black" stroke-width="0.1" />
                    <circle cx="5" cy="7.5" r="0.4" fill="black" stroke="black" stroke-width="0.1" />
                </g>
            ) : (
                <g>
                    <g transform={`rotate(${rotate}) scale(${scale})`}>
                        {/* {type === 'file' ? (
                            <image href={imageHrefs.get(id)!} aria-label={label} />
                        ) : (
                            <image href={`${href}`} aria-label={label} />
                        )} */}
                        <image href={imgHref} aria-label={label} />
                    </g>
                    <g
                        transform="rotate(45)"
                        className="removeMe"
                        onPointerDown={onPointerDown}
                        onPointerMove={onPointerMove}
                        onPointerUp={onPointerUp}
                        style={{ cursor: 'move' }}
                    >
                        <line x1="-5" y1="0" x2="5" y2="0" stroke="black" />
                        <line x1="0" y1="-5" x2="0" y2="5" stroke="black" />
                        <circle r={5} stroke="black" fill="white" fillOpacity="0" />
                    </g>
                </g>
            )}
        </g>
    );
};

/**
 * Image specific props.
 */
export interface ImageAttributes {
    label: string;
    type: 'url' | 'file';
    href?: string;
    hash?: string;
    scale: number;
    rotate: number;
}

const defaultImageAttributes: ImageAttributes = {
    label: 'Uninitialized Image',
    type: 'file',
    scale: 1,
    rotate: 0,
};

const attrsComponent = (props: AttrsProps<ImageAttributes>) => {
    const { id, attrs, handleAttrsUpdate } = props;
    const { t } = useTranslation();

    const [imgSrc, setImgSrc] = React.useState<string | undefined>(undefined);
    React.useEffect(() => {
        let ignore = false;
        if (attrs.href) {
            imageStoreIndexedDB.get(id as MiscNodeId).then(src => {
                if (!ignore) setImgSrc(src);
            });
        } else {
            setImgSrc(undefined);
        }
        return () => {
            ignore = true;
        };
    }, [id, attrs.href]);

    // const loadExternalImage = async (url: string) => {
    //     try {
    //         const response = await fetch(url, { headers: { 'Access-Control-Allow-Origin': '*' } });
    //         if (!response.ok) {
    //             throw new Error(`下载失败: ${url}`);
    //         }
    //         const arrayBuffer = await response.arrayBuffer();

    //         const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
    //         const hashHex = bufferToHex(hashBuffer);

    //         const base64String = bufferToBase64(arrayBuffer);
    //         const mimeType = response.headers.get('Content-Type') || 'image/jpeg';
    //         const href = `data:${mimeType};base64,${base64String}`;

    //         dispatch(addImageHref({ id: id as MiscNodeId, href }));
    //         return hashHex;
    //     } catch (error) {
    //         console.error('Error loading external image:', error);
    //         return undefined;
    //     }
    // };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        console.log('File selected:', file);
        if (file) {
            const reader = new FileReader();
            reader.onload = () => {
                if (typeof reader.result === 'string') {
                    console.log('File read as base64:', reader.result);
                    console.log({ ...attrs, href: reader.result });
                    imageStoreIndexedDB.save(id as MiscNodeId, reader.result);
                    handleAttrsUpdate(id, { ...attrs, label: file.name, href: `${id}+${nanoid(5)}` });
                }
            };
            reader.readAsDataURL(file);
        }
    };

    const fields: RmgFieldsField[] = [
        {
            label: t('label'),
            type: 'input',
            value: attrs.label,
            onChange: (value: string) => handleAttrsUpdate(id, { ...attrs, label: value }),
            minW: 'full',
        },
        // {
        //     label: 'type',
        //     type: 'custom',
        //     component: (
        //         <RmgButtonGroup
        //             selections={[
        //                 {
        //                     label: t('panel.details..file'),
        //                     value: 'file',
        //                 },
        //                 {
        //                     label: t('panel.de.url'),
        //                     value: 'url',
        //                 },
        //             ]}
        //             defaultValue={attrs.type}
        //             multiSelect={false}
        //             onChange={value => handleAttrsUpdate(id, { ...attrs, type: value })}
        //         />
        //     ),
        //     minW: 'full',
        // },
        {
            label: t('scale'),
            type: 'input',
            value: (attrs.scale ?? defaultImageAttributes.scale).toString(),
            validator: (val: string) => !Number.isNaN(val),
            onChange: val => {
                attrs.scale = Number(val);
                handleAttrsUpdate(id, attrs);
            },
            minW: 'full',
            hidden: !attrs.href,
        },
        {
            label: t('rorate'),
            type: 'input',
            value: (attrs.rotate ?? defaultImageAttributes.rotate).toString(),
            validator: (val: string) => !Number.isNaN(val),
            onChange: val => {
                attrs.rotate = Number(val);
                handleAttrsUpdate(id, attrs);
            },
            minW: 'full',
            hidden: !attrs.href,
        },
        {
            label: t('image'),
            type: 'custom',
            component:
                attrs.href === undefined || !imageStoreIndexedDB.has(id as MiscNodeId) ? (
                    'Please upload file.'
                ) : (
                    <ChakraImage src={imgSrc} />
                ),
            minW: 'full',
            hidden: attrs.type !== 'file',
        },
        // {
        //     label: 'url',
        //     type: 'input',
        //     value: attrs.href ?? '',
        //     onChange: async (value: string) => {
        //         const hash = await loadExternalImage(value);
        //         handleAttrsUpdate(id, { ...attrs, href: value, hash });
        //     },
        //     minW: 'full',
        //     hidden: attrs.type !== 'url',
        // },
    ];

    return (
        <>
            <RmgFields fields={fields} />
            {attrs.type === 'file' && (
                <Input variant="flushedd" type="file" accept="image/*" onChange={handleFileChange} />
            )}
        </>
    );
};

const imageIcon = (
    <svg
        viewBox="0 0 24 24"
        height={40}
        width={40}
        focusable={false}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
    >
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <path d="M21 15l-5-5L5 21" />
    </svg>
);

const image: Node<ImageAttributes> = {
    component: Image,
    icon: imageIcon,
    defaultAttrs: defaultImageAttributes,
    attrsComponent,
    metadata: {
        displayName: 'panel.details.nodes.image.displayName',
        tags: [],
    },
};

export default image;
