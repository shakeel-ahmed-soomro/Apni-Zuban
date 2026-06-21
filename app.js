// Configure Monaco Editor base path
require.config({ paths: { vs: 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.39.0/min/vs' } });
let errorLog = [];

const CONFIG = {
    langName: "ApniZuban",
    keywords: {
        start: "iftitah",
        end: "ikhtitam",
        print: "bolen",
        scan: "poochen", 
        variable: "ye hai",
        ifKeyword: "agar",
        elseKeyword: "warna",
        whileKeyword: "jab tak",
        forKeyword: "jab bhi",
        funcKeyword: "tareeqa",
        returnKeyword: "wapas den",
        breakKeyword: "ruk jayen",
        continueKeyword: "aage barhen",
        trueKeyword: "sahi",
        falseKeyword: "ghalat",
        andKeyword: "aur",
        orKeyword: "ya"
    },
    sampleCode: [
        "iftitah",
        "ye hai naam = poochen(\"Enter your name: \")",
        "bolen (\"Welcome \" + naam + \"!\\n\\t\\t\\tto Apni Zuban Compiler.\")",
        "ikhtitam"
    ].join("\n")
};

document.title = `${CONFIG.langName} Ultimate Studio`;
document.getElementById('app-title').innerHTML = `${CONFIG.langName} <span>Compiler Core</span>`;
document.getElementById('lang-indicator').innerText = `${CONFIG.langName} Workspace`;

const KEYWORD_MAP = {
    [CONFIG.keywords.start]: 'START', [CONFIG.keywords.end]: 'END',
    [CONFIG.keywords.print]: 'PRINT', [CONFIG.keywords.scan]: 'SCAN',
    [CONFIG.keywords.variable]: 'VAR_DEC', [CONFIG.keywords.ifKeyword]: 'IF',
    [CONFIG.keywords.elseKeyword]: 'ELSE', [CONFIG.keywords.whileKeyword]: 'WHILE',
    [CONFIG.keywords.forKeyword]: 'FOR', [CONFIG.keywords.funcKeyword]: 'FUNC',
    [CONFIG.keywords.returnKeyword]: 'RETURN', [CONFIG.keywords.breakKeyword]: 'BREAK',
    [CONFIG.keywords.continueKeyword]: 'CONTINUE', [CONFIG.keywords.trueKeyword]: 'TRUE',
    [CONFIG.keywords.falseKeyword]: 'FALSE', [CONFIG.keywords.andKeyword]: 'AND',
    [CONFIG.keywords.orKeyword]: 'OR'
};

const KEYWORD_ENTRIES = Object.entries(KEYWORD_MAP).sort((a, b) => b[0].length - a[0].length);

function unescapeString(str) {
    return str.replace(/\\n/g, '\n').replace(/\\t/g, '\t').replace(/\\"/g, '"').replace(/\\\\/g, '\\');
}

// =====================================================================
// PHASE 1: LEXICAL ANALYSIS
// =====================================================================
class Lexer {
    constructor(sourceCode) { this.source = sourceCode; this.cursor = 0; this.line = 1; }
    hasMoreTokens() { return this.cursor < this.source.length; }

    getNextToken() {
        if (!this.hasMoreTokens()) return null;
        const remaining = this.source.slice(this.cursor);

        const wsOrComment = /^(?:\s+|\/\/[^\n]*)+/.exec(remaining);
        if (wsOrComment) {
            // Count newlines in the matched whitespace
            const newlines = (wsOrComment[0].match(/\n/g) || []).length;
            this.line += newlines;
            this.cursor += wsOrComment[0].length;
            return this.getNextToken();
        }

        for (let [keywordString, tokenType] of KEYWORD_ENTRIES) {
            if (remaining.startsWith(keywordString)) {
                const nextChar = remaining[keywordString.length];
                if (!nextChar || !/[a-zA-Z0-9_]/.test(nextChar)) {
                    this.cursor += keywordString.length;
                    return { type: tokenType, value: keywordString, line: this.line };
                }
            }
        }

        if (remaining.startsWith('==')) { this.cursor += 2; return { type: 'COMP_OP', value: '==' }; }
        if (remaining.startsWith('!=')) { this.cursor += 2; return { type: 'COMP_OP', value: '!=' }; }
        if (remaining.startsWith('<=')) { this.cursor += 2; return { type: 'COMP_OP', value: '<=' }; }
        if (remaining.startsWith('>=')) { this.cursor += 2; return { type: 'COMP_OP', value: '>=' }; }
        if (remaining.startsWith('&&')) { this.cursor += 2; return { type: 'AND', value: '&&' }; }
        if (remaining.startsWith('||')) { this.cursor += 2; return { type: 'OR', value: '||' }; }

        const singleCharTokens = [
            { str: '<', type: 'COMP_OP' }, { str: '>', type: 'COMP_OP' },
            { str: '=', type: 'ASSIGN' }, { str: '+', type: 'MATH_OP' },
            { str: '-', type: 'MATH_OP' }, { str: '*', type: 'MATH_OP' },
            { str: '/', type: 'MATH_OP' }, { str: '%', type: 'MATH_OP' },
            { str: '{', type: 'LBRACE' }, { str: '}', type: 'RBRACE' },
            { str: '(', type: 'LPAREN' }, { str: ')', type: 'RPAREN' },
            { str: ';', type: 'SEMI' }, { str: ',', type: 'COMMA' }
        ];

        for (let tc of singleCharTokens) {
            if (remaining.startsWith(tc.str)) {
                this.cursor += tc.str.length;
                return { type: tc.type, value: tc.str };
            }
        }

        const numeric = /^\d+(\.\d+)?/.exec(remaining);
        if (numeric) {
            this.cursor += numeric[0].length;
            return { type: 'NUMBER', value: Number(numeric[0]) };
        }

        const stringMatch = /^"((?:[^"\\]|\\.)*)"/.exec(remaining);
        if (stringMatch) {
            this.cursor += stringMatch[0].length;
            return { type: 'STRING', value: unescapeString(stringMatch[1]) };
        }

        const identifier = /^[a-zA-Z_][a-zA-Z0-9_]*/.exec(remaining);
        if (identifier) {
            this.cursor += identifier[0].length;
            return { type: 'IDENTIFIER', value: identifier[0] };
        }

        errorLog.push(`Lexical Error: Unexpected token near "${remaining.slice(0, 15)}..."`);
        return null; // Stop lexing
    }

    tokenize() {
        const tokens = [];
        while (this.hasMoreTokens()) {
            const token = this.getNextToken();
            if (token) tokens.push(token);
        }
        return tokens;
    }
}

// =====================================================================
// PHASE 2: SYNTAX ANALYSIS
// =====================================================================
class Parser {
    constructor(tokens) { this.tokens = tokens; this.cursor = 0; }
    lookahead() { return this.tokens[this.cursor] || null; }
    match(type) { return this.lookahead() && this.lookahead().type === type; }
    
    eat(type) {
        const token = this.lookahead();
        if (!token || token.type !== type) {
            const line = token ? token.line : "EOF";
            errorLog.push(`Line ${line}: Expected [${type}], found "${token ? token.value : 'End of file'}"`);
            
            // Panic: skip the current token and force continue
            this.cursor++; 
            return null;
        }
        this.cursor++;
        return token;
    }

    parse() {
        this.eat('START');
        const programRoot = { type: 'Program', body: [] };
        
        while (this.cursor < this.tokens.length && !this.match('END')) {
            const stmt = this.parseStatement();
            if (stmt) programRoot.body.push(stmt);
            else this.cursor++; // Skip broken statements
        }
        this.eat('END');
        return programRoot;
    }

    parseStatement() {
        const token = this.lookahead();
        if (!token) throw new SyntaxError("Parser Error: Statement expected.");
        switch (token.type) {
            case 'PRINT': return this.parsePrintStatement();
            case 'VAR_DEC': return this.parseVariableDeclaration();
            case 'IF': return this.parseIfStatement();
            case 'WHILE': return this.parseWhileStatement();
            case 'FOR': return this.parseForStatement();
            case 'FUNC': return this.parseFunctionDeclaration();
            case 'RETURN': return this.parseReturnStatement();
            case 'BREAK': return this.parseBreakStatement();
            case 'CONTINUE': return this.parseContinueStatement();
            case 'LBRACE': return this.parseBlockStatement();
            case 'IDENTIFIER':
                if (this.tokens[this.cursor + 1] && this.tokens[this.cursor + 1].type === 'LPAREN') {
                    return { type: 'ExpressionStatement', expression: this.parseCallExpression() };
                }
                return this.parseAssignmentStatement();
            default: throw new SyntaxError(`Parser Error: Invalid statement start: "${token.value}"`);
        }
    }

    parseBlockStatement() {
        this.eat('LBRACE');
        const body = [];
        while (this.lookahead() && !this.match('RBRACE')) body.push(this.parseStatement());
        this.eat('RBRACE');
        return { type: 'BlockStatement', body };
    }

    parsePrintStatement() {
        this.eat('PRINT');
        return { type: 'PrintStatement', expression: this.parseExpression() };
    }

    parseVariableDeclaration() {
        this.eat('VAR_DEC');
        const idToken = this.eat('IDENTIFIER');
        this.eat('ASSIGN');
        return { type: 'VariableDeclaration', id: idToken.value, init: this.parseExpression() };
    }

    parseAssignmentStatement() {
        const idToken = this.eat('IDENTIFIER');
        this.eat('ASSIGN');
        return { type: 'AssignmentStatement', id: idToken.value, value: this.parseExpression() };
    }

    parseIfStatement() {
        this.eat('IF'); this.eat('LPAREN');
        const condition = this.parseExpression();
        this.eat('RPAREN');
        const consequent = this.parseStatement();
        let alternate = null;
        if (this.match('ELSE')) { this.eat('ELSE'); alternate = this.parseStatement(); }
        return { type: 'IfStatement', condition, consequent, alternate };
    }

    parseWhileStatement() {
        this.eat('WHILE'); this.eat('LPAREN');
        const condition = this.parseExpression();
        this.eat('RPAREN');
        return { type: 'WhileStatement', condition, body: this.parseStatement() };
    }

    parseForStatement() {
        this.eat('FOR'); this.eat('LPAREN');
        let init = null;
        if (!this.match('SEMI')) {
            if (this.match('VAR_DEC')) init = this.parseVariableDeclaration();
            else init = this.parseAssignmentStatement();
        }
        this.eat('SEMI');
        let condition = null;
        if (!this.match('SEMI')) condition = this.parseExpression();
        this.eat('SEMI');
        let update = null;
        if (!this.match('RPAREN')) update = this.parseAssignmentStatement();
        this.eat('RPAREN');
        return { type: 'ForStatement', init, condition, update, body: this.parseStatement() };
    }

    parseFunctionDeclaration() {
        this.eat('FUNC');
        const nameToken = this.eat('IDENTIFIER');
        this.eat('LPAREN');
        const params = [];
        if (!this.match('RPAREN')) {
            params.push(this.eat('IDENTIFIER').value);
            while (this.match('COMMA')) { this.eat('COMMA'); params.push(this.eat('IDENTIFIER').value); }
        }
        this.eat('RPAREN');
        return { type: 'FunctionDeclaration', name: nameToken.value, params, body: this.parseBlockStatement() };
    }

    parseReturnStatement() {
        this.eat('RETURN');
        let argument = null;
        if (!this.match('RBRACE') && !this.match('END') && !this.match('SEMI')) argument = this.parseExpression();
        return { type: 'ReturnStatement', argument };
    }

    parseBreakStatement() { this.eat('BREAK'); return { type: 'BreakStatement' }; }
    parseContinueStatement() { this.eat('CONTINUE'); return { type: 'ContinueStatement' }; }

    parseExpression() { return this.parseLogicalOrExpression(); }

    parseLogicalOrExpression() {
        let left = this.parseLogicalAndExpression();
        while (this.match('OR')) {
            this.eat('OR');
            left = { type: 'LogicalExpression', operator: 'OR', left, right: this.parseLogicalAndExpression() };
        }
        return left;
    }

    parseLogicalAndExpression() {
        let left = this.parseComparisonExpression();
        while (this.match('AND')) {
            this.eat('AND');
            left = { type: 'LogicalExpression', operator: 'AND', left, right: this.parseComparisonExpression() };
        }
        return left;
    }

    parseComparisonExpression() {
        let left = this.parseAdditiveExpression();
        while (this.match('COMP_OP')) {
            const op = this.eat('COMP_OP').value;
            left = { type: 'BinaryExpression', operator: op, left, right: this.parseAdditiveExpression() };
        }
        return left;
    }

    parseAdditiveExpression() {
        let left = this.parseMultiplicativeExpression();
        while (this.match('MATH_OP') && (this.lookahead().value === '+' || this.lookahead().value === '-')) {
            const op = this.eat('MATH_OP').value;
            left = { type: 'BinaryExpression', operator: op, left, right: this.parseMultiplicativeExpression() };
        }
        return left;
    }

    parseMultiplicativeExpression() {
        let left = this.parsePrimaryOrCall();
        while (this.match('MATH_OP') && (this.lookahead().value === '*' || this.lookahead().value === '/' || this.lookahead().value === '%')) {
            const op = this.eat('MATH_OP').value;
            left = { type: 'BinaryExpression', operator: op, left, right: this.parsePrimaryOrCall() };
        }
        return left;
    }

    parsePrimaryOrCall() {
        const token = this.lookahead();
        if (token && token.type === 'IDENTIFIER') {
            const nextToken = this.tokens[this.cursor + 1];
            if (nextToken && nextToken.type === 'LPAREN') return this.parseCallExpression();
            this.eat('IDENTIFIER');
            return { type: 'Identifier', name: token.value };
        }
        return this.parsePrimaryExpression();
    }

    parseCallExpression() {
        const nameToken = this.eat('IDENTIFIER');
        this.eat('LPAREN');
        const args = [];
        if (!this.match('RPAREN')) {
            args.push(this.parseExpression());
            while (this.match('COMMA')) { this.eat('COMMA'); args.push(this.parseExpression()); }
        }
        this.eat('RPAREN');
        return { type: 'CallExpression', callee: nameToken.value, arguments: args };
    }

    parsePrimaryExpression() {
        const token = this.lookahead();
        if (!token) throw new SyntaxError("Parser Error: Value expected.");

        if (token.type === 'NUMBER' || token.type === 'STRING') { this.eat(token.type); return { type: 'Literal', value: token.value }; }
        if (token.type === 'TRUE') { this.eat('TRUE'); return { type: 'Literal', value: true }; }
        if (token.type === 'FALSE') { this.eat('FALSE'); return { type: 'Literal', value: false }; }
        
        if (token.type === 'SCAN') { 
            this.eat('SCAN'); 
            let promptNode = null;
            if (this.match('LPAREN')) {
                this.eat('LPAREN');
                promptNode = this.parseExpression();
                this.eat('RPAREN');
            }
            return { type: 'ScanExpression', prompt: promptNode }; 
        } 

        if (token.type === 'LPAREN') {
            this.eat('LPAREN');
            const expr = this.parseExpression();
            this.eat('RPAREN');
            return expr;
        }
        throw new SyntaxError(`Parser Error: Unexpected token "${token.value}"`);
    }
}

// =====================================================================
// PHASE 3: SEMANTIC ANALYSIS (Scope & Variable Checking)
// =====================================================================
class SemanticAnalyzer {
    constructor() { this.scopes = [new Set()]; }
    enterScope() { this.scopes.push(new Set()); }
    exitScope() { this.scopes.pop(); }
    declare(name) { this.scopes[this.scopes.length - 1].add(name); }
    isDeclared(name) { return this.scopes.some(scope => scope.has(name)); }

    analyze(node) {
        if (!node) return;
        switch(node.type) {
            case 'Program':
            case 'BlockStatement':
                this.enterScope();
                node.body.forEach(stmt => this.analyze(stmt));
                this.exitScope();
                break;
            case 'VariableDeclaration':
                this.analyze(node.init);
                this.declare(node.id);
                break;
            case 'AssignmentStatement':
                this.analyze(node.value);
                if (!this.isDeclared(node.id)) throw new Error(`Semantic Error: Variable '${node.id}' used before declaration.`);
                break;
            case 'Identifier':
                if (!this.isDeclared(node.name)) throw new Error(`Semantic Error: Variable '${node.name}' used before declaration.`);
                break;
            case 'IfStatement':
                this.analyze(node.condition); this.analyze(node.consequent);
                if (node.alternate) this.analyze(node.alternate);
                break;
            case 'WhileStatement':
                this.analyze(node.condition); this.analyze(node.body);
                break;
            case 'ForStatement':
                this.enterScope();
                if (node.init) this.analyze(node.init);
                if (node.condition) this.analyze(node.condition);
                if (node.update) this.analyze(node.update);
                this.analyze(node.body);
                this.exitScope();
                break;
            case 'FunctionDeclaration':
                this.declare(node.name);
                this.enterScope();
                node.params.forEach(p => this.declare(p));
                this.analyze(node.body);
                this.exitScope();
                break;
            case 'BinaryExpression':
            case 'LogicalExpression':
                this.analyze(node.left); this.analyze(node.right);
                break;
            case 'PrintStatement':
            case 'ReturnStatement':
            case 'ExpressionStatement':
                this.analyze(node.expression || node.argument);
                break;
        }
    }
}

// =====================================================================
// PHASE 4: INTERMEDIATE CODE GENERATION (TAC/IR)
// =====================================================================
class IntermediateCodeGenerator {
    constructor() { this.tempCount = 0; this.ir = []; }
    newTemp() { return `t${this.tempCount++}`; }
    
    generate(node) { this.walk(node); return this.ir; }
    
    walk(node) {
        if (!node) return '';
        switch(node.type) {
            case 'Literal': return JSON.stringify(node.value);
            case 'Identifier': return node.name;
            case 'BinaryExpression':
                const left = this.walk(node.left);
                const right = this.walk(node.right);
                const t = this.newTemp();
                this.ir.push(`${t} = ${left} ${node.operator} ${right}`);
                return t;
            case 'VariableDeclaration':
                const init = this.walk(node.init);
                this.ir.push(`${node.id} = ${init}`);
                return node.id;
            case 'AssignmentStatement':
                const val = this.walk(node.value);
                this.ir.push(`${node.id} = ${val}`);
                return node.id;
            case 'PrintStatement':
                const expr = this.walk(node.expression);
                this.ir.push(`PRINT ${expr}`);
                break;
            case 'Program':
            case 'BlockStatement':
                node.body.forEach(s => this.walk(s));
                break;
        }
    }
}

// =====================================================================
// PHASE 5: CODE OPTIMIZATION (AST Constant Folding)
// =====================================================================
class Optimizer {
    optimize(node) {
        if (!node) return node;
        switch (node.type) {
            case 'Program':
            case 'BlockStatement':
                node.body = node.body.map(s => this.optimize(s));
                return node;
            case 'BinaryExpression':
                node.left = this.optimize(node.left);
                node.right = this.optimize(node.right);
                // Constant Folding (e.g., compile 2 + 3 into 5 before runtime)
                if (node.left.type === 'Literal' && node.right.type === 'Literal' && typeof node.left.value === 'number' && typeof node.right.value === 'number') {
                    try {
                        const val = eval(`${node.left.value} ${node.operator} ${node.right.value}`);
                        return { type: 'Literal', value: val };
                    } catch(e) {}
                }
                return node;
            case 'VariableDeclaration': node.init = this.optimize(node.init); return node;
            case 'AssignmentStatement': node.value = this.optimize(node.value); return node;
            case 'PrintStatement': node.expression = this.optimize(node.expression); return node;
            case 'IfStatement':
                node.condition = this.optimize(node.condition);
                node.consequent = this.optimize(node.consequent);
                if (node.alternate) node.alternate = this.optimize(node.alternate);
                return node;
            case 'WhileStatement':
                node.condition = this.optimize(node.condition);
                node.body = this.optimize(node.body);
                return node;
        }
        return node;
    }
}

// =====================================================================
// PHASE 6: TARGET CODE GENERATION (Compiled Output to JS)
// =====================================================================
class CodeGenerator {
    generate(node) {
        if (!node) return '';
        switch(node.type) {
            case 'Program': return node.body.map(s => this.generate(s)).join('\n');
            case 'BlockStatement': return `{\n${node.body.map(s => this.generate(s)).join('\n')}\n}`;
            case 'VariableDeclaration': return `let ${node.id} = ${this.generate(node.init)};`;
            case 'AssignmentStatement': return `${node.id} = ${this.generate(node.value)};`;
            case 'PrintStatement': return `__env.print(${this.generate(node.expression)});`;
            case 'ScanExpression': return `(await __env.scan(${node.prompt ? this.generate(node.prompt) : '""'}))`;
            case 'Literal': 
                // This ensures "Welcome \n" becomes a valid JS string "Welcome \n"
                if (typeof node.value === 'string') {
                    return JSON.stringify(node.value);
                }
                return node.value;
            case 'Identifier': return node.name;
            case 'BinaryExpression': return `(${this.generate(node.left)} + ${this.generate(node.right)})`;
            case 'LogicalExpression':
                let op = node.operator === 'AND' ? '&&' : '||';
                return `(${this.generate(node.left)} ${op} ${this.generate(node.right)})`;
            case 'IfStatement': return `if (${this.generate(node.condition)}) ${this.generate(node.consequent)} ${node.alternate ? `else ${this.generate(node.alternate)}` : ''}`;
            case 'WhileStatement': return `while (${this.generate(node.condition)}) ${this.generate(node.body)}`;
            case 'ForStatement': return `for (${node.init ? this.generate(node.init) : ''} ${node.condition ? this.generate(node.condition) : ''}; ${node.update ? this.generate(node.update).replace(';','') : ''}) ${this.generate(node.body)}`;
            case 'FunctionDeclaration': return `async function ${node.name}(${node.params.join(', ')}) ${this.generate(node.body)}`;
            case 'ReturnStatement': return `return ${node.argument ? this.generate(node.argument) : ''};`;
            case 'CallExpression': return `(await ${node.callee}(${node.arguments.map(a => this.generate(a)).join(', ')}))`;
            case 'ExpressionStatement': return `${this.generate(node.expression)};`;
            case 'BreakStatement': return 'break;';
            case 'ContinueStatement': return 'continue;';
        }
    }
}

// Monaco Editor Initialization
let monacoEditorInstance;
require(['vs/editor/editor.main'], function () {
    monaco.languages.register({ id: 'ultimateFlowLanguage' });

    const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const keywordsToMatch = Object.values(CONFIG.keywords).map(escapeRegex).join('|');

    monaco.languages.setMonarchTokensProvider('ultimateFlowLanguage', {
        tokenizer: {
            root: [
                [new RegExp(`\\b(${keywordsToMatch})\\b`), 'keyword'],
                [/"((?:[^"\\]|\\.)*)"/, 'string'],
                [ /\/\/.*/, 'comment' ],
                [/\d+(\.\d+)?/, 'number'],
                [/[a-zA-Z_][a-zA-Z0-9_]*/, 'identifier'],
                [/[{}()]/, 'delimiter'],
                [/[<>=+\-*\/%!]+/, 'operator'],
            ]
        }
    });

    monaco.editor.defineTheme('ultimateDarkTheme', {
        base: 'vs-dark',
        inherit: true,
        rules: [
            { token: 'keyword', foreground: '8b5cf6', fontStyle: 'bold' },
            { token: 'string', foreground: '10b981' },
            { token: 'number', foreground: 'f59e0b' },
            { token: 'comment', foreground: '64748b', fontStyle: 'italic' },
            { token: 'operator', foreground: 'f43f5e' },
            { token: 'identifier', foreground: 'e2e8f0' }
        ],
        colors: {
            'editor.background': '#14171f',
            'editor.lineHighlightBackground': '#1e2330',
            'editorLineNumber.foreground': '#475569',
            'editorLineNumber.activeForeground': '#94a3b8'
        }
    });

    monacoEditorInstance = monaco.editor.create(document.getElementById('editor-container'), {
        value: CONFIG.sampleCode,
        language: 'ultimateFlowLanguage',
        theme: 'ultimateDarkTheme',
        fontSize: 14,
        fontFamily: "'Fira Code', monospace",
        automaticLayout: true,
        minimap: { enabled: false },
        padding: { top: 16 }
    });
});

