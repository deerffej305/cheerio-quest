import Phaser from 'phaser';

export default class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload() {
    // Real assets land here in a later phase. Nothing to load yet.
  }

  create() {
    this.scene.start('Title');
  }
}
