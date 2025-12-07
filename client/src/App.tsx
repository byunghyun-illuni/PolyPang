import { Routes, Route } from 'react-router-dom'
import './App.css'

// Screens
import HomeScreen from '@/components/screens/HomeScreen'
import ArenaTestScreen from '@/components/screens/ArenaTestScreen'
// import LobbyScreen from '@/components/screens/LobbyScreen'
// import GameScreen from '@/components/screens/GameScreen'
// import SpectatorScreen from '@/components/screens/SpectatorScreen'
// import ResultScreen from '@/components/screens/ResultScreen'

function App() {
  return (
    <div className="app-container">
      <div className="game-viewport">
        <Routes>
          <Route path="/" element={<HomeScreen />} />
          <Route path="/arena-test" element={<ArenaTestScreen />} />
          {/* <Route path="/lobby/:roomCode" element={<LobbyScreen />} />
          <Route path="/game/:roomCode" element={<GameScreen />} />
          <Route path="/spectator/:roomCode" element={<SpectatorScreen />} />
          <Route path="/result/:roomCode" element={<ResultScreen />} /> */}
        </Routes>
      </div>
    </div>
  )
}

export default App
