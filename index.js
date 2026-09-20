const MODULE_NAME = 'oocinstruction';

let initialized = false;
let generationListenerInstalled = false;
let chatListenerInstalled = false;


/* ==========================================================
   SILLYTAVERN CONTEXT
   ========================================================== */

function getContext() {
    try {
        if (
            !window.SillyTavern ||
            typeof window.SillyTavern.getContext !== 'function'
        ) {
            console.error(
                '[OOC Instruction] SillyTavern.getContext() unavailable.'
            );

            return null;
        }

        return window.SillyTavern.getContext();

    } catch (error) {

        console.error(
            '[OOC Instruction] Context error:',
            error
        );

        return null;
    }
}


/* ==========================================================
   CURRENT INSTRUCTION
   ========================================================== */

function getInstruction() {

    try {

        const context = getContext();

        if (
            !context ||
            !context.chatMetadata
        ) {
            return '';
        }

        return String(
            context.chatMetadata.ooc_instruction || ''
        );

    } catch (error) {

        console.error(
            '[OOC Instruction] Read instruction error:',
            error
        );

        return '';
    }
}


/* ==========================================================
   SAVE INSTRUCTION
   ========================================================== */

async function saveInstruction(value) {

    try {

        const context = getContext();

        if (
            !context ||
            !context.chatMetadata
        ) {
            return;
        }

        context.chatMetadata.ooc_instruction =
            String(value || '');

        /*
         * Current SillyTavern context exposes
         * saveMetadataDebounced().
         */

        if (
            typeof context.saveMetadataDebounced ===
            'function'
        ) {

            context.saveMetadataDebounced();

        } else if (
            typeof context.saveMetadata ===
            'function'
        ) {

            await context.saveMetadata();
        }

    } catch (error) {

        console.error(
            '[OOC Instruction] Save error:',
            error
        );
    }
}


/* ==========================================================
   INJECT OOC INTO PROMPT
   ========================================================== */

function updatePrompt() {

    try {

        const context = getContext();

        if (
            !context ||
            typeof context.setExtensionPrompt !==
            'function'
        ) {

            console.error(
                '[OOC Instruction] setExtensionPrompt() unavailable.'
            );

            return false;
        }


        const instruction =
            getInstruction().trim();


        /*
         * SillyTavern:
         *
         * IN_PROMPT = 0
         * SYSTEM role = 0
         *
         * We use the real numeric values here instead
         * of importing script.js.
         */

        const IN_PROMPT = 0;

        const SYSTEM_ROLE = 0;

        const DEPTH = 0;

        const SCAN = false;


        /* --------------------------------------------------
           NO INSTRUCTION
           -------------------------------------------------- */

        if (!instruction) {

            context.setExtensionPrompt(
                MODULE_NAME,
                '',
                IN_PROMPT,
                DEPTH,
                SCAN,
                SYSTEM_ROLE
            );

            console.log(
                '[OOC Instruction] Prompt cleared.'
            );

            return true;
        }


        /* --------------------------------------------------
           BUILD PROMPT
           -------------------------------------------------- */

        const prompt =
            `OOC INSTRUCTION:\n` +
            `${instruction}\n` +
            `END OOC INSTRUCTION`;


        /* --------------------------------------------------
           INJECT
           -------------------------------------------------- */

        context.setExtensionPrompt(
            MODULE_NAME,
            prompt,
            IN_PROMPT,
            DEPTH,
            SCAN,
            SYSTEM_ROLE
        );


        /*
         * Verify that SillyTavern actually received it.
         */

        const registered =
            context.extensionPrompts?.[MODULE_NAME];


        if (registered) {

            console.log(
                '[OOC Instruction] INJECTED:',
                registered
            );

        } else {

            console.warn(
                '[OOC Instruction] setExtensionPrompt() was called, but the prompt was not found in extensionPrompts.'
            );
        }


        return true;

    } catch (error) {

        console.error(
            '[OOC Instruction] Injection error:',
            error
        );

        return false;
    }
}


/* ==========================================================
   FORCE INJECTION BEFORE EVERY GENERATION
   ========================================================== */

