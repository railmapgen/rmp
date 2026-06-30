import { render } from '@testing-library/react';
import React from 'react';
import { describe, expect, it } from 'vitest';
import { SecondaryNameText } from './secondary-name';

describe('SecondaryNameText', () => {
    it('keeps Guangzhou two-language secondary name layout', () => {
        const { container } = render(
            <svg>
                <SecondaryNameText names={['广州南', 'Guangzhounan']} />
            </svg>
        );

        const texts = container.querySelectorAll('text');
        expect(texts).toHaveLength(2);
        expect(texts[0].textContent).toBe('广州南');
        expect(texts[0].getAttribute('font-size')).toBe('10');
        expect(texts[0].getAttribute('dy')).toBe('-2');
        expect(texts[1].textContent).toBe('Guangzhounan');
        expect(texts[1].getAttribute('font-size')).toBe('5.42');
        expect(texts[1].getAttribute('dy')).toBe('2');
    });

    it('uses the full secondary name height for Chinese-only names', () => {
        const { container } = render(
            <svg>
                <SecondaryNameText names={['广州南', '']} />
            </svg>
        );

        const texts = container.querySelectorAll('text');
        expect(texts).toHaveLength(1);
        expect(texts[0].textContent).toBe('广州南');
        expect(texts[0].getAttribute('font-size')).toBe('13.13');
        expect(texts[0].getAttribute('dominant-baseline')).toBe('middle');
        expect(texts[0].hasAttribute('dy')).toBe(false);
    });

    it('uses the full secondary name height for English-only names', () => {
        const { container } = render(
            <svg>
                <SecondaryNameText names={['', 'Guangzhounan']} />
            </svg>
        );

        const texts = container.querySelectorAll('text');
        expect(texts).toHaveLength(1);
        expect(texts[0].textContent).toBe('Guangzhounan');
        expect(texts[0].getAttribute('font-size')).toBe('11');
        expect(texts[0].getAttribute('dominant-baseline')).toBe('middle');
        expect(texts[0].getAttribute('dy')).toBe('-0.5');
    });
});
