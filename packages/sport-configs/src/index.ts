export const SPORT_CONFIGS_VERSION = "@dynasty-os/sport-configs";

export type SportType = "CFB" | "Madden";

export interface SportConfig {
  id: SportType;
  name: string;
  description: string;
}

export const CFB_CONFIG: SportConfig = {
  id: "CFB",
  name: "College Football",
  description: "EA College Football dynasty mode",
};

export const MADDEN_CONFIG: SportConfig = {
  id: "Madden",
  name: "Madden NFL",
  description: "Madden NFL franchise mode",
};
