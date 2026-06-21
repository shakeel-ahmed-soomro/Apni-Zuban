// --- INITIALIZATION ---
require.config({ paths: { vs: 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.39.0/min/vs' } });

// --- CONFIGURATION ---
const CONFIG = {
    keywords: {
        start: "iftitah", end: "ikhtitam", print: "bolen", 
        variable: "ye hai", scanKeyword: "poochen",
        ifKeyword: "agar", elseKeyword: "warna",
        whileKeyword: "jab tak", forKeyword: "jab bhi",
        funcKeyword: "tareeqa", returnKeyword: "wapas den",
        trueKeyword: "sahi", falseKeyword: "ghalat"
    }
};

// --- INTERPRETER CORE ---
class RuntimeInterpreter {
    constructor() {
        this.globalEnv = new Map();
        this.functions = new Map();
    }

    print(text) {
        const term = document.getElementById('terminal-screen');
        const div = document.createElement('div');
        div.className = 'terminal-line';
        div.innerText = text;
        term.appendChild(div);
        term.scrollTop = term.scrollHeight;
    }

    async prompt(message) {
        return new Promise((resolve) => {
            const term = document.getElementById('terminal-screen');
            const row = document.createElement('div');
            row.innerHTML = `<span style="color: #64748b;">${message} </span><input type="text" id="active-input" style="background:transparent; border:none; border-bottom:1px solid #64748b; color:white; outline:none;">`;
            term.appendChild(row);
            const input = row.querySelector('#active-input');
            input.focus();
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    const val = input.value;
                    input.disabled = true;
                    resolve(val);
                }
            });
        });
    }

    async execute(ast) {
        for (let node of ast.body) {
            if (node.type === 'PrintStatement') {
                const val = await this.evaluate(node.expression);
                this.print(val);
            }
            if (node.type === 'VariableDeclaration') {
                this.globalEnv.set(node.id, await this.evaluate(node.init));
            }
        }
    }

    async evaluate(node) {
        if (node.type === 'Literal') return node.value;
        if (node.type === 'Identifier') return this.globalEnv.get(node.name);
        if (node.type === 'ScanExpression') {
            const msg = node.argument ? await this.evaluate(node.argument) : "Input:";
            return await this.prompt(msg);
        }
        if (node.type === 'BinaryExpression') {
            const left = await this.evaluate(node.left);
            const right = await this.evaluate(node.right);
            return left + right; // Simple concatenation/addition
        }
    }
}

// --- MONACO EDITOR SETUP ---
let editor;
require(['vs/editor/editor.main'], function () {
    // 1. Define Language Rules carefully
    monaco.languages.register({ id: 'apniZuban' });
    monaco.languages.setMonarchTokensProvider('apniZuban', {
        tokenizer: {
            root: [
                [/\b(iftitah|ikhtitam|bolen|ye hai|poochen)\b/, "keyword"],
                [/"([^"\n]*)"/, "string"],
                [/[0-9]+/, "number"]
            ]
        }
    });

    // 2. Initialize Editor
    editor = monaco.editor.create(document.getElementById('editor-container'), {
        value: 'iftitah\nye hai naam = poochen("Apka naam:")\nbolen "Hello " + naam\nikhtitam',
        language: 'apniZuban',
        theme: 'vs-dark'
    });
});

// --- EXECUTION TRIGGER ---
window.executeSourceCode = async function() {
    if (!editor) {
        alert("Editor still loading...");
        return;
    }
    document.getElementById('terminal-screen').innerHTML = ''; // Clear
    const code = editor.getValue();
    try {
        // You would place your Lexer/Parser logic here
        const interpreter = new RuntimeInterpreter();
        // Assuming your parser returns an AST
        const ast = new Parser(new Lexer(code).tokenize()).parse(); 
        await interpreter.execute(ast);
    } catch (err) {
        console.error(err);
        alert("Error: " + err.message);
    }
}