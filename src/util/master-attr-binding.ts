import { Parser } from 'expr-eval';
import { MonoColour } from '@railmapgen/rmg-palette-resources';
import { CityCode, Theme } from '../constants/constants';
import { MasterAttrBinding, MasterComponent, MasterCondition, MasterSvgsElem } from '../constants/master';

interface EvaluateResult<T> {
    value?: T;
    error?: string;
}

export interface EvaluateMasterSvgAttrsResult {
    attrs: Record<string, unknown>;
    error?: string;
}

const TOKEN_RE = /\{([^{}]+)\}/g;
const MATH_FUNCTIONS = ['min', 'max', 'round', 'abs', 'floor', 'ceil'] as const;

const parser = new Parser({
    allowMemberAccess: false,
    operators: {
        add: true,
        concatenate: true,
        conditional: true,
        divide: true,
        factorial: false,
        multiply: true,
        power: true,
        remainder: true,
        subtract: true,
        logical: true,
        comparison: true,
        in: false,
        assignment: false,
    },
});

const normalizeFormulaExpression = (expression: string) => {
    return MATH_FUNCTIONS.reduce(
        (result, fn) => result.replace(new RegExp(`\\bMath\\s*\\.\\s*${fn}\\b`, 'g'), fn),
        expression
    );
};

export const normalizeTheme = (value: unknown): EvaluateResult<Theme> => {
    if (!Array.isArray(value) || value.length !== 4) {
        return { error: 'Invalid theme: expected [CityCode, string, ColourHex, MonoColour].' };
    }

    const [city, line, hex, mono] = value;
    const normalizedMono =
        mono === 'black' ? MonoColour.black : mono === 'white' ? MonoColour.white : (mono as MonoColour);

    if (!Object.values(CityCode).includes(city as CityCode)) {
        return { error: `Invalid theme city code: ${String(city)}.` };
    }
    if (typeof line !== 'string') {
        return { error: 'Invalid theme line id: expected string.' };
    }
    if (typeof hex !== 'string' || !/^#[0-9a-fA-F]{6}$/.test(hex)) {
        return { error: `Invalid theme colour: ${String(hex)}.` };
    }
    if (!Object.values(MonoColour).includes(normalizedMono)) {
        return { error: `Invalid theme text colour: ${String(mono)}.` };
    }

    return { value: [city as CityCode, line, hex as `#${string}`, normalizedMono] };
};

const getComponentDisplayName = (component: MasterComponent) => component.name || component.label;

const findComponent = (components: MasterComponent[], query: string) => {
    return (
        components.find(component => component.id === query) ?? components.find(component => component.label === query)
    );
};

const normalizeComponentValue = (component: MasterComponent) => {
    const value = component.value ?? component.defaultValue;

    if (component.type === 'number' && value !== '' && !Number.isNaN(Number(value))) {
        return Number(value);
    }
    if (component.type === 'switch') {
        return !!value;
    }
    return value;
};

const getPathValue = (value: unknown, path: string): EvaluateResult<unknown> => {
    const parts = path
        .replace(/\[(\w+)\]/g, '.$1')
        .split('.')
        .filter(Boolean);
    let current = value;

    for (const part of parts) {
        if (current === null || current === undefined) {
            return { error: `Cannot resolve path "${path}".` };
        }

        if (Array.isArray(current)) {
            const index = Number(part);
            if (!Number.isInteger(index)) {
                return { error: `Invalid array index "${part}" in path "${path}".` };
            }
            current = current[index];
        } else if (typeof current === 'object') {
            current = (current as Record<string, unknown>)[part];
        } else {
            return { error: `Cannot resolve path "${path}" on ${typeof current}.` };
        }
    }

    return { value: current };
};