window.clearConsole = function() { document.getElementById('terminal-screen').innerHTML = ''; }

function printToTerminal(text, type = "normal") {
    const screen = document.getElementById('terminal-screen');
    const row = document.createElement('div');
    row.className = 'terminal-line';
    
    let colorClass = "";
    if (type === "info") colorClass = "color: #3b82f6;";
    if (type === "success") colorClass = "color: #10b981;";
    if (type === "error") colorClass = "color: #ef4444; font-weight: bold;";
    
    row.innerHTML = `<span class="terminal-output" style="${colorClass}">${text}</span>`;
    screen.appendChild(row);
    screen.scrollTop = screen.scrollHeight;
}

// =====================================================================
// COMPILER PIPELINE & EXECUTION
// =====================================================================
window.executeSourceCode = async function() {
    const codeInputString = monacoEditorInstance.getValue();
    clearConsole();
    
    // Reset error log for this new run
    errorLog = [];

    try {
        // We pass the errorLog array to the pipeline
        const lexer = new Lexer(codeInputString);
        const tokens = lexer.tokenize(); 

        const parser = new Parser(tokens);
        const ast = parser.parse();
        
        const analyzer = new SemanticAnalyzer();
        analyzer.analyze(ast);
        
        // If we found any errors during analysis, show them and stop
        if (errorLog.length > 0) {
            errorLog.forEach(err => printToTerminal(err, 'error'));
            return;
        }

        const optimizer = new Optimizer();
        const optimizedAst = optimizer.optimize(ast);
        
        const generator = new CodeGenerator();
        const compiledJS = generator.generate(optimizedAst);

        // Terminal-based Input System
        const __env = {
            print: (text) => {
                const formatted = String(text).replace(/\n/g, '<br>').replace(/\t/g, '&nbsp;&nbsp;&nbsp;&nbsp;');
                printToTerminal(formatted);
            },
            
            // REPLACE YOUR OLD SCAN FUNCTION WITH THIS ONE:
            scan: async (promptText) => {
                // 1. Create a span to hold both the prompt text and the input field
                const lineContainer = document.createElement('div');
                const promptElement = document.createElement('span');
                promptElement.innerText = promptText;
                lineContainer.appendChild(promptElement);
                
                // 2. Create the input field and add it right next to the text
                const inputField = document.createElement('input');
                inputField.style.cssText = "background:transparent; color:white; border:none; outline:none; font-family:monospace; margin-left: 5px;";
                lineContainer.appendChild(inputField);
                
                // 3. Add to terminal and focus
                document.getElementById('terminal-screen').appendChild(lineContainer);
                inputField.focus();
                
                return new Promise((resolve) => {
                    inputField.onkeydown = (e) => {
                        if (e.key === 'Enter') {
                            const val = inputField.value;
                            inputField.disabled = true; // Lock the input after Enter
                            resolve(val);
                        }
                    };
                });
            }
        };

        const execute = new Function('__env', `return (async () => { \n${compiledJS}\n })();`);
        await execute(__env);
        printToTerminal('\n[Program Finished]', 'success');

    } catch (error) {
        printToTerminal(`❌ System Error: ${error.message}`, 'error');
    }
}