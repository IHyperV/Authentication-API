const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const fs = require('fs');
const { MongoClient } = require("mongodb");
const https = require('https');
require('dotenv').config({path: __dirname + '/.env'})
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const app = express()
const cors = require('cors')


const httpsServ = https
.createServer({ 
    key: fs.readFileSync((path.join(__dirname, '/SSL/Cert.key'))), 
    cert: fs.readFileSync((path.join(__dirname, '/SSL/Cert.cert'))), 
}, 
app )

requestIp = require('request-ip');

var request_data = [];
const seconds = 1000 * 2,
      infractionsMax = 7;
      
      
app.use(bodyParser.json({ type: 'application/vnd.api+json' }))
app.use(bodyParser.json({ type: 'application/json' }))
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors())


app.set('view engine', 'ejs')
app.use(requestIp.mw());
app.use(function(req, res, next) {
	res.setHeader('PoweredBy', 'HyperVoid');
	res.setHeader('Server', 'SERVER_NAME');
 next();
});


/*ANTI DOS PROVIDED BY NULL https://github.com/NullifiedCode/DDoS-Protection-V2*/

app.use(function(req, res, next) {
    // Ignore the request entirely if they are inside the blacklist.
    if(fs.existsSync((path.join(__dirname, '/utils/ddos-filtered.cache')))){
        if(fs.readFileSync((path.join(__dirname, '/utils/ddos-filtered.cache'))).toString().includes(req.clientIp)){
            return;
        }
    }

    var timePast = false;
    if(request_data === undefined){
        request_data = [];
    }
    if(request_data[req.clientIp] === undefined){
        request_data[req.clientIp] = {
            time: new Date().getTime(),
            infractions: 0
        }
        timePast = true;
    }else{
        timePast = (new Date().getTime() - request_data[req.clientIp].time < seconds) ? false : true;
    }   

    switch(timePast){
        case true:
            request_data[req.clientIp].time = new Date().getTime();
            if(request_data[req.clientIp].infractions > 0){
                var g = parseInt(request_data[req.clientIp].infractions);
                g = g - 1;
                request_data[req.clientIp].infractions = g;
            }
            console.log(`[${req.method}] IP: ${req.clientIp} Infractions: ${request_data[req.clientIp].infractions} URI: ${req.originalUrl}` );
            var jsondata = JSON.stringify({ Method: `${req.method}`, IP:`${req.clientIp}`,Infractions: `${request_data[req.clientIp].infractions}`, URI: `${req.originalUrl}` })
            fs.appendFileSync((path.join(__dirname, '/utils/requests')), jsondata+",\n")
            next();
            break;
        case false:
            var g = parseInt(request_data[req.clientIp].infractions);
            g = g + 1;
            request_data[req.clientIp].infractions = g;
            if(request_data[req.clientIp].infractions > infractionsMax){
    
                if(!fs.existsSync((path.join(__dirname, '/utils/ddos-filtered.cache')))){
                    fs.writeFileSync((path.join(__dirname, '/utils/ddos-filtered.cache')), '', function(er) {
                        
                    })
                }
                if(!fs.readFileSync((path.join(__dirname, '/utils/ddos-filtered.cache'))).toString().includes(req.clientIp))
                    fs.appendFileSync((path.join(__dirname, '/utils/ddos-filtered.cache')), req.clientIp+"\n",function(err) {
    
                    });
    
                console.log(`[${req.method}] ${req.clientIp} is now blacklisted. Exceeded infractions`);
                delete request_data[req.clientIp];
                return;
            }   
            console.log(`[${req.method}] blocked from ${req.clientIp} ${request_data[req.clientIp].infractions}`);
            break;
    }
});

app.disable( 'x-powered-by' );
app.use('/', express.static(path.join(__dirname, '../public')))

app.use(bodyParser.json())

/*Start of Regular api Routes*/
app.get('/api/Identify', async (req, res) => {
	res.status(200).json({ message: "Hello World! Made By HyperV", status: "200" })
})

/*Routers*/

const ClientRouter = require(path.join(__dirname, '/Client/ClientAPI'))

app.use('/api', ClientRouter)

/*Error Handlers*/
app.use(function (req, res, next) { var err = new Error('Not Found'); err.status = 404; next(err); });

app.use('/api', function (err, req, res, next) { res.status(err.status || 500); res.json({ message: err.message, error: err	})});
		
app.use(function (err, req, res, next) {res.status(err.status || 500); res.status(404).send("404 Not Found")});


/*Start Https Server bc we are not about to get hacked out here*/


  httpsServ.listen(443, function () {
    console.log(
      "api Running on port 443 https://localhost:443/"
    );
  });

/*this is for legacy reasons lol*/

  app.listen(80, () => {
	console.log('Server up at 80')
})

