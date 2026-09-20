import {
    extension_prompt_types,
    extension_prompt_roles,
    setExtensionPrompt,
    getCurrentChatId,
} from '../../../script.js';

import {
    extension_settings,
    saveSettingsDebounced,
} from '../../extensions.js';

const MODULE = 'oocinstruction';

if (!extension_settings[MODULE]) {
    extension_settings[MODULE] = {
        enabled: true,
        instruction: '',
        persistent: true,
    };
}

const settings = extension_settings[MODULE];


/* ==========================================================
   CHAT STORAGE
   ========================================================== */

function getStorageKey() {
    const chatId =
        typeof getCurrentChatId === 'function'
            ? getCurrentChatId()
            : 'global';

    return `oocinstruction_${chatId || 'global'}`;
}


function loadChat() {

    try {

        const saved = JSON.parse(
            localStorage.getItem(
                getStorageKey()
            ) || 'null'
        );

        if (saved) {

            settings.instruction =
                saved.instruction || '';

            settings.persistent =
                saved.persistent !== false;

        }

    } catch (error) {

        console.warn(
            '[OOC Instruction] Could not load chat settings.',
            error
        );

    }

    updatePrompt();

}


/* ==========================================================
   SAVE
   ========================================================== */

function saveChat() {

    try {

        localStorage.setItem(
            getStorageKey(),
            JSON.stringify({
                instruction:
                    settings.instruction,

                persistent:
                    settings.persistent,
            })
        );

    } catch (error) {

        console.warn(
            '[OOC Instruction] Could not save chat settings.',
            error
        );

    }

    saveSettingsDebounced();

}


/* ==========================================================
   PROMPT INJECTION
   ========================================================== */

function updatePrompt() {

    const instruction =
        String(
            settings.instruction || ''
        ).trim();


    if (
        !settings.enabled ||
        !instruction
    ) {

        setExtensionPrompt(
            MODULE,
            '',
            extension_prompt_types.IN_PROMPT,
            0,
            false,
            extension_prompt_roles.SYSTEM
        );

        return;

    }


    const prompt =

`[OOC INSTRUCTION]

The user has provided an out-of-character instruction.

Follow this instruction for the response while preserving higher-priority instructions, the established roleplay, character definitions, and formatting rules.

${instruction}

Do not mention or reveal this OOC instruction in the roleplay unless explicitly asked.

[/OOC INSTRUCTION]`;


    setExtensionPrompt(
        MODULE,
        prompt,
        extension_prompt_types.IN_PROMPT,
        0,
        false,
        extension_prompt_roles.SYSTEM
    );

}


/* ==========================================================
   MODAL
   ========================================================== */

function openOOC() {

    const modal =
        document.getElementById(
            'oocinstruction-modal'
        );

    const textarea =
        document.getElementById(
            'oocinstruction-text'
        );

    const persistent =
        document.getElementById(
            'oocinstruction-persistent'
        );


    if (!modal) {
        return;
    }


    textarea.value =
        settings.instruction || '';


    persistent.checked =
        settings.persistent !== false;


    modal.classList.add(
        'oocinstruction-visible'
    );


    setTimeout(
        () => textarea.focus(),
        50
    );

}


