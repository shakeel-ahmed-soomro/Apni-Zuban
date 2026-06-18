// Configure Monaco Editor base path
require.config({ paths: { vs: 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.39.0/min/vs' } });


const CONFIG = {
    langName: "ApniZuban",
    keywords: {
        start: "iftitah",
        end: "ikhtitam",
        print: "bolen",
        variable: "ye hai",
        ifKeyword: "agar",
        elseKeyword: "warna",
        whileKeyword: "jab tak",
        forKeyword: "har dafa",
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
        "",
        "bolen \"Starting Functions & Logic Test.\"",
        "",
        "// Aik Function banate hain jo math karke sahi ya ghalat batata hai.",
        "tareeqa checkNumber(num) {",
        "    agar (num > 10 aur num < 20) {",
        "        wapas den sahi",
        "    } warna {",
        "        wapas den ghalat",
        "    }",
        "}",
        "",
        "ye hai result = checkNumber(15)",
        "bolen \"Is 15 between 10 and 20?\"",
        "bolen result",
        "",
        "bolen \"Starting For Loop Test\"",
        "",
        "har dafa (ye hai i = 1; i < 6; i = i + 1) {",
        "    agar (i == 3) {",
        "        bolen \"Skipping number 3!\"",
        "        aage barhen",
        "    }",
        "    agar (i == 5) {",
        "        bolen \"Breaking out at 5!\"",
        "        ruk jayen",
        "    }",
        "    bolen i",
        "}",
        "",
        "bolen \"Execution Complete\"",
        "ikhtitam"
    ].join("\n")
};

document.title = `${CONFIG.langName} Ultimate Studio`;
document.getElementById('app-title').innerHTML = `${CONFIG.langName} <span>Ultimate Core</span>`;
document.getElementById('lang-indicator').innerText = `${CONFIG.langName} Workspace`;

const KEYWORD_MAP = {
    [CONFIG.keywords.start]: 'START', [CONFIG.keywords.end]: 'END',
    [CONFIG.keywords.print]: 'PRINT', [CONFIG.keywords.variable]: 'VAR_DEC',
    [CONFIG.keywords.ifKeyword]: 'IF', [CONFIG.keywords.elseKeyword]: 'ELSE',
    [CONFIG.keywords.whileKeyword]: 'WHILE', [CONFIG.keywords.forKeyword]: 'FOR',
    [CONFIG.keywords.funcKeyword]: 'FUNC', [CONFIG.keywords.returnKeyword]: 'RETURN',
    [CONFIG.keywords.breakKeyword]: 'BREAK', [CONFIG.keywords.continueKeyword]: 'CONTINUE',
    [CONFIG.keywords.trueKeyword]: 'TRUE', [CONFIG.keywords.falseKeyword]: 'FALSE',
    [CONFIG.keywords.andKeyword]: 'AND', [CONFIG.keywords.orKeyword]: 'OR'
};

const KEYWORD_ENTRIES = Object.entries(KEYWORD_MAP).sort((a, b) => b[0].length - a[0].length);


class Lexer {
    constructor(sourceCode) { this.source = sourceCode; this.cursor = 0; }
    hasMoreTokens() { return this.cursor < this.source.length; }

    getNextToken() {
        if (!this.hasMoreTokens()) return null;
        const remaining = this.source.slice(this.cursor);

        const wsOrComment = /^(?:\s+|\/\/[^\n]*)+/.exec(remaining);
        if (wsOrComment) {
            this.cursor += wsOrComment[0].length;
            return this.getNextToken();
        }

        for (let [keywordString, tokenType] of KEYWORD_ENTRIES) {
            if (remaining.startsWith(keywordString)) {
                const nextChar = remaining[keywordString.length];
                if (!nextChar || !/[a-zA-Z0-9_]/.test(nextChar)) {
                    this.cursor += keywordString.length;
                    return { type: tokenType, value: keywordString };
                }
            }
        }

        if (remaining.startsWith('==')) { this.cursor += 2; return { type: 'COMP_OP', value: '==' }; }
        if (remaining.startsWith('!=')) { this.cursor += 2; return { type: 'COMP_OP', value: '!=' }; }
        if (remaining.startsWith('<=')) { this.cursor += 2; return { type: 'COMP_OP', value: '<=' }; }
        if (remaining.startsWith('>=')) { this.cursor += 2; return { type: 'COMP_OP', value: '>=' }; }

        const singleCharTokens = [
            { str: '<', type: 'COMP_OP' }, { str: '>', type: 'COMP_OP' },
            { str: '=', type: 'ASSIGN' },
            { str: '+', type: 'MATH_OP' }, { str: '-', type: 'MATH_OP' },
            { str: '*', type: 'MATH_OP' }, { str: '/', type: 'MATH_OP' }, { str: '%', type: 'MATH_OP' },
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

        const stringMatch = /^"([^"\n]*)"/.exec(remaining);
        if (stringMatch) {
            this.cursor += stringMatch[0].length;
            return { type: 'STRING', value: stringMatch[1] };
        }

        const identifier = /^[a-zA-Z_][a-zA-Z0-9_]*/.exec(remaining);
        if (identifier) {
            this.cursor += identifier[0].length;
            return { type: 'IDENTIFIER', value: identifier[0] };
        }

        throw new SyntaxError(`Lexical Analyzer Error near: "${remaining.slice(0, 15)}..."`);
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


class Parser {
    constructor(tokens) { this.tokens = tokens; this.cursor = 0; }
    lookahead() { return this.tokens[this.cursor] || null; }
    match(type) { return this.lookahead() && this.lookahead().type === type; }
    
    eat(type) {
        const token = this.lookahead();
        if (!token) throw new SyntaxError(`Parser Error: Expected [${type}], reached end of file.`);
        if (token.type !== type) throw new SyntaxError(`Parser Error: Expected [${type}], found "${token.value}"`);
        this.cursor++;
        return token;
    }

    parse() {
        this.eat('START');
        const programRoot = { type: 'Program', body: [] };
        while (this.cursor < this.tokens.length && !this.match('END')) {
            programRoot.body.push(this.parseStatement());
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
                    const callExpr = this.parseCallExpression();
                    return { type: 'ExpressionStatement', expression: callExpr };
                }
                return this.parseAssignmentStatement();
            default:
                throw new SyntaxError(`Parser Error: Invalid statement start: "${token.value}"`);
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
        if (token.type === 'LPAREN') {
            this.eat('LPAREN');
            const expr = this.parseExpression();
            this.eat('RPAREN');
            return expr;
        }
        throw new SyntaxError(`Parser Error: Unexpected token "${token.value}"`);
    }
}


class Environment {
    constructor(parent = null) { this.vars = new Map(); this.parent = parent; }
    define(name, value) { this.vars.set(name, value); }
    assign(name, value) {
        if (this.vars.has(name)) { this.vars.set(name, value); return; }
        if (this.parent) { this.parent.assign(name, value); return; }
        throw new ReferenceError(`Undefined variable pointer: "${name}"`);
    }
    get(name) {
        if (this.vars.has(name)) return this.vars.get(name);
        if (this.parent) return this.parent.get(name);
        throw new ReferenceError(`Undefined variable pointer: "${name}"`);
    }
}

class ReturnSignal extends Error { constructor(value) { super(); this.value = value; } }
class BreakSignal extends Error {}
class ContinueSignal extends Error {}

class RuntimeInterpreter {
    constructor() {
        this.globalEnv = new Environment();
        this.currentEnv = this.globalEnv;
        this.logs = [];
        this.functions = new Map();
        this.loopProtectionCounter = 0;
    }

    evaluateNode(node) {
        switch (node.type) {
            case 'Literal': return node.value;
            case 'Identifier': return this.currentEnv.get(node.name);
            case 'BinaryExpression': {
                const left = this.evaluateNode(node.left);
                const right = this.evaluateNode(node.right);
                switch (node.operator) {
                    case '+': return left + right; case '-': return left - right;
                    case '*': return left * right; case '/': return left / right; case '%': return left % right;
                    case '==': return left == right; case '!=': return left != right;
                    case '<': return left < right; case '>': return left > right;
                    case '<=': return left <= right; case '>=': return left >= right;
                    default: throw new Error(`Unknown Math/Comp Operator: ${node.operator}`);
                }
            }
            case 'LogicalExpression': {
                const left = this.evaluateNode(node.left);
                if (node.operator === 'OR') { if (left) return true; return Boolean(this.evaluateNode(node.right)); }
                if (node.operator === 'AND') { if (!left) return false; return Boolean(this.evaluateNode(node.right)); }
                break;
            }
            case 'CallExpression': {
                if (!this.functions.has(node.callee)) throw new Error(`Function "${node.callee}" is not defined.`);
                const func = this.functions.get(node.callee);
                const evaluatedArgs = node.arguments.map(arg => this.evaluateNode(arg));
                
                const prevEnv = this.currentEnv;
                this.currentEnv = new Environment(this.globalEnv);
                
                func.params.forEach((paramName, idx) => {
                    this.currentEnv.define(paramName, evaluatedArgs[idx] !== undefined ? evaluatedArgs[idx] : null);
                });

                let returnValue = null;
                try { this.executeStatement(func.body); } 
                catch (signal) {
                    if (signal instanceof ReturnSignal) returnValue = signal.value;
                    else throw signal;
                } finally { this.currentEnv = prevEnv; }
                return returnValue;
            }
            default: throw new Error(`Unknown Expression Node: ${node.type}`);
        }
    }

    executeStatement(node) {
        this.loopProtectionCounter++;
        if (this.loopProtectionCounter > 15000) throw new Error("🚨 Infinite Loop Protection Triggered! Execution cut-off (> 15,000 steps).");

        switch (node.type) {
            case 'BlockStatement':
                for (let stmt of node.body) this.executeStatement(stmt);
                break;
            case 'PrintStatement':
                this.logs.push(String(this.evaluateNode(node.expression)));
                break;
            case 'VariableDeclaration':
                this.currentEnv.define(node.id, this.evaluateNode(node.init));
                break;
            case 'AssignmentStatement':
                this.currentEnv.assign(node.id, this.evaluateNode(node.value));
                break;
            case 'ExpressionStatement':
                this.evaluateNode(node.expression);
                break;
            case 'FunctionDeclaration':
                this.functions.set(node.name, node);
                break;
            case 'ReturnStatement':
                throw new ReturnSignal(node.argument ? this.evaluateNode(node.argument) : null);
            case 'BreakStatement':
                throw new BreakSignal();
            case 'ContinueStatement':
                throw new ContinueSignal();
            case 'IfStatement':
                if (this.evaluateNode(node.condition)) this.executeStatement(node.consequent);
                else if (node.alternate) this.executeStatement(node.alternate);
                break;
            case 'WhileStatement':
                while (this.evaluateNode(node.condition)) {
                    try { this.executeStatement(node.body); }
                    catch (signal) {
                        if (signal instanceof BreakSignal) break;
                        if (signal instanceof ContinueSignal) continue;
                        throw signal;
                    }
                }
                break;
            case 'ForStatement':
                if (node.init) this.executeStatement(node.init);
                while (!node.condition || this.evaluateNode(node.condition)) {
                    try { this.executeStatement(node.body); }
                    catch (signal) {
                        if (signal instanceof BreakSignal) break;
                        if (signal instanceof ContinueSignal) { /* proceed to update */ }
                        else throw signal;
                    }
                    if (node.update) this.executeStatement(node.update);
                }
                break;
        }
    }

    interpret(ast) {
        for (let stmt of ast.body) this.executeStatement(stmt);
        return this.logs;
    }
}


let monacoEditorInstance;

require(['vs/editor/editor.main'], function () {
    monaco.languages.register({ id: 'ultimateFlowLanguage' });

    const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const keywordsToMatch = Object.values(CONFIG.keywords).map(escapeRegex).join('|');

    monaco.languages.setMonarchTokensProvider('ultimateFlowLanguage', {
        tokenizer: {
            root: [
                [new RegExp(`\\b(${keywordsToMatch})\\b`), 'keyword'],
                [/"([^"\n]*)"/, 'string'],
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

window.executeSourceCode = function() {
    const terminalScreen = document.getElementById('terminal-screen');
    const codeInputString = monacoEditorInstance.getValue();
    clearConsole();

    try {
        const tokens = new Lexer(codeInputString).tokenize();
        const ast = new Parser(tokens).parse();
        const runtimeLogs = new RuntimeInterpreter().interpret(ast);

        if (runtimeLogs.length === 0) {
            terminalScreen.innerHTML = `<div class="terminal-line"><span class="terminal-prompt">></span><span class="terminal-output terminal-welcome">Program ran with no output.</span></div>`;
        } else {
            runtimeLogs.forEach(line => {
                const row = document.createElement('div');
                row.className = 'terminal-line';
                row.innerHTML = `<span class="terminal-prompt">></span><span class="terminal-output"></span>`;
                row.querySelector('.terminal-output').innerText = line;
                terminalScreen.appendChild(row);
            });
        }
    } catch (err) {
        const errRow = document.createElement('div');
        errRow.className = 'terminal-line';
        errRow.innerHTML = `<div class="terminal-error"></div>`;
        errRow.querySelector('.terminal-error').innerText = err.message;
        terminalScreen.appendChild(errRow);
    }
}