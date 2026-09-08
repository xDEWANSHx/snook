import React from 'react';
import type { Player } from '../types';
import { PlayerCard } from './PlayerCard';

interface PlayerCardsGridProps {
  players: Player[];
  activePlayerIndex: number;
  theme?: 'felt' | 'chalk';
}

export const PlayerCardsGrid: React.FC<PlayerCardsGridProps> = ({
  players,
  activePlayerIndex,
  theme = 'felt',
}) => {
  const getGridColsClass = () => {
    switch (players.length) {
      case 2:
        return 'grid-cols-2';
      case 3:
        return 'grid-cols-3';
      case 4:
        return 'grid-cols-2';
      case 5:
        return 'grid-cols-2 sm:grid-cols-3';
      case 6:
        return 'grid-cols-2 sm:grid-cols-3';
      default:
        return 'grid-cols-2';
    }
  };

  return (
    <section className="w-full">
      <div className={`grid gap-2 sm:gap-2.5 ${getGridColsClass()}`}>
        {players.map((player, idx) => (
          <PlayerCard
            key={player.id}
            player={player}
            isActive={idx === activePlayerIndex}
            playerIndex={idx}
            totalPlayers={players.length}
            theme={theme}
          />
        ))}
      </div>
    </section>
  );
};
