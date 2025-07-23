// src/renderer.js

// --- Global State ---
let currentFileName = 'untitled.nl';
let lastGeneratedCode = '';
let isResizing = false;

// --- Element References ---
const editor = document.getElementById('editor');
const lineNumbers = document.getElementById('lineNumbers');
const highlight = document.getElementById('editorHighlight');
const runBtn = document.getElementById('runBtn');
const statusText = document.getElementById('statusText');
const terminalLog = document.getElementById('terminal'); // Using the div as a log area
const modal = document.getElementById('codeModal');


// --- Editor Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    initializeEditor();
    initializeResizer();
    updateStatus('Github(@Rhishavhere)');
    addToTerminal('🤖 CodeBlink initialized. Welcome!', 'ai-log');
    window.api.on('🐢 Terminal:closed', (message) => {
        addToTerminal(message, 'ai-log');
    });
});

function initializeEditor() {
    editor.addEventListener('input', updateEditorUI);
    editor.addEventListener('scroll', syncScroll);
    editor.addEventListener('keyup', updateCursorPosition);
    editor.addEventListener('click', updateCursorPosition);
    updateEditorUI();
}

// --- UI Updaters ---
function updateEditorUI() {
    updateLineNumbers();
    updateSyntaxHighlighting();
    updateCursorPosition();
}

function updateLineNumbers() {
    const lines = editor.value.split('\n');
    lineNumbers.innerHTML = Array.from({ length: lines.length }, (_, i) => i + 1).join('\n');
}

