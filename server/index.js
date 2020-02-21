const keys = require('./keys');

//********Express App set up.
const express    = require('express');
const bodyParser = require('body-parser');
const cors       = require('cors');

const app = express();
app.use(cors());
app.use(bodyParser.json());


//********Postgres clien setup
const { Pool } = require('pg');
const pgClient = new Pool({
    user: keys.pgUser,
    host: keys.pgHost,
    database: keys.pgDatabase,
    password: keys.pgPassword,
    port: keys.pgPort
});
//Listener
pgClient.on('error', () => console.log('Lost PG Connection'));

//Table to save all indexes.
pgClient.query('CREATE TABLE IF NOT EXISTS values (number INT)')
    .catch((err)=> console.log(err)); 

//*********Redis Client set up
const redis = require('redis');

const redisClient = redis.createClient({
    host: keys.redisHost,
    port: keys.redisPort,
    retry_strategy: () => 1000,  
});

const redisPubliser = redisClient.duplicate();

//*********Express Routes Handlers

app.get('/', (req, res)=> {
    res.send('Hi there');
});

app.get('/values/all', async (req, res)=> {
    const values = await pgClient.query('Select * from values');
    res.send(values.rows);
});

app.get('/values/current', async (req, res)=> {
    redisClient.hgetall('values', (err, values)=> {
        res.send(values);
    });
});

app.post('/values', async (req, res)=>{
    const index = req.body.index;

    if (parseInt(index) > 40){
        return req.status(422).send('Index too high');
    }

    redisClient.hset('values', index, 'Nothing Yet');
    redisClient.publish('insert', index);
    pgClient.query('INSERT INTO values(number) VALUES($1)', [index]);

    res.send({ working:true });
});

app.listen(5000, err=>{
    console.log('Listening...');
});
