let fs = require('fs');
//let path = require('path');
let express = require('express');
let app = express();
let bodyParser = require('body-parser');

let urlencodedParser = bodyParser.urlencoded({ extended: false });

let data = JSON.parse(fs.readFileSync('./public/data.json'));
let priceData = data.Symbol;

let nowPrice={};
let lastPrice={};

let enableSymbles=[];


for (let p in priceData){//遍历json对象的每个key/value对,p为key

    nowPrice[p]=0;
    lastPrice[p]=0;
    enableSymbles.push(p);
}


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

function compare() {
    return function(object1, object2) {
        let value1 = object1;
        let value2 = object2;
        if (value2 < value1) {
            return -1;
        } else if (value2 > value1) {
            return 1;
        }
        return 0;
    }
}
function wirteInfo() {
    fs.writeFileSync('./public/data.json',JSON.stringify(data));
}

function handle(pathName, req, response) {

    console.log(pathName);
    if (pathName==='createSymbol'){
        let symbol = req.query.symbol;
        if (priceData[symbol]===undefined){
            priceData[symbol]=[];
            enableSymbles.push(symbol);
            nowPrice[symbol]=0;
            lastPrice[symbol]=0;
            wirteInfo();
            response.end('');
        }
    } else if (pathName === 'deleteSymbol'){
        let symbol = req.query.symbol;
        if (priceData[symbol]!==undefined){
            delete priceData[symbol];
            removeArray(enableSymbles, symbol);
            delete nowPrice[symbol];
            delete lastPrice[symbol];
            wirteInfo();
            response.end('');
        }
    } else if (pathName === 'getPriceList'){
        let symbol = req.query.symbol;
        response.end(JSON.stringify(priceData[symbol].sort(compare())));
    } else if (pathName === 'pushPriceList'){
        let symbol = req.query.symbol;
        let pricelist = JSON.parse(req.query.priceList);
        let isValiable=true;
        for (let i=0;i < pricelist.length;i++){
            if (pricelist[i]===null){
                isValiable=false;
                break;
            }
        }
        if (isValiable){
            priceData[symbol] = pricelist.sort(compare());
        }

        wirteInfo();
        response.end(JSON.stringify(priceData[symbol].sort(compare())));
    } else if (pathName === 'getPrice'){

        response.end(JSON.stringify(nowPrice));
    } else if (pathName === 'getEnableSymbols'){
        response.end(JSON.stringify(enableSymbles));
    }

}
let server = app.listen(8080, function () {

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
function check(symbol){
    //let priceData = JSON.parse(fs.readFileSync('./public/price.json'));
    let has = false;
    for (let i=0;i<priceData[symbol].length;i++){

        if ((nowPrice[symbol] <= priceData[symbol][i] && priceData[symbol][i]<=lastPrice[symbol])||
            (lastPrice[symbol] <= priceData[symbol][i] && priceData[symbol][i]<=nowPrice[symbol])){
            mailer.sendEMail([data.Email],symbol + priceData[symbol][i],'now price' + nowPrice[symbol]);
            removeArray(priceData[symbol], priceData[symbol][i]);
            has = true;
            break;
        }
    }
    if (!has){
        lastPrice[symbol] = nowPrice[symbol];
    } else {
        check();
    }
    //fs.writeFileSync('./public/price.json',JSON.stringify(priceData));
    console.log(priceData);
}
function clock() {
    console.log('clock');
    for (let i=0;i<enableSymbles.length;i++){
        let symbol=enableSymbles[i];
        binance.prices((error, ticker) => {
            if (ticker === undefined){
                console.log('ticker undefined');
            } else {
                console.log('Price of '+symbol, ticker[symbol]);
                nowPrice[symbol] = parseFloat(ticker[symbol]);
                check(symbol);
            }
        });
    }


}
setInterval(clock,5000);
