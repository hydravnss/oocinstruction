const MODULE_NAME = 'oocinstruction';

let context = null;
let initialized = false;

/* ==========================================================
   CONTEXT
   ========================================================== */

function getSTContext() {
    try {
        if (!window.SillyTavern || typeof window.SillyTavern.getContext !== 'function') {
            console.error('[OOC Instruction] SillyTavern.getContext() unavailable.');
            return null;
        }

        return window.SillyTavern.getContext();
    } catch (error) {
        console.error('[OOC Instruction] Failed to get SillyTavern context:', error);
        return null;
    }
}

/* ==========================================================
   CHAT METADATA
   ========================================================== */

function getInstruction() {
    try {
        const ctx = getSTContext();

        if (!ctx || !ctx.chatMetadata) {
            return '';
        }

        return ctx.chatMetadata.ooc_instruction || '';
    } catch (error) {
        console.error('[OOC Instruction] Failed reading instruction:', error);
        return '';
    }
}

async function saveInstruction(value) {
    try {
        const ctx = getSTContext();

        if (!ctx || !ctx.chatMetadata) {
            return;
        }

        ctx.chatMetadata.ooc_instruction = value;

        if (typeof ctx.saveMetadata === 'function') {
            await ctx.saveMetadata();
        }
    } catch (error) {
        console.error('[OOC Instruction] Failed saving instruction:', error);
    }
}

/* ==========================================================
   PROMPT INJECTION
   ========================================================== */

function updatePrompt() {
    try {
        const ctx = getSTContext();

        if (!ctx || typeof ctx.setExtensionPrompt !== 'function') {
            console.error('[OOC Instruction] setExtensionPrompt() unavailable.');
            return;
        }

        const instruction = getInstruction().trim();

        const prompt = instruction
            ? `[OOC INSTRUCTION]\n${instruction}\n[END OOC INSTRUCTION]`
            : '';

        const types = ctx.extension_prompt_types || {};
        const roles = ctx.extension_prompt_roles || {};

        const position =
            types.IN_PROMPT !== undefined
                ? types.IN_PROMPT
                : 0;

        const role =
            roles.SYSTEM !== undefined
                ? roles.SYSTEM
                : undefined;

        if (prompt) {
            if (role !== undefined) {
                ctx.setExtensionPrompt(
                    MODULE_NAME,
                    prompt,
                    position,
                    0,
                    false,
                    role
                );
            } else {
                ctx.setExtensionPrompt(
                    MODULE_NAME,
                    prompt,
                    position,
                    0
                );
            }
        } else {
            if (types.NONE !== undefined) {
                ctx.setExtensionPrompt(
                    MODULE_NAME,
                    '',
                    types.NONE
                );
            } else {
                ctx.setExtensionPrompt(
                    MODULE_NAME,
                    '',
                    position
                );
            }
        }
    } catch (error) {
        console.error('[OOC Instruction] Failed updating prompt:', error);
    }
}

/* ==========================================================
   MODAL
   ========================================================== */

function closeModal() {
    const modal = document.getElementById('ooc-instruction-modal');

    if (modal) {
        modal.remove();
    }
}

