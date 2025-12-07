import { Routes, Route } from 'react-router-dom'
import './App.css'

// Screens
import LobbyScreen from '@/components/screens/LobbyScreen'
import RoomScreen from '@/components/screens/RoomScreen'
import MultiplayerGameScreen from '@/components/screens/MultiplayerGameScreen'
import ArenaTestScreen from '@/components/screens/ArenaTestScreen'

function App() {
  return (
    <div className="app-container">
      <div className="game-viewport">
        <Routes>
          <Route path="/" element={<LobbyScreen />} />
          <Route path="/room/:roomCode" element={<RoomScreen />} />
          <Route path="/game/:roomCode" element={<MultiplayerGameScreen />} />
          <Route path="/arena-test" element={<ArenaTestScreen />} />
        </Routes>
      </div>
    </div>
  )
}

export default App
