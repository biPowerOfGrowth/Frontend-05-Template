function getStyle(element){
    if(!element.style){
        element.style = {};
    }
    for(let prop in element.computedStyle){
        var p = element.computedStyle.value;
        element.style[prop] = element.computedStyle[prop].value;

        if(element.style[prop].toString().match(/px$/)){
            element.style[prop] = parseInt(element.style[prop]);
        }

        if(element.style[prop].toString().match(/^[0-9]\.+$/)){
            element.style[prop] = parseInt(element.style[prop]);
        }

    }

    return element.style;
}

module.exports = function layout(element){
    if(!element.computedStyle) return;
    let elementStyle = getStyle(element);

    if(elementStyle.display !== 'flex') return;
    let items = element.children.filter(e => e.type === 'element');

    items.sort(function(a, b){
        return (a.order || 0) - (b.order || 0);
    });

    let style = elementStyle;

    ['width', 'height'].forEach(size => {
        if(style[size] === 'auto' || style[size] === ''){
            style[size] = null;
        }
    });

    if(!style.direction || style.direction === 'auto'){
        style.direction = 'row';
    }
    if(!style.alignItems || style.alignItems === 'auto'){
        style.alignItems = 'stretch';
    }
    if(!style.justifyContent || style.justifyContent === 'auto'){
        style.justifyContent = 'flex-start';
    }
    if(!style.flexWrap || style.flexWrap === 'auto'){
        style.flexWrap = 'nowrap';
    }
    if(!style.alignContent || style.alignContent === 'auto'){
        style.alignContent = 'stretch';
    }

    let mainSize, mainStart, mainEnd, mainSign, mainBase, crossSize,
        crossStart, crossEnd, crossSign, crossBase;
    if(style.flexDirection === 'row'){
        mainSize = 'width';
        mainStart = 'left';
        mainEnd = 'right';
        mainSign = +1;
        mainBase = 0;

        crossSize = 'height';
        crossStart = 'top';
        crossEnd = 'bottom';
    }

    if(style.flexDirection === 'row-reverse'){
        mainSize = 'width';
        mainStart = 'right';
        mainEnd = 'end';
        mainSign = -1;
        mainBase = 0;

        crossSize = 'height';
        crossStart = 'top';
        crossEnd = 'bottom';
    }

    if(style.flexDirection === 'column'){
        mainSize = 'height';
        mainStart = 'top';
        mainEnd = 'bottom';
        mainSign = +1;
        mainBase = 0;

        crossSize = 'width';
        crossStart = 'left';
        crossEnd = 'right';
    }

    if(style.flexDirection === 'row-reverse'){
        mainSize = 'height';
        mainStart = 'bottom';
        mainEnd = 'height';
        mainSign = -1;
        mainBase = 0;

        crossSize = 'width';
        crossStart = 'left';
        crossEnd = 'right';
    }

    if(style.flexWrap === 'wrap-reverse'){
        let tmp = crossStart;
        crossStart = crossEnd;
        crossEnd = tmp;
        crossSign = -1;
    }
    else{
        crossBase = 0;
        crossSign = 1;
    }

    // 收集元素进行

    let isAutoMainSize = false;
    if(!style[mainSize]){
        style[mainSize] = 0;
        
        for(var i = 0; i < items.length; i++){
            let item = items[i];
            if(style[mainSize] !== null || style[mainSize] !== (void 0)){
                style[mainSize] =  elementStyle[mainSize] + itemStyle[mainSize];;
            }
        }
        isAutoMainSize = true;
    }

    let flexLine = [];
    let flexLines = [flexLine];

    let mainSpace = elementStyle[mainSize];
    let corssSpace = 0;

    for(let i = 0; i< items.length; i++){
        let item  = items[i];
        let itemStyle = getStyle(item);

        if(itemStyle[mainSize] === null){
            itemStyle[mainSize] = 0;
        }

        if(itemStyle.flex){
            flexLine.push(item);
        }
        else if(style.flexWrap === 'nowrap' && isAutoMainSize){
            mainSpace -= itemStyle[mainSize];
            if(itemStyle[crossSize] !== null && itemStyle[crossSize] !== (void 0)){
                crossSpace = Math.max(crossSpace, itemStyle[crossSize]);
            }

            flexLine.push(item);
        }
        else{
            if(itemStyle[mainSize] > style[mainSize]){
                itemStyle[mainSize] = style[mainSize];
            }
            if(mainSize > itemStyle[mainSize]){
                flexLine.mainSize = mainSpace;
                flexLine.crossSpace = crossSpace;
                flexLine = [item];
                flexLines.push(flexLine);
                mainSpace = style[mainSize];
                corssSpace = 0;
            }
            else{
                flexLine.push(item);
            }

            if(itemStyle[crossSize] !== null && itemStyle[crossSize] !== (void 0)){
                crossSpace = Math.max(crossSpace, itemStyle[crossSize]);
            }
            mainSpace -= itemStyle[mainSize];
        }
    }
    flexLine.mainSpace = mainSpace;
    console.log(item);
}