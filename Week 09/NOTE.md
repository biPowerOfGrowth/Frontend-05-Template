学习笔记
# 1、HTML解析模块
实际生产过车个闹钟功能http请求的响应应逐段返回，toy browser中整体返回。
拆分parser.js

# 2、FSM实现HTML解析
实现参考https://html.spec.whatwg.org/multipage/#toc-syntax  tokenization章节

使用状态机解析html标签

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

```
function data(c){ // 起始状态接受字符 
    if(c === '<'){
       // --->U+003C LESS-THAN SIGN (<)
        // Switch to the tag open state.
        return tagOpen;
    }
    else if(c === 'EOF'){
        return ;
    }
    else{ // status reconsume
        return data;
    }
}

```

状态机每部实现都可以在标准文档中找到实际描述。

# 3、创建元素，创建token序列，完成词法分析

创建数组，保存token。状态机节点，保存需要的token，完成html词法分析。

# 4、用栈构建dom树的原理

emit函数接受了所有的token。在此完成dom树的构建》

创建根节点 ```let stack = [{type: 'document', children: []}];```

取出栈顶元素 ```let top = stack[stack.length - 1]```

如果遇到startTag token，创建element，入栈
```if(token.type === 'startTag'){
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

        top.children.push(element);
        element.parent = top;
    }```
实现参考 tree construction
实现重点：用栈实现构建dom树

# 5、css规则收集

npm i css
使用css解析器收集css规则，构建css ast











