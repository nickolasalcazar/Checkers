/* Network Logic **********************************************************************/
let clientId = null;
let gameId = null;
let joinCode = null;
let isLocal = false;
//let ws = new WebSocket("ws://localhost:3001");  // Connect to websocket hosted at localhost:9090
let ws = new WebSocket("wss://cryptic-lake-10293.herokuapp.com");

// Client sends request to server to update board
const submitMove = () => {
  const payload = {
    "method": "update",
    "clientId": clientId,
    "gameId": gameId,
    "board": board,
    "kings": kings
  }
  ws.send(JSON.stringify(payload));
  waiting = true;
  turn = !turn;
  toggleWaitingDisplay();
}

// Handling server responses
ws.onmessage = message => {
  const response = JSON.parse(message.data);
  switch (response.method) {
    // Server responds to client first connection to server; client saves clientId
    case "connect":
      clientId = response.clientId;
      break;
    // Server responds to client request to create a game; client saves game data
    case "create":
      gameId = response.game.id;
      joinCode = response.game.joinCode;
      joinCodeText.textContent = joinCode;
      board = response.game.board;
      playerColor = response.game.playerColor;
      kings = response.game.kings;
      break;
    // Server responds to client request to join a game
    case "join":
      if (response.joinStatus === "opponent joined") {
        waitingOnOpponentContainer.style.display = "none"; // Hide previous menu
        connectionAnimation();
        turn = true; // Red moves first
        waiting = false; // Play is currently making their move
        toggleWaitingDisplay();
        populateBoard();
      } else if (response.joinStatus === "success") {
        joinGameContainer.style.display = "none"; // Hide previous menu
        connectionAnimation();
        gameId = response.game.id;
        board = response.game.board;
        playerColor = response.game.playerColor;
        turn = false;
        waiting = true;
        kings = response.game.kings;
        populateBoard();
        toggleWaitingDisplay();
      } else if (response.joinStatus === "fail") {
        // Display error message
        if (document.getElementsByClassName("join-error").length !== 0) return;
        const joinError = joinGameContainer.appendChild(document.createElement("p"));
        joinError.textContent = "Incorrect game code or game does not exist";
        joinError.classList.add("join-error");
        joinError.classList.add("fade");
        setTimeout(() => { joinError.parentNode.removeChild(joinError); }, 3000);
        // Refocus browser onto text input field
        document.getElementById("game-id").focus();
      }
      break;
    // Server responds to client request to update game; client updates board
    case "update":
      board = response.game.board;
      waiting = !waiting;
      kings = response.game.kings;
      populateBoard();
      toggleWaitingDisplay();
      break;
    default:
  }
}

/* UI Logic ***************************************************************************/
const gameOptionsContainer = document.getElementById("game-options-container");

const mainMenuContainer = document.getElementById("main-menu-container");
const waitingOnOpponentContainer = document.getElementById("waiting-for-opponent-container");
const joinGameContainer = document.getElementById("join-game-container");

const loadingScreen = document.getElementById("loading-screen");
const connectionSuccessScreen = document.getElementById("connection-success");
const waitingDisplay = document.getElementById("waiting-display");

const quitGameBtn = document.getElementById("quit-game-btn")

// Plays a sequence of animations for when an opponent connects to the game
const connectionAnimation = () => {
  loadingScreen.style.display = "block";
  setTimeout(() => {
    loadingScreen.style.animation = "shrink 0.2s forwards";
    setTimeout(() => {
      loadingScreen.style.display = "none";
      connectionSuccessScreen.style.animation = "grow 0.2s forwards";
      connectionSuccessScreen.childNodes[1].style.animation = "spin 0.2s forwards, shake 1s";
      setTimeout(() => {
        gameOptionsContainer.style.animation = "shrink-width 0.5s forwards";
        connectionSuccessScreen.childNodes[1].style.animation = "shrink-width 0.1s forwards";
        quitGameBtn.style.display = "block";
        setTimeout(() => gameOptionsContainer.style.display = "none", 100);
      }, 1100);
    }, 200);
  }, 1000);
}