function updateSyntaxHighlighting() {
    const text = editor.value;
    const highlightedText = text
        .replace(/(input|print|if|else|elif|for|while|in|and|or|not|is|greater|less|than|equal|to)\b/g, '<span class="keyword">$1</span>')
        .replace(/("[^"]*"|'[^']*')/g, '<span class="string">$1</span>')
        .replace(/\b(\d+\.?\d*)\b/g, '<span class="number">$1</span>')
        .replace(/(#.*$)/gm, '<span class="comment">$1</span>');
    highlight.innerHTML = highlightedText;
}

function syncScroll() {
    lineNumbers.scrollTop = editor.scrollTop;
    highlight.scrollTop = editor.scrollTop;
}

function updateCursorPosition() {
    const cursorPos = editor.selectionStart;
    const textBefore = editor.value.substring(0, cursorPos);
    const lines = textBefore.split('\n');
    const currentLine = lines.length;
    const currentCol = lines[lines.length - 1].length + 1;
    document.getElementById('cursorPosition').textContent = `Ln ${currentLine}, Col ${currentCol}`;
}

function updateStatus(message, type = '') {
    statusText.textContent = message;
    statusText.className = type;
}

// --- REWRITTEN Terminal Function ---
// This now appends log messages to the div instead of writing to xterm.js
function addToTerminal(text, type = '') {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = document.createElement('div');
    logEntry.textContent = `[${timestamp}] ${text}`;

    // Add simple color styling based on type
    if (type === 'error') logEntry.style.color = '#f44747';
    if (type === 'success') logEntry.style.color = '#4ec9b0';
    if (type === 'ai-log') logEntry.style.color = '#569cd6';

    terminalLog.appendChild(logEntry);
    terminalLog.scrollTop = terminalLog.scrollHeight; // Auto-scroll to the bottom
}


// --- REWRITTEN Main Execution Logic ---
async function runProgram() {
    const apiKey = await window.api.invoke('get-api-key');
    const code = editor.value.trim();

    if (!apiKey) {
        updateStatus('API key not found in .env file', 'error');
        addToTerminal('❌ Error: GEMINI_API_KEY is missing from your .env file.', 'error');
        return;
    }
    if (!code) {
        updateStatus('Editor is empty', 'error');
        addToTerminal('❌ Error: No code to execute', 'error');
        return;
    }

    runBtn.disabled = true;
    runBtn.textContent = '⏳ Processing...';
    updateStatus('Processing natural language...', 'loading');
    addToTerminal('🔄 Starting AI interpretation...', 'loading');

    try {
        const pythonCode = await convertToCode(code, apiKey);
        lastGeneratedCode = pythonCode;
        addToTerminal('✅ AI interpretation complete!', 'success');

        const processedFileName = `interpreted_files/${currentFileName.replace(/\.[^/.]+$/, "")}Processed.py`;
        
        // Use IPC to ask the main process to save the file
        const result = await window.api.invoke('file:save', { filePath: processedFileName, content: pythonCode });

        if (result.success) {
            // addToTerminal(`💾 Generated file saved: ${result.path}`, 'success');
            
            // NEW: Send the file path to the main process to be run in an external terminal
            addToTerminal(`🚀 Launching script in new PowerShell window...`, 'ai-log');
            window.api.send('run:external', result.path);
            
            updateStatus('Execution command sent to external terminal', 'success');
        } else {
            throw new Error(result.error);
        }

    } catch (error) {
        updateStatus('Processing failed', 'error');
        addToTerminal(`❌ Error: ${error.message}`, 'error');
    } finally {
        runBtn.disabled = false;
        runBtn.textContent = '▶️ Run';
    }
}

// --- SAVE FUNCTION ---
async function handleManualSave() {
    const content = editor.value;
    updateStatus('Saving file...', 'loading');
    
    try {
        const filePath = await window.api.invoke('file:saveDialog', content);
        
        if (filePath) {
            // Update the UI with the new file name
            const fileName = filePath.split('\\').pop().split('/').pop();
            document.getElementById('tabFileName').textContent = fileName;
            currentFileName = fileName;
            updateStatus('File saved successfully!', 'success');
            addToTerminal(`💾 File saved to: ${filePath}`, 'success');
        } else {
            updateStatus('Save canceled.', '');
        }
    } catch (err) {
        updateStatus('Failed to save file.', 'error');
        addToTerminal(`❌ Error saving file: ${err.message}`, 'error');
    }
}


async function handleFileOpen() {
    updateStatus('Opening file...', 'loading');
    
    try {
        const result = await window.api.invoke('file:openDialog');
        
        if (result) {
            const { filePath, content } = result;
            editor.value = content; // Load content into the editor
            
            // Update UI with the new file name
            const fileName = filePath.split('\\').pop().split('/').pop();
            document.getElementById('tabFileName').textContent = fileName;
            currentFileName = fileName;
            
            // Trigger a refresh of the editor view (line numbers, etc.)
            updateEditorUI();
            
            updateStatus('File opened successfully!', 'success');
            addToTerminal(`📁 File opened: ${filePath}`, 'success');
        } else {
            updateStatus('Open canceled.', '');
        }
    } catch (err) {
        updateStatus('Failed to open file.', 'error');
        addToTerminal(`❌ Error opening file: ${err.message}`, 'error');
    }
}

// --- Gemini API Call (Unchanged) ---
async function convertToCode(naturalLanguage, apiKey) {
    const prompt = `You are an expert Python code generator. Convert the following natural language to an executable Python script.
    
        Instructions:
        1. Preserve the logical structure.
        2. Handle patterns like "input X as Y", "if X is greater than Y", "print X", and loops.
        3. Make sure numeric inputs are cast to the correct type (e.g., int()).
        4. Return ONLY the raw Python code. Do not include any explanations or markdown formatting like \`\`\`python.

        Natural Language Code:
        ---
        ${naturalLanguage}
        ---

        Python Code:`;

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`API Error: ${errorData.error?.message || response.statusText}`);
        }

        const data = await response.json();
        const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!generatedText) throw new Error('Invalid response from Gemini API.');
        
        const cleanedCode = generatedText
            .replace(/^```python\n?/, '') // Removes ```python at the start
            .replace(/```$/, '')          // Removes ``` at the end
            .trim();                      // Removes any leading/trailing whitespace

        return cleanedCode;
    } catch (error) {
        console.error(error);
        throw new Error(`Failed to contact Gemini API: ${error.message}`);
    }
}


// --- Event Listeners for Buttons and UI Elements ---
document.getElementById('runBtn').addEventListener('click', runProgram);
document.getElementById('openBtn').addEventListener('click', handleFileOpen);
document.getElementById('saveBtn').addEventListener('click', handleManualSave);
// UPDATED: This now clears the log div
document.getElementById('clearTerminalBtn').addEventListener('click', () => {
    terminalLog.innerHTML = '';
});

document.getElementById('showCodeBtn').addEventListener('click', showPythonCode);
document.getElementById('closeModalBtn').addEventListener('click', closeModal);


// --- Modal Logic (Unchanged) ---
function showPythonCode() {
    if (lastGeneratedCode) {
        document.getElementById('generatedCode').textContent = lastGeneratedCode;
        modal.style.display = 'block';
    } else {
        addToTerminal('No generated code to show. Run the program first.', 'error');
    }
}

function closeModal() {
    modal.style.display = 'none';
}

window.onclick = (event) => {
    if (event.target === modal) {
        closeModal();
    }
};

// --- Resizer Logic (Unchanged) ---
function initializeResizer() {
    const resizer = document.getElementById('resizer');
    const leftPanel = document.querySelector('.editor-panel');
    
    resizer.addEventListener('mousedown', () => {
        isResizing = true;
        document.addEventListener('mousemove', handleResize);
        document.addEventListener('mouseup', stopResize);
    });

    function handleResize(e) {
        if (!isResizing) return;
        const containerWidth = document.querySelector('.main-container').offsetWidth;
        const newLeftWidth = (e.clientX / containerWidth) * 100;
        if (newLeftWidth > 20 && newLeftWidth < 80) {
            leftPanel.style.flex = `0 0 ${newLeftWidth}%`;
        }
    }

    function stopResize() {
        isResizing = false;
        document.removeEventListener('mousemove', handleResize);
        document.removeEventListener('mouseup', stopResize);
    }

    
}