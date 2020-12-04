const EOF = Symbol('EOF');
const alpha = /^[a-zA-Z$]/;
const spaceSeries = /^[\t\n\f ]$/;
let currentToken = null;
let currentAttribute = null;
let currentTextNode = null;
let stack = [{type: 'document', children: []}];
const css = require('css');
let rules = [];

// 把css规则暂存数组
function addCssRules(text){
    var ast = css.parse(text);
    // console.log(JSON.stringify(ast, null, "   ")); // 
    rules.push(...ast.stylesheet.rules);
}

function match(element, selector){
    if(!selector || !element.attributes){
        return false;
    }

    if(selector.charAt(0) == '#'){
        let attr = element.attributes.filter(attr => attr.name === "id")[0]
        if(attr && attr.value === selector.replace("#", '')){
            return true;
        }
    }
    else if(selector.charAt(0) == '.'){
        let attr = element.attributes.filter(attr => attr.name === 'class')[0]
        if(attr && attr.value === selector.replace(".", '')){
            return true;
        }
    }
    else {
        if(element.tagName === selector){
            return true;
        }
    }


    return false;
}

function computedCSS(element){
    // console.log(rules);
    //  避免栈变化引起的污染
    var elements = stack.slice().reverse();
    if(!element.computedStyle){
        element.computedStyle = {};
    }

    for(let rule of rules){
        var selectorParts = rule.selectors[0].split(" ").reverse();
        // selectorParts = ['#mydiv', 'div', 'body']
        if(!match(element, selectorParts[0])){
            continue;
        }
        let matched = false;

        var j = 1;
        for(var i = 0; i < elements.length; i++){
            if(match(elements[i], selectorParts[j])){
                j++;
            }
        }

        if(j >= selectorParts.length ){
            matched = true;
        }

        if(matched){
            //  如果匹配到，我们要加入
            console.log('Element', element, 'matched rule', rule);
            let computedStyle = element.computedStyle;
            for(let declaration of rule.declarations){
                if(!computedStyle[declaration.property]){
                    computedStyle[declaration.property] = {};
                    computedStyle[declaration.property].value = declaration.value;
                }
            }

            console.log('element.computedStyle', element.computedStyle);
        }

    }
}

function emit(token){
    // console.log(token);
    // if(token.type === 'text'){
    //     return;
    // }
    let top = stack[stack.length -1];
    if(token.type === 'startTag'){
        let element = {
            type: 'element',
            children: [],
            attributes: []
        };

        element.tagName = token.tagName;

        for(let p in token){
            if(p !== 'type' && p !== 'tagName'){
                element.attributes.push({
                    name: p,
                    value: token[p]
                });                
            }
        }

        computedCSS(element);

        top.children.push(element);
        element.parent = top;

        if(!token.selfClosing){
            stack.push(element);
        }

        currentTextNode = null;


    }
    else if(token.type === 'endTag'){
        if(top.tagName !== token.tagName){
            throw new Error("Tag start end does't match");
        }
        else{
            // 遇到style标签，执行添加css规则的操作
            if(top.tagName === 'style'){
                addCssRules(top.children[0].content);
            }
            stack.pop();
        }
        currentTextNode = null;
    }
    else if(token.type === 'text'){
        if(currentTextNode == null){
            currentTextNode = {
                type: 'text',
                content: ''
            };
            top.children.push(currentTextNode);
        }
        token.content !== EOF ? currentTextNode.content += token.content : '';
    }

}
// 13.2.5.1 Data state
// Consume the next input character:

//---> U+0026 AMPERSAND (&)
// Set the return state to the data state. Switch to the character reference state.
// --->U+003C LESS-THAN SIGN (<)
// Switch to the tag open state.
//---> U+0000 NULL
// This is an unexpected-null-character parse error. Emit the current input character as a character token.
// --->EOF
// Emit an end-of-file token.
// --->Anything else
// Emit the current input character as a character token.

function data(c){ // 起始状态接受字符 
    if(c === '<'){
       // --->U+003C LESS-THAN SIGN (<)
        // Switch to the tag open state.
        return tagOpen;
    }
    else if(c === 'EOF'){
        emit({
            type: 'EOF'
        });
        return ;
    }
    else{ // status reconsume
        emit({
            type: 'text',
            content: c
        });
        return data;
    }
}