// Client clicks the 'Play Local Game' butotn
// Choose to play a local game rather than an online game
document.getElementById("local-game-btn").addEventListener("click", () => {
  startLocalGame();
  quitGameBtn.style.display = "block";
  gameOptionsContainer.style.animation = "shrink 0.2s forwards";
});

// Client clicks the 'Create Online Game' button
// Sends request to server.js to create a new online game
document.getElementById("create-game-btn").addEventListener("click", e => {
  waitingOnOpponentContainer.style.display = "block";
  mainMenuContainer.style.display = "none";
  document.getElementById("join-code-waiting-message").classList.add("blink");
  ws.send(JSON.stringify({ "method": "create", "clientId": clientId }));
});

// Client clicks the 'Cancel' button
// Cancels an online game that has been created
const cancelCreateOnlineGameBtn = document.getElementById("cancel-create-btn");
cancelCreateOnlineGameBtn.addEventListener("click", () => {
  mainMenuContainer.style.display = "block";
  waitingOnOpponentContainer.style.display = "none";
});

// Client clicks the 'Join Online Game' button
// Sends request to server to join an existing game
document.getElementById("submit-join-game-btn").addEventListener("click", () => {
  const payload = {
    "method": "join",
    "clientId": clientId,
    "joinCode": document.getElementById("game-id").value
  }
  ws.send(JSON.stringify(payload));  // Send request to join game
});

// Client clicks the 'Cancel' button
// Cancels joining an online game
document.getElementById("cancel-join-btn").addEventListener("click", () => {
  mainMenuContainer.style.display = "block";
  joinGameContainer.style.display = "none";
});

// Client clicks the 'Join Online Game' button
// Chooses to join an existing online game
document.getElementById("join-game-btn").addEventListener("click", () => {
  mainMenuContainer.style.display = "none";
  joinGameContainer.style.display = "block";
  document.getElementById("game-id").focus();
});

// Copy join code to clipboard when it is clicked
// Displays 'text copied' when it is clicked
const joinCodeText = document.querySelector("#waiting-for-opponent-container h3");
joinCodeText.addEventListener("click", e => {
  navigator.clipboard.writeText(e.target.textContent);
  const copiedMessage = document.getElementById("copied-to-clipboard");
  copiedMessage.style.display = "block";
  copiedMessage.style.animation = "fadeinout 0.75s forwards";
});

// Toggle waiting display on / off
// Active when player is waiting for opponent to submit their move
const toggleWaitingDisplay = () => {
  if (waiting === true)
    waitingDisplay.style.display = "block";
  else if (waiting === false || waiting === null)
    waitingDisplay.style.display = "none";
}

// Player clicks on "Quit Game" button
// Quits game and returns to main menu
quitGameBtn.addEventListener("click", () => {
  gameOptionsContainer.style.display = "block";
  mainMenuContainer.style.display = "block";
  connectionSuccessScreen.style.display = "none";
  gameOptionsContainer.style.animation = "grow 0.25s linear 1 forwards";
});

/* Gameplay Logic **********************************************************************/
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

// DOM references
const cells = document.querySelectorAll("td");
let redsPieces = document.querySelectorAll(".red-piece");
let blacksPieces = document.querySelectorAll(".black-piece");
const redTurnText = document.querySelectorAll(".red-turn-text");
const blackTurntext = document.querySelectorAll(".black-turn-text");
const divider = document.querySelector("#divider");

// Player properties
let turn = true;
let redScore = 12;
let blackScore = 12;
let playerPieces;

let board = [null] * 64;
let playerColor = null;             // If null, then game is local
let waiting = null;                 // If null, game is local

let kings = {red: [], black: []};   // Array of IDs of pieces that are kings