const resolveVariable = (
    components: MasterComponent[],
    componentId: string,
    path?: string
): EvaluateResult<unknown> => {
    const component = findComponent(components, componentId);
    if (!component) {
        return { error: `Unknown component "${componentId}".` };
    }

    const value = normalizeComponentValue(component);
    if (component.type === 'color') {
        const theme = normalizeTheme(value);
        if (theme.error) {
            return { error: `Invalid theme for component "${getComponentDisplayName(component)}": ${theme.error}` };
        }

        const colorPath = path || 'hex';
        if (colorPath === 'hex') {
            return { value: theme.value![2] };
        }
        if (colorPath === 'text') {
            return { value: theme.value![3] };
        }

        return {
            error: `Unsupported color path "${colorPath}" for component "${getComponentDisplayName(component)}".`,
        };
    }

    if (path) {
        return getPathValue(value, path);
    }
    return { value };
};

const parseToken = (token: string): { componentId: string; path?: string } => {
    const trimmed = token.trim();
    const dotIndex = trimmed.indexOf('.');
    if (dotIndex !== -1) {
        return { componentId: trimmed.slice(0, dotIndex), path: trimmed.slice(dotIndex + 1) };
    }
    return { componentId: trimmed };
};

const stringifyTokenValue = (value: unknown) => {
    if (value === null || value === undefined) return '';
    if (typeof value === 'string') return value;
    return String(value);
};

const hasFormulaOperator = (expression: string) => {
    const withoutTokens = expression.replace(TOKEN_RE, '');
    return /[+\-*/%^<>=!&|?:]/.test(withoutTokens);
};

const hasTextOutsideTokens = (expression: string) => {
    const withoutTokens = normalizeFormulaExpression(expression.replace(TOKEN_RE, ''));
    const withoutKnownFunctions = MATH_FUNCTIONS.reduce(
        (result, fn) => result.replace(new RegExp(`\\b${fn}\\b`, 'g'), ''),
        withoutTokens
    );
    return /[A-Za-z]/.test(withoutKnownFunctions);
};

const hasDisallowedMemberAccess = (expression: string) => {
    return /(^|[^0-9])\b[A-Za-z_$][\w$]*\s*\.\s*[A-Za-z_$][\w$]*\b/.test(expression);
};

const evaluateFormula = (expression: string, components: MasterComponent[]): EvaluateResult<unknown> => {
    const variables: Record<string, unknown> = {};
    const interpolatedParts: string[] = [];
    let lastIndex = 0;
    let tokenIndex = 0;
    let tokenizedExpression = '';
    let tokenMatch: RegExpExecArray | null;

    TOKEN_RE.lastIndex = 0;
    while ((tokenMatch = TOKEN_RE.exec(expression))) {
        const [tokenText, tokenName] = tokenMatch;
        const variableName = `__rmp_${tokenIndex++}`;
        const token = parseToken(tokenName);
        const resolved = resolveVariable(components, token.componentId, token.path);

        if (resolved.error) {
            return { error: resolved.error };
        }

        tokenizedExpression += expression.slice(lastIndex, tokenMatch.index) + variableName;
        interpolatedParts.push(expression.slice(lastIndex, tokenMatch.index), stringifyTokenValue(resolved.value));
        variables[variableName] = resolved.value;
        lastIndex = tokenMatch.index + tokenText.length;
    }

    tokenizedExpression += expression.slice(lastIndex);
    interpolatedParts.push(expression.slice(lastIndex));

    const normalizedExpression = normalizeFormulaExpression(tokenizedExpression);
    if (hasDisallowedMemberAccess(normalizedExpression)) {
        return { error: `Unsupported member access in formula "${expression}".` };
    }

    try {
        return { value: parser.evaluate(normalizedExpression, variables as any) };
    } catch (e) {
        if (tokenIndex > 0 && (!hasFormulaOperator(expression) || hasTextOutsideTokens(expression))) {
            return { value: interpolatedParts.join('') };
        }

        return { error: `Invalid formula "${expression}": ${(e as Error).message}` };
    }
};

