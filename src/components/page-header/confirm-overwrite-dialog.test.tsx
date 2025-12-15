import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { render } from '../../test-utils';
import { CURRENT_VERSION } from '../../util/save';
import ConfirmOverwriteDialog from './confirm-overwrite-dialog';

// Mock the translation hook
vi.mock('react-i18next', async () => {
    const actual = await vi.importActual('react-i18next');
    return {
        ...actual,
        useTranslation: () => ({
            t: (key: string, options?: any) => {
                if (key === 'header.open.confirmOverwrite.title') return 'Confirm overwrite';
                if (key === 'header.open.confirmOverwrite.body')
                    return 'This action will overwrite your current project. Any unsaved changes will be lost. Are you sure you want to continue?';
                if (key === 'header.open.confirmOverwrite.overwrite') return 'Overwrite';
                if (key === 'cancel') return 'Cancel';
                if (key === 'header.open.confirmOverwrite.newerVersion')
                    return `Warning: This save file is from a newer version (${options?.saveVersion}) than the current version (${options?.currentVersion}). Loading it may cause errors or undefined behavior.`;
                return key;
            },
        }),
    };
});

describe('ConfirmOverwriteDialog', () => {
    it('should not show version warning when saveVersion is 0', () => {
        render(<ConfirmOverwriteDialog isOpen={true} onClose={vi.fn()} onConfirm={vi.fn()} saveVersion={0} />);

        expect(screen.getByText('Confirm overwrite')).toBeInTheDocument();
        expect(
            screen.getByText(
                'This action will overwrite your current project. Any unsaved changes will be lost. Are you sure you want to continue?'
            )
        ).toBeInTheDocument();
        expect(screen.queryByText(/Warning:/)).not.toBeInTheDocument();
    });

    it('should not show version warning when saveVersion equals CURRENT_VERSION', () => {
        render(
            <ConfirmOverwriteDialog isOpen={true} onClose={vi.fn()} onConfirm={vi.fn()} saveVersion={CURRENT_VERSION} />
        );

        expect(screen.getByText('Confirm overwrite')).toBeInTheDocument();
        expect(screen.queryByText(/Warning:/)).not.toBeInTheDocument();
    });

    it('should not show version warning when saveVersion is less than CURRENT_VERSION', () => {
        render(
            <ConfirmOverwriteDialog
                isOpen={true}
                onClose={vi.fn()}
                onConfirm={vi.fn()}
                saveVersion={CURRENT_VERSION - 10}
            />
        );

        expect(screen.getByText('Confirm overwrite')).toBeInTheDocument();
        expect(screen.queryByText(/Warning:/)).not.toBeInTheDocument();
    });

    it('should show version warning when saveVersion is greater than CURRENT_VERSION', () => {
        const newerVersion = CURRENT_VERSION + 10;
        render(
            <ConfirmOverwriteDialog isOpen={true} onClose={vi.fn()} onConfirm={vi.fn()} saveVersion={newerVersion} />
        );

        expect(screen.getByText('Confirm overwrite')).toBeInTheDocument();
        expect(
            screen.getByText(
                `Warning: This save file is from a newer version (${newerVersion}) than the current version (${CURRENT_VERSION}). Loading it may cause errors or undefined behavior.`
            )
        ).toBeInTheDocument();
    });

    it('should render buttons correctly', () => {
        render(<ConfirmOverwriteDialog isOpen={true} onClose={vi.fn()} onConfirm={vi.fn()} saveVersion={0} />);

        expect(screen.getByText('Cancel')).toBeInTheDocument();
        expect(screen.getByText('Overwrite')).toBeInTheDocument();
    });

    it('should not render when isOpen is false', () => {
        render(<ConfirmOverwriteDialog isOpen={false} onClose={vi.fn()} onConfirm={vi.fn()} saveVersion={100} />);

        expect(screen.queryByText('Confirm overwrite')).not.toBeInTheDocument();
    });
});