// 13.2.5.6 Tag open state
// Consume the next input character:

// ---> U+0021 EXCLAMATION MARK (!)
// Switch to the markup declaration open state.
// ---> U+002FSOLIDUS (/)
// Switch to the end tag open state.
//  --->ASCII alpha /^[a-zA-Z]$/
// Create a new start tag token, set its tag name to the empty string. Reconsume in the tag name state.
// ---> U+003F QUESTION MARK (?)
// This is an unexpected-question-mark-instead-of-tag-name parse error. Create a comment token whose data is the empty string. Reconsume in the bogus comment state.
//  --->EOF
// This is an eof-before-tag-name parse error. Emit a U+003C LESS-THAN SIGN character token and an end-of-file token.
//  --->Anything else
// This is an invalid-first-character-of-tag-name parse error. Emit a U+003C LESS-THAN SIGN character token. Reconsume in the data state.

function tagOpen(c){ // 标签开始
    if(c === '/'){
        return endTagOpen; // 结束标签开始
    }
    else if(c.match(alpha)){
        // Create a new start tag token, set its tag name to the empty string. Reconsume in the tag name state.
        currentToken = {
            type: 'startTag',
            tagName: ''
        };
        return tagName(c); // 收集tagName
    }
    else{
        return;
    }
}


// 13.2.5.7 End tag open state
// Consume the next input character:

// ASCII alpha
// Create a new end tag token, set its tag name to the empty string. Reconsume in the tag name state.
// U+003E GREATER-THAN SIGN (>)
// This is a missing-end-tag-name parse error. Switch to the data state.
// EOF
// This is an eof-before-tag-name parse error. Emit a U+003C LESS-THAN SIGN character token, a U+002F SOLIDUS character token and an end-of-file token.
// Anything else
// This is an invalid-first-character-of-tag-name parse error. Create a comment token whose data is the empty string. Reconsume in the bogus comment state.

function endTagOpen(c){  // 结束标签开始
    if(c.match(alpha)){
        currentToken = {
            type: 'endTag',
            tagName: ''
        };
        return tagName(c);
    }
    else if(c === '>'){

    }
    else if(c === EOF){

    }
    else{

    }
}

// 13.2.5.8 Tag name state
// Consume the next input character:

// ---> U+0009 CHARACTER TABULATION (tab)
// ---> U+000A LINE FEED (LF)
// ---> U+000C FORM FEED (FF)
// ---> U+0020 SPACE
// Switch to the before attribute name state.
// ---> U+002F SOLIDUS (/)
// Switch to the self-closing start tag state.
// ---> U+003E GREATER-THAN SIGN (>)
// Switch to the data state. Emit the current tag token.
//  --->ASCII upper alpha
// Append the lowercase version of the current input character (add 0x0020 to the character's code point) to the current tag token's tag name.
//  --->U+0000 NULL
// This is an unexpected-null-character parse error. Append a U+FFFD REPLACEMENT CHARACTER character to the current tag token's tag name.
//  --->EOF
// This is an eof-in-tag parse error. Emit an end-of-file token.
//  --->Anything else
// Append the current input character to the current tag token's tag name.

function tagName(c){
    if(c.match(spaceSeries)){
        return beforeAttributeName;
    }
    else if(c === '/'){
        return selfClosingStartTag;
    }
    else if(c.match(alpha)){
        currentToken.tagName += c;
        return tagName;
    }
    else if(c === '>'){
        emit(currentToken);
        return data;
    }
    else{
        return tagName;
    }
}

// 13.2.5.32 Before attribute name state
// Consume the next input character:

// ---> U+0009 CHARACTER TABULATION (tab)
// ---> U+000A LINE FEED (LF)
// ---> U+000C FORM FEED (FF)
// ---> U+0020 SPACE
// Ignore the character.
// ---> U+002F SOLIDUS (/)
// ---> U+003E GREATER-THAN SIGN (>)
// ---> EOF
// Reconsume in the after attribute name state.
// ---> U+003D EQUALS SIGN (=)
// This is an unexpected-equals-sign-before-attribute-name parse error. Start a new attribute in the current tag token. Set that attribute's name to the current input character, and its value to the empty string. Switch to the attribute name state.
// ---> Anything else
// Start a new attribute in the current tag token. Set that attribute name and value to the empty string. Reconsume in the attribute name state.
function beforeAttributeName(c){
    if(c.match(spaceSeries)){
        return beforeAttributeName;
    }
    else if(c === '>'){
        return data;
    }
    else if(c === '='){
        return beforeAttributeName;
    }
    else {
        return beforeAttributeName;
    }
}