const evaluateBinding = (binding: MasterAttrBinding, components: MasterComponent[]): EvaluateResult<unknown> => {
    switch (binding.kind) {
        case 'literal':
            return { value: binding.value };
        case 'variable':
            return resolveVariable(components, binding.componentId, binding.path);
        case 'formula':
            return evaluateFormula(binding.expression, components);
        case 'conditional': {
            const condition = evaluateCondition(binding.if, components);
            if (condition.error) return condition;
            return evaluateBinding(condition.value ? binding.then : binding.else, components);
        }
        case 'legacy':
            return { error: 'Legacy attr binding is not supported in v4 master rendering.' };
        default:
            return { error: 'Unsupported attr binding.' };
    }
};

const toBoolean = (value: unknown) => {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value !== 0;
    if (typeof value === 'string') return value !== '' && value !== 'false' && value !== '0';
    return !!value;
};

const compareValues = (left: unknown, operator: string, right: unknown) => {
    switch (operator) {
        case '===':
            return Object.is(left, right);
        case '==':
            return Object.is(left, right) || String(left) === String(right);
        case '!==':
            return !Object.is(left, right);
        case '!=':
            return !(Object.is(left, right) || String(left) === String(right));
        case '>':
            return Number(left) > Number(right);
        case '>=':
            return Number(left) >= Number(right);
        case '<':
            return Number(left) < Number(right);
        case '<=':
            return Number(left) <= Number(right);
        default:
            return false;
    }
};

const evaluateCondition = (condition: MasterCondition, components: MasterComponent[]): EvaluateResult<boolean> => {
    if (typeof condition === 'boolean') {
        return { value: condition };
    }
    if (typeof condition === 'string') {
        const result = evaluateFormula(condition, components);
        return result.error ? { error: result.error } : { value: toBoolean(result.value) };
    }
    if ('kind' in condition) {
        const result = evaluateBinding(condition, components);
        return result.error ? { error: result.error } : { value: toBoolean(result.value) };
    }
    if ('expression' in condition) {
        const result = evaluateFormula(condition.expression, components);
        return result.error ? { error: result.error } : { value: toBoolean(result.value) };
    }
    if ('left' in condition && 'operator' in condition && 'right' in condition) {
        const left = evaluateBinding(condition.left, components);
        if (left.error) return { error: left.error };
        const right = evaluateBinding(condition.right, components);
        if (right.error) return { error: right.error };
        return { value: compareValues(left.value, condition.operator, right.value) };
    }
    if ('operator' in condition && condition.operator === 'not') {
        const result = evaluateCondition(condition.condition, components);
        return result.error ? { error: result.error } : { value: !result.value };
    }
    if ('operator' in condition && condition.operator === 'and') {
        for (const child of condition.conditions) {
            const result = evaluateCondition(child, components);
            if (result.error || !result.value) return result;
        }
        return { value: true };
    }
    if ('operator' in condition && condition.operator === 'or') {
        for (const child of condition.conditions) {
            const result = evaluateCondition(child, components);
            if (result.error || result.value) return result;
        }
        return { value: false };
    }

    return { error: 'Unsupported condition.' };
};

export const evaluateMasterSvgAttrs = (
    svg: MasterSvgsElem,
    components: MasterComponent[]
): EvaluateMasterSvgAttrsResult => {
    const attrs: Record<string, unknown> = {};

    for (const [attrName, binding] of Object.entries(svg.attrBindings ?? {})) {
        const result = evaluateBinding(binding, components);
        if (result.error) {
            return { attrs, error: `${svg.id}.${attrName}: ${result.error}` };
        }
        attrs[attrName] = result.value;
    }

    return { attrs };
};

export const collectMasterSvgAttrErrors = (svgs: MasterSvgsElem[], components: MasterComponent[]): string[] => {
    const errors: string[] = [];

    const collectErrors = (svg: MasterSvgsElem) => {
        const result = evaluateMasterSvgAttrs(svg, components);
        if (result.error) {
            errors.push(result.error);
        }
        svg.children?.forEach(collectErrors);
    };

    svgs.forEach(collectErrors);
    return errors;
};
