var WebSocketServer = require('ws').Server,
    wss = new WebSocketServer({port: 9999});

var connections = [],
    activeConnections = [],
    activeMembers = [],
    messages = [],
    deauthorisedHimself;

// Функция штампа времени (возвращает текущую дату/время в виде строки)
function getFormattedDateString() {
    var date = new Date();

    return   date.getFullYear() + '.' +
            (date.getMonth()   < 9  ? '0' + (date.getMonth() + 1) : (date.getMonth() + 1)) + '.' +
            (date.getDate()    < 10 ? '0' + date.getDate()        : date.getDate())        + ' ' +
            (date.getHours()   < 10 ? '0' + date.getHours()       : date.getHours())       + ':' +
            (date.getMinutes() < 10 ? '0' + date.getMinutes()     : date.getMinutes())     + ':' +
            (date.getSeconds() < 10 ? '0' + date.getSeconds()     : date.getSeconds());
}

// Функция возвращает только время, если дата совпадает с текущей
function getShortFormattedDateString(inputDate) {
    var date = new Date(),
        withoutTimeStr = date.getFullYear() + '.' +
                        (date.getMonth() < 9  ? '0' + (date.getMonth() + 1) : (date.getMonth() + 1)) + '.' +
                        (date.getDate()  < 10 ? '0' + date.getDate()        : date.getDate()) + ' ';

    if (inputDate.indexOf(withoutTimeStr) != -1) {
        return inputDate.slice(withoutTimeStr.length);
    }

    return inputDate;
}

wss.on('connection', function connection(ws) {

    ws.on('message', function incoming(message) {
        console.log('==========');
        console.log('new message "%s"', message);

        message = JSON.parse(message);

        // авторизация нового/старого пользователя
        if (message.login) {
            var alreadyPresent = false; // пользователь уже существует

            // Обходим большим циклом все соединения
            for (let i = 0; i < connections.length; i++) {
                // Пользователь из сообщения уже существует, и сообщение не обновляет фото
                if (connections[i].login === message.login && !message.isUpdatePhoto) {
                    // еще цикл: ищем, не активен ли пользователь из сообщения
                    for (let j = 0; j < activeMembers.length; j++) {
                        // если активен, отрезаем его старое соединение
                        if (activeMembers[j].login === message.login) {
                            // обновляем список активных соединений
                            activeConnections = activeConnections.filter(function (current) {
                                if (activeMembers[j].login === current.login) {
                                    current.send(JSON.stringify({deauthorised: true}));
                                    deauthorisedHimself = current.login;
                                    return false;
                                }

                                return true;
                            });
                            activeMembers.splice(j, 1);
                        }
                    }

                    // есть ли в базе фото текущего существующего пользователя
                    if (connections[i].photo) {
                        message.photo = connections[i].photo;
                    } else {
                        message.photo = null;
                    }

                    // есть ли в базе сообщения текущего существующего пользователя
                    if (connections[i].messages.length) {
                        message.oldMessages = [];

                        for (let j = 0; j < connections[i].messages.length; j++) {
                            message.oldMessages.push(messages[connections[i].messages[j]]);
                            message.oldMessages[j].date = getShortFormattedDateString(message.oldMessages[j].date);
                        }
                    }

                    // говорим, что пользователь уже существует
                    alreadyPresent = true;

                    // добавляем соединение текущего существующего польователя в активные
                    activeConnections.push(ws);
                    activeConnections[activeConnections.length - 1].login = connections[i].login;

                    // добавляем текущего существующего польователя в массив активных участников
                    activeMembers.push({
                        name: message.name,
                        photo: connections[i].photo,
                        login: message.login
                    });

                    console.log('new connection from ' + connections[connections.length - 1].login);
                    console.log('Авторизовались под существующим');
                    break;
                }

                // Если пользователь из сообщения существует, и сообщение говорит "Обновить фото"
                if (connections[i].login === message.login && message.isUpdatePhoto) {
                    connections[i].photo = message.photo;
                    // также циклом ищем, не активен ли пользователь из сообщения,
                    // если активен - обновляем фото в списке активных участников.
                    for (let j = 0; j < activeMembers.length; j++) {
                        if (activeMembers[j].login === message.login) {
                            activeMembers[j].photo = message.photo;
                        }
                    }
                }
            }

            // Если пользователь из сообщения еще не существует - добавляем его во все массивы
            if (!alreadyPresent && !message.isUpdatePhoto) {
                connections.push(ws);
                connections[connections.length - 1].login = message.login;
                connections[connections.length - 1].name = message.name;
                connections[connections.length - 1].messages = [];

                activeConnections.push(ws);
                activeConnections[activeConnections.length - 1].login = connections[connections.length - 1].login;

                activeMembers.push({
                    name: message.name,
                    photo: connections[connections.length - 1].photo,
                    login: message.login
                });

                console.log('new connection from ' + connections[connections.length - 1].login);
            }

            // записываем в сообщение список активных участников
            message.members = activeMembers;

            message = JSON.stringify(message);
        }

        // если сообщение содержит текст
        if (message.text) {
            // добавляем его в массив сообщений сервера
            messages.push({
                from: message.from,
                name: message.name,
                text: message.text,
                date: getFormattedDateString()
            });

            // получаем укороченный вариант даты (только время), если дата текущая
            message.date = getShortFormattedDateString(messages[messages.length - 1].date);

            // пишем номер сообщения в массивы сообщений всех активных участников (чтобы вернуть при авторизации)
            for (let i = 0; i < activeMembers.length; i++) {
                for (let j = 0; j < connections.length; j++) {
                    if (connections[j].login == activeMembers[i].login) {
                        connections[j].messages.push(messages.length - 1);
                    }
                }
            }
        }

        // выполняем рассылку обработанного сообщения всем активным участникам
        dispatchMessage(message);

        console.log('==========');
    });

    // Удаляем соединение из массива соединений к серверу, если оно закрывается (закрыли вкладку и т.п.)
    ws.on('close', function() {
        if (ws.login !== deauthorisedHimself) {
            // обновляем список активных соединений
            activeConnections = activeConnections.filter(function (current) {
                return current !== ws;
            });

            // обновляем список активных участников
            for (let i = 0; i < activeMembers.length; i++) {
                if (activeMembers[i].login === ws.login) {
                    activeMembers.splice(i, 1);
                    dispatchMessage({members: activeMembers});
                    break;
                }
            }

            console.log('close connection');
        } else {
            // если пользователь деавторизовался входом с другого места, то уже почистили его соединение в другом месте
            deauthorisedHimself = null;
        }
    });
});

// Функция выполняет рассылку обработанного сообщения всем активным участникам
function dispatchMessage(message) {
    if ((typeof message) !== 'string') { // если сообщение - не строка, преобразуем в строку
        message = JSON.stringify(message);
    }

    // каждому активному соединению...
    activeConnections.forEach(function(connection) {
        console.log('sending data to client');
        // ...рассылаем обработанное сообщение
        connection.send(message, function(e) {
            if (e) { // если ошибка - закрываем соединение текущего пользователя
                console.log(e);
                // обновляем массив активных соединений
                activeConnections = activeConnections.filter(function(current) {
                    return current !== connection;
                });
                // обновляем массив активных участников
                for (let i = 0; i < activeMembers.length; i++) {
                    if (activeMembers[i].login === connection.login) {
                        activeMembers.splice(i, 1);
                        message.members = activeMembers;
                        dispatchMessage(message);
                        break;
                    }
                }

                console.log('close connection in send');
            }
        });
    });
}