// 13.2.5.40 Self-closing start tag state
// Consume the next input character:

// ---> U+003E GREATER-THAN SIGN (>)
// Set the self-closing flag of the current tag token. Switch to the data state. Emit the current tag token.
// ---> EOF
// This is an eof-in-tag parse error. Emit an end-of-file token.
// ---> Anything else
// This is an unexpected-solidus-in-tag parse error. Reconsume in the before attribute name state.

function selfClosingStartTag(c){
    if(c === '>'){
        currentToken.selfClosing = true;
        emit(currentToken);
        return data;
    }
    else if(c === 'EOF'){

    }
    else{
        return beforeAttributeName(c);
    }
}

// 13.2.5.32 Before attribute name state
// Consume the next input character:

// ---> U+0009 CHARACTER TABULATION (tab)
// ---> U+000A LINE FEED (LF)
// ---> U+000C FORM FEED (FF)
// ---> U+0020 SPACE
// Ignore the character.
// ---> U+002F SOLIDUS (/)
// ---> U+003E GREATER-THAN SIGN (>)
// ---> EOF
// Reconsume in the after attribute name state.
// ---> U+003D EQUALS SIGN (=)
// This is an unexpected-equals-sign-before-attribute-name parse error.
//  Start a new attribute in the current tag token. Set that attribute's name 
// to the current input character, and its value to the empty string. Switch to the attribute name state.
// ---> Anything else
// Start a new attribute in the current tag token. Set that attribute name 
// and value to the empty string. Reconsume in the attribute name state.

function beforeAttributeName(c){
    if(c.match(spaceSeries)){
        return beforeAttributeName;
    }
    else if(c === '/' || c === '>' || c == EOF){
        return afterAttributeName(c);
    }
    else if(c === '='){

    }
    else {
        currentAttribute = {
            name: '',
            value: ''
        };
        return attributeName(c);
    }
}


// 13.2.5.33 Attribute name state
// Consume the next input character:

// U+0009 CHARACTER TABULATION (tab)
// U+000A LINE FEED (LF)
// U+000C FORM FEED (FF)
// U+0020 SPACE
// U+002F SOLIDUS (/)
// U+003E GREATER-THAN SIGN (>)
// EOF
// Reconsume in the after attribute name state.
// U+003D EQUALS SIGN (=)
// Switch to the before attribute value state.
// ASCII upper alpha
// Append the lowercase version of the current input character (add 0x0020 to the character's code point) to the current attribute's name.
// U+0000 NULL
// This is an unexpected-null-character parse error. Append a U+FFFD REPLACEMENT CHARACTER character to the current attribute's name.
// U+0022 QUOTATION MARK (")
// U+0027 APOSTROPHE (')
// U+003C LESS-THAN SIGN (<)
// This is an unexpected-character-in-attribute-name parse error. Treat it as per the "anything else" entry below.
// Anything else
// Append the current input character to the current attribute's name.
// When the user agent leaves the attribute name state (and before emitting the tag token, if appropriate), 
// the complete attribute's name must be compared to the other attributes on the same token; if there is already 
// an attribute on the token with the exact same name, then this is a duplicate-attribute parse error and the new 
// attribute must be removed from the token.

function  attributeName(c){
    if(c.match(spaceSeries) || c === '/' || c === '>'){
        return afterAttributeName(c);
    }
    else if(c === '='){
        return beforeAttributeValue;
    }
    else if(c === '\u0000'){

    }
    else if(c === "\"" || c === "'" || c === "<"){

    }
    else {
        currentAttribute.name += c;
        return attributeName;
    }
}

// 13.2.5.34 After attribute name state
// Consume the next input character:

