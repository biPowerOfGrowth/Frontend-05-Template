const EOF = Symbol('EOF');
const alpha = /^[a-zA-Z$]/;
const spaceSeries = /^[\t\n\f ]$/;
let currentToken = null;

function emit(token){
    console.log(token);
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

    }
}

module.exports.parserHTML = function parserHTML(html){
    let state = data;
    for(let c of html){
        state = state(c);
    }
    state = state(EOF);
}
