let fs = require('fs');
//let path = require('path');
let express = require('express');
let app = express();
let bodyParser = require('body-parser');

let urlencodedParser = bodyParser.urlencoded({ extended: false });

let priceData = JSON.parse(fs.readFileSync('./public/price.json'));

let nowPrice={};
let lastPrice={};
nowPrice.ETHUSDT=0;
lastPrice.ETHUSDT=0;

app.use(express.static('public'));

app.get('/index.htm', function (req, res) {
    res.sendFile( __dirname + "/" + "index.htm" );
})

app.get('/process_get', function (req, res) {

    // 输出 JSON 格式
    let response = {
        'first_name':req.query.first_name,
        'last_name':req.query.last_name
    };
    console.log(response);
    res.end(JSON.stringify(response));
})

app.get('/d_*', function (req, res) {

    handle(req.params['0'], req, res );
})
app.post('/process_post', urlencodedParser, function (req, res) {

    // 输出 JSON 格式
    let response = {
        'first_name':req.body.first_name,
        'last_name':req.body.last_name
    };
    console.log(response);
    res.end(JSON.stringify(response));
})
app.post('/d_*', urlencodedParser, function (req, res) {

    handle(req.params['0'], req, res );
})

function compare() {
    return function(object1, object2) {
        let value1 = object1;
        let value2 = object2;
        if (value2 < value1) {
            return -1;
        } else if (value2 > value1) {
            return 1;
        } else {
            return 0;
        }
    }
}
function handle(pathName, req, response) {

    console.log(pathName);

    if (pathName === 'getPriceList'){
        response.end(JSON.stringify(priceData.ETHUSDT.sort(compare())));
        return;
    }
    if (pathName === 'pushPriceList'){

        let pricelist = JSON.parse(req.query.priceList);
        let isValiable=true;
        for (let i=0;i < pricelist.length;i++){
            if (pricelist[i]===null){
                isValiable=false;
                break;
            }
        }
        if (isValiable){
            priceData.ETHUSDT = pricelist.sort(compare());
        }

        fs.writeFileSync('./public/price.json',JSON.stringify(priceData));
        response.end(JSON.stringify(priceData.ETHUSDT.sort(compare())));
        return;
    }
    if (pathName === 'getPrice'){

        response.end(JSON.stringify(nowPrice));
        return;
    }

}
let server = app.listen(8080, function () {

    let host = server.address().address;
    let port = server.address().port;

    console.log("应用实例，访问地址为 http://%s:%s", host, port)
});


let mailer = require('./mailer');

let APIKEY = 'zSehYr8Dg1RrDGfE95MbKpIZ3jDZDCkKHsRKevpH8IAqNHWDmszCgTA7x5MsW6kj';
let APISECRET = 'WG1OjqRhlHGTlP6nliWKti52bvNXFeJGOIZgQueskYZKwyn9fJwHfLV7G1jLKdfq';

const binance = require('./node-binance-api')().options({
    APIKEY: APIKEY,
    APISECRET: APISECRET,
    useServerTime: true, // If you get timestamp errors, synchronize to server time at startup
    test: true // If you want to use sandbox mode where orders are simulated
});
function check(){
    //let priceData = JSON.parse(fs.readFileSync('./public/price.json'));
    let has = false;
    for (let i=0;i<priceData.ETHUSDT.length;i++){
        console.log('lastPrice'+lastPrice.ETHUSDT);
        console.log('priceData'+priceData.ETHUSDT[i]);
        console.log('nowPrice'+nowPrice.ETHUSDT);

        if (nowPrice.ETHUSDT <= priceData.ETHUSDT[i]){
            console.log('1 nowPrice.ETHUSDT <= priceData.ETHUSDT');
        }
        if (priceData.ETHUSDT[i]<=lastPrice.ETHUSDT){
            console.log('2 priceData.ETHUSDT[i]<=lastPrice.ETHUSDT)');
        }
        if (lastPrice.ETHUSDT <= priceData.ETHUSDT[i]){
            console.log('3 lastPrice.ETHUSDT <= priceData.ETHUSDT[i]');
        }
        if (priceData.ETHUSDT[i]<=nowPrice.ETHUSDT){
            console.log('4 priceData.ETHUSDT[i]<=nowPrice.ETHUSDT');
        }
        console.log('============================');
        if ((nowPrice.ETHUSDT <= priceData.ETHUSDT[i] && priceData.ETHUSDT[i]<=lastPrice.ETHUSDT)||
            (lastPrice.ETHUSDT <= priceData.ETHUSDT[i] && priceData.ETHUSDT[i]<=nowPrice.ETHUSDT)){
            console.log('iiiiiiiii');
            mailer.sendEMail(['597833968@qq.com'],priceData.ETHUSDT[i],'now price' + nowPrice.ETHUSDT);

            let tina = priceData.ETHUSDT.filter(p => {return p === priceData.ETHUSDT[i];});
            let index = priceData.ETHUSDT.indexOf(tina[0]);
            if (index > -1){
                priceData.ETHUSDT.splice(index, 1);
            }
            has = true;
            break;
        }
    }
    if (!has){
        lastPrice = nowPrice;
    }
    //fs.writeFileSync('./public/price.json',JSON.stringify(priceData));
    console.log(priceData);
}
function clock() {
    console.log('clock');
    binance.prices('ETHUSDT', (error, ticker) => {
        if (ticker === undefined){
            console.log('ticker undefined');
        } else {
            console.log('Price of ETHUSDT: ', ticker.ETHUSDT);
            nowPrice.ETHUSDT = parseFloat(ticker.ETHUSDT);
            check();
        }

        //mailer.sendEMail(['597833968@qq.com'],'price ',ticker.ETHUSDT);
    });

}
setInterval(clock,5000);