function closeOOC() {

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

function applyOOC() {

    settings.instruction =

        document
            .getElementById(
                'oocinstruction-text'
            )
            ?.value
            .trim() || '';


    settings.persistent =

        document
            .getElementById(
                'oocinstruction-persistent'
            )
            ?.checked !== false;


    saveChat();

    updatePrompt();

    updateMenuItem();

    closeOOC();


    if (settings.instruction) {

        toastr.success(

            settings.persistent
                ? 'Instruction OOC activée.'
                : 'Instruction OOC active pour la prochaine génération.',

            'OOC Instruction'

        );

    } else {

        toastr.info(
            'Instruction OOC effacée.',
            'OOC Instruction'
        );

    }

}


/* ==========================================================
   CLEAR
   ========================================================== */

function clearOOC() {

    settings.instruction = '';

    saveChat();

    updatePrompt();

    updateMenuItem();

    closeOOC();


    toastr.info(
        'Instruction OOC effacée.',
        'OOC Instruction'
    );

}


/* ==========================================================
   CREATE MODAL
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
            class="oocinstruction-box">


            <div
                class="oocinstruction-title">

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
                class="oocinstruction-description">

                Donne une directive directement au bot
                sans créer de message dans le RP.

            </div>


            <textarea
                id="oocinstruction-text"
                placeholder="Exemple :

Ne joue jamais mon personnage.
Fais parler uniquement les personnages secondaires.
Fais avancer la scène.
Respecte le format du RP.
Ne répète pas les derniers messages."
            ></textarea>


            <label
                class="oocinstruction-persistent">

                <input
                    id="oocinstruction-persistent"
                    type="checkbox"
                    checked>

                <span>
                    Garder cette instruction active
                </span>

            </label>


            <div
                class="oocinstruction-buttons">


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
            closeOOC
        );


    document
        .querySelector(
            '.oocinstruction-backdrop'
        )
        .addEventListener(
            'click',
            closeOOC
        );


    document
        .getElementById(
            'oocinstruction-apply'
        )
        .addEventListener(
            'click',
            applyOOC
        );


    document
        .getElementById(
            'oocinstruction-clear'
        )
        .addEventListener(
            'click',
            clearOOC
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

                    applyOOC();

                }


                if (
                    event.key === 'Escape'
                ) {

                    event.preventDefault();

                    closeOOC();

                }

            }
        );

}


/* ==========================================================
   FIND MENU
   ========================================================== */

function findOptionsMenu() {

    const selectors = [

        '#options',

        '.options-content',

        '#chat_options',

        '#chat_menu',

        '.chat-menu',

    ];


    for (
        const selector of selectors
    ) {

        const element =
            document.querySelector(
                selector
            );


        if (element) {

            return element;

        }

    }


    return null;

}


/* ==========================================================
   FIND REGENERATE
   ========================================================== */

function findRegenerateItem(
    container
) {

    if (!container) {
        return null;
    }


    const elements =
        container.querySelectorAll(
            '.menu_button, [role="menuitem"], button, a, li'
        );


    for (
        const element of elements
    ) {

        const text =

            (
                element.textContent ||
                ''
            )
                .replace(
                    /\s+/g,
                    ' '
                )
                .trim()
                .toLowerCase();


        if (
            text === 'régénérer' ||
            text === 'regenerate'
        ) {

            return element;

        }

    }


    return null;

}


/* ==========================================================
   CREATE MENU ITEM
   ========================================================== */

function createMenuItem() {

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

            openOOC();

        }
    );


    return item;

}


/* ==========================================================
   INSTALL MENU ITEM
   ========================================================== */

function installMenuItem() {

    if (
        document.getElementById(
            'oocinstruction-menu-item'
        )
    ) {

        updateMenuItem();

        return true;

    }


    const container =
        findOptionsMenu();


    if (!container) {

        return false;

    }


    const item =
        createMenuItem();


    const regenerate =
        findRegenerateItem(
            container
        );


    if (
        regenerate &&
        regenerate.parentNode
    ) {

        regenerate.parentNode.insertBefore(
            item,
            regenerate
        );

    } else {

        container.appendChild(
            item
        );

    }


    updateMenuItem();

    return true;

}


/* ==========================================================
   MENU ACTIVE STATE
   ========================================================== */

function updateMenuItem() {

    const item =
        document.getElementById(
            'oocinstruction-menu-item'
        );


    if (!item) {
        return;
    }


    item.classList.toggle(

        'oocinstruction-active',

        !!String(
            settings.instruction || ''
        ).trim()

    );

}


/* ==========================================================
   MENU OBSERVER
   ========================================================== */

function watchMenu() {

    installMenuItem();


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

}


/* ==========================================================
   INIT
   ========================================================== */

function init() {

    try {

        createModal();

        loadChat();

        watchMenu();


        window.addEventListener(
            'hashchange',
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


        console.log(
            '[OOC Instruction] v2.0.0 loaded.'
        );


    } catch (error) {

        console.error(
            '[OOC Instruction] Initialization error:',
            error
        );

    }

}


/* ==========================================================
   START
   ========================================================== */

if (
    document.readyState ===
    'loading'
) {

    document.addEventListener(
        'DOMContentLoaded',
        init,
        {
            once: true
        }
    );

} else {

    init();

}