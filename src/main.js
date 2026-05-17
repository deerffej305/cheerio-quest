import Phaser from 'phaser';
import BootScene from './scenes/BootScene.js';
import TitleScene from './scenes/TitleScene.js';
import GameModeScene from './scenes/GameModeScene.js';
import RoomMouth from './scenes/RoomMouth.js';
import RoomEsophagus from './scenes/RoomEsophagus.js';
import RoomStomach from './scenes/RoomStomach.js';
import RoomSmallIntestine from './scenes/RoomSmallIntestine.js';
import RoomLargeIntestine from './scenes/RoomLargeIntestine.js';
import RoomAnus from './scenes/RoomAnus.js';
import CutsceneScene from './scenes/CutsceneScene.js';
import QuizArcadeScene from './scenes/QuizArcadeScene.js';
import PauseScene from './scenes/PauseScene.js';
import HudScene from './scenes/HudScene.js';
import QuizScene from './scenes/QuizScene.js';
import LeaderboardScene from './scenes/LeaderboardScene.js';
import CheatScene from './scenes/CheatScene.js';
import { GAME_WIDTH, GAME_HEIGHT } from './constants.js';

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
  // Use setTimeout instead of requestAnimationFrame so the game keeps
  // ticking when the preview iframe is backgrounded (RAF is throttled
  // by the browser in hidden tabs). No visual impact when foregrounded.
  fps: {
    forceSetTimeOut: true,
    target: 60,
  },
  scene: [BootScene, TitleScene, GameModeScene, RoomMouth, RoomEsophagus, RoomStomach, RoomSmallIntestine, RoomLargeIntestine, RoomAnus, CutsceneScene, QuizArcadeScene, HudScene, QuizScene, LeaderboardScene, PauseScene, CheatScene],
};

const game = new Phaser.Game(config);
// Expose the game in dev for the preview console to introspect scenes.
if (import.meta.env.DEV) window.__game = game;
