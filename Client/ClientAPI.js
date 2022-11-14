const express = require('express');
const ClientRouter = express.Router()
const path = require('path');
const fs = require('fs');
const { MongoClient } = require("mongodb");
require('dotenv').config({ path: __dirname + '/.env' })
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
const app = express()


ClientRouter.post('/GetCore', async (req, res) => {
	async function run() {
		const { Key, HWID, BETA, LoaderVersion } = req.body

		const client = new MongoClient(process.env.uri);

		/*Check Loader Version*/

		const LoadVersion = fs.readFileSync((path.join(__dirname, 'LoaderVersion.txt')), "utf8");

		if (LoadVersion != LoaderVersion) { LogLogin(false, req.body, "BadLoaderVersion"); return res.status(417).json({ message: "Invalid Loader Version", status: "417" }) }
		/*This Just Checks if the key is null*/
		if (Key == null || Key == "") { LogLogin(false, req.body, "Bad Key"); return res.status(400).json({ message: "Bad Key", status: "400" }) }


		/*Try Start Checks on user*/

		try {
			await client.connect();
			const database = client.db(process.env.database);
			const User = database.collection(process.env.collection);
			const user = await User.findOne({ Key })

			/*If Key is Invalid*/

			if (!user) { await client.close(); LogLogin(false, req.body, "Invalid Key"); return res.status(404).json({ message: "Invalid Key", status: "404" }) }

			/*Check If User Is Banned*/
			if (user.banned == true) { await client.close(); LogLogin(false, req.body, "Banned."); return res.status(410).json({ message: "Banned.", status: "410" }) }

			if (user.Active != null && !user.Active) { LogLogin(false, req.body, "Sub Expired"); return res.status(417).json({ message: "Expired", status: "403" }) }

			if (HWID == "0") { LogLogin(false, req.body, "BadHwid"); return res.status(410).json({ message: "BAD HWID", status: "410" }) }

			/*Check Hwid see if it needs to be updated if it does then update it*/
			if (user.HWID == "0") {
				const filter = { Key: Key };
				const options = { upsert: false };
				const updateDoc = { $set: { HWID: `${HWID}` } };
				const result = await User.updateOne(filter, updateDoc, options);
				LogLogin(true, req.body, "Updated HWID");
				await client.close(); return res.status(200).sendFile('Core.dll', { root: __dirname })

			}

			/*Checks User HWID to see if it matches*/
			if (HWID != user.HWID) { await client.close(); LogLogin(false, req.body, "InvalidHWID"); return res.status(404).json({ message: "Invalid HWID", status: "404" }) }

			/*Checks if User Has Beta when requesting for Beta*/
			if (HWID == user.HWID && BETA == true && user.hasBeta == false) { await client.close(); LogLogin(false, req.body, "No Beta Access"); return res.status(417).json({ message: "No Beta Access", status: "417" }) }

			/*checks if the user has beta and requesting for it and sends it to them*/
			if (HWID == user.HWID && BETA != null && user.hasBeta == true) { await client.close(); LogLogin(true, req.body, "Beta Sucess"); return res.status(200).sendFile('BetaCore.dll', { root: __dirname }) }

			/*After all Check To see if info is corect if so then go ahead and send them the core*/
			if (HWID == user.HWID) { await client.close(); LogLogin(true, req.body, "Success"); return res.status(200).sendFile('Core.dll', { root: __dirname }) }
			LogLogin(false, req.body, "Error"); sendMessage("Check Logs Failed Login");
			res.status(404).json({ message: "something is wrong try again later", code: "HV15", status: "404" })

		} finally { await client.close(); }
	} run().catch(console.dir);
})


/*Login A Client User*/

ClientRouter.post('/Login', async (req, res) => {
	res.setHeader('X-Powered-By', 'HyperVoid');
	async function run() {
		const { Key, HWID, ClientTime } = req.body

		const client = new MongoClient(process.env.uri);

		if (Key == null || Key == "") { LogLogin(false, req.body, "Bad Key"); return res.status(400).json({ message: "Invalid Key", status: "400" }) }

		/*Try Start Checks on user*/

		try {
			await client.connect();
			const database = client.db(process.env.database);
			const User = database.collection(process.env.collection);
			const user = await User.findOne({ Key })

			if (!user) { LogLogin(false, req.body, "Login Failed Invalid Key"); await client.close(); return res.status(404).json({ message: "Invalid Key", status: "404" }) }

			if (user.Active != null && !user.Active) { LogLogin(false, req.body, "Sub Expired"); return res.status(417).json({ message: "Expired", status: "403" }) }

			if (user.banned == true) { LogLogin(false, req.body, "Banned."); await client.close(); return res.status(403).json({ message: "Banned", status: "403" }) }

			if (user.HWID == null) {
				const filter = { Key: Key }; const options = { upsert: false }; const updateDoc = { $set: { HWID: `${HWID}` } };
				const result = await User.updateOne(filter, updateDoc, options); LogLogin(true, req.body, "Updated HWID");
				await client.close(); return res.status(200).json({ message: "Sucess", status: "200" })
			}

			if (HWID != user.HWID) { sendMessage(`<@${process.env.userid}> \nInvalid HWID ${user.USERNAME} `); LogLogin(false, req.body, "Login Failed Invalid HWID"); await client.close(); return res.status(409).json({ message: "Invalid HWID", status: "409" }) }

			if (HWID == user.HWID) { LogLogin(true, req.body, "Login Sucess"); await client.close(); return res.status(200).json({ message: "Sucess", status: "200" }) }

			res.status(401).json({ message: "Unknown Issue", status: "401" })

		} finally { await client.close(); }
	} run().catch(console.dir);
})

/*Check User For Info And Get Server Updates*/

module.exports = ClientRouter

async function sendMessage(content) {
	const response = await fetch(
		`https://discord.com/api/v9/channels/${process.env.CHANNEL_ID}/messages`, {
		method: 'post',
		body: JSON.stringify({ content }),
		headers: {
			'Authorization': `Bot ${process.env.BOT_TOKEN}`,
			'Content-Type': 'application/json',
		}
	}
	);
	const data = await response.json();

	return data;
}

function LogLogin(Status, Payload, Message) {
	const { Key, HWID, BETA, LoaderVersion, ClientTime, BypassServerTime } = Payload
	var becomingajson = JSON.stringify({ Key: Key, Hwid: HWID, IsBeta: BETA, LoaderVersion: LoaderVersion, IsBypass: BypassServerTime, WasSuccess: Status, ClientTime: ClientTime, WasDeniedFor: Message })
	const data = fs.readFileSync((path.join(__dirname, 'logins.json')), "utf8");
	if (!data.includes(becomingajson)) {
		var cutstring = data.slice(0, -1);
		fs.writeFileSync((path.join(__dirname, 'logins.json')), cutstring + "," + becomingajson + `\n` + "]");
	}
}