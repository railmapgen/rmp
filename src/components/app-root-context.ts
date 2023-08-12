import { createContext, Dispatch, SetStateAction } from 'react';
import { Theme } from '../constants/constants';

interface IAppRootContext {
    prevTheme?: Theme;
    setPrevTheme?: Dispatch<SetStateAction<Theme | undefined>>;
    nextTheme?: Theme;
    setNextTheme?: Dispatch<SetStateAction<Theme | undefined>>;
}

const AppRootContext = createContext<IAppRootContext>({});
export default AppRootContext;
