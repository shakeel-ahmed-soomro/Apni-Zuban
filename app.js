// Configure Monaco Editor base path
require.config({ paths: { vs: 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.39.0/min/vs' } });

const CONFIG = {
    langName: "ApniZuban",
    keywords: {
        start: "iftitah",
        end: "ikhtitam",
        print: "bolen",
        variable: "ye hai",
        scanKeyword: "poochen",
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
        "ye hai naam = poochen(\"Apna naam darj karen:\")",
        "bolen \"Khush amdeed, \" + naam + \"!\\n\\tYeh Apni Zuban hai.\"",
        "ikhtitam"
    ].join("\n")
};

document.title = `${CONFIG.langName} Ultimate Studio`;
document.getElementById('app-title').innerHTML = `${CONFIG.langName} <span>Ultimate Core</span>`;
document.getElementById('lang-indicator').innerText = `${CONFIG.langName} Workspace`;

const KEYWORD_MAP = {
    [CONFIG.keywords.start]: 'START', [CONFIG.keywords.end]: 'END',
    [CONFIG.keywords.print]: 'PRINT', [CONFIG.keywords.variable]: 'VAR_DEC',
    [CONFIG.keywords.scanKeyword]: 'SCAN',
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

        
        const stringMatch = /^"((?:[^"\\]|\\.)*)"/.exec(remaining);
        if (stringMatch) {
            this.cursor += stringMatch[0].length;
            let processedValue = stringMatch[1]
                .replace(/\\n/g, '\n')
                .replace(/\\t/g, '\t')
                .replace(/\\"/g, '"')
                .replace(/\\\\/g, '\\');
            return { type: 'STRING', value: processedValue };
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

        
        if (token.type === 'SCAN') {
            this.eat('SCAN');
            this.eat('LPAREN');
            let argument = null;
            if (!this.match('RPAREN')) {
                argument = this.parseExpression(); 
            }
            this.eat('RPAREN');
            return { type: 'ScanExpression', argument };
        }

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

// ============================================================
// PHASE 3: SEMANTIC ANALYZER
// ============================================================
class SymbolTable {
    constructor(parent = null) {
        this.symbols = new Map();
        this.parent = parent;
        this.scope = 'global';
    }

    define(name, type, kind = 'variable') {
        if (this.symbols.has(name)) throw new Error(`Semantic Error: Symbol "${name}" already defined in current scope.`);
        this.symbols.set(name, { type, kind, defined: true });
    }

    lookup(name) {
        if (this.symbols.has(name)) return this.symbols.get(name);
        if (this.parent) return this.parent.lookup(name);
        return null;
    }

    exists(name) {
        return this.lookup(name) !== null;
    }

    createChildScope() {
        return new SymbolTable(this);
    }
}

class SemanticAnalyzer {
    constructor() {
        this.globalSymbolTable = new SymbolTable();
        this.currentSymbolTable = this.globalSymbolTable;
        this.errors = [];
        this.nodeSymbolMap = new Map();
    }

    analyze(ast) {
        try {
            this.visitProgram(ast);
            if (this.errors.length > 0) throw new Error(`Semantic Errors:\n${this.errors.join('\n')}`);
        } catch (err) {
            throw new Error(`Semantic Analysis Failed: ${err.message}`);
        }
        return { ast, symbolTable: this.globalSymbolTable, nodeSymbolMap: this.nodeSymbolMap };
    }

    visitProgram(node) {
        for (let stmt of node.body) this.visitStatement(stmt);
    }

    visitStatement(node) {
        switch (node.type) {
            case 'VariableDeclaration':
                if (this.currentSymbolTable.symbols.has(node.id)) {
                    this.errors.push(`Variable "${node.id}" redeclared in same scope.`);
                } else {
                    this.currentSymbolTable.define(node.id, 'dynamic', 'variable');
                }
                if (node.init) this.visitExpression(node.init);
                break;
            case 'FunctionDeclaration':
                this.currentSymbolTable.define(node.name, 'function', 'function');
                const funcScope = this.currentSymbolTable.createChildScope();
                funcScope.scope = `function:${node.name}`;
                const prevTable = this.currentSymbolTable;
                this.currentSymbolTable = funcScope;
                for (let param of node.params) {
                    this.currentSymbolTable.define(param, 'dynamic', 'parameter');
                }
                this.visitStatement(node.body);
                this.currentSymbolTable = prevTable;
                break;
            case 'BlockStatement':
                const blockScope = this.currentSymbolTable.createChildScope();
                blockScope.scope = 'block';
                const prevTable2 = this.currentSymbolTable;
                this.currentSymbolTable = blockScope;
                for (let stmt of node.body) this.visitStatement(stmt);
                this.currentSymbolTable = prevTable2;
                break;
            case 'PrintStatement':
                this.visitExpression(node.expression);
                break;
            case 'AssignmentStatement':
                if (!this.currentSymbolTable.exists(node.id)) {
                    this.errors.push(`Undefined variable: "${node.id}"`);
                } else {
                    const sym = this.currentSymbolTable.lookup(node.id);
                    if (sym.kind === 'function') this.errors.push(`Cannot assign to function: "${node.id}"`);
                }
                this.visitExpression(node.value);
                break;
            case 'IfStatement':
                this.visitExpression(node.condition);
                this.visitStatement(node.consequent);
                if (node.alternate) this.visitStatement(node.alternate);
                break;
            case 'WhileStatement':
                this.visitExpression(node.condition);
                this.visitStatement(node.body);
                break;
            case 'ForStatement':
                const forScope = this.currentSymbolTable.createChildScope();
                forScope.scope = 'for-loop';
                const prevTable3 = this.currentSymbolTable;
                this.currentSymbolTable = forScope;
                if (node.init) this.visitStatement(node.init);
                if (node.condition) this.visitExpression(node.condition);
                if (node.update) this.visitStatement(node.update);
                this.visitStatement(node.body);
                this.currentSymbolTable = prevTable3;
                break;
            case 'ExpressionStatement':
                this.visitExpression(node.expression);
                break;
            case 'ReturnStatement':
                if (node.argument) this.visitExpression(node.argument);
                break;
        }
    }

    visitExpression(node) {
        switch (node.type) {
            case 'Identifier':
                if (!this.currentSymbolTable.exists(node.name)) {
                    this.errors.push(`Undefined variable: "${node.name}"`);
                }
                break;
            case 'BinaryExpression':
                this.visitExpression(node.left);
                this.visitExpression(node.right);
                break;
            case 'LogicalExpression':
                this.visitExpression(node.left);
                this.visitExpression(node.right);
                break;
            case 'CallExpression':
                if (!this.currentSymbolTable.exists(node.callee)) {
                    this.errors.push(`Undefined function: "${node.callee}"`);
                }
                for (let arg of node.arguments) this.visitExpression(arg);
                break;
            case 'ScanExpression':
                if (node.argument) this.visitExpression(node.argument);
                break;
        }
    }
}

// ============================================================
// PHASE 4: INTERMEDIATE CODE GENERATOR (3-Address Code)
// ============================================================
class IntermediateCodeGenerator {
    constructor() {
        this.code = [];
        this.tempCounter = 0;
        this.labelCounter = 0;
    }

    generate(ast) {
        this.visitProgram(ast);
        return this.code;
    }

    newTemp() {
        return `$t${this.tempCounter++}`;
    }

    newLabel() {
        return `L${this.labelCounter++}`;
    }

    emit(op, arg1 = null, arg2 = null, result = null, operator = null) {
        const instr = { op, arg1, arg2, result, index: this.code.length };
        if (operator) instr.operator = operator;
        this.code.push(instr);
    }

    visitProgram(node) {
        for (let stmt of node.body) this.visitStatement(stmt);
    }

    visitStatement(node) {
        switch (node.type) {
            case 'VariableDeclaration':
                if (node.init) {
                    const temp = this.visitExpression(node.init);
                    this.emit('ASSIGN', temp, null, node.id);
                }
                break;
            case 'PrintStatement':
                const val = this.visitExpression(node.expression);
                this.emit('PRINT', val);
                break;
            case 'AssignmentStatement':
                const exprVal = this.visitExpression(node.value);
                this.emit('ASSIGN', exprVal, null, node.id);
                break;
            case 'FunctionDeclaration':
                const startLabel = this.newLabel();
                const endLabel = this.newLabel();
                this.emit('FUNC_DECL', node.name, node.params.length, startLabel);
                this.visitStatement(node.body);
                this.emit('FUNC_END', node.name);
                break;
            case 'BlockStatement':
                for (let stmt of node.body) this.visitStatement(stmt);
                break;
            case 'IfStatement':
                const falseLabel = this.newLabel();
                const endLabel2 = this.newLabel();
                const condition = this.visitExpression(node.condition);
                this.emit('JF', condition, falseLabel);
                this.visitStatement(node.consequent);
                this.emit('JMP', endLabel2);
                this.code.push({ label: falseLabel });
                if (node.alternate) this.visitStatement(node.alternate);
                this.code.push({ label: endLabel2 });
                break;
            case 'WhileStatement':
                const loopLabel = this.newLabel();
                const exitLabel = this.newLabel();
                this.code.push({ label: loopLabel });
                const whileCond = this.visitExpression(node.condition);
                this.emit('JF', whileCond, exitLabel);
                this.visitStatement(node.body);
                this.emit('JMP', loopLabel);
                this.code.push({ label: exitLabel });
                break;
            case 'ExpressionStatement':
                this.visitExpression(node.expression);
                break;
        }
    }

    visitExpression(node) {
        switch (node.type) {
            case 'Literal':
                return node.value;
            case 'Identifier':
                return node.name;
            case 'BinaryExpression':
                const left = this.visitExpression(node.left);
                const right = this.visitExpression(node.right);
                const temp = this.newTemp();
                this.emit('BINOP', left, right, temp, node.operator);
                return temp;
            case 'LogicalExpression':
                const leftLog = this.visitExpression(node.left);
                const rightLog = this.visitExpression(node.right);
                const tempLog = this.newTemp();
                this.emit('LOGOP', leftLog, rightLog, tempLog, node.operator);
                return tempLog;
            case 'CallExpression':
                const args = node.arguments.map(arg => this.visitExpression(arg));
                const callTemp = this.newTemp();
                this.emit('CALL', node.callee, args.length, callTemp);
                args.forEach((arg, idx) => this.emit('PUSH_ARG', arg, idx));
                return callTemp;
            case 'ScanExpression':
                const scanTemp = this.newTemp();
                this.emit('SCAN', node.argument || null, null, scanTemp);
                return scanTemp;
            default:
                return null;
        }
    }
}

// ============================================================
// PHASE 5: CODE OPTIMIZER
// ============================================================
class CodeOptimizer {
    optimize(intermediateCode) {
        let optimized = [...intermediateCode];
        optimized = this.deadCodeElimination(optimized);
        optimized = this.constantFolding(optimized);
        return optimized;
    }

    deadCodeElimination(code) {
        const reachable = new Set();
        let pc = 0;
        while (pc < code.length) {
            const instr = code[pc];
            if (!instr.op) { pc++; continue; }
            reachable.add(pc);
            if (instr.op === 'JMP' || instr.op === 'RETURN') pc = code.length;
            else pc++;
        }
        return code.filter((_, idx) => reachable.has(idx) || !code[idx].op);
    }

    constantFolding(code) {
        const constants = new Map();
        return code.map(instr => {
            if (!instr.op) return instr;
            if (instr.op === 'BINOP' && typeof instr.arg1 === 'number' && typeof instr.arg2 === 'number') {
                let result;
                switch (instr.result) {
                    case '+': result = instr.arg1 + instr.arg2; break;
                    case '-': result = instr.arg1 - instr.arg2; break;
                    case '*': result = instr.arg1 * instr.arg2; break;
                    case '/': result = instr.arg1 / instr.arg2; break;
                    default: return instr;
                }
                constants.set(instr.result, result);
                return { ...instr, result };
            }
            return instr;
        });
    }
}

// ============================================================
// PHASE 6: BYTECODE GENERATOR & VIRTUAL MACHINE
// ============================================================
class BytecodeGenerator {
    constructor() {
        this.bytecode = [];
        this.symbolTable = new Map();
    }

    generateBytecode(intermediateCode) {
        this.bytecode = intermediateCode.map((instr, idx) => ({
            addr: idx,
            ...instr
        }));
        return this.bytecode;
    }
}

class VirtualMachine {
    constructor(bytecode, inputCallback) {
        this.bytecode = bytecode;
        this.pc = 0;
        this.stack = [];
        this.memory = new Map();
        this.functions = new Map();
        this.logs = [];
        this.stepCount = 0;
        this.maxSteps = 15000;
        this.inputCallback = inputCallback;
        this.isWaitingForInput = false;
    }

    async execute() {
        while (this.pc < this.bytecode.length && this.stepCount < this.maxSteps) {
            const instr = this.bytecode[this.pc];
            if (!instr.op) { this.pc++; continue; }

            this.stepCount++;

            switch (instr.op) {
                case 'PRINT':
                    const valToPrint = this.resolveValue(instr.arg1);
                    this.logs.push(String(valToPrint));
                    break;
                case 'ASSIGN':
                    const val = this.resolveValue(instr.arg1);
                    this.memory.set(instr.result, val);
                    break;
                case 'BINOP':
                    const left = this.resolveValue(instr.arg1);
                    const right = this.resolveValue(instr.arg2);
                    let opResult;
                    switch (instr.operator) {
                        case '+': opResult = left + right; break;
                        case '-': opResult = left - right; break;
                        case '*': opResult = left * right; break;
                        case '/': opResult = left / right; break;
                        case '%': opResult = left % right; break;
                        case '==': opResult = left == right; break;
                        case '!=': opResult = left != right; break;
                        case '<': opResult = left < right; break;
                        case '>': opResult = left > right; break;
                        case '<=': opResult = left <= right; break;
                        case '>=': opResult = left >= right; break;
                    }
                    this.memory.set(instr.result, opResult);
                    break;
                case 'LOGOP':
                    const leftL = this.resolveValue(instr.arg1);
                    const rightL = this.resolveValue(instr.arg2);
                    let logResult;
                    if (instr.operator === 'OR') {
                        logResult = leftL || rightL;
                    } else if (instr.operator === 'AND') {
                        logResult = leftL && rightL;
                    }
                    this.memory.set(instr.result, logResult);
                    break;
                case 'JF':
                    if (!this.resolveValue(instr.arg1)) {
                        this.pc = this.findLabel(instr.arg2);
                        continue;
                    }
                    break;
                case 'JMP':
                    this.pc = this.findLabel(instr.arg1);
                    continue;
                case 'SCAN':
                    const prompt_msg = instr.arg1 ? this.resolveValue(instr.arg1) : "Enter:";
                    const input = await this.inputCallback(prompt_msg);
                    this.memory.set(instr.result, isNaN(input) ? input : Number(input));
                    break;
            }
            this.pc++;
        }

        if (this.stepCount >= this.maxSteps) {
            throw new Error("🚨 Infinite Loop Protection Triggered! Execution cut-off (> 15,000 steps).");
        }

        return this.logs;
    }

    resolveValue(val) {
        if (typeof val === 'number' || typeof val === 'string' || typeof val === 'boolean') return val;
        if (this.memory.has(val)) return this.memory.get(val);
        return val;
    }

    findLabel(labelName) {
        for (let i = 0; i < this.bytecode.length; i++) {
            if (this.bytecode[i].label === labelName) return i;
        }
        return this.pc + 1;
    }
}

// ============================================================
// COMPLETE COMPILER (6 PHASES)
// ============================================================
class CompleteCompiler {
    constructor(inputCallback) {
        this.phases = [];
        this.inputCallback = inputCallback;
    }

    async compile(sourceCode) {
        try {
            // PHASE 1: Lexical Analysis
            const lexer = new Lexer(sourceCode);
            const tokens = lexer.tokenize();
            this.phases.push({ phase: 1, name: 'Lexical Analysis', tokens: tokens.slice(0, 10) });

            // PHASE 2: Syntax Analysis  
            const parser = new Parser(tokens);
            const ast = parser.parse();
            this.phases.push({ phase: 2, name: 'Syntax Analysis (AST Generated)', success: true });

            // PHASE 3: Semantic Analysis
            const semanticAnalyzer = new SemanticAnalyzer();
            const { symbolTable } = semanticAnalyzer.analyze(ast);
            this.phases.push({ phase: 3, name: 'Semantic Analysis', symbols: symbolTable.symbols.size });

            // PHASE 4: Intermediate Code Generation
            const icGenerator = new IntermediateCodeGenerator();
            const intermediateCode = icGenerator.generate(ast);
            this.phases.push({ phase: 4, name: 'Intermediate Code Generation', instructions: intermediateCode.length });

            // PHASE 5: Code Optimization
            const optimizer = new CodeOptimizer();
            const optimizedCode = optimizer.optimize(intermediateCode);
            this.phases.push({ phase: 5, name: 'Code Optimization', optimized: true });

            // PHASE 6: Bytecode Generation & Execution
            const bcGenerator = new BytecodeGenerator();
            const bytecode = bcGenerator.generateBytecode(optimizedCode);
            this.phases.push({ phase: 6, name: 'Bytecode Generation', bytecodeSize: bytecode.length });

            const vm = new VirtualMachine(bytecode, this.inputCallback);
            const results = await vm.execute();

            return { success: true, output: results, phases: this.phases };
        } catch (err) {
            return { success: false, error: err.message, phases: this.phases };
        }
    }
}

// Legacy Interpreter (kept for backward compatibility)
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
            
            
            case 'ScanExpression': {
                const message = node.argument ? this.evaluateNode(node.argument) : "Enter input:";
                const userInput = prompt(message);
                if (userInput === null) return null;
                return isNaN(userInput) || userInput.trim() === "" ? userInput : Number(userInput);
            }

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

let currentInputResolve = null;

window.handleConsoleInput = function(event) {
    if (event.key === 'Enter') {
        const input = document.getElementById('console-input-field').value;
        document.getElementById('console-input-field').value = '';
        
        // Display the input in the console
        const inputRow = document.createElement('div');
        inputRow.className = 'terminal-line';
        inputRow.innerHTML = `<span class="terminal-output" style="color: #f59e0b;">${input}</span>`;
        document.getElementById('terminal-screen').appendChild(inputRow);
        
        // Hide input area
        document.getElementById('console-input-area').style.display = 'none';
        
        // Resolve the promise
        if (currentInputResolve) {
            currentInputResolve(input);
            currentInputResolve = null;
        }
    }
}

window.requestConsoleInput = function(prompt) {
    return new Promise((resolve) => {
        currentInputResolve = resolve;
        const inputArea = document.getElementById('console-input-area');
        const inputField = document.getElementById('console-input-field');
        const promptSpan = document.getElementById('input-prompt');
        
        promptSpan.textContent = prompt ? prompt : 'Input:';
        inputArea.style.display = 'block';
        inputField.focus();
    });
}

window.executeSourceCode = async function() {
    const terminalScreen = document.getElementById('terminal-screen');
    const codeInputString = monacoEditorInstance.getValue();
    clearConsole();

    try {
        const compiler = new CompleteCompiler(window.requestConsoleInput);
        const result = await compiler.compile(codeInputString);

        // Display compilation phases
        const phasesRow = document.createElement('div');
        phasesRow.className = 'terminal-line';
        phasesRow.innerHTML = `<span class="terminal-output" style="color: #8b5cf6; font-weight: bold;">╔════ 6-PHASE COMPILATION REPORT ════╗</span>`;
        terminalScreen.appendChild(phasesRow);

        result.phases.forEach(phase => {
            const phaseRow = document.createElement('div');
            phaseRow.className = 'terminal-line';
            let info = `Phase ${phase.phase}: ${phase.name}`;
            if (phase.tokens) info += ` - Tokens: ${phase.tokens.length}+`;
            if (phase.symbols !== undefined) info += ` - Symbols: ${phase.symbols}`;
            if (phase.instructions !== undefined) info += ` - Instructions: ${phase.instructions}`;
            if (phase.bytecodeSize !== undefined) info += ` - Bytecode: ${phase.bytecodeSize}`;
            
            phaseRow.innerHTML = `<span class="terminal-output" style="color: #10b981;">${info}</span>`;
            terminalScreen.appendChild(phaseRow);
        });

        const endRow = document.createElement('div');
        endRow.className = 'terminal-line';
        endRow.innerHTML = `<span class="terminal-output" style="color: #8b5cf6; font-weight: bold;">╚═════════════════════════════════╝</span>`;
        terminalScreen.appendChild(endRow);

        const outputRow = document.createElement('div');
        outputRow.className = 'terminal-line';
        outputRow.innerHTML = `<span class="terminal-output" style="color: #60a5fa; font-style: italic;">--- Program Output ---</span>`;
        terminalScreen.appendChild(outputRow);

        if (result.success) {
            if (result.output.length === 0) {
                terminalScreen.innerHTML += `<div class="terminal-line"><span class="terminal-output terminal-welcome">Program ran with no output.</span></div>`;
            } else {
                result.output.forEach(line => {
                    const row = document.createElement('div');
                    row.className = 'terminal-line';
                    row.innerHTML = `<span class="terminal-output" style="white-space: pre-wrap;"></span>`;
                    row.querySelector('.terminal-output').innerText = line;
                    terminalScreen.appendChild(row);
                });
            }
        } else {
            const errRow = document.createElement('div');
            errRow.className = 'terminal-line';
            errRow.innerHTML = `<div class="terminal-error"></div>`;
            errRow.querySelector('.terminal-error').innerText = result.error;
            terminalScreen.appendChild(errRow);
        }
        
        // Hide input area after execution
        document.getElementById('console-input-area').style.display = 'none';
    } catch (err) {
        const errRow = document.createElement('div');
        errRow.className = 'terminal-line';
        errRow.innerHTML = `<div class="terminal-error"></div>`;
        errRow.querySelector('.terminal-error').innerText = err.message;
        terminalScreen.appendChild(errRow);
        document.getElementById('console-input-area').style.display = 'none';
    }
}