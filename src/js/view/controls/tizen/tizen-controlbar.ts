import Controlbar from 'view/controls/controlbar';
import { cloneIcons } from 'view/controls/icons';
import TimeSlider from 'view/controls/components/timeslider';
import CustomButton from 'view/controls/components/custom-button';
import button, { Button } from 'view/controls/components/button';
import { SimpleTooltip } from 'view/controls/components/simple-tooltip';
import { toggleClass } from 'utils/dom';
import type { PlayerAPI } from 'types/generic.type';
import type ViewModel from 'view/view-model';
import type NextUpToolTip from 'view/controls/nextuptooltip';

type ControlbarElement = HTMLElement | Button | TimeSlider;

function div(classes: string): HTMLElement {
    const element = document.createElement('div');
    element.className = `jw-reset ${classes}`;
    return element;
}

const appendChildren = (container: HTMLElement, elements: HTMLElement[]) => {
    elements.forEach(e => {
        container.appendChild(e);
    });
};

function getHTMLElements(elements: ControlbarElement[]): HTMLElement[] {
    return elements.map(e => {
        if ('element' in e) {
            return e.element();
        }
        return e;
    })
}

function setTooltip(tooltip: SimpleTooltip): void {
    tooltip.open();
    tooltip.close();
}

function isVisibleButton(el: ControlbarElement): boolean {
    return 'element' in el && el.element().style.display !== 'none' && el.element().classList.contains('jw-button-color');
}

function getNextButton(activeButton: Button, layout: ControlbarElement[], toRight: boolean): Button | undefined {
    if (!activeButton) {
        return;
    }

    const index = layout.indexOf(activeButton);
    const incr = toRight ? 1 : -1;

    for (let i = index + incr; i >= 0 && i < layout.length; i += incr) {
        const element = layout[i];
        if (isVisibleButton(element)) {
            return element as Button;
        }
    }

    return;
}

export default class TizenControlbar extends Controlbar {
    _api: PlayerAPI;
    _model: ViewModel;
    elements: any;
    topLayout: ControlbarElement[];
    bottomLayout: ControlbarElement[];
    activeButton: Button | null;
    el: HTMLElement;
    nextUpToolTip: NextUpToolTip;
    element: any;
    on: any;
    trigger: any;

    constructor(_api: PlayerAPI, _model: ViewModel, _accessibilityContainer: any) {
        super(_api, _model, _accessibilityContainer);

        this._api = _api;
        this._model = _model;
        this.activeButton = null;
        const localization = _model.get('localization');
        const timeSlider = new TimeSlider(_model, _api, _accessibilityContainer.querySelector('.jw-time-update'));
        
        const superElements = this.elements;

        const elements = this.elements = {
            alt: superElements.alt,
            play: superElements.play,
            live: superElements.live,
            elapsed: superElements.elapsed,
            countdown: superElements.countdown,
            time: timeSlider,
            duration: superElements.duration,
            settingsButton: superElements.settingsButton,
            back: button('jw-icon-back', () => {
                this.trigger('backClick');
            }, 'Back', cloneIcons('arrow-left')),
            topContainer: div('jw-top-container'),
            bottomContainer: div('jw-bottom-container'),
            buttonContainer: div('jw-button-container')
        };

        // Remove play tooltip
        elements.play.element().removeChild(elements.play.element().querySelector('.jw-tooltip-play'));

        // Add button text tooltips
        setTooltip(SimpleTooltip(elements.settingsButton.element(), 'settings', localization.settings));
        setTooltip(SimpleTooltip(elements.back.element(), 'back', 'Back'));

        this.topLayout = [
            elements.back,
            elements.settingsButton
        ];

        this.bottomLayout = [
            elements.play,
            elements.alt,
            elements.live,
            elements.elapsed,
            elements.time,
            elements.countdown
        ];

        const layout = [
            elements.topContainer,
            elements.buttonContainer,
            elements.bottomContainer
        ];

        this.el = document.createElement('div');
        this.el.className = 'jw-tizen-controlbar jw-controlbar jw-reset';

        appendChildren(elements.topContainer, getHTMLElements(this.topLayout));
        appendChildren(elements.bottomContainer,getHTMLElements(this.bottomLayout));
        appendChildren(this.el, layout);

        // Initial State
        elements.play.show();
        elements.back.show();
    }

    handleKeydown(evt: KeyboardEvent, isShowing: boolean): void {
        const activeButton = this.activeButton;
        let inTopControls = false;
        let inBottomControls = false;
        let rightButton: Button | undefined;
        let leftButton: Button | undefined;

        if (activeButton) {
            inTopControls = this.elements.topContainer.contains(activeButton.element());
            inBottomControls = this.elements.bottomContainer.contains(activeButton.element());
    
            const layout = inTopControls ? this.topLayout : this.bottomLayout;
            rightButton = getNextButton(activeButton, layout, true);
            leftButton = getNextButton(activeButton, layout, false);
        }

        switch (evt.keyCode) {
            case 37: // left-arrow
                if (leftButton) {
                    this.setActiveButton(leftButton);
                    return;
                }
                break;
            case 39: // right-arrow
                if (rightButton) {
                    this.setActiveButton(rightButton);
                    return;
                }
                break;
            case 38: // up-arrow
                if (!isShowing || !activeButton) {
                    this.setActiveButton(this.elements.play);
                    return;
                }

                if (inBottomControls) {
                    if (isVisibleButton(this.elements.settingsButton)) {
                        this.setActiveButton(this.elements.settingsButton);
                    } else {
                        this.setActiveButton(this.elements.back);
                    }
                    return;
                }
                break;
            case 40: // down-arrow
                if (!isShowing || !activeButton) {
                    this.setActiveButton(this.elements.play);
                    return;
                }

                if (inTopControls) {
                    this.setActiveButton(this.elements.play);
                    return;
                }
                break;
            case 13: // center/enter
                if (isShowing && activeButton) {
                    activeButton.ui.trigger('click');
                }
                break;
            case 412: // Rewind
                break;
            case 417: // FastForward
                break;
            default:
                break;
        }
    }

    setActiveButton(nextButton: Button): void {
        const currentActiveButton = this.activeButton;
        if (currentActiveButton === nextButton) {
            return;
        }

        if (currentActiveButton) {
            toggleClass(currentActiveButton.element(), 'jw-active', false);
        }

        this.activeButton = nextButton;
        toggleClass(nextButton.element(), 'jw-active', true);
    }

    onAudioMode(): void { /* */ }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    updateButtons(model: ViewModel, newButtons: CustomButton[], oldButtons: CustomButton[]): void {
        if (!newButtons) {
            return;
        }
        
        const buttonContainer = this.elements.buttonContainer;

        for (let i = newButtons.length - 1; i >= 0; i--) {
            let buttonProps = newButtons[i];
            const newButton = new CustomButton(
                buttonProps.img,
                buttonProps.tooltip,
                buttonProps.callback,
                buttonProps.id,
                buttonProps.btnClass
            );

            if (buttonProps.tooltip) {
                SimpleTooltip(newButton.element(), buttonProps.id, buttonProps.tooltip);
            }

            buttonContainer.appendChild(newButton.element());
        }
    }

    destroy(): void {
        this.activeButton = null;
        super.destroy.apply(this);
    }
}
