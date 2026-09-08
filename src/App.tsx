import React, { useState } from 'react';
import { useSnookerGame } from './hooks/useSnookerGame';
import { TopBar } from './components/TopBar';
import { PlayerCardsGrid } from './components/PlayerCardsGrid';
import { BallControls } from './components/BallControls';
import { SetupModal } from './components/SetupModal';
import { EndGameModal } from './components/EndGameModal';
import { HistoryDrawer } from './components/HistoryDrawer';
import { RoomModal } from './components/RoomModal';
import { ConfirmActionModal } from './components/ConfirmActionModal';
import { LandingView } from './components/LandingView';
import { CompletedFrameView } from './components/CompletedFrameView';

export const App: React.FC = () => {
  const {
    state,
    roomCode,
    hasActiveMatch,
    realtimeStatus,
    setRoomCode,
    exitToLanding,
    canUndo,
    canRedo,
    addPoints,
    applyFoul,
    nextPlayer,
    undo,
    redo,
    lastUndoDescription,
    lastRedoDescription,
    startNewGame,
    toggleDoubleTapMode,
    setGameOver,
  } = useSnookerGame();

  // Background Theme: 'felt' (rich tournament table) vs 'chalk' (warm vintage parchment)
  const [theme, setTheme] = useState<'felt' | 'chalk'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('snooker_theme') as 'felt' | 'chalk') || 'felt';
    }
    return 'felt';
  });

  const toggleTheme = () => {
    setTheme(prev => {
      const next = prev === 'felt' ? 'chalk' : 'felt';
      if (typeof window !== 'undefined') {
        localStorage.setItem('snooker_theme', next);
      }
      return next;
    });
  };

  // Modals state
  const [isSetupOpen, setIsSetupOpen] = useState(false);
  const [isEndGameOpen, setIsEndGameOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isRoomOpen, setIsRoomOpen] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    type: 'undo' | 'redo';
    description: string;
  }>({
    isOpen: false,
    type: 'undo',
    description: '',
  });

  const nextPlayerIndex = (state.activePlayerIndex + 1) % state.players.length;
  const nextPlayerName = state.players[nextPlayerIndex]?.name || 'Next';

  const handleStartNewGame = (names: string[]) => {
    startNewGame(names);
    setIsSetupOpen(false);
  };

  const handleRequestUndo = () => {
    if (!canUndo) return;
    setConfirmModal({
      isOpen: true,
      type: 'undo',
      description: lastUndoDescription || 'Previous shot',
    });
  };

  const handleRequestRedo = () => {
    if (!canRedo) return;
    setConfirmModal({
      isOpen: true,
      type: 'redo',
      description: lastRedoDescription || 'Next action',
    });
  };

  const handleConfirmAction = () => {
    if (confirmModal.type === 'undo') {
      undo();
    } else {
      redo();
    }
  };

  return (
    <div
      className={`min-h-screen flex flex-col justify-start transition-colors duration-300 selection:bg-emerald-300 relative ${
        theme === 'felt' ? 'theme-felt' : 'theme-chalk'
      }`}
    >
      {/* 1. Sticky Top Bar */}
      <TopBar
        matchStartTime={state.matchStartTime}
        turnCount={state.turnCount}
        roomCode={roomCode}
        realtimeStatus={realtimeStatus}
        canUndo={canUndo}
        canRedo={canRedo}
        theme={theme}
        isGameOver={state.isGameOver}
        onToggleTheme={toggleTheme}
        onUndo={handleRequestUndo}
        onRedo={handleRequestRedo}
        onEndGameClick={() => setIsEndGameOpen(true)}
        onOpenHistory={() => setIsHistoryOpen(true)}
        onNewGameClick={() => setIsSetupOpen(true)}
        onOpenRoom={() => setIsRoomOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-xl mx-auto w-full px-3 py-2.5 sm:px-4 flex flex-col gap-2.5 sm:gap-3 justify-start relative z-10">
        {!hasActiveMatch ? (
          /* Landing Screen: Ask for player names first before table assignment */
          <LandingView
            theme={theme}
            onStartMatch={handleStartNewGame}
            onJoinRoom={setRoomCode}
            onOpenHistory={() => setIsHistoryOpen(true)}
          />
        ) : (
          /* Active Match / Scoreboard */
          <>
            {/* 2. Player Cards Grid (Display only, non-clickable, turn advances via Turn Over button) */}
            <PlayerCardsGrid
              players={state.players}
              activePlayerIndex={state.activePlayerIndex}
              theme={theme}
            />

            {/* 3. Conditional view: Completed Frame Leaderboard OR Live Ball Controls */}
            {state.isGameOver ? (
              <CompletedFrameView
                players={state.players}
                roomCode={roomCode}
                theme={theme}
                onStartNewFrame={() => setIsSetupOpen(true)}
                onOpenHistory={() => setIsHistoryOpen(true)}
                onRedirectToLanding={exitToLanding}
              />
            ) : (
              <BallControls
                theme={theme}
                onAddPoints={addPoints}
                onApplyFoul={applyFoul}
                onNextPlayer={nextPlayer}
                nextPlayerName={nextPlayerName}
                doubleTapMode={state.doubleTapMode}
                onToggleDoubleTap={toggleDoubleTapMode}
                redsRemaining={state.redsRemaining}
                nextBallType={state.nextBallType}
                colorSequenceIndex={state.colorSequenceIndex}
              />
            )}
          </>
        )}
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
        onConfirmGameOver={() => setGameOver(true)}
        onRedirectToLanding={exitToLanding}
      />

      <HistoryDrawer
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
      />

      <RoomModal
        isOpen={isRoomOpen}
        onClose={() => setIsRoomOpen(false)}
        roomCode={roomCode}
        onSwitchRoom={setRoomCode}
        realtimeStatus={realtimeStatus}
      />

      <ConfirmActionModal
        isOpen={confirmModal.isOpen}
        type={confirmModal.type}
        actionDescription={confirmModal.description}
        onConfirm={handleConfirmAction}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};

export default App;
