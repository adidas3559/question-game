export type Question = {
  id: string;
  question: string;
  answers: string[];
}

export type QuestionSet = {
  questions: Question[];
}

export type QuestionSets = Record<string, QuestionSet>;

export type QuestionAnswer = {
  questionId: string; // matches question id. Might not use this?
  question: string;
  yourResponse: string;
  theirResponse: string;
}

export type RoomState = {
  roomName: string;
  roomCode: string;
  hostId: string;
  players: PlayersState[];
  questionSet: QuestionSet | null;
}

export type PlayersState = {
  id: string,
  socketId: string,
  nickname: string,
  questionAnswers: QuestionAnswer[];
  finished: boolean;
}

export type RoomsRecord = Record<string, RoomState>;



// connection types
export type  APIResponse<T> =
  | { status: 'success'; data: T}
  | { status: 'error'; message: string };

export interface ClientToServerEvents {
  createRoom: (payload: { roomName: string; nickname: string }, callback: (response: APIResponse<{ playerId: string, roomName: string, roomCode: string, players: PlayersState[] }>) => void) => void;
  joinRoom: (payload: { roomCode: string, nickname: string }, callback: (response: APIResponse<{ playerId: string, roomName: string, roomCode: string, players: PlayersState[]}>) => void) => void;
  goToQuestionSets: (payload: { roomCode: string, playerId: string })=> void;
  startGame: (payload: { roomCode: string, questionSet: QuestionSet, playerId: string }) => void;
  finishGame: (paylod: { roomCode: string, playerId: string, questionAnswers: QuestionAnswer[] }, callback: (response: APIResponse<{ message: string }>) => void) => void;
  seeResults: (paylod: { roomCode: string, playerId: string }, callback: (response: APIResponse<{ message: string }>) => void) => void;
  rejoinLobby: (payload: { roomCode: string, playerId: string }, callback: (response: APIResponse<{ roomName: string, players: PlayersState[]}>) => void) => void;
}

export interface ServerToClientEvents {
  lobbyUpdated: (payload: { room: RoomState, playerId: string, nickname: string}) => void;
  gameStarted: (payload: { questionSet: QuestionSet }) => void;
  goToQuestionSets: (payload: { questionSets: QuestionSets }) => void;
  gameFinished: (payload: { players: PlayersState[], questionSet: QuestionSet }) => void;
  goToResults: (payload: { players: PlayersState[] }) => void;
  error: (payload: { message: string }) => void;
  // rejoinLobby: (payload: { roomCode: string, playerId: string }) => void;
}

