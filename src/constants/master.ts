import { MonoColour } from '@railmapgen/rmg-palette-resources';

export type MasterCondition =
    | boolean
    | string
    | MasterAttrBinding
    | { expression: string }
    | {
          left: MasterAttrBinding;
          operator: '===' | '==' | '!==' | '!=' | '>' | '>=' | '<' | '<=';
          right: MasterAttrBinding;
      }
    | { operator: 'and' | 'or'; conditions: MasterCondition[] }
    | { operator: 'not'; condition: MasterCondition };

export type MasterAttrBinding =
    | { kind: 'literal'; value: string | number | boolean | object | unknown[] }
    | { kind: 'variable'; componentId: string; path?: string }
    | { kind: 'formula'; expression: string }
    | { kind: 'conditional'; if: MasterCondition; then: MasterAttrBinding; else: MasterAttrBinding }
    | { kind: 'legacy'; expression: string };

export interface MasterSvgsElem {
    id: string;
    type: string;
    attrs?: Record<string, string>;
    attrBindings?: Record<string, MasterAttrBinding>;
    children?: MasterSvgsElem[];
}

export interface MasterComponent {
    id: string;
    label: string;
    name?: string;
    type: 'text' | 'textarea' | 'number' | 'switch' | 'color' | (string & {});
    constraints?: { min?: number; max?: number; step?: number; options?: string[] };
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
    labelColorBg?: `#${string}`;
    labelColorFg?: MonoColour;
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
