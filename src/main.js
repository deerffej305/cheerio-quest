import Phaser from 'phaser';
import BootScene from './scenes/BootScene.js';
import TitleScene from './scenes/TitleScene.js';
import GameModeScene from './scenes/GameModeScene.js';
import QuizScene from './scenes/QuizScene.js';
import LeaderboardScene from './scenes/LeaderboardScene.js';

export const GAME_WIDTH = 1280;
export const GAME_HEIGHT = 720;

const config = {
  type: Phaser.AUTO,
  parent: 'game',
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: '#1a1020',
  pixelArt: false,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 1400 },
      debug: false,
    },
  },
  scene: [BootScene, TitleScene, GameModeScene, QuizScene, LeaderboardScene],
};

const game = new Phaser.Game(config);
// Expose the game in dev for the preview console to introspect scenes.
if (import.meta.env.DEV) window.__game = game;
