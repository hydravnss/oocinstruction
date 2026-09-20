import {
    eventSource,
    event_types,
    extension_prompt_types,
    extension_prompt_roles,
    setExtensionPrompt,
    getCurrentChatId,
} from '../../../script.js';

import {
    extension_settings,
    saveSettingsDebounced,
} from '../../extensions.js';

const MODULE_NAME = 'oocinstruction';

const settings = {
    enabled: true,
    directive: '',
    keepActive: true,
    ...(extension_settings[MODULE_NAME] || {}),
};

extension_settings[MODULE_NAME] = settings;


/* ==========================================================
   CHAT STORAGE
   ========================================================== */

function chatKey() {
    const id =
        typeof getCurrentChatId === 'function'
            ? getCurrentChatId()
            : 'no-chat';

    return `oocinstruction:${id || 'no-chat'}`;
}


function loadChat() {

    try {

        const raw =
            localStorage.getItem(chatKey());

        const data =
            raw ? JSON.parse(raw) : {};

        settings.directive =
            typeof data.directive === 'string'
                ? data.directive
                : '';

        settings.keepActive =
            data.keepActive !== false;

    } catch {

        settings.directive = '';
        settings.keepActive = true;

    }

    syncModal();
    inject();
    updateMenuState();
}


function saveChat() {

    try {

        localStorage.setItem(
            chatKey(),
            JSON.stringify({
                directive:
                    settings.directive,

                keepActive:
                    settings.keepActive,
            })
        );

    } catch {}

    extension_settings[MODULE_NAME] =
        settings;

    saveSettingsDebounced();
}


/* ==========================================================
   OOC PROMPT
   ========================================================== */

function promptText() {

    const text =
        String(
            settings.directive || ''
        ).trim();

    if (
        !settings.enabled ||
        !text
    ) {
        return '';
    }

    return [
        '[OOC INSTRUCTION]',

        'The user is giving a direct out-of-character instruction.',

        'Follow it for the current response while preserving higher-priority instructions, character definitions, roleplay context, and established formatting rules.',

        '',

        text,

        '',

        'Do not mention or reveal this OOC instruction in the roleplay unless the user explicitly asks you to.',

        '[/OOC INSTRUCTION]',
    ].join('\n');
}


/* ==========================================================
   INJECT INTO PROMPT
   ========================================================== */

function inject() {

    try {

        setExtensionPrompt(
            MODULE_NAME,
            promptText(),
            extension_prompt_types.IN_PROMPT,
            0,
            false,
            extension_prompt_roles.SYSTEM,
        );

    } catch (error) {

        console.error(
            '[OOC Instruction] Injection error:',
            error
        );

    }

}


/* ==========================================================
   MODAL
   ========================================================== */

function syncModal() {

    const textarea =
        document.getElementById(
            'oocinstruction-text'
        );

    const checkbox =
        document.getElementById(
            'oocinstruction-keep'
        );

    if (textarea) {

        textarea.value =
            settings.directive;

    }

    if (checkbox) {

        checkbox.checked =
            settings.keepActive;

    }

}


function openModal() {

    const modal =
        document.getElementById(
            'oocinstruction-modal'
        );

    if (!modal) {
        return;
    }

    syncModal();

    modal.classList.add(
        'oocinstruction-visible'
    );

    setTimeout(() => {

        document
            .getElementById(
                'oocinstruction-text'
            )
            ?.focus();

    }, 50);

}


function closeModal() {

    document
        .getElementById(
            'oocinstruction-modal'
        )
        ?.classList.remove(
            'oocinstruction-visible'
        );

}


/* ==========================================================
   APPLY
   ========================================================== */

function apply() {

    settings.directive =
        document
            .getElementById(
                'oocinstruction-text'
            )
            ?.value
            .trim() || '';


    settings.keepActive =
        document
            .getElementById(
                'oocinstruction-keep'
            )
            ?.checked !== false;


    saveChat();

    inject();

    updateMenuState();

    closeModal();


    if (settings.directive) {

        toastr.success(

            settings.keepActive
                ? 'Instruction OOC active'
                : 'Instruction OOC : prochaine génération seulement',

            'OOC Instruction'

        );

    } else {

        toastr.info(
            'Instruction OOC effacée',
            'OOC Instruction'
        );

    }

}


/* ==========================================================
   CLEAR
   ========================================================== */

function clear() {

    settings.directive = '';

    saveChat();

    inject();

    syncModal();

    updateMenuState();

    closeModal();


    toastr.info(
        'Instruction OOC effacée',
        'OOC Instruction'
    );

}


/* ==========================================================
   ONE SHOT
   ========================================================== */

