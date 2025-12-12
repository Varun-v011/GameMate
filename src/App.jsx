// src/App.jsx
import React, { useState } from "react";
import './App.css'
import Landing from "./Components/Landing";
import Setup from "./Components/Setup";
import Home from "./Home";
import Rummyscore from "./Components/RummyScore";
import KempTeams from "./Components/Kemp";
import Poker from "./Components/Poker";
import MonopolyScore from "./Components/monopoly";

function App() {
  // 'landing' | 'home' | 'rummy-setup' | 'rummy' | 'poker' | 'monopoly' | 'kemp' | 'tournament'
  const [screen, setScreen] = useState("home");

  if (screen === "landing") {
    return (
      <Landing
        onGoToSetup={() => setScreen("rummy-setup")}
        onGoToHome={() => setScreen("home")}
      />
    );
  }

  if (screen === "home") {
    return (
      <Home
        onGoRummy={() => setScreen("rummy")}
        onGoPoker={() => setScreen("poker")}
        onGoMonopoly={() => setScreen("monopoly")}
        onGoKemp={() => setScreen("kemp")}
        onGoTournament={() => setScreen("tournament")}
        onGoToSetup={()=> setScreen("rummy-setup")}
      />
    );
  }

  if (screen === "rummy-setup") {
    return <Setup onDone={() => setScreen("home")} />;
  }

  if (screen === "rummy") {
    return (
      <Rummyscore
        onBack={() => setScreen("home")}
      />
    );
  }

  if (screen === "kemp") {
    return <KempTeams 
    onBack={() => setScreen("home")}/>;
  }

  // placeholders for now
  if (screen === "poker") {
  return <Poker 
    onBack={() => setScreen("home")}/>;
}
  if (screen === "monopoly") {
    return < MonopolyScore 
    onBack={() => setScreen("home")}/>;
  }
  if (screen === "tournament") return <div>Tournament (coming soon)</div>;

  return null;
}

export default App;
