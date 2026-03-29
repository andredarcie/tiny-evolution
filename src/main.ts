import './style.css';
import './turn-style.css';
import { Game } from './game/Game';

const container = document.getElementById('game-container')!;
new Game(container);
