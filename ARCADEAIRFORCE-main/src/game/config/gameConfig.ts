import { Dimensions } from "react-native";

const { width, height } = Dimensions.get("window");

export const GAME_CONFIG = {
  SCREEN_WIDTH: width,
  SCREEN_HEIGHT: height,

  PLAYER_WIDTH: 80,
  PLAYER_HEIGHT: 80,

  PLAYER_HEALTH: 100,
};