let express = require('express')
let app = express();
let server = require('http').Server(app);
let io = require('socket.io')(server);
let fs = require('fs');
//let path = require('path');

let bodyParser = require('body-parser');

let urlencodedParser = bodyParser.urlencoded({ extended: false });

let userInfos = JSON.parse(fs.readFileSync('./public/data.json'));

let nowTicker = {};
let lastTicker = {};

nowTicker['BTCUSDT']=11282.76;
lastTicker['BTCUSDT']=11282.76;

nowTicker['EOSUSDT']=1.76;
lastTicker['EOSUSDT']=1.76;

let mailer = require('./mailer');

let APIKEY = 'a';
let APISECRET = 'b';

server.listen(80);
// WARNING: app.listen(80) will NOT work here!
app.use(express.static('public'));
app.get('index.htm', function (req, res) {
    res.sendFile(__dirname + "/" + "index.htm");
});
let OnLineUser={};
io.on('connection', function (socket) {
    socket.on('disconnect', function(){
        if (socket.email !== null){
            delete OnLineUser[socket.email];
        }
        console.log( socket.name + ' has disconnected from the chat.' + socket.id);
    });
    socket.on('Login', function (data) {
        console.log(data.email);
        socket.email=data.email;
        OnLineUser[data.email]={};
        OnLineUser[data.email].socket=socket;

        socket.emit('showSymbols', getHasSymbolListByEmail(data.email));
    });
    socket.on('createSymbol', function (data) {
        let symbol = data.symbol;
        if (!isEnableSymbol(symbol)){
            socket.emit('Failed', {'message':`binance中不存在${symbol}交易对`});
            return;
        }
        let email = data.email;
        if (!isValiableEmail(email)){
            return
        }
        if (userInfos[email].Symbol[symbol]===undefined){
            userInfos[email].Symbol[symbol]=[];
            wirteInfo();
            socket.emit('showSymbols', getHasSymbolListByEmail(data.email));
        } else {
            socket.emit('Failed', {'message':`已存在${symbol}交易对`});
        }
    });
    socket.on('deleteSymbol', function (data) {
        let symbol = data.symbol;
        if (!isEnableSymbol(symbol)){
            return;
        }

        let email = data.email;
        if (!isValiableEmail(email)){
            return
        }
        if (userInfos[email].Symbol[symbol]!==undefined){
            delete userInfos[email].Symbol[symbol];
            wirteInfo();
            socket.emit('showSymbols', getHasSymbolListByEmail(data.email));
        }
    });
    socket.on('getPriceList', function (data) {
        let symbol = data.symbol;
        if (!isEnableSymbol(symbol)){
            return;
        }

        let email = data.email;
        if (!isValiableEmail(email)){
            return
        }
        socket.emit('onPriceList', userInfos[email].Symbol[symbol]);
        socket.emit('onPrice', nowTicker[symbol]);
        OnLineUser[email].symbol = symbol;
    });
    socket.on('pushPriceList', function (data) {
        let symbol = data.symbol;
        if (!isEnableSymbol(symbol)){
            return;
        }
        let email = data.email;
        if (!isValiableEmail(email)){
            return
        }
        let pricelist = data.priceList;
        let isValiable=true;
        for (let i=0;i < pricelist.length;i++){
            if (pricelist[i]===null || pricelist[i].price === null){
                isValiable=false;
                break;
            }
        }
        if (isValiable){
            userInfos[email].Symbol[symbol] = pricelist.sort(compare());
            wirteInfo();
            socket.emit('onPriceList', userInfos[email].Symbol[symbol]);
        } else {
            socket.emit('Failed', {'message':'添加失败'});
        }
    });
});