// Selected piece properties
let selectedPiece = {
  pieceId: -1,
  indexOfBoardPiece: -1,
  isKing: false,
  seventhSpace: false,
  ninthSpace: false,
  fourteenthSpace: false,
  eighteenthSpace: false,
  minusSeventhSpace: false,
  minusNinthSpace: false,
  minusFourteenthSpace: false,
  minusEighteenthSpace: false
}

// Parses pieceId and returns the index of that piece's place on the board
const findPiece = (pieceId) => board.indexOf(parseInt(pieceId));

// Initialize event listeners on pieces
const givePiecesEventListeners = () => {
  if (turn) {
    for (let i = 0; i < redsPieces.length; i++) {
      redsPieces[i].addEventListener("click", getPlayerPieces);
      redsPieces[i].style.cursor = "pointer";
    }
  } else {
    for (let i = 0; i < blacksPieces.length; i++) {
      blacksPieces[i].addEventListener("click", getPlayerPieces);
      blacksPieces[i].style.cursor = "pointer";
    }
  }
}

// Starts a local game
const startLocalGame = () => {
  isLocal = true;
  waiting = false;
  board = JSON.parse(JSON.stringify(initialBoard)); // Copy by value
  populateBoard();
}

// Populates board from data contained in 'board' variable
const populateBoard = () => {
  // Add updated pieces to board
  for (let i = 0; i < board.length; i++) {
    if (board[i] === null) {
      if (cells[i].classList.contains("noPieceHere")) continue;
      else cells[i].innerHTML = "<p></p>";
    } else {
      if (board[i] < 12) {
        cells[i].innerHTML = `<p class="red-piece" id="${board[i]}"></p>`;
        if (kings["red"].includes(board[i]))
          cells[i].childNodes[0].classList.add("king");
      } else {
        cells[i].innerHTML = `<p class="black-piece" id="${board[i]}"></p>`;
        if (kings["black"].includes(board[i]))
          cells[i].childNodes[0].classList.add("king");
      }
    }
  }
  // If player is not waiting, then add listeners
  if (waiting === false)  {
    redsPieces = document.querySelectorAll(".red-piece");
    blacksPieces = document.querySelectorAll(".black-piece");
    givePiecesEventListeners();
  }
}

// Holds the length of the players piece count
const getPlayerPieces = () => {
  if (turn) playerPieces = redsPieces;
  else playerPieces = blacksPieces;
  removeCellonclick();
  resetBorders();
}

// Removes possible moves from old selected piece
// This is needed because the user might re-select a piece
const removeCellonclick = () => {
  for (let i = 0; i < cells.length; i++) {
    cells[i].removeAttribute("onclick");
    cells[i].style.cursor = "default";
  }
}

// Resets borders to default
const resetBorders = () => {
  for (let i = 0; i < playerPieces.length; i++)
    playerPieces[i].style.border = "1px solid white";
  resetSelectedPieceProperties();
  getSelectedPiece();
}

// Resets selected piece properties
const resetSelectedPieceProperties = () => {
  selectedPiece.pieceId = -1;
  selectedPiece.pieceId = -1;
  selectedPiece.isKing = false;
  selectedPiece.seventhSpace = false;
  selectedPiece.ninthSpace = false;
  selectedPiece.fourteenthSpace = false;
  selectedPiece.eighteenthSpace = false;
  selectedPiece.minusSeventhSpace = false;
  selectedPiece.minusNinthSpace = false;
  selectedPiece.minusFourteenthSpace = false;
  selectedPiece.minusEighteenthSpace = false;
}

// Gets ID and index of the board cell its on
const getSelectedPiece = () => {
  selectedPiece.pieceId = parseInt(event.target.id);
  selectedPiece.indexOfBoardPiece = findPiece(selectedPiece.pieceId);
  isPieceKing();
}

// Checks if selected piece is a king
const isPieceKing = () => {
  selectedPiece.isKing = document.getElementById(selectedPiece.pieceId).classList.contains("king");
  getAvailableSpaces();
}

