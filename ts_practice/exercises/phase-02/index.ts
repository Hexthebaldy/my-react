export function createElement(e:'div'):HTMLDivElement;
export function createElement(e:'a'): HTMLAnchorElement;
export function createElement(e:'input'):HTMLInputElement;
export function createElement(e:'div' | 'a' | 'input'):HTMLDivElement | HTMLAnchorElement | HTMLInputElement{
    if(e === 'div'){
        return document.createElement('div');
    }

    if(e === 'a'){
        return document.createElement('a');
    }

    if(e === 'input'){
        return document.createElement('input');
    }
    return document.createElement(e);
}