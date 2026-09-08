import React, { useState } from 'react';
import { useSnookerGame } from './hooks/useSnookerGame';
import { TopBar } from './components/TopBar';
import { PlayerCardsGrid } from './components/PlayerCardsGrid';
import { BallControls } from './components/BallControls';
import { SetupModal } from './components/SetupModal';
import { EndGameModal } from './components/EndGameModal';
import { HistoryDrawer } from './components/HistoryDrawer';
import { ConfigModal } from './components/ConfigModal';

export const App: React.FC = () => {
  const {
    state,
    canUndo,
    canRedo,
    addPoints,
    applyFoul,
    nextPlayer,
    undo,
    redo,
    startNewGame,
    toggleDoubleTapMode,
  } = useSnookerGame();

  // Modals state
  const [isSetupOpen, setIsSetupOpen] = useState(false);
  const [isEndGameOpen, setIsEndGameOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [, setConfigRefreshKey] = useState(0);

  const nextPlayerIndex = (state.activePlayerIndex + 1) % state.players.length;
  const nextPlayerName = state.players[nextPlayerIndex]?.name || 'Next';

  const handleStartNewGame = (names: string[]) => {
    startNewGame(names);
    setIsSetupOpen(false);
  };

  return (
    <div className="min-h-screen bg-noise text-stone-900 flex flex-col justify-between selection:bg-emerald-200">
      {/* 1. Sticky Top Bar: Match timer, turn counter, undo, redo, settings, end game */}
      <TopBar
        matchStartTime={state.matchStartTime}
        turnCount={state.turnCount}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={undo}
        onRedo={redo}
        onEndGameClick={() => setIsEndGameOpen(true)}
        onOpenHistory={() => setIsHistoryOpen(true)}
        onOpenSettings={() => setIsConfigOpen(true)}
        onNewGameClick={() => setIsSetupOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col justify-between max-w-xl mx-auto w-full py-1">
        {/* 2. Middle Area: Player Cards Grid (Active player prominently enlarged with glowing border) */}
        <div className="flex-1 flex flex-col justify-center">
          <PlayerCardsGrid
            players={state.players}
            activePlayerIndex={state.activePlayerIndex}
            onSelectPlayer={() => {
              // Direct player selection allowed
            }}
          />
        </div>

        {/* 3. Bottom Thumb Zone: Snooker Balls, Foul Section, and Giant "Turn Over" Button */}
        <BallControls
          onAddPoints={addPoints}
          onApplyFoul={applyFoul}
          onNextPlayer={nextPlayer}
          nextPlayerName={nextPlayerName}
          doubleTapMode={state.doubleTapMode}
          onToggleDoubleTap={toggleDoubleTapMode}
        />
      </main>

      {/* Modal Dialogs */}
      <SetupModal
        isOpen={isSetupOpen}
        onClose={() => setIsSetupOpen(false)}
        onStartGame={handleStartNewGame}
        initialPlayerNames={state.players.map(p => p.name)}
      />

      <EndGameModal
        isOpen={isEndGameOpen}
        onClose={() => setIsEndGameOpen(false)}
        players={state.players}
        matchStartTime={state.matchStartTime}
        onNewGame={() => setIsSetupOpen(true)}
        onOpenHistory={() => setIsHistoryOpen(true)}
      />

      <HistoryDrawer
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
      />

      <ConfigModal
        isOpen={isConfigOpen}
        onClose={() => setIsConfigOpen(false)}
        onConfigSaved={() => setConfigRefreshKey(prev => prev + 1)}
      />
    </div>
  );
};

export default App;
