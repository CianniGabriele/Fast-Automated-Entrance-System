const express = require('express');
const { MongoClient } = require('mongodb');
const app = express();
const port = 3000;

// Connection URI for MongoDB (replace with your actual connection string)
const uri = 'mongodb+srv://gabri:gabri@smartparkingagk.wkm2s3j.mongodb.net';
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

app.use(express.static('public'));
app.use(express.json()); // Parse JSON requests
// Middleware per il parsing del corpo JSON

let pollingInterval;

let latestInsertedEntry = null;

async function fetchData() {
    try {
        const database = client.db("smartparkingagk");
        const collection = database.collection('datadump');
        const items = await collection.find().toArray();

        if (items.length > 0) {
            // Log the latest entry
            latestInsertedEntry = items[items.length - 1];
            //console.log('Latest Inserted Entry:', latestInsertedEntry);
        } else {
            console.log('No entries in the collection.');
        }
    } catch (error) {
        console.error('Polling error:', error);
    }
}

// Function to log collection names
async function logCollectionNames() {
    const database = client.db("smartparkingagk");
    const collections = await database.listCollections().toArray();
    const collectionNames = collections.map(collection => collection.name);
    //console.log('Collections in the database:', collectionNames);
}

// API endpoint to get all items
app.get('/api/items', async (req, res) => {
    try {
        await client.connect();
        console.log('Connected to MongoDB'); // Log statement indicating successful connection
        fetchData(); // Fetch data on initial request
        logCollectionNames(); // Log collection names on initial request
        // Start polling at a specified interval (e.g., every 2 seconds)
        pollingInterval = setInterval(fetchData, 2000);
        const database = client.db("smartparkingagk");
        const collection = database.collection('datadump');
        const items = await collection.find().toArray();

        //console.log(items);

        res.json(items);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// API endpoint to add new data
app.post('/api/items', async (req, res) => {
    try {

        console.log(req);

        const { _id, plate, bluetooth_devices } = req.body;

        // Validation
        if (!_id || !plate || !bluetooth_devices) {
            return res.status(400).json({ error: 'Invalid data format' });
        }

        await client.connect();
        const database = client.db("smartparkingagk");
        const collection = database.collection('datadump');

        // Insert the new data
        await collection.insertOne({ _id, plate, bluetooth_devices });
        console.log("after insert one");

        // Log the inserted entry
        const insertedEntry = { _id, plate, bluetooth_devices };
        console.log('Inserted Entry:', insertedEntry);

        res.json({ success: true, message: 'Data added successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// API endpoint to get the last inserted entry
// ... (altre importazioni e configurazioni)

// API endpoint per ottenere l'ultimo elemento inserito con un valore booleano
app.get('/api/lastInserted', async (req, res) => {
    try {
        if (latestInsertedEntry) {
            const database = client.db("smartparkingagk"); // Assicurati di avere il riferimento al database
            const testCollection = database.collection('test');

            const items = await testCollection.find().toArray();    
            

            // Trova un elemento nella collezione 'test' che corrisponda ai dati dell'ultimo inserimento
            const plateRFID = await testCollection.find({
                $and: [
                    { _id: latestInsertedEntry._id },
                    { plate: latestInsertedEntry.plate }
                ]
            }).toArray();

            const plateBt = await testCollection.find({
                $and: [
                    { plate: latestInsertedEntry.plate },
                    { bluetooth_devices: latestInsertedEntry.bluetooth_devices },
                ]
            }).toArray();


            const RFIDbt = await testCollection.find({
                $and: [
                    { _id: latestInsertedEntry._id },
                    { bluetooth_devices: latestInsertedEntry.bluetooth_devices },
                ]
            }).toArray();

            /*
            const all = await testCollection.find({
                $or: [
                    { _id: latestInsertedEntry._id },
                    { plate: latestInsertedEntry.plate },
                    { bluetooth_devices: latestInsertedEntry.bluetooth_devices },
                ]
            }).toArray();*/

            //console.log(matchingItems);


            if (RFIDbt.length==1 || plateBt.length == 1 || plateRFID.length==1) {
                // Se esiste un elemento corrispondente, imposta verification a true
                verification = true;
            } else {
                // Se non esiste un elemento corrispondente, imposta verification a false
                verification = false;
            }

            // Invia un oggetto JSON che include i dati dell'ultimo inserimento e il valore booleano di verification
            res.json({ data: latestInsertedEntry, success: true, verification: verification });
        } else {
            res.json({ message: 'Nessun elemento è stato inserito ancora.', success: false });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Errore interno del server', success: false });
    }
});





app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
});

// Close the polling interval when the server is shutting down
process.on('SIGINT', () => {
    clearInterval(pollingInterval);
    console.log('Server shutting down...');
    process.exit();
});
    