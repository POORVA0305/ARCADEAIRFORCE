export class Player {
  x: number;
  y: number;

  width: number;
  height: number;

  health: number;
  speed: number;

  constructor() {
    this.x = 150;
    this.y = 500;

    this.width = 80;
    this.height = 80;

    this.health = 100;
    this.speed = 5;
  }

  move(newX: number, newY: number) {
    this.x = newX;
    this.y = newY;
  }
}