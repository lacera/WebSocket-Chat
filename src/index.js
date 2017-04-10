require('./styles.css');
// импорт работы с канвас
import {canvasReturn, canvasClear, drawDnDText} from '../src/dnd.to.canvas';

var socket = new WebSocket('ws://localhost:9999');

// клик по кнопке "Войти"
authButton.addEventListener('click', authAction);

// Авторизация (запускаем вход в чат после клика на "Войти")
function authAction() {
    if (!nameText.value || !loginText.value) { // если одно из полей пустое - не даем зайти
        alert('Вход невозможен. Правильно заполните поля!');
        return;
    }

    var user = {
        name: nameText.value,
        login: loginText.value,
        photo: ''
    },
        membersPhotos = {}; // здесь храним пользовательские фото

    sendAuthData(socket, user); // отправляем данные пользователя на сервер

    // слушаем сообщения от сервера
    socket.addEventListener('message', function(event) {
        var message = JSON.parse(event.data);
        console.log(message);

        // Что делаем, если получаем сообщение с текстом
        if (message.text) {
            addMessage(message, membersPhotos);
        }

        // Получили логин своего пользователя, значит обновляем информацию о пользователе (фото, имя, сообщения в чате)
        if (message.login && message.login === user.login) {
            document.querySelector('#avatar .name').textContent = message.name;
            if (message.photo) {
                let photoDiv = document.querySelector('#avatar .photo');

                photoDiv.style.backgroundImage = `url(${message.photo})`;
                photoDiv.innerText = '';
            }
            if (message.oldMessages) {
                for (let i = 0; i < message.oldMessages.length; i++) {
                    addMessage(message.oldMessages[i], membersPhotos);
                }
            }
        }

        // Что делаем, если сообщение содержит список участников
        if (message.members) {
            // получаем фото участников
            for (let i = 0; i < message.members.length; i++) {
                membersPhotos[message.members[i].login] = message.members[i].photo;
            }

            // обновляем фото участников в сообщениях чата
            for (let key in membersPhotos) {
                var messagesFrom = document.querySelectorAll(`img[data-photo='${key}']`);

                for (let i = 0; i < messagesFrom.length; i++) {
                    if (membersPhotos[key]) {
                        messagesFrom[i].src = membersPhotos[key];
                    }
                }
            }

            // обновляем список участников слева
            var templateFn = require('../src/templates/members-list.hbs');

            document.querySelector('#members').innerHTML = templateFn({
                membersNum: message.members.length,
                members: message.members
            });
        }

        // если получено сообщение о деавторизации (авторизовались под тем же логином на другой вкладке)
        if (message.deauthorised) {
            location.reload(); // выкидывает из чата
        }
    });

    // скроем окно авторизации
    document.querySelector('.substrate-auth').style.display = 'none';

    // на событие ошибки соединения вебсокета покажем alert
    socket.addEventListener('error', function() {
        alert('Соединение закрыто или не может быть открыто');
    });

    // навешаем событие на текстовое поле чата: по нажатию Enter отправим сообщение на сервер
    messageText.addEventListener('change', () => sendMessage(socket, user));

    // навешаем события click делегированием
    document.querySelector('#main-container').addEventListener('click', (e) => {

        // отправка сообщения по нажатию на "Отправить"
        if (e.target.id == 'sendButton') {
            sendMessage(socket, user);
        }

        // вызвать окно загрузки фотографии по нажатию на фото пользователя слева
        if (e.target.className == 'photo') {
            drawDnDText();
            document.querySelector('.substrate-photo').style.display = 'block';
        }

        // по нажатию на "Отмена" в окне загрузки фото - закрыть это окно и очистить канву
        if (e.target.id == 'cancelButton') {
            canvasClear();
            document.querySelector('.substrate-photo').style.display = 'none';
        }

        // по нажатию на "Загрузить" в окне загрузки фото - отправить загруженное фото на сервер
        if (e.target.id == 'loadButton') {
            var photo = canvasReturn();

            if (photo.hasImage) {
                user.photo = photo.content.toDataURL("image/jpeg");
                user.isUpdatePhoto = true;
                sendAuthData(socket, user);
            } else {
                alert('Вы не загрузили изображение из файла!');
            }
        }
    });
}

// Отправка пользовательских данных на сервер
function sendAuthData(socket, user) {
    if (socket.readyState === WebSocket.CLOSED) {
        socket.onerror();
        return;
    }

    socket.send(JSON.stringify(user));
}

// добавляем сообщение в чат
function addMessage(message, membersPhotos) {
    if (!message.text.trim()) { // если текст сообщения пустой - ничего не делаем
        return;
    }

    // если сообщение от пользователя с установленным фото, то пробрасываем фото в сообщение
    if (membersPhotos[message.from]) {
        message.photo = membersPhotos[message.from];
    } else {
        message.photo = '';
    }

    // создаем сообщение, как элемент списка, и вставляем в него шаблон сообщения
    var messageItem = document.createElement('li');
    messageItem.className = "list-group-item";

    var templateFn = require('../src/templates/message.hbs');

    messageItem.innerHTML = templateFn({
        message: message
    });

    messageContainer.appendChild(messageItem);

    // последние сообщения всегда внизу
    messageContainer.scrollTop = messageContainer.scrollHeight;
}

// Отправляем сообщение
function sendMessage(socket, user) {
    var message = {
        text: messageText.value,
        from: user.login,
        name: user.name
    };

    if (socket.readyState === WebSocket.CLOSED) {
        socket.onerror();
        return;
    }

    socket.send(JSON.stringify(message));

    messageText.value = '';
}