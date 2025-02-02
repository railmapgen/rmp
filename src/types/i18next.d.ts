// eslint-disable-next-line import/no-unassigned-import
import 'i18next';

declare module 'i18next' {
    interface CustomTypeOptions {
        returnNull: false;
    }
}
