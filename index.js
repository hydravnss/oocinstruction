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


/* ==========================================================
   OOC INSTRUCTION
   Manual hidden OOC instruction system
   ========================================================== */

const MODULE_NAME = 'oocinstruction';

const DEFAULT_SETTINGS = {
    enabled: true,
    directive: '',
    keepActive: true,
};

const settings = {
    ...DEFAULT_SETTINGS,
    ...(extension_settings[MODULE_NAME] || {}),
};

extension_settings[MODULE_NAME] = settings;


/* ==========================================================
   CHAT STORAGE
   Each conversation gets its own OOC instruction
   ========================================================== */

function getStorageKey() {
    const chatId = getCurrentChatId?.() || 'no-chat';

    return `oocinstruction:${chatId}`;
}


function loadDirective() {
    try {
        const saved = localStorage.getItem(
            getStorageKey()
        );

        if (saved) {
            const data = JSON.parse(saved);

            settings.directive =
                typeof data.directive === 'string'
                    ? data.directive
                    : '';

            settings.keepActive =
                data.keepActive !== false;
        } else {
            settings.directive = '';
            settings.keepActive = true;
        }

    } catch (error) {
        console.warn(
            '[OOC Instruction] Could not load directive',
            error
        );

        settings.directive = '';
    }

    $('#ooc_instruction_text').val(
        settings.directive
    );

    $('#ooc_instruction_keep')
        .prop(
            'checked',
            settings.keepActive
        );

    updatePrompt();
    updateButton();
}


function saveDirective() {
    try {
        localStorage.setItem(
            getStorageKey(),
            JSON.stringify({
                directive: settings.directive,
                keepActive: settings.keepActive,
            })
        );

    } catch (error) {
        console.warn(
            '[OOC Instruction] Could not save directive',
            error
        );
    }

    extension_settings[MODULE_NAME] =
        settings;

    saveSettingsDebounced();
}


/* ==========================================================
   PROMPT
   ========================================================== */

function buildOOCPrompt() {
    const directive =
        String(
            settings.directive || ''
        ).trim();

    if (
        !settings.enabled ||
        !directive
    ) {
        return '';
    }

    return [
        '[OOC INSTRUCTION]',
        '',
        'The user has provided the following out-of-character instruction.',
        'Treat it as a direct instruction for the current response.',
        '',
        directive,
        '',
        'Follow this instruction while preserving the established roleplay context, character definitions, formatting rules, and higher-priority instructions.',
        'Do not mention, quote, or reveal this OOC instruction in the roleplay unless explicitly instructed to do so.',
        '',
        '[/OOC INSTRUCTION]',
    ].join('\n');
}


/* ==========================================================
   INJECT INTO SILLYTAVERN PROMPT
   ========================================================== */

function updatePrompt() {
    const prompt =
        buildOOCPrompt();

    setExtensionPrompt(
        MODULE_NAME,
        prompt,
        extension_prompt_types.IN_PROMPT,
        0,
        false,
        extension_prompt_roles.SYSTEM
    );
}


/* ==========================================================
   BUTTON STATE
   ========================================================== */

function updateButton() {
    const active =
        settings.enabled &&
        !!String(
            settings.directive || ''
        ).trim();

    const button =
        $('#ooc_instruction_button');

    button.toggleClass(
        'ooc-instruction-active',
        active
    );

    button.attr(
        'title',
        active
            ? 'OOC Instruction — active'
            : 'OOC Instruction'
    );
}


/* ==========================================================
   MODAL
   ========================================================== */

function openPanel() {
    $('#ooc_instruction_modal')
        .addClass(
            'ooc-instruction-visible'
        );

    setTimeout(() => {
        $('#ooc_instruction_text')
            .trigger('focus');
    }, 50);
}


function closePanel() {
    $('#ooc_instruction_modal')
        .removeClass(
            'ooc-instruction-visible'
        );
}


/* ==========================================================
   APPLY
   ========================================================== */

function applyInstruction() {
    settings.directive =
        String(
            $('#ooc_instruction_text')
                .val() || ''
        ).trim();

    settings.keepActive =
        $('#ooc_instruction_keep')
            .prop('checked') === true;

    saveDirective();

    updatePrompt();
    updateButton();

    closePanel();

    if (settings.directive) {
        toastr.success(
            settings.keepActive
                ? 'OOC Instruction active'
                : 'OOC Instruction active for the next generation',
            'OOC Instruction'
        );
    } else {
        toastr.info(
            'OOC Instruction cleared',
            'OOC Instruction'
        );
    }
}


/* ==========================================================
   CLEAR
   ========================================================== */