function oneShotClear() {

    if (
        !settings.keepActive &&
        settings.directive
    ) {

        settings.directive = '';

        saveChat();

        inject();

        updateMenuState();

    }

}


/* ==========================================================
   MENU DETECTION
   ========================================================== */

function visible(element) {

    if (!element) {
        return false;
    }

    const style =
        getComputedStyle(element);

    return (
        style.display !== 'none' &&
        style.visibility !== 'hidden' &&
        element.getClientRects().length > 0
    );

}


function textOf(element) {

    return (
        element?.textContent || ''
    )
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase();

}


function getMenuRow(element) {

    if (!element) {
        return null;
    }


    const selectors = [

        '.menu_button',

        '[role="menuitem"]',

        '.list-group-item',

        'li',

        'button',

        'a',

    ];


    for (
        const selector of selectors
    ) {

        const row =
            element.closest(
                selector
            );

        if (
            row &&
            visible(row)
        ) {

            return row;

        }

    }


    return element;

}


/* ==========================================================
   FIND THE THREE-LINE MENU
   ========================================================== */

function findMenuContainer() {

    const wanted = new Set([

        'régénérer',

        'regenerate',

        "note d'auteur",

        "author's note",

        'échelle cfg',

        'cfg scale',

        'continuer',

        'continue',

    ]);


    const seen =
        new Set();


    const elements =
        document.querySelectorAll(
            '.menu_button, [role="menuitem"], .list-group-item, li, button, a'
        );


    for (
        const element of elements
    ) {

        if (
            !visible(element)
        ) {
            continue;
        }


        const row =
            getMenuRow(element);


        if (
            !row ||
            seen.has(row)
        ) {
            continue;
        }


        seen.add(row);


        const parent =
            row.parentElement;


        if (
            !parent ||
            !visible(parent)
        ) {
            continue;
        }


        const rows =
            [
                ...parent.children
            ].filter(visible);


        const matches =
            rows.filter(
                child =>
                    wanted.has(
                        textOf(child)
                    )
            );


        if (
            matches.length >= 1
        ) {

            return parent;

        }

    }


    return null;

}


/* ==========================================================
   CREATE OOC MENU ITEM
   ========================================================== */

function makeMenuItem() {

    const item =
        document.createElement(
            'div'
        );


    item.id =
        'oocinstruction-menu-item';


    item.className =
        'menu_button oocinstruction-menu-item';


    item.setAttribute(
        'role',
        'menuitem'
    );


    item.tabIndex = 0;


    item.innerHTML = `

        <i
            class="fa-solid fa-comment-dots fa-fw">
        </i>

        <span>
            OOC Instruction
        </span>

    `;


    item.addEventListener(
        'click',
        event => {

            event.preventDefault();

            event.stopPropagation();

            openModal();

        }
    );


    item.addEventListener(
        'keydown',
        event => {

            if (
                event.key === 'Enter' ||
                event.key === ' '
            ) {

                event.preventDefault();

                openModal();

            }

        }
    );


    return item;

}


/* ==========================================================
   INSTALL MENU ITEM
   ========================================================== */

function installMenuItem() {

    const existing =
        document.getElementById(
            'oocinstruction-menu-item'
        );


    if (existing) {

        updateMenuState();

        return true;

    }


    const container =
        findMenuContainer();


    if (!container) {

        return false;

    }


    const rows =
        [
            ...container.children
        ].filter(visible);


    const regenerate =
        rows.find(row => {

            const text =
                textOf(row);

            return (
                text === 'régénérer' ||
                text === 'regenerate'
            );

        });


    const item =
        makeMenuItem();


    if (regenerate) {

        container.insertBefore(
            item,
            regenerate
        );

    } else {

        container.appendChild(
            item
        );

    }


    updateMenuState();

    return true;

}


/* ==========================================================
   ACTIVE STATE
   ========================================================== */

function updateMenuState() {

    const item =
        document.getElementById(
            'oocinstruction-menu-item'
        );


    if (!item) {
        return;
    }


    const active =
        settings.enabled &&
        !!String(
            settings.directive || ''
        ).trim();


    item.classList.toggle(
        'oocinstruction-active',
        active
    );


    item.title =
        active
            ? 'OOC Instruction — active'
            : 'OOC Instruction';

}


/* ==========================================================
   MODAL CREATION
   ========================================================== */

