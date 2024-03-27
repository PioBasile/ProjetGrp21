import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import './CSS/newLobby.css';
import socket from '../socketG';

const NewLobby = () => {

    socket.emit('join', sessionStorage.getItem('serverConnected'));
    sessionStorage.setItem('loaded', false);

    const [playerList, setPlayerList] = useState([]);

    const [owner, setOwner] = useState("");
    const [maxPlayers, setMaxPlayers] = useState(0);
    const [gameName, setGameName] = useState("")
    const [gameType, setGameType] = useState("")
    const [password, setPassword] = useState("")
    const [moneyBet, setMoneyBet] = useState(0);
    const [timer, setTimer] = useState(0)
    const [isReady, setIsReady] = useState(false);


    const [allReady, setAllReady] = useState(false)
    const [timeBetweenTurn, setTimeBetweenTurn] = useState(30);
    const [roundsMax, setRoundsMax] = useState(20);
    const navigate = useNavigate();
    const [clobby, setLobby] = useState({ playerList: [] });

    const quotes = [
        "At the end of the day, it's the friends we made along the way",
        "Gambling is not an addiction - OBAMA",
        "If a girl leaves you for another there is always her mother",
        "I'd rather have 1 medkit thant 10 bandages",
        "We will never ask you your Credit Card",
        "Liberté égalité Renault Coupé",
        "If she say your a looser you shall pick up her mother",
        "Pro Tips 1 : Always All-in ",
        "Pro Tips 2 : Don't forget to breath",
        "Pro Tips 3 : Don't loose",
        "Pro Tips 4 : We don't play to play we play to Win",
        "Pro Tips 5 : Don't stay in storm",
        "Pro Tips 6 : It's never about size",
        "Pro Tips 7 : SAM-SAM le plus petit des grands héros",
        "Pro Tips 8 : OUI-OUI est un garçon ?",
        "Pro Tips 9 : Oh la qui voit la inspecteur gadget",
        "Pro Tips 10 : Si tu perds Thomas Le Train te suivras !",
        "Send you credit card to this number : 0658073801",
        "Pickachu will always choose you ",
        "This is pay to win",
        "Always emote when your friend loose",
        "don't forget, jfk was shot by the cia",
        "FREE V-BUCKS",
        "Never back down never what ??",
        "NEVER GIVE UP !",
        "Maurice La Malice",
    ];

    const generateQuote = () => {
        let randomId = Math.round(Math.random() * quotes.length);
        let randomQuote = quotes[randomId]
        return randomQuote;
    }


    function leaveGame() {
        socket.emit('leaveGame', sessionStorage.getItem('name'), sessionStorage.getItem('serverConnected'));
        socket.emit('leave', sessionStorage.getItem('serverConnected'));
        navigate('/BrowserManager');
    };



    const handleKickPlayer = (index) => {
        socket.emit('deco_lobby', sessionStorage.getItem('serverConnected'), playerList[index].username);
    };

    const handleReadyClick = () => {
        if (isReady) setIsReady(false);
        else setIsReady(true)
        socket.emit('ready', sessionStorage.getItem('serverConnected'), sessionStorage.getItem('name'));
    };

    const handleStart = () => {

        let count = 0;
        clobby.playerList.forEach(player => {
            if (player.isReady) { count++; }
        });

        if (count === clobby.nbPlayerMax && clobby.owner === sessionStorage.getItem('name')) {
            setAllReady(true)
            setTimeout(() => {
                socket.emit("StartGame", sessionStorage.getItem('serverConnected'));
            }, "3000")
        };
    }

    useEffect(() => {

        if (sessionStorage.getItem('serverConnected') === "-1") {
            navigate("/BrowserManager");
        }

        socket.emit("getServ");
        socket.emit("lobbyInfo_UwU", sessionStorage.getItem('serverConnected'))

    }, [navigate])


    useEffect(() => {

        let mounted = true;
        if (mounted) {

            socket.on("yourInfoBebs", (data) => {

                console.log("test");

                switch (data.gameType) {
                    case "mb":
                        setGameType("Mille Bornes");
                        break
                    case "rd":
                        setGameType("Random");
                        break;
                    case "sqp":
                        setGameType("Six Qui Prend");
                        break;
                    case "batailleOuverte":
                        setGameType("Bataille Ouverte");
                        break;
                    default:
                        setGameType("unknow");
                        return;
                }

                setGameName(data.serverName);
                setMaxPlayers(data.nbPlayerMax);
                setOwner(data.owner);
                setPassword(data.password);
                setTimer(data.timer);
                setMoneyBet(data.moneyBet);
            });

            if (sessionStorage.getItem('loaded') === "true") { return; } else {
                socket.emit('WhereAmI', sessionStorage.getItem('serverConnected')); sessionStorage.setItem('loaded', true)
            }
            socket.on('here', (lobby) => {
                if (mounted) {
                    setLobby(lobby);
                    setPlayerList(lobby.playerList);
                    setMaxPlayers(lobby.nbPlayerMax);

                }


            });

            socket.on("lobbyParams", (maxPlayers, timeBetweenTurn, roundsMax) => {

                if (clobby.owner === sessionStorage.getItem('name')) {
                    return
                } else {
                    if (mounted) {
                        setMaxPlayers(maxPlayers);
                        setTimeBetweenTurn(timeBetweenTurn);
                        setRoundsMax(roundsMax);
                    }

                }


            });

            socket.on('disconected', (name) => {

                if (sessionStorage.getItem("name") === name) {
                    navigate('/BrowserManager');

                }

            });

            socket.on("start", (place) => {

                navigate(`/${place}`);

            });

        }


        return () => { mounted = false };

    }, []);

    return (
        <div className='NB-container'>
            <div className='UBwithUnderBandeau'>

                <div className='NB-upperBandeau'>
                    <div className='leaveLobbyButton' onClick={() => leaveGame()}>LEAVE</div>
                    <div className='gameNameType'>{gameName} ({gameType})</div>
                    <div></div>
                </div>
                <div className='NB-underBandeau'>
                    <div className='waitingPlayerTitle animated-ellipsis'> {` ${!allReady ? "WAITING FOR PLAYERS" : "GAME STARTING "}`}</div>
                    <div className='gameStat'>
                        <table>
                            <tbody>
                                <tr>
                                    <td className="table-title">Owner :</td>
                                    <td className="table-info">{owner}</td>
                                    <td className="table-title">maxPlayer :</td>
                                    <td className="table-info">{maxPlayers}</td>
                                </tr>
                                <tr>
                                    <td className="table-title">gameName :</td>
                                    <td className="table-info">{gameName}</td>
                                    <td className="table-title">gameType :</td>
                                    <td className="table-info">{gameType}</td>
                                </tr>
                                <tr>
                                    <td className="table-title">password :</td>
                                    <td className="table-info">{password ? password : "None"}</td>
                                    <td className="table-title">Timer :</td>
                                    <td className="table-info">{timer}</td>
                                </tr>
                                <tr>
                                    <td className="table-title">Argent Parié :</td>
                                    <td className="table-info">{moneyBet}$</td>
                                    <td className="table-title">Quote</td>
                                    <td className="table-info">{generateQuote()}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    <div className='bigReadyButton-container'>
                        <div className='bigReadyButton' onClick={handleReadyClick}>{!isReady ? "READY" : "UNREADY"} </div>
                        {clobby.owner === sessionStorage.getItem("name") && <div className='bigReadyButton' onClick={handleStart}>START </div>}
                    </div>
                </div>
            </div>

            <div className='NB-playerList'>
                {
                    playerList.map((player, index) => (
                        <div className='playerInList'>
                            <div className='playerInfoContainer'>
                                <div className='playerInfo'>{player.username + "   |   " + (player.isReady ? "Pret" : "Pas pret")} </div>
                                <div></div>
                                {clobby.owner === sessionStorage.getItem("name") && <div className='kickButton' onClick={() => handleKickPlayer(index)} disabled={player.username === sessionStorage.getItem('name') || clobby.owner !== sessionStorage.getItem('name')}>KICK</div>}
                            </div>
                        </div>
                    ))
                }
            </div>

        </div>
    )
}


export default NewLobby