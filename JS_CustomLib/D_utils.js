const { login, changeDataBase, get_user_info, register } = require("./D_db.js");

const makecookie = (length) => {
    let result = '';
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const charactersLength = characters.length;
    let counter = 0;
    while (counter < length) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
      counter += 1;
    }
    return result;
  }
  
  
const findGame = (id,availableGames) => {
  
      let game = 0;
      availableGames.forEach((elem) => {
        if(elem.identifiant_partie == id){game=elem}
      });
      return game;
  
}
  
const findLobby = (id,lobbyList) => {
  
    let lobby = 0;
    lobbyList.forEach((elem) => {
      if(elem.id == id){lobby=elem}
    });
    return lobby;
  
}
  
const findWaitingPlayer = (username, plist) => {
  
    let player = 0;
    plist.forEach((elem) => {
      if(elem.username == username){player=elem}
    });
    return player;
  
}
  
  
const findPlayer = (username, plist) => {
  
    let player = 0;
    plist.forEach((elem) => {
      if(elem.name == username){player=elem}
    });
    return player;
  
}
  
const generateCartes = () => {
    const symbols = ['Coeur', 'Carreau', 'Trefle', 'Pique'];
    const numbers = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'V', 'Reine', 'Roi', 'As'];
    const powers = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];
  
    const deck = [];
    for (const symbol of symbols) {
      for (let i = 0; i < numbers.length; i++) {
        const card = new Bataille_Card(symbol, numbers[i], powers[i]);
        deck.push(card);
      }
    }
  
    return deck;
}
  
const shuffle = (array) => {
    let currentIndex = array.length,  randomIndex;
  
    while (currentIndex > 0) {
  
      randomIndex = Math.floor(Math.random() * currentIndex);
      currentIndex--;
  
      [array[currentIndex], array[randomIndex]] = [
        array[randomIndex], array[currentIndex]];
    }
  
    return array;
}
  
const findCard = (card, deck) => {
    let count = 0;
    let found = false;
    deck.forEach((elem) => {
  
        if(elem.symbole == card.symbole && elem.power == card.power){
          found = !found;
        }
        if(!found){
          count++;
        }
  
      });
    return count;
}
  
const findRemovePlayer = (player, plist) => {
    let count = 0;
    let found = false;
    plist.forEach((elem) => {
  
        if(elem.name == player.name){
          found = !found;
        }
        if(!found){
          count++;
        }
  
      });
    return count;
}


//Bataille

const STATUS = {
  START: 's',
  WAITING_FOR_PLAYER_CARD: 'phase1',
  PHASE_2: 'phase2',
  DRAW: 'd',
  ENDED: "end"
};

class Bataille{
  
  constructor(idPart,maxJ,maxT,Owner,playerL){

    this.identifiant_partie = idPart;
    this.maxJoueurs = maxJ;
    this.maxTurn = maxT;
    this.owner = Owner;
    this.playerList = playerL;
    this.scoreboard = {};
    this.cartes = shuffle(generateCartes());

    let index = 0;

    this.playerList.forEach((player) => {

      this.scoreboard[player.name] = 0;
      

      for(let i = 0;i<Math.floor(52/(this.maxJoueurs));i++){
          if(i==20){break}
          player.deck.push(this.cartes[index]);
          index++;
      }
  

    });
  

    this.currentTurn = 0;
    this.status = STATUS.START;

    this.Rwinner;
    this.Rdraw;

  }

  resolve(){

    let maxP = 0;
    let currentW = null;
    let drawP = [];

    this.playerList.forEach((player)=>{

      if(player.out){
        return;
      }
      
      let power = player.selected.power
      player.removeCard(player.selected);
      player.selected = null;

      if(power == maxP){

          drawP.push(player, currentW);
          currentW = null;
  
        }

      if(power > maxP){

        maxP = power;
        currentW = player;
        drawP = [];

      }
      
      

    });

    if(currentW != null){

      this.Rwinner = currentW;
      this.Rdraw = null;
      this.scoreboard[currentW.name]+=1;
      get_user_info(currentW.name).then((res) => {

        changeDataBase('roundWin',res.roundWin + 1,currentW.name);
    
      });

    } else {

      this.Rwinner = null;
      this.Rdraw = drawP;

    }
    
    return 0;

  }

