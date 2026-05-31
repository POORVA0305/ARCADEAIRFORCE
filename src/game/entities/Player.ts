export class Player {
  x:number;
  y:number;

  health:number;
  speed:number;

  constructor() {
    this.x = 0;
    this.y = 0;

    this.health = 100;
    this.speed = 5;
  }
}