// Gets the moves that the selected piece can make
const getAvailableSpaces = () => {
  if (board[selectedPiece.indexOfBoardPiece + 7] === null && 
    cells[selectedPiece.indexOfBoardPiece + 7].classList.contains("noPieceHere") !== true) {
    selectedPiece.seventhSpace = true;
    cells[selectedPiece.indexOfBoardPiece + 7].style.cursor = "pointer";
  }
  if (board[selectedPiece.indexOfBoardPiece + 9] === null && 
    cells[selectedPiece.indexOfBoardPiece + 9].classList.contains("noPieceHere") !== true) {
    selectedPiece.ninthSpace = true;
    cells[selectedPiece.indexOfBoardPiece + 9].style.cursor = "pointer";
  }
  if (board[selectedPiece.indexOfBoardPiece - 7] === null && 
    cells[selectedPiece.indexOfBoardPiece - 7].classList.contains("noPieceHere") !== true) {
    selectedPiece.minusSeventhSpace = true;
    cells[selectedPiece.indexOfBoardPiece - 7].style.cursor = "pointer";
  }
  if (board[selectedPiece.indexOfBoardPiece - 9] === null && 
    cells[selectedPiece.indexOfBoardPiece - 9].classList.contains("noPieceHere") !== true) {
    selectedPiece.minusNinthSpace = true;
    cells[selectedPiece.indexOfBoardPiece - 9].style.cursor = "pointer";
  }
  checkAvailableJumpSpaces();
}

// Gets the moves that the selected piece can jump
const checkAvailableJumpSpaces = () => {
  if (turn) {
    if (board[selectedPiece.indexOfBoardPiece + 14] === null 
    && cells[selectedPiece.indexOfBoardPiece + 14].classList.contains("noPieceHere") !== true
    && board[selectedPiece.indexOfBoardPiece + 7] >= 12) {
      selectedPiece.fourteenthSpace = true;
    }
    if (board[selectedPiece.indexOfBoardPiece + 18] === null 
    && cells[selectedPiece.indexOfBoardPiece + 18].classList.contains("noPieceHere") !== true
    && board[selectedPiece.indexOfBoardPiece + 9] >= 12) {
      selectedPiece.eighteenthSpace = true;
    }
    if (board[selectedPiece.indexOfBoardPiece - 14] === null 
    && cells[selectedPiece.indexOfBoardPiece - 14].classList.contains("noPieceHere") !== true
    && board[selectedPiece.indexOfBoardPiece - 7] >= 12) {
      selectedPiece.minusFourteenthSpace = true;
    }
    if (board[selectedPiece.indexOfBoardPiece - 18] === null 
    && cells[selectedPiece.indexOfBoardPiece - 18].classList.contains("noPieceHere") !== true
    && board[selectedPiece.indexOfBoardPiece - 9] >= 12) {
      selectedPiece.minusEighteenthSpace = true;
    }
  } else {
    if (board[selectedPiece.indexOfBoardPiece + 14] === null 
    && cells[selectedPiece.indexOfBoardPiece + 14].classList.contains("noPieceHere") !== true
    && board[selectedPiece.indexOfBoardPiece + 7] < 12 && board[selectedPiece.indexOfBoardPiece + 7] !== null) {
      selectedPiece.fourteenthSpace = true;
    }
    if (board[selectedPiece.indexOfBoardPiece + 18] === null 
    && cells[selectedPiece.indexOfBoardPiece + 18].classList.contains("noPieceHere") !== true
    && board[selectedPiece.indexOfBoardPiece + 9] < 12 && board[selectedPiece.indexOfBoardPiece + 9] !== null) {
      selectedPiece.eighteenthSpace = true;
    }
    if (board[selectedPiece.indexOfBoardPiece - 14] === null
    && cells[selectedPiece.indexOfBoardPiece - 14].classList.contains("noPieceHere") !== true
    && board[selectedPiece.indexOfBoardPiece - 7] < 12 
    && board[selectedPiece.indexOfBoardPiece - 7] !== null) {
      selectedPiece.minusFourteenthSpace = true;
    }
    if (board[selectedPiece.indexOfBoardPiece - 18] === null
    && cells[selectedPiece.indexOfBoardPiece - 18].classList.contains("noPieceHere") !== true
    && board[selectedPiece.indexOfBoardPiece - 9] < 12
    && board[selectedPiece.indexOfBoardPiece - 9] !== null) {
      selectedPiece.minusEighteenthSpace = true;
    }
  }
  checkPieceConditions();
}