function createModal() {
    closeModal();

    const overlay = document.createElement('div');
    overlay.id = 'ooc-instruction-modal';

    const box = document.createElement('div');
    box.className = 'ooc-instruction-box';

    const header = document.createElement('div');
    header.className = 'ooc-instruction-header';

    const title = document.createElement('div');
    title.className = 'ooc-instruction-title';
    title.textContent = 'OOC Instruction';

    const close = document.createElement('button');
    close.className = 'ooc-instruction-close';
    close.type = 'button';
    close.textContent = '×';

    close.addEventListener('click', closeModal);

    header.appendChild(title);
    header.appendChild(close);

    const description = document.createElement('div');
    description.className = 'ooc-instruction-description';
    description.textContent =
        'Instruction envoyée au modèle sans apparaître comme un message RP.';

    const textarea = document.createElement('textarea');
    textarea.id = 'ooc-instruction-textarea';
    textarea.placeholder =
        'Exemple : Ne joue jamais mon personnage. Décris davantage les réactions des autres personnages.';
    textarea.value = getInstruction();

    const footer = document.createElement('div');
    footer.className = 'ooc-instruction-footer';

    const clearButton = document.createElement('button');
    clearButton.type = 'button';
    clearButton.className = 'ooc-instruction-clear';
    clearButton.textContent = 'Effacer';

    clearButton.addEventListener('click', async () => {
        textarea.value = '';
        await saveInstruction('');
        updatePrompt();
    });

    const cancelButton = document.createElement('button');
    cancelButton.type = 'button';
    cancelButton.className = 'ooc-instruction-cancel';
    cancelButton.textContent = 'Annuler';

    cancelButton.addEventListener('click', closeModal);

    const saveButton = document.createElement('button');
    saveButton.type = 'button';
    saveButton.className = 'ooc-instruction-save';
    saveButton.textContent = 'Enregistrer';

    saveButton.addEventListener('click', async () => {
        await saveInstruction(textarea.value);
        updatePrompt();
        closeModal();
    });

    footer.appendChild(clearButton);
    footer.appendChild(cancelButton);
    footer.appendChild(saveButton);

    box.appendChild(header);
    box.appendChild(description);
    box.appendChild(textarea);
    box.appendChild(footer);

    overlay.appendChild(box);

    overlay.addEventListener('click', (event) => {
        if (event.target === overlay) {
            closeModal();
        }
    });

    document.body.appendChild(overlay);

    setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(
            textarea.value.length,
            textarea.value.length
        );
    }, 50);
}

/* ==========================================================
   MENU BUTTON
   ========================================================== */

function createMenuButton() {
    if (document.getElementById('ooc-instruction-menu-item')) {
        return true;
    }

    /*
     * SillyTavern's hamburger/options menu.
     * We search several possible containers so the extension
     * remains compatible with different ST versions.
     */

    const menu =
        document.querySelector('#options') ||
        document.querySelector('#options_menu') ||
        document.querySelector('.options-content') ||
        document.querySelector('#chat_options');

    if (!menu) {
        return false;
    }

    const button = document.createElement('div');

    button.id = 'ooc-instruction-menu-item';
    button.className = 'menu_button ooc-instruction-menu-item';

    button.setAttribute('role', 'button');
    button.setAttribute('tabindex', '0');

    button.innerHTML = `
        <i class="fa-solid fa-comment-dots"></i>
        <span>OOC Instruction</span>
    `;

    button.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();

        createModal();
    });

    button.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            createModal();
        }
    });

    /*
     * Try to place it near the other chat options.
     */
    const regenerate =
        menu.querySelector('#option_regenerate') ||
        menu.querySelector('[id*="regenerate"]');

    if (regenerate && regenerate.parentElement === menu) {
        menu.insertBefore(button, regenerate);
    } else {
        menu.appendChild(button);
    }

    return true;
}

/* ==========================================================
   MENU OBSERVER
   ========================================================== */

function installMenuObserver() {
    if (window.__OOC_INSTRUCTION_OBSERVER__) {
        return;
    }

    const observer = new MutationObserver(() => {
        createMenuButton();
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

    window.__OOC_INSTRUCTION_OBSERVER__ = observer;

    createMenuButton();
}

/* ==========================================================
   CHAT CHANGE
   ========================================================== */

function installChatChangeListener() {
    try {
        const ctx = getSTContext();

        if (!ctx || !ctx.eventSource || !ctx.event_types) {
            return;
        }

        const chatChanged =
            ctx.event_types.CHAT_CHANGED ||
            'chat_changed';

        if (typeof ctx.eventSource.on === 'function') {
            ctx.eventSource.on(chatChanged, () => {
                setTimeout(() => {
                    updatePrompt();
                }, 50);
            });
        }
    } catch (error) {
        console.warn(
            '[OOC Instruction] Could not install chat change listener:',
            error
        );
    }
}

/* ==========================================================
   INITIALIZATION
   ========================================================== */

function initialize() {
    if (initialized) {
        return;
    }

    initialized = true;

    context = getSTContext();

    if (!context) {
        initialized = false;
        console.error('[OOC Instruction] SillyTavern context not ready.');
        return;
    }

    installMenuObserver();
    installChatChangeListener();
    updatePrompt();

    console.log('[OOC Instruction] Loaded successfully.');
}

/* ==========================================================
   SILLYTAVERN LIFECYCLE
   ========================================================== */

export function onActivate() {
    try {
        initialize();
    } catch (error) {
        console.error('[OOC Instruction] Activation error:', error);
    }
}