function clearInstruction() {
    settings.directive = '';

    $('#ooc_instruction_text')
        .val('');

    saveDirective();

    updatePrompt();
    updateButton();

    closePanel();

    toastr.info(
        'OOC Instruction cleared',
        'OOC Instruction'
    );
}


/* ==========================================================
   ONE-SHOT MODE
   ========================================================== */

function clearAfterGeneration() {
    if (
        !settings.keepActive &&
        settings.directive
    ) {
        settings.directive = '';

        $('#ooc_instruction_text')
            .val('');

        saveDirective();

        updatePrompt();
        updateButton();
    }
}


/* ==========================================================
   GENERATION INTERCEPTOR
   ========================================================== */

globalThis.ooc_instruction_interceptor =
    async function () {

        updatePrompt();

    };


/* ==========================================================
   UI
   ========================================================== */

function installUI() {

    if (
        $('#ooc_instruction_button')
            .length
    ) {
        return;
    }


    const html = `
        <button
            id="ooc_instruction_button"
            class="menu_button ooc-instruction-button"
            type="button"
            title="OOC Instruction"
            aria-label="OOC Instruction">

            <span>OOC</span>

        </button>


        <div
            id="ooc_instruction_modal"
            class="ooc-instruction-modal">

            <div
                class="ooc-instruction-backdrop">
            </div>


            <div
                class="ooc-instruction-card">


                <div
                    class="ooc-instruction-header">

                    <span>
                        OOC / Instruction
                    </span>


                    <button
                        id="ooc_instruction_close"
                        class="ooc-instruction-close"
                        type="button">

                        ×

                    </button>

                </div>


                <div
                    class="ooc-instruction-description">

                    Donne une directive directement au bot.
                    Elle sera injectée dans le prompt sans
                    créer de message dans le RP.

                </div>


                <textarea
                    id="ooc_instruction_text"
                    class="ooc-instruction-textarea"
                    spellcheck="false"
                    placeholder="Exemple :

Ne joue jamais Hagen.
Ne joue jamais le personnage de l'utilisateur.
Fais répondre uniquement Bobby.
Fais avancer la scène lentement.
Garde les dialogues en gras.
Garde les actions en italique.">
                </textarea>


                <label
                    class="ooc-instruction-checkbox">

                    <input
                        id="ooc_instruction_keep"
                        type="checkbox"
                        checked>

                    <span>
                        Garder l'instruction active
                    </span>

                </label>


                <div
                    class="ooc-instruction-actions">


                    <button
                        id="ooc_instruction_clear"
                        type="button"
                        class="ooc-instruction-clear">

                        Effacer

                    </button>


                    <button
                        id="ooc_instruction_apply"
                        type="button"
                        class="ooc-instruction-apply">

                        Appliquer

                    </button>


                </div>

            </div>

        </div>
    `;


    const sendButton =
        $('#send_but');


    if (sendButton.length) {

        sendButton.before(html);

    } else {

        $('#send_form')
            .append(html);

    }


    /* Button */

    $('#ooc_instruction_button')
        .on(
            'click',
            openPanel
        );


    /* Close */

    $('#ooc_instruction_close')
        .on(
            'click',
            closePanel
        );


    $('.ooc-instruction-backdrop')
        .on(
            'click',
            closePanel
        );


    /* Apply */

    $('#ooc_instruction_apply')
        .on(
            'click',
            applyInstruction
        );


    /* Clear */

    $('#ooc_instruction_clear')
        .on(
            'click',
            clearInstruction
        );


    /* Keyboard shortcuts */

    $('#ooc_instruction_text')
        .on(
            'keydown',
            (event) => {

                if (
                    (event.ctrlKey ||
                        event.metaKey) &&
                    event.key === 'Enter'
                ) {

                    event.preventDefault();

                    applyInstruction();
                }


                if (
                    event.key === 'Escape'
                ) {

                    event.preventDefault();

                    closePanel();
                }

            }
        );


    loadDirective();
}


/* ==========================================================
   EVENTS
   ========================================================== */

function init() {

    installUI();


    /* New conversation / character */

    eventSource.on(
        event_types.CHAT_CHANGED,
        () => {

            setTimeout(
                loadDirective,
                0
            );

        }
    );


    /* Make sure the prompt is ready */

    eventSource.on(
        event_types.GENERATION_STARTED,
        updatePrompt
    );


    eventSource.on(
        event_types.GENERATION_AFTER_COMMANDS,
        updatePrompt
    );


    /* One-shot instruction */

    eventSource.on(
        event_types.GENERATION_ENDED,
        clearAfterGeneration
    );


    eventSource.on(
        event_types.GENERATION_STOPPED,
        clearAfterGeneration
    );


    updatePrompt();
    updateButton();
}


/* ==========================================================
   START
   ========================================================== */

$(document).ready(init);