  resolve_draw(){

      let maxP = 0;
      let currentW = null;
      let drawP = [];

      this.Rdraw.forEach((player)=>{

        if(player.out){
          return;
        }
          
          let power = player.selected.power
          player.removeCard(player.selected);
          player.selected = null;


          if(power == maxP){

              drawP.push(player, currentW);
              currentW = null;
  
          }

          if(power > maxP){

              maxP = power;
              currentW = player;
              drawP = [];

          }
    });
    
            if(currentW != null){

                this.Rwinner = currentW;
                this.Rdraw = null;
                this.scoreboard[currentW.name]+=1;
                get_user_info(currentW.name).then((res) => {

                  changeDataBase('roundWin',res.roundWin + 1,currentW.name);
              
                });
        
              } else {
        
                this.Rwinner = null;
                this.Rdraw = drawP;
        
              }

        
  }


  removePlayer(player){

    let playerI = findRemovePlayer(player,this.playerList);
    this.playerList.splice(playerI,1);
    this.scoreboard[player.name] = -1;

  }




}


 class Player{

  constructor(username,cookie){

    this.out = false;
    this.name = username;
    this.deck = [];
    this.selected = null;
    this.cookie = cookie;


    // pour le 6 qui prend 
    this.score = 0;

  }

  removeCard(card){

    let icard = findCard(card,this.deck);
    this.deck.splice(icard,1);

  }

}

 class Bataille_Card{

  constructor(symbole, number, power){

    this.symbole = symbole;
    this.number = number;
    this.power = power;

  }

}



//// LOBBY 

 class Player_IN_Lobby {

  constructor(username,cookie){

    this.username = username;
    this.cookie = cookie;
    this.isReady = false;
  }

}

class Lobby{

  constructor(serverName, nbPlayerMax, isPrivate, password, gameType, ID, owner){

    this.serverName = serverName;
    this.nbPlayerMax = nbPlayerMax;
    this.isPrivate = isPrivate;
    this.password = password;
    this.gameType = gameType;
    this.id = ID;
    this.playerList = [];
    this.owner = owner;
    this.tbt = 30;
    this.maxTurn = 20;

  }

}

// 6 QUI PREND 


class Carte6{

  constructor(numero, nb_boeuf){

    this.number = numero;
    this.nb_boeuf = nb_boeuf;

  }

}

function generate6Cartes(){

  let boeuf;
  let cartes = [];

  for(let i = 1;i<104;i++){

    boeuf = 1;
    if(i%11 == 0){

      boeuf += 4 ;

    }

    if(i%10 == 0){

      boeuf += 2

    }

    if(i%5 == 0 && i%10 != 0){

      boeuf += 1

    }

    cartes.push(new Carte6(i,boeuf));

  }

  return cartes;

}



class SixQuiPrend{

  constructor(id_partie, owner, player_list, chrono){

    this.identifiant_partie = id_partie;
    this.owner = owner;
    this.player_list = player_list;
    this.selected_cards = [];

    this.mChrono = chrono;
    this.Chrono = chrono;

    this.croupier();

    this.order = [];
    this.currentP = null;

    this.winner = null;

  }

  gagnant(){
    let al = false;

    this.player_list.forEach((elem) => {

      if(elem.score >= 20){

        al = true;

      }

    });

    return al;

  }

  Pgagant(){

    let less = this.player_list[0];

    this.player_list.forEach((elem) => {

      if(elem.score < less.score){

        less = elem;

      }

    });

    return less;

  }

  tousJouer(){

    let no = true;

    this.player_list.forEach((player) => {

      if(player.selected == null){

        no = false;

      }

    });

    return no;

  }

  tousPasJouer(){

    let no = true;

    this.player_list.forEach((player) => {

      if(player.selected != null){

        no = false;

      }

    });

    return no;

  }