// U+0009 CHARACTER TABULATION (tab)
// U+000A LINE FEED (LF)
// U+000C FORM FEED (FF)
// U+0020 SPACE
// Ignore the character.
// U+002F SOLIDUS (/)
// Switch to the self-closing start tag state.
// U+003D EQUALS SIGN (=)
// Switch to the before attribute value state.
// U+003E GREATER-THAN SIGN (>)
// Switch to the data state. Emit the current tag token.
// EOF
// This is an eof-in-tag parse error. Emit an end-of-file token.
// Anything else
// Start a new attribute in the current tag token. Set that attribute name and value to 
// the empty string. Reconsume in the attribute name state.

function afterAttributeName(c){
    if(c.match(spaceSeries)){
        return attributeName;
    }
    else if( c === "/"){
        return selfClosingStartTag;
    }
    else if(c === "="){
        return beforeAttributeValue;
    }
    else if(c === ">"){
        currentToken[currentAttribute.name] = currentAttribute.value;
        emit(currentToken);
        return data;
    }
    else if(c === EOF){

    }
    else {
        currentToken[currentAttribute.name] = currentAttribute.value;
        currentAttribute = {
            name: '',
            value: ''
        };
        return attributeName(c);
    }
}

// 13.2.5.35 Before attribute value state
// Consume the next input character:

// U+0009 CHARACTER TABULATION (tab)
// U+000A LINE FEED (LF)
// U+000C FORM FEED (FF)
// U+0020 SPACE
// Ignore the character.
// U+0022 QUOTATION MARK (")
// Switch to the attribute value (double-quoted) state.
// U+0027 APOSTROPHE (')
// Switch to the attribute value (single-quoted) state.
// U+003E GREATER-THAN SIGN (>)
// This is a missing-attribute-value parse error. Switch to the data state. Emit the current tag token.
// Anything else
// Reconsume in the attribute value (unquoted) state.

function beforeAttributeValue (c){
    if(c.match(spaceSeries) || c === "/" || c === ">" || c === EOF){
        return beforeAttributeValue;
    }
    else if(c === "\""){
        return doubleQuotedAttributeValue;
    }
    else if(c === "\'"){
        return singleQuotedAttributeValue;
    }
    else if(c === '>'){

    }
    else {
        return unquotedAttributeValue(c);
    }
}


// 13.2.5.36 Attribute value (double-quoted) state
// Consume the next input character:

// U+0022 QUOTATION MARK (")
// Switch to the after attribute value (quoted) state.
// U+0026 AMPERSAND (&)
// Set the return state to the attribute value (double-quoted) state. Switch to the character reference state.
// U+0000 NULL
// This is an unexpected-null-character parse error. Append a U+FFFD REPLACEMENT CHARACTER character to the current attribute's value.
// EOF
// This is an eof-in-tag parse error. Emit an end-of-file token.
// Anything else
// Append the current input character to the current attribute's value.
function doubleQuotedAttributeValue(c){
    if(c === "\""){
        currentAttribute[currentAttribute.name] = currentAttribute.value;
        return afterQuotedAttributeValue;
    }
    else if(c === '\u0000'){

    }
    else if(c === EOF){

    }
    else{
        currentAttribute.value += c;
        return doubleQuotedAttributeValue;
    }
}


// 13.2.5.37 Attribute value (single-quoted) state
// Consume the next input character:

// U+0027 APOSTROPHE (')
// Switch to the after attribute value (quoted) state.
// U+0026 AMPERSAND (&)
// Set the return state to the attribute value (single-quoted) state. Switch to the character reference state.
// U+0000 NULL
// This is an unexpected-null-character parse error. Append a U+FFFD REPLACEMENT CHARACTER character to the current attribute's value.
// EOF
// This is an eof-in-tag parse error. Emit an end-of-file token.
// Anything else
// Append the current input character to the current attribute's value.

function singleQuotedAttributeValue(c){
    if(c === "\'"){
        currentAttribute[currentAttribute.name] = currentAttribute.value;
        return afterQuotedAttributeValue;
    }
    else if(c === '\u0000'){

    }
    else if(c === EOF){

    }
    else{
        currentAttribute.value += c;
        return singleQuotedAttributeValue;//doubleQuotedAttributeValue;
    }
}


// 13.2.5.38 Attribute value (unquoted) state
// Consume the next input character:

