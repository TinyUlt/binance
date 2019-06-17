let mailer = require('./mailer');

let APIKEY = 'zSehYr8Dg1RrDGfE95MbKpIZ3jDZDCkKHsRKevpH8IAqNHWDmszCgTA7x5MsW6kj';
let APISECRET = 'WG1OjqRhlHGTlP6nliWKti52bvNXFeJGOIZgQueskYZKwyn9fJwHfLV7G1jLKdfq';
// let APIKEY = process.env.APIKEY;
// let APISECRET = process.env.APISECRET;
// binance.options({
//     'APIKEY':APIKEY,
//     'APISECRET':APISECRET
// });
const binance = require('./node-binance-api')().options({
    APIKEY: APIKEY,
    APISECRET: APISECRET,
    useServerTime: true, // If you get timestamp errors, synchronize to server time at startup
    test: true // If you want to use sandbox mode where orders are simulated
});
binance.prices('BNBBTC', (error, ticker) => {
    console.log('Price of BNB: ', ticker.BNBBTC);
    mailer.sendEMail(['597833968@qq.com'],'price ',ticker.BNBBTC);
});


