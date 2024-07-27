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

export interface MasterParam {
    randomId: string;
    label: string;
    version?: number;
    nodeType: 'MiscNode' | 'Station';
    svgs: MasterSvgsElem[];
    components: MasterComponent[];
    color?: MasterComponent;
    core?: string;
}