// U+0009 CHARACTER TABULATION (tab)
// U+000A LINE FEED (LF)
// U+000C FORM FEED (FF)
// U+0020 SPACE
// Switch to the before attribute name state.
// U+0026 AMPERSAND (&)
// Set the return state to the attribute value (unquoted) state. Switch to the character reference state.
// U+003E GREATER-THAN SIGN (>)
// Switch to the data state. Emit the current tag token.
// U+0000 NULL
// This is an unexpected-null-character parse error. Append a U+FFFD REPLACEMENT CHARACTER character to the current attribute's value.
// U+0022 QUOTATION MARK (")
// U+0027 APOSTROPHE (')
// U+003C LESS-THAN SIGN (<)
// U+003D EQUALS SIGN (=)
// U+0060 GRAVE ACCENT (`)
// This is an unexpected-character-in-unquoted-attribute-value parse error. Treat it as per the "anything else" entry below.
// EOF
// This is an eof-in-tag parse error. Emit an end-of-file token.
// Anything else
// Append the current input character to the current attribute's value.

function unquotedAttributeValue(c){
    if(c .match(spaceSeries)){
        currentToken[currentAttribute.name] = currentAttribute.value;
        return beforeAttributeName;
    }
    else if(c === "/"){
        currentToken[currentAttribute.name] = currentAttribute.value;
        return selfClosingStartTag;
    }
    else if(c === ">"){
        currentToken[currentAttribute.name] = currentAttribute.value;
        emit(currentToken);
        return data;
    }
    else if(c === '\u0000'){

    }
    else if(c === "\"" || c === "'" || c === "<" || c === "=" || c === "`"){

    }
    else if(c === EOF){

    }
    else{
        currentAttribute.value += c;
        return unquotedAttributeValue;
    }
}

// 13.2.5.39 After attribute value (quoted) state
// Consume the next input character:

// U+0009 CHARACTER TABULATION (tab)
// U+000A LINE FEED (LF)
// U+000C FORM FEED (FF)
// U+0020 SPACE
// Switch to the before attribute name state.
// U+002F SOLIDUS (/)
// Switch to the self-closing start tag state.
// U+003E GREATER-THAN SIGN (>)
// Switch to the data state. Emit the current tag token.
// EOF
// This is an eof-in-tag parse error. Emit an end-of-file token.
// Anything else
// This is a missing-whitespace-between-attributes parse error. Reconsume in the before attribute name state.

function afterQuotedAttributeValue(c){
   if(c.match(spaceSeries)){
       return  beforeAttributeName;
   } 
   else if(c === "/"){
       return selfClosingStartTag;
   }
   else if(c === ">"){
       currentToken[currentAttribute.name] = currentAttribute.value;
       emit(currentToken);
       return data;
   }
   else if(c === EOF){
    
   }
   else{
       currentAttribute.value += c;
    //    return beforeAttributeName(c);
       return doubleQuotedAttributeValue;
   }
}

// 13.2.5.32 Before attribute name state
// Consume the next input character:

// U+0009 CHARACTER TABULATION (tab)
// U+000A LINE FEED (LF)
// U+000C FORM FEED (FF)
// U+0020 SPACE
// Ignore the character.
// U+002F SOLIDUS (/)
// U+003E GREATER-THAN SIGN (>)
// EOF
// Reconsume in the after attribute name state.
// U+003D EQUALS SIGN (=)
// This is an unexpected-equals-sign-before-attribute-name parse error. Start a new attribute in 
// the current tag token. Set that attribute's name to the current input character, and its value to 
// the empty string. Switch to the attribute name state.
// Anything else
// Start a new attribute in the current tag token. Set that attribute name and value to the empty
//  string. Reconsume in the attribute name state.

function  beforeAttributeName(c){
    if(c.match(spaceSeries)){
        return beforeAttributeName;
    }
    else if( c=== "/" || c === ">" || c === EOF){
        return afterAttributeName(c);
    }
    else if(c === "="){

    }
    else{
        currentAttribute = {
            name: '',
            value: ''
        };
        return attributeName(c);
    }
}
module.exports.parserHTML = function parserHTML(html){
    let state = data;
    for(let c of html){
        state = state(c);
    }
    state = state(EOF);
    // console.log(stack[0]);
}