function installGenerationListener() {

    if (generationListenerInstalled) {
        return;
    }

    try {

        const context =
            getContext();

        if (
            !context ||
            !context.eventSource ||
            !context.eventTypes
        ) {
            console.warn(
                '[OOC Instruction] Generation event API unavailable.'
            );

            return;
        }


        const eventName =
            context.eventTypes.GENERATION_STARTED;


        if (!eventName) {

            console.warn(
                '[OOC Instruction] GENERATION_STARTED unavailable.'
            );

            return;
        }


        /*
         * makeLast() makes our injection run at the end
         * of the generation-start listeners.
         */

        if (
            typeof context.eventSource.makeLast ===
            'function'
        ) {

            context.eventSource.makeLast(
                eventName,
                () => {

                    updatePrompt();

                }
            );

        } else if (
            typeof context.eventSource.on ===
            'function'
        ) {

            context.eventSource.on(
                eventName,
                () => {

                    updatePrompt();

                }
            );
        }


        generationListenerInstalled = true;


        console.log(
            '[OOC Instruction] Generation listener installed.'
        );

    } catch (error) {

        console.error(
            '[OOC Instruction] Generation listener error:',
            error
        );
    }
}


/* ==========================================================
   CHAT CHANGE
   ========================================================== */

function installChatListener() {

    if (chatListenerInstalled) {
        return;
    }

    try {

        const context =
            getContext();

        if (
            !context ||
            !context.eventSource ||
            !context.eventTypes
        ) {
            return;
        }


        const eventName =
            context.eventTypes.CHAT_CHANGED;


        if (!eventName) {
            return;
        }


        if (
            typeof context.eventSource.on ===
            'function'
        ) {

            context.eventSource.on(
                eventName,
                () => {

                    /*
                     * Give SillyTavern time to finish
                     * loading the new chat metadata.
                     */

                    setTimeout(
                        () => {

                            updatePrompt();

                        },
                        100
                    );

                }
            );
        }


        chatListenerInstalled = true;

    } catch (error) {

        console.error(
            '[OOC Instruction] Chat listener error:',
            error
        );
    }
}


/* ==========================================================
   MODAL
   ========================================================== */

function closeModal() {

    const modal =
        document.getElementById(
            'ooc-instruction-modal'
        );

    if (modal) {
        modal.remove();
    }
}


function openModal() {

    closeModal();


    const overlay =
        document.createElement('div');

    overlay.id =
        'ooc-instruction-modal';


    const box =
        document.createElement('div');

    box.className =
        'ooc-instruction-box';


    /* HEADER */

    const header =
        document.createElement('div');

    header.className =
        'ooc-instruction-header';


    const title =
        document.createElement('div');

    title.className =
        'ooc-instruction-title';

    title.textContent =
        'OOC Instruction';


    const closeButton =
        document.createElement('button');

    closeButton.type =
        'button';

    closeButton.className =
        'ooc-instruction-close';

    closeButton.textContent =
        '×';


    closeButton.addEventListener(
        'click',
        closeModal
    );


    header.appendChild(title);

    header.appendChild(
        closeButton
    );


    /* DESCRIPTION */

    const description =
        document.createElement('div');

    description.className =
        'ooc-instruction-description';

    description.textContent =
        'Instruction envoyée au modèle sans apparaître comme un message RP.';


    /* TEXTAREA */

    const textarea =
        document.createElement('textarea');

    textarea.id =
        'ooc-instruction-textarea';

    textarea.value =
        getInstruction();

    textarea.placeholder =
        'Exemple : Ne joue jamais mon personnage. Respecte mes instructions et laisse-moi contrôler ses actions.';


    /* FOOTER */

    const footer =
        document.createElement('div');

    footer.className =
        'ooc-instruction-footer';


    /* CLEAR */

    const clearButton =
        document.createElement('button');

    clearButton.type =
        'button';

    clearButton.className =
        'ooc-instruction-clear';

    clearButton.textContent =
        'Effacer';


    clearButton.addEventListener(
        'click',
        async () => {

            textarea.value = '';

            await saveInstruction('');

            updatePrompt();
        }
    );


    /* CANCEL */

    const cancelButton =
        document.createElement('button');

    cancelButton.type =
        'button';

    cancelButton.className =
        'ooc-instruction-cancel';

    cancelButton.textContent =
        'Annuler';


    cancelButton.addEventListener(
        'click',
        closeModal
    );


    /* SAVE */

    const saveButton =
        document.createElement('button');

    saveButton.type =
        'button';

    saveButton.className =
        'ooc-instruction-save';

    saveButton.textContent =
        'Enregistrer';


    saveButton.addEventListener(
        'click',
        async () => {

            const value =
                textarea.value.trim();


            await saveInstruction(
                value
            );


            /*
             * IMPORTANT:
             * Immediately inject the new instruction.
             */

            updatePrompt();


            closeModal();
        }
    );


    footer.appendChild(
        clearButton
    );

    footer.appendChild(
        cancelButton
    );

    footer.appendChild(
        saveButton
    );


    box.appendChild(header);

    box.appendChild(description);

    box.appendChild(textarea);

    box.appendChild(footer);


    overlay.appendChild(box);


    overlay.addEventListener(
        'click',
        (event) => {

            if (
                event.target ===
                overlay
            ) {

                closeModal();
            }
        }
    );


    document.body.appendChild(
        overlay
    );


    setTimeout(
        () => {

            textarea.focus();

            textarea.setSelectionRange(
                textarea.value.length,
                textarea.value.length
            );

        },
        50
    );
}