// Restricts movement if the piece is a king
const checkPieceConditions = () => {
  if (selectedPiece.isKing) {
    givePieceBorder();
  } else {
    if (turn) {
      selectedPiece.minusSeventhSpace = false;
      selectedPiece.minusNinthSpace = false;
      selectedPiece.minusFourteenthSpace = false;
      selectedPiece.minusEighteenthSpace = false;
    } else {
      selectedPiece.seventhSpace = false;
      selectedPiece.ninthSpace = false;
      selectedPiece.fourteenthSpace = false;
      selectedPiece.eighteenthSpace = false;
    }
    givePieceBorder();
  }
}

// Gives the piece a green highlight for the user (showing its movable)
const givePieceBorder = () => {
  if (selectedPiece.seventhSpace || selectedPiece.ninthSpace || selectedPiece.fourteenthSpace
  || selectedPiece.eighteenthSpace || selectedPiece.minusSeventhSpace || selectedPiece.minusNinthSpace
  || selectedPiece.minusFourteenthSpace || selectedPiece.minusEighteenthSpace) {
    document.getElementById(selectedPiece.pieceId).style.border = "3px solid green";
    giveCellsClick();
  } else return;
}

// Gives the cells on the board a 'click' based on the possible moves
const giveCellsClick = () => {
  if (selectedPiece.seventhSpace)
    cells[selectedPiece.indexOfBoardPiece + 7].setAttribute("onclick", "makeMove(7)");
  if (selectedPiece.ninthSpace)
    cells[selectedPiece.indexOfBoardPiece + 9].setAttribute("onclick", "makeMove(9)");
  if (selectedPiece.fourteenthSpace)
    cells[selectedPiece.indexOfBoardPiece + 14].setAttribute("onclick", "makeMove(14)");
  if (selectedPiece.eighteenthSpace)
    cells[selectedPiece.indexOfBoardPiece + 18].setAttribute("onclick", "makeMove(18)");
  if (selectedPiece.minusSeventhSpace)
    cells[selectedPiece.indexOfBoardPiece - 7].setAttribute("onclick", "makeMove(-7)");
  if (selectedPiece.minusNinthSpace)
   cells[selectedPiece.indexOfBoardPiece - 9].setAttribute("onclick", "makeMove(-9)");
  if (selectedPiece.minusFourteenthSpace)
    cells[selectedPiece.indexOfBoardPiece - 14].setAttribute("onclick", "makeMove(-14)");
  if (selectedPiece.minusEighteenthSpace)
    cells[selectedPiece.indexOfBoardPiece - 18].setAttribute("onclick", "makeMove(-18)");
}

// Makes the move that was clicked
const makeMove = (number) => {
  document.getElementById(selectedPiece.pieceId).remove();
  cells[selectedPiece.indexOfBoardPiece].innerHTML = "";
  if (turn) {
    if (selectedPiece.isKing) {
      cells[selectedPiece.indexOfBoardPiece + number].innerHTML = `<p class="red-piece king" id="${selectedPiece.pieceId}"></p>`;
      redsPieces = document.querySelectorAll(".red-piece");
    } else {
      cells[selectedPiece.indexOfBoardPiece + number].innerHTML = `<p class="red-piece" id="${selectedPiece.pieceId}"></p>`;
      redsPieces = document.querySelectorAll(".red-piece");
    }
  } else {
    if (selectedPiece.isKing) {
      cells[selectedPiece.indexOfBoardPiece + number].innerHTML = `<p class="black-piece king" id="${selectedPiece.pieceId}"></p>`;
      blacksPieces = document.querySelectorAll(".black-piece");
    } else {
      cells[selectedPiece.indexOfBoardPiece + number].innerHTML = `<p class="black-piece" id="${selectedPiece.pieceId}"></p>`;
      blacksPieces = document.querySelectorAll(".black-piece");
    }
  }

  let indexOfPiece = selectedPiece.indexOfBoardPiece
  if (number === 14 || number === -14 || number === 18 || number === -18)
    changeData(indexOfPiece, indexOfPiece + number, indexOfPiece + number / 2);
  else changeData(indexOfPiece, indexOfPiece + number);
}

