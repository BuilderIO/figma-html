/// <reference types="react" />
export declare const theme: {
    typography: {
        fontFamily: string;
    };
    page: {
        tableMaxWidth: number;
        formMaxWidth: number;
    };
    colors: {
        primary: string;
        primaryDark: string;
        primaryLight: string;
        readonly primaryGradient: string;
        primaryWithOpacity(opacity: number): string;
        green: string;
        readonly success: string;
        readonly secondary: string;
    };
    fonts: {
        base: string;
    };
    studio: {
        tabs: import("react").CSSProperties;
        container: import("react").CSSProperties;
        sideBar: import("react").CSSProperties;
    };
    transitions: {
        easing: string;
        for(...properties: string[]): string;
    };
};