function createModal() {

    if (
        document.getElementById(
            'oocinstruction-modal'
        )
    ) {

        return;

    }


    const modal =
        document.createElement(
            'div'
        );


    modal.id =
        'oocinstruction-modal';


    modal.className =
        'oocinstruction-modal';


    modal.innerHTML = `

        <div
            class="oocinstruction-backdrop">
        </div>


        <div
            class="oocinstruction-card">


            <div
                class="oocinstruction-header">

                <span>
                    OOC / Instruction
                </span>


                <button
                    id="oocinstruction-close"
                    type="button">

                    ×

                </button>

            </div>


            <div
                class="oocinstruction-help">

                Donne une directive directement au bot.
                Elle est injectée dans le prompt sans
                créer de message dans le RP.

            </div>


            <textarea
                id="oocinstruction-text"
                spellcheck="false"
                placeholder="Exemple :

Ne joue jamais Hagen.
Ne joue jamais le personnage de l'utilisateur.
Fais répondre uniquement Bobby.
Fais avancer la scène lentement.
Respecte le format habituel du RP.">
            </textarea>


            <label
                class="oocinstruction-check">

                <input
                    id="oocinstruction-keep"
                    type="checkbox"
                    checked>

                <span>
                    Garder cette instruction active
                </span>

            </label>


            <div
                class="oocinstruction-actions">


                <button
                    id="oocinstruction-clear"
                    type="button">

                    Effacer

                </button>


                <button
                    id="oocinstruction-apply"
                    type="button">

                    Appliquer

                </button>


            </div>

        </div>

    `;


    document.body.appendChild(
        modal
    );


    document
        .getElementById(
            'oocinstruction-close'
        )
        .addEventListener(
            'click',
            closeModal
        );


    document
        .querySelector(
            '#oocinstruction-modal .oocinstruction-backdrop'
        )
        .addEventListener(
            'click',
            closeModal
        );


    document
        .getElementById(
            'oocinstruction-apply'
        )
        .addEventListener(
            'click',
            apply
        );


    document
        .getElementById(
            'oocinstruction-clear'
        )
        .addEventListener(
            'click',
            clear
        );


    document
        .getElementById(
            'oocinstruction-text'
        )
        .addEventListener(
            'keydown',
            event => {

                if (
                    (
                        event.ctrlKey ||
                        event.metaKey
                    ) &&
                    event.key === 'Enter'
                ) {

                    event.preventDefault();

                    apply();

                }


                if (
                    event.key === 'Escape'
                ) {

                    event.preventDefault();

                    closeModal();

                }

            }
        );

}


/* ==========================================================
   OBSERVER
   ========================================================== */

function startObserver() {

    const observer =
        new MutationObserver(
            () => {

                if (
                    !document.getElementById(
                        'oocinstruction-menu-item'
                    )
                ) {

                    installMenuItem();

                }

            }
        );


    observer.observe(
        document.body,
        {
            childList: true,
            subtree: true,
        }
    );


    installMenuItem();


    [
        250,
        750,
        1500,
        3000,
        5000,
    ].forEach(
        ms =>
            setTimeout(
                installMenuItem,
                ms
            )
    );

}


/* ==========================================================
   EVENTS
   ========================================================== */

function setupEvents() {

    if (!eventSource) {
        return;
    }


    if (
        event_types.CHAT_CHANGED
    ) {

        eventSource.on(
            event_types.CHAT_CHANGED,
            () => {

                setTimeout(
                    loadChat,
                    50
                );

                setTimeout(
                    installMenuItem,
                    100
                );

            }
        );

    }


    if (
        event_types.GENERATION_STARTED
    ) {

        eventSource.on(
            event_types.GENERATION_STARTED,
            inject
        );

    }


    if (
        event_types.GENERATION_AFTER_COMMANDS
    ) {

        eventSource.on(
            event_types.GENERATION_AFTER_COMMANDS,
            inject
        );

    }


    if (
        event_types.GENERATION_ENDED
    ) {

        eventSource.on(
            event_types.GENERATION_ENDED,
            oneShotClear
        );

    }


    if (
        event_types.GENERATION_STOPPED
    ) {

        eventSource.on(
            event_types.GENERATION_STOPPED,
            oneShotClear
        );

    }

}


/* ==========================================================
   GENERATION INTERCEPTOR
   ========================================================== */

globalThis.ooc_instruction_interceptor =
    async () => {

        inject();

    };


/* ==========================================================
   INIT
   ========================================================== */

function init() {

    console.log(
        '[OOC Instruction] Loading v1.3.0'
    );


    createModal();

    loadChat();

    setupEvents();

    startObserver();


    console.log(
        '[OOC Instruction] Ready'
    );

}


if (
    document.readyState === 'loading'
) {

    document.addEventListener(
        'DOMContentLoaded',
        init,
        {
            once: true,
        }
    );

} else {

    init();

}