/* ==========================================================
   MENU BUTTON
   ========================================================== */

function createMenuButton() {

    /*
     * The actual chat menu.
     */

    const options =
        document.querySelector('#options');


    if (!options) {
        return false;
    }


    const menu =
        options.querySelector(
            '.options-content'
        );


    if (!menu) {
        return false;
    }


    /*
     * If it already exists, don't create another.
     */

    if (
        menu.querySelector(
            '#ooc-instruction-menu-item'
        )
    ) {

        return true;
    }


    const button =
        document.createElement('div');

    button.id =
        'ooc-instruction-menu-item';

    button.className =
        'ooc-instruction-menu-item';

    button.setAttribute(
        'role',
        'button'
    );

    button.setAttribute(
        'tabindex',
        '0'
    );


    button.innerHTML = `
        <i class="fa-solid fa-comment-dots"></i>
        <span>OOC Instruction</span>
    `;


    button.addEventListener(
        'click',
        (event) => {

            event.preventDefault();

            event.stopPropagation();

            openModal();
        }
    );


    button.addEventListener(
        'keydown',
        (event) => {

            if (
                event.key === 'Enter' ||
                event.key === ' '
            ) {

                event.preventDefault();

                openModal();
            }
        }
    );


    /*
     * Put the button inside the actual menu.
     */

    const regenerate =
        menu.querySelector(
            '#option_regenerate'
        );


    if (regenerate) {

        menu.insertBefore(
            button,
            regenerate
        );

    } else {

        menu.appendChild(
            button
        );
    }


    return true;
}


/* ==========================================================
   MENU OBSERVER
   ========================================================== */

function installMenuObserver() {

    const observer =
        new MutationObserver(
            () => {

                createMenuButton();

            }
        );


    observer.observe(
        document.body,
        {
            childList: true,
            subtree: true
        }
    );


    createMenuButton();
}


/* ==========================================================
   INITIALIZATION
   ========================================================== */

function initialize() {

    if (initialized) {
        return;
    }


    const context =
        getContext();


    if (!context) {

        console.error(
            '[OOC Instruction] Context not ready.'
        );

        return;
    }


    initialized = true;


    installMenuObserver();

    installGenerationListener();

    installChatListener();


    /*
     * Inject immediately.
     */

    updatePrompt();


    /*
     * Retry after SillyTavern has finished
     * loading the current chat.
     */

    setTimeout(
        updatePrompt,
        250
    );

    setTimeout(
        updatePrompt,
        1000
    );

    setTimeout(
        updatePrompt,
        2000
    );


    console.log(
        '[OOC Instruction] Loaded successfully.'
    );
}


/* ==========================================================
   SILLYTAVERN ACTIVATION
   ========================================================== */

export function onActivate() {

    try {

        setTimeout(
            initialize,
            100
        );

    } catch (error) {

        console.error(
            '[OOC Instruction] Activation error:',
            error
        );
    }
}