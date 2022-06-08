// Heroku port
const PORT = process.env.PORT || 3000;

// Hashmap of clients
const clients = {};
const games = {};
const joinCodes = {}; // Maps join codes to gameIds

// Create the server 
const WebSocketServer = require("websocket").server;
const express         = require("express");
const app             = express();
const server          = app.listen(PORT, () => {console.log(`Listening on port ${PORT}`)});
const wsServer        = new WebSocketServer({ httpServer : server });

app.use(express.static("public"));

const initialBoard = [
  null, 0, null, 1, null, 2, null, 3,
  4, null, 5, null, 6, null, 7, null,
  null, 8, null, 9, null, 10, null, 11,
  null, null, null, null, null, null, null, null,
  null, null, null, null, null, null, null, null,
  12, null, 13, null, 14, null, 15, null,
  null, 16, null, 17, null, 18, null, 19,
  20, null, 21, null, 22, null, 23, null
]

// When a client makes a request via websocket.
wsServer.on("request", request => {
  // Save the TCP connection
  const connection = request.accept(null, request.origin);

  connection.on("open", () => console.log("Connection opened"));
  connection.on("closed", () => console.log("Connection closed"));

  //let clientId = null;
  
  // When message received from client
  connection.on("message", message => {
    // IMPORTANT: next line fails if client sends bad JSON: must implement try/catch
    const result = JSON.parse(message.utf8Data);

    // If user requests to create a new game
    if (result.method === "create") {
      const clientId = result.clientId;
      // clientId = result.clientId;
      const gameId = guid();
      let joinCode = gameId.slice(0,4);

      // Keep generating a join code until a unique one is found
      while (joinCodes.hasOwnProperty(joinCode)) {
        joinCode = Math.random().toString(36).substring(2,7);
      }
      joinCodes[joinCode] = gameId;

      // Initial game state stored here
      games[gameId] = {
        "public": {
          "id": gameId,
          "joinCode": joinCode,
          "playerColor": "red",         // Player who creates game is red
          "board": initialBoard,
          "kings": {"red": [], "black": []}
        },
        "private": {                    // Client IDs remain private
          "redClientId": clientId,      // Creator of game is "red"
          "blackClientId": null         // Joiner of game is "black"
        }
      }

      const payload = {
        "method": "create",
        "game": games[gameId].public
      }
      clients[clientId].connection.send(JSON.stringify(payload));

    // Else if user requests to join a game
    } else if (result.method === "join") {
      const clientId = result.clientId;
      const gameId = joinCodes[result.joinCode];

      // If game exists
      if (games.hasOwnProperty(gameId)) {
        // If player is trying to join their own game, then join unsuccessful
        if (clientId === games[gameId].private.redClientId) {
          const payload = { "method": "join", "joinStatus": "fail" }
          clients[clientId].connection.send(JSON.stringify(payload));
        } else {
          // If opponent is null
          if (games[gameId].private.blackClientId === null) {
            // Player successfully joins
            games[gameId].private.blackClientId = clientId;
            games[gameId].public.playerColor = "black";
            const blackPayload = {
              "method": "join",
              "game": games[gameId].public,
              "joinStatus": "success"
            }
            clients[clientId].connection.send(JSON.stringify(blackPayload));
            
            const redPayload = {
              "method": "join",
              "joinStatus": "opponent joined"
            }
            clients[games[gameId].private.redClientId]
              .connection.send(JSON.stringify(redPayload));
          } else {
            // Join unsuccessful; game already active
            const payload = { "method": "join", "joinStatus": "fail" }
            clients[clientId].connection.send(JSON.stringify(payload));
          }
        }
      } else {
        // Join unsuccessful; game not found
        const payload = { "method": "join", "joinStatus": "fail" }
        clients[clientId].connection.send(JSON.stringify(payload));
      }
    } else if (result.method === "update") {
      const clientId = result.clientId;
      const game = games[result.gameId];

      game.public.board = result.board;   // Update server's board with new board

      const payload = {
        "method": "update",
        "game": games[result.gameId].public,
      }

      // If update came from "red", send update to "black"
      if (game.private.redClientId === clientId) {
        game.public.kings.red = result.kings.red;
        clients[game.private.blackClientId].connection.send(JSON.stringify(payload));
      // If update came from "black", send update to "red"
      } else if (game.private.blackClientId === clientId) {
        game.public.kings.black = result.kings.black;
        clients[game.private.redClientId].connection.send(JSON.stringify(payload));
      }
    }
  });

  // Generate new client ID
  const clientId = guid();

  // Save the client's connection in hashmap using clientId
  clients[clientId] = { "connection": connection };

  // Response to client
  const payload = {
    "method": "connect",
    "clientId": clientId
  }

  // Send to client connection
  connection.send(JSON.stringify(payload));
});

// GUID generation code lifted from https://stackoverflow.com/a/44996682; written by Behnam Mohammadi
function S4() { return (((1+Math.random())*0x10000)|0).toString(16).substring(1); }
const guid = () => (S4() + S4() + "-" + S4() + "-4" + S4().substring(0,3) + "-" + S4() + "-" + S4() + S4() + S4()).toLowerCase();