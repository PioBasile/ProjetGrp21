const express = require('express');
const app = express();
const http = require('http');
const { Server } = require("socket.io");
const cors = require("cors");
const { start } = require('repl');
const { platform } = require('os');
const roomName = "room"

// CUSTOM LIB
const {
  makecookie,
  Lobby,
  Player_IN_Lobby,
  Bataille_Card,
  Player,
  Bataille,
  STATUS,
  findRemovePlayer,
  findCard,
  shuffle,
  generateCartes,
  findPlayer,
  findGame,
  findLobby,
  findWaitingPlayer,
  generate6Cartes,
  Carte6,
  SixQuiPrend,
  MilleBorne,
  MB_Player,
  getOpponent,
  State,
  GameState

} = require("./JS_CustomLib/D_utils.js");
const { login, changeDataBase, get_user_info, register } = require("./JS_CustomLib/D_db.js");
const { Roulette } = require("./JS_CustomLib/D_Casino.js");
const {Sentinel_Main} = require('./JS_CustomLib/sentinel.js');



app.use(cors());
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
  },

});


// VARIABLES 

let validCookies = {};
let BatailGames = [];
let TaureauGames = [];
let MilleBornesGames = [];
let lobbyList = [];
let lobbyIndex = 1;
let RouletteInstance = new Roulette();
let isPaused = false;

//setInterval(() => {Sentinel_Main(io,validCookies,BatailGames,TaureauGames,MilleBornesGames,lobbyList,lobbyIndex)},100);


//

server.listen(3001, () => {
  console.log("SERVER IS RUNNING");
})



const updateWins = async () => {
  for (const win of RouletteInstance.wins) {
    try {
      const res = await get_user_info(win["name"]);
      console.log(res.argent);
      console.log(win);
      await changeDataBase("argent", res.argent + win["won"], win["name"]);
    } catch (error) {
      console.error("Erreur lors de la mise à jour des gains :", error);
    }
  }
}

setInterval(() => {

  if (isPaused) {
    return
  }

  RouletteInstance.timer = RouletteInstance.timer - 1;

  if (RouletteInstance.timer == 0) {

    RouletteInstance.rolls();
    console.log("ROLL : " + RouletteInstance.roll);
    io.emit('spinwheel', RouletteInstance.roll);
    RouletteInstance.resolveBets();

    updateWins();

    io.emit("listWins", RouletteInstance.wins);

    RouletteInstance.wins = [];
    RouletteInstance.bets = [];

    isPaused = true;
    setTimeout(() => {
      isPaused = false;
    }, 9000);

    RouletteInstance.timer = 30;

  }
  io.emit('rouletteTimer', RouletteInstance.timer);
}, 1000);

setInterval(() => {io.emit('timerDown');}, 1000);