  clearP(){

    this.player_list.forEach((player) => {

     player.selected = null;


    });


  } 


  GiveOrder(){

    const playersCopy = [...this.player_list];

    for (let i = 1; i < playersCopy.length; i++) {
      let j = i - 1;
      const temp = playersCopy[i];
      while (j >= 0 && playersCopy[j].selected.number > temp.selected.number) {
          playersCopy[j + 1] = playersCopy[j];
          j--;
      }
      playersCopy[j + 1] = temp;
  }
    
    this.order = playersCopy;
    return playersCopy;

  }


  nextP(){

    if(this.order.length == 0){
      return 0;
    }

    this.currentP = this.order.shift();

    return this.currentP;

  }

  play(row){


    let player = this.currentP;
    let card = player.selected;

    let crow;

    switch(row){

      case 1:
        crow = this.row1;
        break;
      case 2:
        crow = this.row2;
        break;
      case 3:
        crow = this.row3;
        break;
      case 4:
        crow = this.row4;
        break;

    }


    if(this.row1[this.row1.length-1].number > card.number && this.row2[this.row2.length-1].number > card.number && this.row3[this.row3.length-1].number > card.number && this.row4[this.row4.length-1].number > card.number){

      let sum = 0;
      crow.forEach(card => {

        sum+=card.nb_boeuf;

      });

      player.score+=sum;

      if(this.gagnant()){

        this.winner = this.Pgagant();
        this.status = STATUS.ENDED;
        return true;

      }

      this.affectRow(row,[card]);

      return true;

    }

    if(this.findValidRow(card.number) == row){

      crow.push(card);
      if(crow.length >= 6){

        let sum = 0;
        crow.forEach(card => {

          sum+=card.nb_boeuf;

        });

        player.score+=sum;

        if(this.gagnant()){

          this.winner = this.Pgagant();
          this.status = STATUS.ENDED;
          return true;
  
        }
        // VARIANTE : this.status = STATUS.WAITING_FOR_PLAYER_CARD;
        this.affectRow(row,[card]);
        // VARIANTE : this.croupier();

      }

      return true;

    }

    return false;





  }

  affectRow(row, value){

    switch(row){

      case 1:
        this.row1 = value;
        break;
      case 2:
        this.row2 = value;
        break;
      case 3:
        this.row3 = value;
        break;
      case 4:
        this.row4 = value;
        break;

    }

  }


  findValidRow(num){

    const r1 = this.row1[this.row1.length-1].number - num;
    const r2 = this.row2[this.row2.length-1].number - num;
    const r3 = this.row3[this.row3.length-1].number - num;
    const r4 = this.row4[this.row4.length-1].number - num;

    let minIndex;
    let minValue = 105;

    if(r1 < 0 && Math.abs(r1) < minValue){
  
      minValue = Math.abs(r1);
      minIndex = 1;
    }
    if(r2 < 0 && Math.abs(r2) < minValue){

      minValue = Math.abs(r2);
      minIndex = 2;
    }
    if(r3 < 0 && Math.abs(r3) < minValue){

      minValue = Math.abs(r3);
      minIndex = 3;
    }
    if(r4 < 0 && Math.abs(r4) < minValue){
 
      minValue = Math.abs(r4);
      minIndex = 4;
    }

    return minIndex;

  }



  croupier(){

    let cartes_a_distribuer = shuffle(generate6Cartes());

    // perdu a 66
  

    let k = 0;
    this.player_list.forEach((elem) => {

      elem.deck = [];

      for(let j = k;j<k+10;j++){
        elem.deck.push(cartes_a_distribuer[j]);
      }
      k+=10;

    });

    this.row1 = [cartes_a_distribuer[k]];
    this.row2 = [cartes_a_distribuer[k+1]];
    this.row3 = [cartes_a_distribuer[k+2]];
    this.row4 = [cartes_a_distribuer[k+3]];

  }

}

class Player6{

  constructor(name){

    this.name = name;
    this.deck = [];
    this.played = false;
    this.score = 0;

  }

}


module.exports = {
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
  SixQuiPrend

}