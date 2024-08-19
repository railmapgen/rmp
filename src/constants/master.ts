export interface MasterSvgsElem {
    id: string;
    type: string;
    attrs: Record<string, string>;
    children?: MasterSvgsElem[];
}

export interface MasterComponent {
    id: string;
    label: string;
    type: string;
    defaultValue: any;
    value?: any;
}

export interface MasterParamTransform {
    translateX: number;
    translateY: number;
    scale: number;
    rotate: number;
}

export const defaultMasterTransform: MasterParamTransform = {
    translateX: 0,
    translateY: 0,
    scale: 1,
    rotate: 0,
};

export interface MasterParam {
    randomId?: string;
    label?: string;
    version?: number;
    transform: MasterParamTransform;
    nodeType: 'MiscNode' | 'Station';
    svgs: MasterSvgsElem[];
    components: MasterComponent[];
    color?: MasterComponent;
    core?: string;
}

export const MAX_MASTER_NODE_FREE = 3;
export const MAX_MASTER_NODE_PRO = Infinity;
