var canvas = document.getElementById('photo-canvas'),
    context = canvas.getContext('2d'),
    img = document.createElement('img'),
    mouseDown = false,
    movement = { // Перемещение картинки в канвас
        x: 0,
        y: 0,
        lastX: 0,
        lastY: 0
    },
    clearCanvas = function () {
        context.clearRect(0, 0, canvas.width, canvas.height);
    };

// При загрузке картинки в img
img.addEventListener('load', function () {
    clearCanvas();

    if (img.width < canvas.width) { // подгоняем картинку по ширине, если сильно мелкая
        img.height = img.height * (canvas.width / img.width);
        img.width = canvas.width;
    }

    if (img.height < canvas.height) { // подгоняем картинку по высоте, если сильно мелкая
        img.width = img.width * (canvas.height / img.height);
        img.height = canvas.height;
    }

    movement.x = movement.y = 0;
    context.drawImage(img, -img.width/2 + canvas.width/2, -img.height/2 + canvas.height/2, img.width, img.height);
});

canvas.addEventListener('mousedown', function () {
    if (img && img.src !== '') {
        mouseDown = true;
    }
});

canvas.addEventListener('mouseup', function () {
    mouseDown = false;
});

// Перерисовываем картинку при ее перемещении мышкой
canvas.addEventListener('mousemove', function (e) {
    if (mouseDown) {
        clearCanvas();

        // запоминаем, на сколько передвинули картинку, плохая математика
        if (movement.lastX > e.layerX) movement.x--;
        if (movement.lastX < e.layerX) movement.x++;
        if (movement.lastY > e.layerY) movement.y--;
        if (movement.lastY < e.layerY) movement.y++;

        movement.lastX = e.layerX;
        movement.lastY = e.layerY;

        context.drawImage(img, e.layerX -img.width/2 + movement.x, e.layerY -img.height/2 + movement.y);
    }
});

canvas.addEventListener('dragover', function (e) {
    e.preventDefault();
});

// Дропаем картинку в канвас и записываем ее в img - утверждается, что работает только в Firefox и Chrome
canvas.addEventListener('drop', function (e) {
    var files = e.dataTransfer.files;

    canvasClear();

    if (files.length > 0) {
        var file = files[0];
        if (typeof FileReader !== 'undefined' && file.type.indexOf('image') != -1) {
            if (file.type === 'image/jpeg' && file.size < 512 * 1024 + 1) { // проверка на jpeg и 512 Кб
                var reader = new FileReader();
                // Примечание: addEventListener не работает в Chrome для этого события
                reader.onload = function (e) {
                    img.src = e.target.result;
                };
                reader.readAsDataURL(file);
            } else {
                alert('Загружаемый файл должен быть jpeg-формата и иметь размер не более 512 Кб');
            }
        }
    }
    e.preventDefault();
});

// экспорт канвас во внешний js
export function canvasReturn() {
    return {
        content: canvas,
        hasImage: img.src !== '' // boolean - загружена ли картинка в img
    };
}

// экспорт во внешний js механизма очистки канвас и зачистки атрибутов img
export function canvasClear() {
    img.removeAttribute('src');
    img.removeAttribute('width');
    img.removeAttribute('height');
    clearCanvas();
}

// экспорт во внешний js механизма установки инструкции 'перетащите сюда фото' в канвас
export function drawDnDText() {
    context.font = '16px Fira Sans';
    context.fillText('перетащите сюда фото', 11, 104);
}