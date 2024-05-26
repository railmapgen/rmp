export interface MasterSvgsElem {
    id: string;
    type: string;
    x: string;
    y: string;
    attrs: object;
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
    nodeType: 'MiscNode' | 'Station';
    svgs: MasterSvgsElem[];
    components: MasterComponent[];
    color?: MasterComponent;
    core?: string;
}
