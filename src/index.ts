// RunJumpSki main entry point
import './styles/main.css';

console.log('RunJumpSki initializing...');

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM ready!');

    // Animate the loading bar
    const loadingBarFill = document.querySelector('.loadingBarFill') as HTMLElement;
    if (loadingBarFill) {
        loadingBarFill.style.width = '100%';
    }

    // Initialize the game engine here (future implementation)
    // import { GameEngine } from './core/engine';
    // const engine = new GameEngine('gameCanvas');
    // engine.initialize();

    // For now, simulate loading and hide the loading screen after a delay
    setTimeout(() => {
        const loadingScreen = document.getElementById('loadingScreen');
        if (loadingScreen) {
            loadingScreen.style.opacity = '0';
            loadingScreen.style.transition = 'opacity 0.5s';
            setTimeout(() => {
                loadingScreen.style.display = 'none';
            }, 500);
        }
    }, 1500);
});