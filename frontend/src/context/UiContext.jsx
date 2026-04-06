import { createContext, useContext, useState, useEffect } from 'react';

const UiContext = createContext();

export const UiProvider = ({ children }) => {
    const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkScreenSize = () => {
            const mobile = window.innerWidth <= 700;
            setIsMobile(mobile);
            setSidebarCollapsed(mobile);
        };
        checkScreenSize();
        window.addEventListener('resize', checkScreenSize);
        return () => window.removeEventListener('resize', checkScreenSize);
    }, []);

    return (
        <UiContext.Provider value={{ sidebarCollapsed, setSidebarCollapsed, isMobile }}>
            {children}
        </UiContext.Provider>
    );
};

export const useUi = () => useContext(UiContext);
