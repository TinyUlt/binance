let fs = require('fs');
//let path = require('path');
let express = require('express');
let app = express();
let bodyParser = require('body-parser');

let urlencodedParser = bodyParser.urlencoded({ extended: false });

let priceData = JSON.parse(fs.readFileSync('./public/price.json'));

let nowPrice={};
let lastPrice={};

let enableSymbles=['ETHUSDT','ZRXUSDT'];
for (let i=0;i<enableSymbles.length;i++){
    nowPrice[enableSymbles[i]]=0;
    lastPrice[enableSymbles[i]]=0;

    if (priceData[enableSymbles[i]]===undefined){
        priceData[enableSymbles[i]]=[];
    }
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
function handle(pathName, req, response) {

    console.log(pathName);

    if (pathName === 'getPriceList'){
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

        fs.writeFileSync('./public/price.json',JSON.stringify(priceData));
        response.end(JSON.stringify(priceData[symbol].sort(compare())));
    } else if (pathName === 'getPrice'){

        response.end(JSON.stringify(nowPrice));
    } else if (pathName === 'getEnableSymbols'){
        response.end(JSON.stringify(enableSymbles));
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
function check(symbol){
    //let priceData = JSON.parse(fs.readFileSync('./public/price.json'));
    let has = false;
    for (let i=0;i<priceData[symbol].length;i++){

        if ((nowPrice[symbol] <= priceData[symbol][i] && priceData[symbol][i]<=lastPrice[symbol])||
            (lastPrice[symbol] <= priceData[symbol][i] && priceData[symbol][i]<=nowPrice[symbol])){
            // console.log('iiiiiiiii');
            mailer.sendEMail(['597833968@qq.com'],priceData[symbol][i],'now price' + nowPrice[symbol]);

            let tina = priceData[symbol].filter(p => {let aa = p === priceData[symbol][i];return aa;});
            let index = priceData[symbol].indexOf(tina[0]);
            if (index > -1){
                priceData[symbol].splice(index, 1);
            }
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
