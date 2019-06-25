let fs = require('fs');
//let path = require('path');
let express = require('express');
let app = express();
let bodyParser = require('body-parser');

let urlencodedParser = bodyParser.urlencoded({ extended: false });

let userInfos = JSON.parse(fs.readFileSync('./public/data.json'));

let nowTicker = {};
let lastTicker = {};

// nowTicker['BTCUSDT']=100;
// lastTicker['BTCUSDT']=100;
//let priceData = data.Symbol;

// let nowPrice={};
// let lastPrice={};


// for (let p in priceData){//遍历json对象的每个key/value对,p为key
//
//     nowPrice[p]=0;
//     lastPrice[p]=0;
//
// }


app.use(express.static('public'));

app.get('/index.htm', function (req, res) {
    res.sendFile( __dirname + "/" + "index.htm" );
});

app.get('/process_get', function (req, res) {

    // 输出 JSON 格式
    let response = {
        'first_name':req.query.first_name,
        'last_name':req.query.last_name
    };
    console.log(response);
    res.end(JSON.stringify(response));
});

app.get('/d_*', function (req, res) {

    handle(req.params['0'], req, res );
});
app.post('/process_post', urlencodedParser, function (req, res) {

    // 输出 JSON 格式
    let response = {
        'first_name':req.body.first_name,
        'last_name':req.body.last_name
    };
    console.log(response);
    res.end(JSON.stringify(response));
});
app.post('/d_*', urlencodedParser, function (req, res) {

    handle(req.params['0'], req, res );
});


function getHasSymbolListByEmail(email){
    let list = [];
    if (userInfos[email] === undefined){
        userInfos[email]={};
        userInfos[email].Symbol={"BTCUSDT":[]};
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

function handle(pathName, req, response) {

    if (nowTicker===null){
        return;
    }
    console.log(pathName);
    if (pathName==='createSymbol'){
        let symbol = req.query.symbol;
        if (!isEnableSymbol(symbol)){
            return;
        }
        let email = req.query.email;
        if (!isValiableEmail(email)){
            return
        }
        if (userInfos[email].Symbol[symbol]===undefined){
            userInfos[email].Symbol[symbol]=[];
            wirteInfo();
            response.end('');
        }
    } else if (pathName === 'deleteSymbol'){
        let symbol = req.query.symbol;
        if (!isEnableSymbol(symbol)){
            return;
        }

        let email = req.query.email;
        if (!isValiableEmail(email)){
            return
        }
        if (userInfos[email].Symbol[symbol]!==undefined){
            delete userInfos[email].Symbol[symbol];
            wirteInfo();
            response.end('');
        }
    } else if (pathName === 'getPriceList'){
        let symbol = req.query.symbol;
        if (!isEnableSymbol(symbol)){
            return;
        }

        let email = req.query.email;
        if (!isValiableEmail(email)){
            return
        }
        response.end(JSON.stringify(userInfos[email].Symbol[symbol]));
    } else if (pathName === 'pushPriceList'){
        let symbol = req.query.symbol;
        if (!isEnableSymbol(symbol)){
            return;
        }
        let email = req.query.email;
        if (!isValiableEmail(email)){
            return
        }
        let pricelist = JSON.parse(req.query.priceList);
        let isValiable=true;
        for (let i=0;i < pricelist.length;i++){
            if (pricelist[i]===null || pricelist[i].price === null){
                isValiable=false;
                break;
            }
        }
        if (isValiable){
            userInfos[email].Symbol[symbol] = pricelist.sort(compare());
        }

        wirteInfo();
        response.end(JSON.stringify(userInfos[email].Symbol[symbol]));
    } else if (pathName === 'getPrice'){
        let symbol = req.query.symbol;
        if (!isEnableSymbol(symbol)){
            return;
        }
        response.end(JSON.stringify(nowTicker[symbol]));
    } else if (pathName === 'getEnableSymbols'){
        let email = req.query.email;
        // if (!isValiableEmail(email)){
        //     return
        // }
        response.end(JSON.stringify(getHasSymbolListByEmail(email)));
    }

}
let server = app.listen(8081, function () {

    let host = server.address().address;
    let port = server.address().port;

    console.log('应用实例，访问地址为 http://%s:%s', host, port)
});


let mailer = require('./mailer');

let APIKEY = 'a';
let APISECRET = 'b';

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
            break;
        }
    }
    if (!has){
        lastTicker = copyTicker(nowTicker);
        wirteInfo();
    } else {
        check(email, symbol);
    }
    //fs.writeFileSync('./public/price.json',JSON.stringify(priceData));
    console.log(priceData);
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
            for (let email in userInfos){//遍历json对象的每个key/value对,p为key
                let enableSymbles = getHasSymbolListByEmail(email);
                for (let i=0;i<enableSymbles.length;i++){
                    let symbol=enableSymbles[i];
                    console.log('Price of '+symbol, nowTicker[symbol]);
                    check(email, symbol);
                }
            }
        }
    });

}
function testClock(){
    nowTicker['BTCUSDT']+=1;
    for (let email in userInfos){//遍历json对象的每个key/value对,p为key
        let enableSymbles = getHasSymbolListByEmail(email);
        for (let i=0;i<enableSymbles.length;i++){
            let symbol=enableSymbles[i];
            console.log('Price of '+symbol, nowTicker[symbol]);
            check(email, symbol);
        }
    }
}
setInterval(clock,5000);