function getHasSymbolListByEmail(email){
    let list = [];
    if (userInfos[email] === undefined){
        userInfos[email]={};
        userInfos[email].Symbol={"BTCUSDT":[]};
        userInfos[email].LastOperationTick = Date.parse(new Date());
        wirteInfo();
        list = getHasSymbolListByEmail(email);
    } else {
        for (let symbol in userInfos[email].Symbol){//遍历json对象的每个key/value对,p为key
            list.push(symbol);
        }
    }
    return list;
}
function isEnableSymbol(symbol){
    for (let s in nowTicker){//遍历json对象的每个key/value对,p为key
        if (s === symbol){
            return true;
        }
    }
    return false;
}
function isValiableEmail(email){
    for (let s in userInfos){//遍历json对象的每个key/value对,p为key
        if (s === email){
            userInfos[email].LastOperationTick = Date.parse(new Date());
            return true;
        }
    }
    return false;
}
function compare() {
    return function(object1, object2) {
        let value1 = object1.price;
        let value2 = object2.price;
        if (value2 < value1) {
            return -1;
        } else if (value2 > value1) {
            return 1;
        }
        return 0;
    }
}
function wirteInfo() {
    fs.writeFileSync('./public/data.json',JSON.stringify(userInfos));
}


const binance = require('./node-binance-api')().options({
    APIKEY: APIKEY,
    APISECRET: APISECRET,
    useServerTime: true, // If you get timestamp errors, synchronize to server time at startup
    test: true // If you want to use sandbox mode where orders are simulated
});
function removeArray(array, d){
    let tina = array.filter(p => {let aa = p === d;return aa;});
    let index = array.indexOf(tina[0]);
    if (index > -1){
        array.splice(index, 1);
    }
}
function copyTicker(obj){
    let o = {};
    if (obj !== null){
        for (let p in obj){//遍历json对象的每个key/value对,p为key
            o[p]=parseFloat(obj[p]);
        }
    }
    return o;
}
function check(email, symbol){
    //let priceData = JSON.parse(fs.readFileSync('./public/price.json'));

    let priceData = userInfos[email].Symbol[symbol];
    let has = false;
    for (let i=0;i<priceData.length;i++){

        if ((nowTicker[symbol] <= priceData[i].price && priceData[i].price<=lastTicker[symbol])||
            (lastTicker[symbol] <= priceData[i].price && priceData[i].price<=nowTicker[symbol])){
            mailer.sendEMail([email],symbol + ' ' + priceData[i].price+' '+priceData[i].disc,'now price' + nowTicker[symbol]);
            removeArray(priceData, priceData[i]);
            has = true;
            if (OnLineUser[email] !== undefined && OnLineUser[email] !== null && OnLineUser[email].socket !== undefined &&OnLineUser[email].socket !==null){
                OnLineUser[email].socket.emit('onPriceList', userInfos[email].Symbol[symbol]);
            }
            break;
        }
    }
    if (!has){
        wirteInfo();
    } else {
        check(email, symbol);
    }
    //fs.writeFileSync('./public/price.json',JSON.stringify(priceData));
    console.log(priceData);
}
function exe(){

    for (let user in OnLineUser){
        let socket = OnLineUser[user].socket;
        if (socket !== null){
            let s = OnLineUser[user].symbol;
            if (s!==null){
                socket.emit('onPrice', nowTicker[s]);
            }
        }
    }
    //socket.emit('onPrice', {'price':});
    for (let email in userInfos){//遍历json对象的每个key/value对,p为key

        let tick = Date.parse(new Date()) - userInfos[email].LastOperationTick;
        if (tick >1000 * 60 * 60 * 24 * 7){
            delete userInfos[email];
            wirteInfo();
        } else {
            let enableSymbles = getHasSymbolListByEmail(email);
            for (let i=0;i<enableSymbles.length;i++){
                let symbol=enableSymbles[i];
                console.log('Price of '+symbol, nowTicker[symbol]);
                check(email, symbol);
            }
        }
    }
}
function clock() {
    console.log('clock');
    binance.prices((error, ticker) => {
        if (ticker === undefined){
            console.log('ticker undefined');
        } else {
            nowTicker = copyTicker(ticker);
            if (lastTicker===null){
                lastTicker=copyTicker(nowTicker);
            }
            exe();
            lastTicker = copyTicker(nowTicker);
        }
    });

}

function testClock(){
    nowTicker['BTCUSDT']+=0.01;
    exe();
    lastTicker = copyTicker(nowTicker);
}
setInterval(testClock,1000);
