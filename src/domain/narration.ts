export interface NarrationCue {
  text: string;
  start: number;
  end: number;
}

export interface NarrationAudio {
  audio: string;
  mimeType: "audio/wav";
  cues: NarrationCue[];
  timing: "aligned" | "estimated";
}

export interface SpokenWord {
  text: string;
  start: number;
  end: number;
}
