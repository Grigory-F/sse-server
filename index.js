import express from "express";
import { createClient } from "redis";
import cors from 'cors'

import authMiddleware from "./authMiddleware.js";

const app = express();
app.use(cors())
let clients = [];
app.disable("x-powered-by");



const client = createClient({
  url: "redis://redis:6379",
  password: "development",
});

(async function () {
  client.on("error", (err) => console.log("Redis Client Error", err));
  await client.connect();
})();

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

function eventsHandler(request, response, next) {
  const headers = {
    "Content-Type": "text/event-stream",
    Connection: "keep-alive",
    "Cache-Control": "no-cache",
  };
  response.writeHead(200, headers);
  const data = `data: 3232321\n\n`;
  response.write(data);
  const clientId = Date.now();
  const newClient = {
    id: clientId,
    response,
  };
  clients.push(newClient);
  request.on("close", () => {
    console.log(`${clientId} Connection closed`);
    clients = clients.filter((client) => client.id !== clientId);
  });
  next();
}

app.use("/", authMiddleware, eventsHandler);

function sendEventsToAll(message) {
  clients.forEach((client) =>
    client.response.write(`data: ${JSON.stringify(message)}\n\n`)
  );
}


client.subscribe("sse", sendEventsToAll);

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`SSE server listening at http://localhost:${PORT}`);
});