// Changes the board states data on the back end
const changeData = (indexOfBoardPiece, modifiedIndex, removePiece) => {
  board[indexOfBoardPiece] = null;
  board[modifiedIndex] = parseInt(selectedPiece.pieceId);
  if (turn && selectedPiece.pieceId < 12 && modifiedIndex >= 56) {
    document.getElementById(selectedPiece.pieceId).classList.add("king")
    kings["red"].push(selectedPiece.pieceId);
  }
  if (turn === false && selectedPiece.pieceId >= 12 && modifiedIndex <= 7) {
    document.getElementById(selectedPiece.pieceId).classList.add("king");
    kings["black"].push(selectedPiece.pieceId);
  }
  if (removePiece) {
    board[removePiece] = null;
    if (turn && selectedPiece.pieceId < 12) {
      cells[removePiece].innerHTML = "";
      blackScore--;
    }
    if (turn === false && selectedPiece.pieceId >= 12) {
      cells[removePiece].innerHTML = "";
      redScore--;
    }
  }
  resetSelectedPieceProperties();
  removeCellonclick();
  removeEventListeners();
}

// Removes the 'onClick' event listeners for pieces
const removeEventListeners = () => {
  if (turn) {
    for (let i = 0; i < redsPieces.length; i++) {
      redsPieces[i].removeEventListener("click", getPlayerPieces);
      redsPieces[i].style.cursor = "default";
    }
    for (let i = 0; i < blacksPieces.length; i++) {
      blacksPieces[i].removeEventListener("click", getPlayerPieces);
    }
  } else {
    for (let i = 0; i < blacksPieces.length; i++) {
      blacksPieces[i].removeEventListener("click", getPlayerPieces);
      blacksPieces[i].style.cursor = "default";
    }
    for (let i = 0; i < redsPieces.length; i++) {
      redsPieces[i].removeEventListener("click", getPlayerPieces);
    }
  }
  checkForWin();
}

// Checks for a win
const checkForWin = () => {
  if (blackScore === 0) {
    divider.style.display = "none";
    for (let i = 0; i < redTurnText.length; i++) {
      redTurnText[i].style.color = "var(--off-white)";
      blackTurntext[i].style.display = "none";
      redTurnText[i].textContent = "RED WINS!";
    }
  } else if (redScore === 0) {
    divider.style.display = "none";
    for (let i = 0; i < blackTurntext.length; i++) {            
      blackTurntext[i].style.color = "var(--off-white)";
      redTurnText[i].style.display = "none";
      blackTurntext[i].textContent = "BLACK WINS!";
    }
  }
  changePlayer();
}

// Switches players turn; turn : true = red
const changePlayer = () => {
  if (turn) {
    turn = false;
    for (let i = 0; i < redTurnText.length; i++) {
      redTurnText[i].style.color = "var(--black-text)";
      blackTurntext[i].style.color = "var(--off-white)";
    }
  } else {
    turn = true;
    for (let i = 0; i < blackTurntext.length; i++) {
      blackTurntext[i].style.color = "var(--black-text)";
      redTurnText[i].style.color = "var(--off-white)";
    }
  }
  if (isLocal) givePiecesEventListeners();
  else submitMove();  // Submit move to server; Event listeners to switch sides are not added
}
givePiecesEventListeners();