io.on('connection', (socket) => {

  // --------------------------------------Casino-------------------------------------------------------

  socket.on("bet", (nom, betAmmount, betPos) => {

    if (betAmmount <= 0) {
      return
    }

    if (RouletteInstance.timer > 5) {

      RouletteInstance.bets.push({ nom: nom, betAmmount: betAmmount, betPos: betPos });
      get_user_info(nom).then((res) => {

        changeDataBase("argent", res.argent - betAmmount, nom);
        socket.emit("VoilaTesSousMonSauce", res.argent - betAmmount);

      });


    }
    else {

      socket.emit("tropsTard");

    }

    console.log(RouletteInstance.bets);
    io.emit("bets", RouletteInstance.bets);


  });

  socket.on("ArgentViteBatard", (name) => {

    get_user_info(name).then((res) => {

      socket.emit("VoilaTesSousMonSauce", res.argent);

    });

  });

  // ----------------------------------------------------------------------------------------------------------

  console.log("Connection par : " + socket.id);


  socket.on('disconnect', () => {
    console.log('Disconnected:', socket.id);
  });


  // -------------------------------------------------------- CONNECTION -------------------------------------

  socket.on('login', (username, password) => {


    login(username, password).then((value) => {
      if (value == 1) {
        cookie = makecookie(10);
        socket.emit('succes', cookie, username);
        validCookies[username] = cookie;
      } else {
        socket.emit('failure');
      }
    });

  });

  socket.on('register', (username, password) => {

    register(username, password).then((value) => {
      if (value == 1) {
        cookie = makecookie(10);
        socket.emit('succes', cookie, username);
        validCookies[username] = cookie;
      } else {
        socket.emit('failure');
      }
    });

  });

  socket.on('co', (name, cookie) => {

    // DESAC

    return;


    if (validCookies[name] == cookie) {
      return;
    } else {
      socket.emit('deco', name);
    }

  });



  // GESTION LOBBY //

  socket.on('newServer', (serverName, nbPlayerMax, isPrivate, password, gameType, owner, moneyBet) => {

    let Nlobby = new Lobby(serverName, parseInt(nbPlayerMax), isPrivate, password, gameType, lobbyIndex, owner, moneyBet);
    lobbyList.push(Nlobby);
    lobbyIndex++;
    io.emit('newServer', lobbyList);

  });

  socket.on('joinLobby', (name, lobbyID, cookie) => {

    clobby = findLobby(lobbyID, lobbyList);
    cplayer = new Player_IN_Lobby(name, cookie);
    clobby.playerList.push(cplayer);
    clobby.is_empty = false;
    io.emit('newServer', lobbyList);

  });

  socket.on('whoIsHere', (lobbyID) => {

    clobby = findLobby(lobbyID, lobbyList);
    io.emit('update', clobby.playerList);

  });

  socket.on('join', (room) => {

    socket.join(room);

  });

  socket.on('leave', (room) => {

    socket.leave(room);

  });

  socket.on("getServ", () => {

    socket.emit('newServer', lobbyList);

  });

  socket.on('WhereAmI', (lobbyID) => {

    let clobby = findLobby(lobbyID, lobbyList);
    socket.emit('here', clobby);
    io.to(lobbyID).emit('here', clobby);

  });

  socket.on('ready', (lobbyID, name) => {

    let clobby = findLobby(lobbyID, lobbyList);
    let cplayer = findWaitingPlayer(name, clobby.playerList);

    cplayer.isReady = !cplayer.isReady;
    socket.emit('here', clobby);
    io.to(lobbyID).emit('here', clobby);



  });

  socket.on('deco_lobby', (lobbyID, name) => {

    let clobby = findLobby(lobbyID, lobbyList);
    let cplayer = findWaitingPlayer(name, clobby.playerList);
    if(cplayer == -1 ){
      socket.emit("deco");
      return;
    }

    clobby.playerList.splice(clobby.playerList.indexOf(cplayer), 1)
    io.to(lobbyID).emit('here', clobby);
    io.to(lobbyID).emit('disconected', name);
    io.emit('newServer', lobbyList);

  });

  socket.on('updateParam', (lobbyID, maxPlayers, timeBetweenTurn, roundsMax) => {

    let clobby = findLobby(lobbyID, lobbyList);

    clobby.nbPlayerMax = parseInt(maxPlayers);
    clobby.tbt = parseInt(timeBetweenTurn);
    clobby.maxTurn = parseInt(roundsMax);

    io.emit('newServer', lobbyList);
    io.to(lobbyID).emit('lobbyParams', maxPlayers, timeBetweenTurn, roundsMax, );

  });

  socket.on("lobbyInfo_UwU", (serverId) => {
    let lobby = findLobby(serverId, lobbyList);
    io.to(serverId).emit("yourInfoBebs", {serverName:lobby.serverName, nbPlayerMax:lobby.nbPlayerMax, password:lobby.password, gameType:lobby.gameType, owner:lobby.owner, timer:lobby.tbt})
  })

  socket.on('askStat', (name) => {

    get_user_info(name).then((res) => {

      socket.emit('stats', res);

    });

  });


  socket.on('StartGame', (lobbyID) => {


    lobby = findLobby(lobbyID, lobbyList);
    owner = lobby.owner;
    let plist = [];

    console.log(lobby.gameType);

    lobby.playerList.forEach((player) => {

      plist.push(new Player(player.username, player.cookie))

      get_user_info(player.username).then((res) => {

        changeDataBase('nbGames', res.nbGames + 1, player.username);

      });

    });

    let nGame;

    if (lobby.gameType == "rd") {
      let game = ["batailleOuverte", "sqp", "mb"]
      let randomId = Math.floor(Math.random() * 2)
      lobby.gameType = game[randomId];
    }

    if (lobby.gameType == "sqp") {

      nGame = new SixQuiPrend(lobbyID, owner, plist, 10, lobby.moneyBet);
      TaureauGames.push(nGame);

    }

    else if (lobby.gameType == "mb") {



      let mbPlist = [];

      let color = ["pink", "red", "yellow", "green"];

      plist.forEach((player, index) => {
        let newMB_player = new MB_Player(player.name, player.cookie, color[index], lobby.moneyBet);
        mbPlist.push(newMB_player);
      })

      nGame = new MilleBorne(lobbyID, owner, mbPlist);

      MilleBornesGames.push(nGame);
    }

    //HERE
    

    else {
      nGame = new Bataille(lobbyID, lobby.nbPlayerMax, lobby.maxTurn, owner, plist, lobby.moneyBet);
      BatailGames.push(nGame);

    }

    io.to(lobbyID).emit('start', lobby.gameType);
    nGame.status = STATUS.WAITING_FOR_PLAYER_CARD;


  });


  // JEU BATAILLE

  // PHASE 1 : Distribution des cartes a tout les joueurs //

  socket.on('WhatIsMyDeck', (username, gameID) => {

    game = findGame(gameID, BatailGames);
    player = findPlayer(username, game.playerList);
    if(player == -1 ){
      socket.emit("deco");
      return;
    }

    socket.emit('Deck', player.deck);

  });

  socket.on('askGameInfo', (GameID) => {

    game = findGame(GameID, BatailGames);
    socket.emit('getInfo', game);

  });

  socket.on("sendCard", (data) => {
    game = findGame(data.serverId, BatailGames)
    let card =  data.card
    if(card) {
        game.cardPlayedInRound[data.name] = card;
    }
    else {
      socket.emit("deco")
      throw new Error("This card does not exist")
    }

    io.to(data.serverId).emit("roundCardsPlayed", game.cardPlayedInRound);
  })

  // Phase de choix, permet au joueurs de choisir leurs cartes et une fois tout les cartes chosis donne le résultat du round //
  socket.on('PhaseDeChoix', (GameId, playerName, card) => {

    let game = findGame(GameId, BatailGames);
    let player = findPlayer(playerName, game.playerList);
    if(player == -1 ){
      socket.emit("deco");
      return;
    }

    player.selected = card;

    let readyUP = true;
    game.playerList.forEach((player) => {
      if (player.selected == null && !player.out) {
        readyUP = false;
      }

    });
    if (!readyUP) {
      return;
    } else {
      game.resolve();
      let count = 0;

      game.playerList.forEach((player) => {

        // HAHAHAHAHAHA
        if (player.deck[0] == [][0]) {
          player.out = true;
          count++;
        }

      });

      if (count >= game.playerList.length - 1 || game.currentTurn == game.maxTurn) {
        io.to(GameId).emit('FIN', game.scoreboard, game.playerList);

        let max = -1;
        let winner = [];
        game.playerList.forEach((player) => {

          if (max < game.scoreboard[player.name]) {
            max = game.scoreboard[player.name];
            winner = [playerName];
          } else if (max == game.scoreboard[player.name]) {
            winner.push(player.name);
          }

        });

        winner.forEach((player) => {

          get_user_info(player).then((res) => {


            changeDataBase('nbWin', res.nbWin + 1, player);

          });

        });
      } else {
        if (game.Rdraw != null) {
          game.Rdraw.forEach((player) => {

            CardIndex = Math.floor(Math.random() * player.deck.length);
            player.deck.splice(CardIndex, 1);
            

          });
          io.to(GameId).emit('Draw', game.Rdraw);
        } else {
          game.Rwinner.deck = [...player.deck, ...Object.values(game.cardPlayedInRound)]
          io.to(GameId).emit('Winner', game.Rwinner);
          game.cardPlayedInRound = {}
          io.to(GameId).emit("roundCardsPlayed", game.cardPlayedInRound);
          game.currentTurn++;
        }
      }
    }
  });

  // POUR RESOUDRE LES EGALITE
  socket.on('ResoudreEgalite', (GameId, playerName, card) => {

    let game = findGame(GameId, BatailGames);
    let player = findPlayer(playerName, game.playerList);
    if(player == -1 ){
      socket.emit("deco");
      return;
    }

    player.selected = card;

    let readyUP = true;
    game.Rdraw.forEach((player) => {
      if (player.selected == null && !player.out) {
        readyUP = false;
      }

    });
    if (!readyUP) {
      return;
    } else {
      game.resolve_draw();
      let count = 0;

      game.playerList.forEach((player) => {

        // HAHAHAHAHAHA
        if (player.deck[0] == [][0]) {
          player.out = true;
          count++;
        }

      });

      if (count >= game.playerList.length - 1 || game.currentTurn == game.maxTurn) {
        io.to(GameId).emit('FIN', game.scoreboard, game.playerList);
        let max = -1;
        let winner = [];
        game.playerList.forEach((player) => {

          if (max < game.scoreboard[player.name]) {
            max = game.scoreboard[player.name];
            winner = [playerName];
          } else if (max == game.scoreboard[player.name]) {
            winner.push(player.name);
          }

        });

        winner.forEach((player) => {

          get_user_info(player).then((res) => {

            changeDataBase('nbWin', res.nbWin + 1, player);

          });

        });

      } else {
        if (game.Rdraw != null) {
          game.Rdraw.forEach((player) => {

            CardIndex = Math.floor(Math.random() * player.deck.length);
            player.deck.splice(CardIndex, 1)

          });
          io.to(GameId).emit('Draw', game.Rdraw);
        } else {
          player.deck = [...player.deck, ...Object.values(game.cardPlayedInRound)]
          io.to(GameId).emit('Winner', game.Rwinner);
          game.cardPlayedInRound = {}
          io.to(GameId).emit('Winner', game.Rwinner);
          game.currentTurn++;
        }
      }
    }

  });

  socket.on('leaveGame', (playerName, GameId) => {

    let game = findGame(GameId, BatailGames);
    let player = findPlayer(playerName, game.playerList);
    if(player == -1 ){
      socket.emit("deco");
      return;
    }

    game.removePlayer(player);
    io.to(GameId).emit('getInfo', game);


  });





  // SIX QUI PREND 


  socket.on('6update', (username, gameID) => {

    console.log("sqp pas normal ici");
    game = findGame(gameID, TaureauGames);
    player = findPlayer(username, game.player_list);
    if(player == -1 ){
      socket.emit("deco");
      return;
    }

    let redo = false;
    game.player_list.forEach((player) => {

      if (player.deck.length == 0) {
        redo = true;
      }

    });

    if (redo) { game.croupier() };

    let oppon6 = []
    let pl;
    game.player_list.forEach((player) => {

      pl = { nom: player.name, deck: player.deck.length, score: player.score };
      oppon6.push(pl);

    });


    socket.emit('startTimer');
    socket.emit('Deck', player.deck);
    socket.emit('Row', [game.row1, game.row2, game.row3, game.row4]);
    socket.emit('6oppo', oppon6);
    socket.emit("cartesDroite", game.selected_cards);

    if (game.status == STATUS.PHASE_2) {

      socket.emit('phase2', (false));
      socket.emit('nextPlayer', game.currentP);


    }


  });


  socket.on('send6cardphase1', (card, playername, gameID) => {


    game = findGame(gameID, TaureauGames);
    player = findPlayer(playername, game.player_list);
    if(player == -1 ){
      socket.emit("deco");
      return;
    }



    let count = 0;
    let found = false;
    player.deck.forEach((elem) => {

      if (elem.number == card.number) {
        found = !found;
      }
      if (!found) {
        count++;
      }

    });

    if (player.selected != null) {

      player.deck.push(player.selected);
      game.selected_cards.splice(game.selected_cards.indexOf(player.selected), 1);

    }

    player.selected = card;
    player.deck.splice(count, 1);
    game.selected_cards.push(card);


    if (game.tousJouer()) {

      game.status = STATUS.PHASE_2;
      io.to(gameID).emit('phase2', (false));
      game.GiveOrder();
      io.to(gameID).emit("nextPlayer", game.nextP());

    }

    let oppon6 = []
    let pl;
    game.player_list.forEach((player) => {

      pl = { nom: player.name, deck: player.deck.length, score: player.score };
      oppon6.push(pl);

    });

    socket.emit('Deck', player.deck);
    io.to(gameID).emit('Row', [game.row1, game.row2, game.row3, game.row4]);
    io.to(gameID).emit('6oppo', oppon6);
    io.to(gameID).emit("cartesDroite", game.selected_cards);


  });


  socket.on('send6cardphase2', (row, playername, gameID) => {

    game = findGame(gameID, TaureauGames);
    player = findPlayer(playername, game.player_list);
    if(player == -1 ){
      socket.emit("deco");
      return;
    }


    if (game.play(parseInt(row))) {

      if (game.status == STATUS.ENDED) {

        io.to(gameID).emit('FIN', game.winner);
        return;
      }

      player.selected = null;

      if (game.tousPasJouer() || game.status == STATUS.WAITING_FOR_PLAYER_CARD) {

        game.selected_cards = [];
        game.status = STATUS.WAITING_FOR_PLAYER_CARD;
        game.clearP();
        io.to(gameID).emit('phase1');

      }

      io.to(gameID).emit("nextPlayer", game.nextP());


    } else {

      socket.emit('missPlacement');

    }




    let oppon6 = []
    let pl;
    game.player_list.forEach((player) => {

      pl = { nom: player.name, deck: player.deck.length, score: player.score };
      oppon6.push(pl);

    });

    socket.emit('Deck', player.deck);
    io.to(gameID).emit('Row', [game.row1, game.row2, game.row3, game.row4]);
    io.to(gameID).emit('6oppo', oppon6);
    io.to(gameID).emit("cartesDroite", game.selected_cards);


  });





  // MILLE BORNE BY xX_PROGRAMER69_Xx

  socket.on("MB-whatMyInfo", (data) => {
    game = findGame(data.serverId, MilleBornesGames);
    player = findPlayer(data.name, game.playerList);
    if(player == -1 ){
      socket.emit("deco");
      return;
    }

    if (player !== 0) {
      socket.emit("MB-playerInfo", { deck: player.deck, nbPoints: player.nbPoints, turn: player.myTurn, bonus: player.bonus, state: player.state, color: player.color, isLimited: player.isLimited });
    }
    else {
      throw new Error("this player didn't exist nooob");
    }
  })

  socket.on("whatTheOrder", async (data) => {
    let game = findGame(data.serverId, MilleBornesGames);
    let player = findPlayer(data.name, game.playerList);
    if(player == -1 ){
      socket.emit("deco");
      return;
    }

    if (game.anyonePlayed()) {
      game.playerList[0].myTurn = true;
    }

    else {
      console.log("a player is already playing");
    }

    socket.emit("myTurn", player.myTurn);
  })

  socket.on("MB-whatMyOpponent", (data) => {
    game = findGame(data.serverId, MilleBornesGames);
    current_player = findPlayer(data.name, game.playerList);
    if(current_player == -1 ){
      socket.emit("deco");
      return;
    }
    playerList = game.playerList;

    let opponentList = getOpponent(playerList, current_player);

    socket.emit("MB-opponent", (opponentList));
  })

  socket.on("MB-playCard", (data) => {

    game = findGame(data.serverId, MilleBornesGames);
    player = findPlayer(data.name, game.playerList);
    if(player == -1 ){
      socket.emit("deco");
      return;
    }
    card = data.card;

    if (game.cardVitesse.includes(card)) {
      game.vitesseCard(card, player);
    }

    else if (game.cartesAttaque.includes(card)) {
      socket.emit("chooseVictim");
      return;
    }

    else if (game.cardBonus.includes(card)) {
      player.addBonus(card);
      game.endAttaque(card, player);
    }

    else if (game.cardContre.includes(card)) {
      game.endAttaque(card, player);
    }

    else {

      throw new Error("this card doesn't exist broh");

    }

    if (!game.cardBonus.includes(card)) {
      game.cardPlayed.push(card);
    }

    if (game.state == "FIN") {
      io.to(data.serverId).emit("MB_FIN", player.name);
    }

    player.deck.splice(player.deck.indexOf(card), 1)

    game.piocher(player);

    game.MB_giveOrder();

    socket.emit("MB-playerInfo", { deck: player.deck, nbPoints: player.nbPoints, turn: player.myTurn, bonus: player.bonus, state: player.state, color: player.color, isLimited: player.isLimited });
    io.to(data.serverId).emit("getUpdate");
    io.to(data.serverId).emit("updateMiddleCard", ({ card: card }));

  })

  socket.on("victim", (data) => {
    game = findGame(data.serverId, MilleBornesGames);
    player = findPlayer(data.name, game.playerList);
    if(player == -1 ){
      socket.emit("deco");
      return;
    }
    playerAttacked = findPlayer(data.playerAttackedName, game.playerList);
    if(playerAttacked == -1 ){
      socket.emit("deco");
      return;
    }
    if (playerAttacked !== 0) {
      if (game.attaqued(playerAttacked, data.card)) {

        player.deck.splice(player.deck.indexOf(card), 1)
        game.cardPlayed.push(card);

        game.piocher(player);

        game.MB_giveOrder();

        io.to(data.serverId).emit("attacked", playerAttacked.name);
        socket.emit("MB-playerInfo", { deck: player.deck, nbPoints: player.nbPoints, turn: player.myTurn, bonus: player.bonus, state: player.state, color: player.color, isLimited: player.isLimited });
        io.to(data.serverId).emit("getUpdate");
        io.to(data.serverId).emit("updateMiddleCard", ({ card: card }));
      }

      else {
        console.log("can't attack this noob BOZO");
      }
    }
    else {
      throw new Error("le joueuer attaquÃ© n'existe pas big noob");
    }
  })

  socket.on("MB-whatMyState", (data) => {
    game = findGame(data.serverId, MilleBornesGames);
    player = findPlayer(data.name, game.playerList);
    if(player == -1 ){
      socket.emit("deco");
      return;
    }

    socket.emit("newState", (player.state));
  })

  socket.on("throwCard", (data) => {

    player.deck.splice(player.deck.indexOf(card), 1)
    game.cardPlayed.push(card);
    game.piocher(player);
    game.MB_giveOrder();
    socket.emit("MB-playerInfo", { deck: player.deck, nbPoints: player.nbPoints, turn: player.myTurn, bonus: player.bonus, state: player.state, color: player.color, isLimited: player.isLimited });
    io.to(data.serverId).emit("getUpdate");
    io.to(data.serverId).emit("updateMiddleCard", ({ card: data.card }));

  })

  socket.on("MB-nbCard", (serverId) => {
    game = findGame(serverId, MilleBornesGames);
    if(game) socket.emit("MB-getNbCards", game.deck.length);
    else socket.emit("deco")
  })

  socket.on("whatMyTurn", (data) => {
    game = findGame(data.serverId, MilleBornesGames);
    player = findPlayer(data.name, game.playerList);
    if(player == -1 ){
      socket.emit("deco");
      return;
    }

    socket.emit("myTurn", player.myTurn);
  })

  socket.on('MB-leaveGame', (data) => {

    let game = findGame(data.serverId, MilleBornesGames);
    let player = findPlayer(data.name, game.playerList);
    if(player == -1 ){
      socket.emit("deco");
      return;
    }


    game.removePlayer(player);
    io.to(data.serverId).emit('getUpdate', game);
    if (game.playerList.length === 1) {
      game.state = GameState.FIN;
      io.to(data.serverId).emit("MB_FIN", player.name);
    }
  });

  //CHAT MILLES BORNES !!!!!!! DORIAN STP NE SUPPRIME PAS !!!!!
  socket.on("MB-sendMessage", (data) => {
    game = findGame(data.serverId, MilleBornesGames);
  if(data.msg) {game.addMessage(`${data.name}: ${data.msg}`);}
    io.to(data.serverId).emit("MB-getMessage", game.chatContent);
  })
  
  socket.on("MB-loadTheChat", (serverId)=> {
    game = findGame(serverId, MilleBornesGames);
    io.to(serverId).emit("MB-getMessage", game.chatContent);
  }) 

  //CHAT SIX QUI PREND

  // socket.on("SQP-sendMessage", (data) => {
  //   game = findGame(data.serverId, TaureauGames);
  //   game.addMessage(`${data.name}: ${data.msg}`);
  //   io.to(data.serverId).emit("SQP-getMessage", game.chatContent);
  // })
  
  socket.on("SQP-loadTheChat", (serverId)=> {
    game = findGame(serverId, TaureauGames);
    io.to(serverId).emit("SQP-getMessage", game.chatContent);
  }) 

   
  // CHAT ROULETTE

  // socket.on("rlt-sendMessage", (data) => {
  //   game = findGame(data.serverId, roul);
  //   game.addMessage(`${data.name}: ${data.msg}`);
  //   io.to(data.serverId).emit("rlt-getMessage", game.chatContent);
  // })
  
  // socket.on("rlt-loadTheChat", (serverId)=> {
  //   game = findGame(serverId, MilleBornesGames);
  //   io.to(serverId).emit("rlt-getMessage", game.chatContent);
  // }) 

  //CHAT BLACKJACK

  // socket.on("BJ-sendMessage", (data) => {
  //   game = findGame(data.serverId, MilleBornesGames);
  //   game.addMessage(`${data.name}: ${data.msg}`);
  //   io.to(data.serverId).emit("BJ-getMessage", game.chatContent);
  // })

  // socket.on("BJ-loadTheChat", (serverId)=> {
  //   game = findGame(serverId, MilleBornesGames);
  //   io.to(serverId).emit("BJ-getMessage", game.chatContent);
  // }) 

  
  //bataille
  socket.on("BTL-sendMessage", (data) => {
    game = findGame(data.serverId, BatailGames);
    console.log(data.msg);
    if(data.msg){
      game.addMessage(`${data.name}: ${data.msg}`);
    }
    io.to(data.serverId).emit("BTL-getMessage", game.chatContent);
  })
  
  socket.on("BTL-loadTheChat", (serverId)=> {
    game = findGame(serverId, BatailGames);
    io.to(serverId).emit("BTL-getMessage", game.chatContent);
  }) 


});