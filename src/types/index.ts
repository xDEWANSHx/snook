export interface Player {
  id: string;
  name: string;
  score: number;
  currentBreak: number;
}

export type NextBallType = 'RED' | 'COLOR' | 'COLOR_SEQUENCE';

export interface GameState {
  players: Player[];
  activePlayerIndex: number;
  turnCount: number;
  matchStartTime: number; // Unix timestamp
  isGameOver: boolean;
  doubleTapMode: boolean; // default: true
  redsRemaining: number; // starts at 15
  nextBallType: NextBallType; // 'RED' | 'COLOR' | 'COLOR_SEQUENCE'
  colorSequenceIndex: number; // 0=Yellow, 1=Green, 2=Brown, 3=Blue, 4=Pink, 5=Black
}

export interface ActionHistoryEntry {
  state: GameState;
  actionDescription: string;
  timestamp: number;
}

export interface PlayerRankResult {
  playerId: string;
  playerName: string;
  finalScore: number;
  rank: number;
  isTie: boolean;
}

export interface MatchPlayerRecord {
  id?: string;
  match_id?: string;
  player_name: string;
  final_score: number;
  rank: number;
}

export interface MatchRecord {
  id: string;
  created_at: string;
  player_count: number;
  winner_names: string[];
  duration_seconds: number;
  match_players?: MatchPlayerRecord[];
}

export interface Ball {
  name: string;
  points: number;
  colorClass: string;
  label: string;
}

export const SNOOKER_BALLS: Ball[] = [
  { name: 'Red', points: 1, colorClass: 'ball-red', label: '+1' },
  { name: 'Yellow', points: 2, colorClass: 'ball-yellow', label: '+2' },
  { name: 'Green', points: 3, colorClass: 'ball-green', label: '+3' },
  { name: 'Brown', points: 4, colorClass: 'ball-brown', label: '+4' },
  { name: 'Blue', points: 5, colorClass: 'ball-blue', label: '+5' },
  { name: 'Pink', points: 6, colorClass: 'ball-pink', label: '+6' },
  { name: 'Black', points: 7, colorClass: 'ball-black', label: '+7' },
];

export const FOUL_OPTIONS = [
  { points: 0, label: 'Miss (0)' },
  { points: -2, label: '-2' },
  { points: -3, label: '-3' },
  { points: -4, label: '-4' },
  { points: -5, label: '-5' },
  { points: -6, label: '-6' },
  { points: -7, label: '-7' },
];
