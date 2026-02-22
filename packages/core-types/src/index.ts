export const CORE_TYPES_VERSION = "@dynasty-os/core-types";

export interface Dynasty {
  id: string;
  name: string;
}

export interface Player {
  id: string;
  name: string;
  position: string;
  dynastyId: string;
}

export interface Season {
  id: string;
  year: number;
  dynastyId: string;
}
