import React from 'react';
import type { Player } from '../types';
import { PlayerCard } from './PlayerCard';

interface PlayerCardsGridProps {
  players: Player[];
  activePlayerIndex: number;
  onSelectPlayer: (index: number) => void;
}

export const PlayerCardsGrid: React.FC<PlayerCardsGridProps> = ({
  players,
  activePlayerIndex,
  onSelectPlayer,
}) => {
  const getGridColsClass = () => {
    switch (players.length) {
      case 2:
        return 'grid-cols-2';
      case 3:
        return 'grid-cols-2 sm:grid-cols-3';
      case 4:
        return 'grid-cols-2';
      default:
        return 'grid-cols-2';
    }
  };

  return (
    <section className="w-full max-w-xl mx-auto px-3 py-2 sm:px-4">
      <div className={`grid gap-2.5 sm:gap-3.5 ${getGridColsClass()}`}>
        {players.map((player, idx) => (
          <PlayerCard
            key={player.id}
            player={player}
            isActive={idx === activePlayerIndex}
            playerIndex={idx}
            totalPlayers={players.length}
            onSelectPlayer={() => onSelectPlayer(idx)}
          />
        ))}
      </div>
    </section>
  );
};
