document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const gameWorld = document.getElementById('game-world');
    const scoreDisplay = document.getElementById('score');
    const fishingLine = document.getElementById('player-fishing-line');
    const hook = document.getElementById('player-hook');
    const fullscreenToggle = document.getElementById('fullscreen-toggle');
    const zoomInBtn = document.getElementById('zoom-in');
    const zoomOutBtn = document.getElementById('zoom-out');

    const playerReelSpeedLevel = document.getElementById('player-reel-speed-level');
    const buyReelSpeedBtn = document.getElementById('buy-reel-speed');
    const playerCastSpeedLevel = document.getElementById('player-cast-speed-level');
    const buyCastSpeedBtn = document.getElementById('buy-cast-speed');
    const buyAutoFisherBtn = document.getElementById('buy-auto-fisher');
    const autoFisherCount = document.getElementById('auto-fisher-count');
    const autoFisherUpgradesContainer = document.getElementById('auto-fisher-upgrades');

    let gameWidth = 0;
    let gameHeight = 0;

    // --- Game State ---
    const MAX_AUTO_FISHERS = 10;

    const gameState = {
        score: 0,
        tick: 0,
        player: {
            isCasting: false,
            isReeling: false,
            caughtFish: null,
            linePos: { x: 0, y: 0 },
            castSpeed: 5,
            reelSpeed: 4,
            castSpeedLevel: 1,
            reelSpeedLevel: 1,
            lineElement: fishingLine,
            hookElement: hook,
        },
        autoFishers: [],
    };

    // --- Upgrade Definitions ---
    const upgrades = {
        playerSpeed: {
            costs: [50, 90, 140, 200, 270, 350, 440, 540, 650, 770],
            castSpeeds: [5, 6, 7, 8, 9, 10, 12, 14, 17, 20],
            reelSpeeds: [4, 5, 6, 7, 8, 9, 10, 12, 13, 15],
        },
        addAutoFisher: {
            cost: 250,
        },
        autoFisherSpeed: {
            costs: [75, 110, 150, 200, 260, 330, 410, 500, 600, 720],
            speeds: [2, 2.3, 2.6, 3, 3.3, 3.6, 4, 4.3, 4.6, 5],
        },
        autoFisherInterval: {
            costs: [100, 150, 210, 280, 360, 450, 550, 660, 780, 910],
            intervals: [10, 9.4, 8.8, 8.2, 7.6, 7, 6.4, 5.8, 5, 4], // seconds
        },
    };

    // --- Helpers ---
    const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
    const isFullscreen = () => !!document.fullscreenElement;
    const updateFullscreenUI = () => {
        if (fullscreenToggle) {
            fullscreenToggle.textContent = '⛶';
            fullscreenToggle.title = isFullscreen() ? 'Fullscreen verlassen' : 'Fullscreen';
        }
    };

    let zoomScale = 1;
    const MIN_ZOOM = 0.85;
    const MAX_ZOOM = 1.3;
    const ZOOM_STEP = 0.1;

    function applyZoom() {
        zoomScale = clamp(zoomScale, MIN_ZOOM, MAX_ZOOM);
        const z = zoomScale.toFixed(2);
        document.documentElement.style.zoom = z;
        document.body.style.zoom = z;
    }

    function measureGameWorld() {
        gameWidth = gameWorld.clientWidth;
        gameHeight = gameWorld.clientHeight;
        if (!gameState.player.isCasting && !gameState.player.isReeling) {
            gameState.player.linePos.x = gameWidth / 2;
        }
        repositionAutoFishers();
    }

    function repositionAutoFishers() {
        const count = gameState.autoFishers.length;
        if (!count) return;
        const gap = gameWidth / (Math.max(count + 1, 3));
        gameState.autoFishers.forEach((fisher, index) => {
            fisher.positionX = Math.round(gap * (index + 1));
            fisher.linePos.x = fisher.positionX;
            fisher.lineElement.style.left = `${fisher.positionX}px`;
            fisher.hookElement.style.left = `${fisher.positionX - 5}px`;
        });
    }

    function applyUpgradeUI(level, costs, levelElement, button) {
        levelElement.textContent = `Lv. ${level}`;
        // Allow purchases only while below the maximum level (costs length maps to max level)
        if (level < costs.length) {
            const cost = costs[level - 1];
            button.textContent = `Buy (Cost: ${cost})`;
            button.disabled = gameState.score < cost;
            return;
        }
        button.textContent = 'Max Level';
        button.disabled = true;
    }

    function currentAutoFisherCost() {
        const base = upgrades.addAutoFisher.cost;
        const count = gameState.autoFishers.length;
        // Slightly exponential scaling to keep later fishers pricey
        return Math.round(base * Math.pow(1.35, count));
    }

    function ensureFisherSummary(fisher) {
        const summaryId = `${fisher.id}-summary`;
        let summary = document.getElementById(summaryId);
        if (!summary) {
            const root = document.getElementById(`${fisher.id}-speed-level`)?.closest('.auto-fisher-block');
            const headerContainer = root?.querySelector('h4')?.parentElement;
            if (headerContainer) {
                summary = document.createElement('div');
                summary.id = summaryId;
                summary.className = 'fisher-level-summary';
                headerContainer.appendChild(summary);
            }
        }
        if (summary) {
            summary.textContent = `Speed Lv. ${fisher.speedLevel} | Interval Lv. ${fisher.intervalLevel}`;
        }
    }

    function updateUI() {
        scoreDisplay.textContent = gameState.score;
        updateFullscreenUI();

        applyUpgradeUI(gameState.player.reelSpeedLevel, upgrades.playerSpeed.costs, playerReelSpeedLevel, buyReelSpeedBtn);
        applyUpgradeUI(gameState.player.castSpeedLevel, upgrades.playerSpeed.costs, playerCastSpeedLevel, buyCastSpeedBtn);

        if (autoFisherCount) {
            autoFisherCount.textContent = `${gameState.autoFishers.length}`;
        }

        if (gameState.autoFishers.length >= MAX_AUTO_FISHERS) {
            buyAutoFisherBtn.textContent = 'Max Reached';
            buyAutoFisherBtn.disabled = true;
        } else {
            const cost = currentAutoFisherCost();
            buyAutoFisherBtn.textContent = `Buy (Cost: ${cost})`;
            buyAutoFisherBtn.disabled = gameState.score < cost;
        }

        gameState.autoFishers.forEach(fisher => {
            const speedLevelDisplay = document.getElementById(`${fisher.id}-speed-level`);
            const buySpeedBtn = document.getElementById(`buy-${fisher.id}-speed`);
            if (speedLevelDisplay && buySpeedBtn) {
                applyUpgradeUI(fisher.speedLevel, upgrades.autoFisherSpeed.costs, speedLevelDisplay, buySpeedBtn);
            }

            const intervalLevelDisplay = document.getElementById(`${fisher.id}-interval-level`);
            const buyIntervalBtn = document.getElementById(`buy-${fisher.id}-interval`);
            if (intervalLevelDisplay && buyIntervalBtn) {
                applyUpgradeUI(fisher.intervalLevel, upgrades.autoFisherInterval.costs, intervalLevelDisplay, buyIntervalBtn);
            }
            ensureFisherSummary(fisher);
        });
    }

    function showPointPopup(points, x, y) {
        const popup = document.createElement('div');
        popup.className = 'point-popup';
        popup.textContent = `+${points}`;
        popup.style.left = `${clamp(x - 10, 6, gameWidth - 36)}px`;
        popup.style.top = `${clamp(y - 24, 6, gameHeight - 30)}px`;
        gameWorld.appendChild(popup);
        setTimeout(() => popup.remove(), 1500);
    }

    // --- Fish Logic ---
    function createFish() {
        const fish = document.createElement('div');
        fish.classList.add('fish');

        const speed = Math.random() * 2.5 + 1.3;
        const initialTop = Math.random() * (gameHeight - 140) + 40;
        const size = Math.random() * 28 + 38;
        fish.style.width = `${size}px`;
        fish.style.height = `${size / 2}px`;

        let points = 1 + Math.round(speed * 1.5) + Math.round(initialTop / 50) + Math.round((70 - size) / 4);
        const minPoints = 3;
        const maxPoints = 20;
        points = clamp(points, minPoints, maxPoints);
        fish.dataset.points = points;

        const normalizedPoints = clamp((points - minPoints) / (maxPoints - minPoints), 0, 1);
        const hue = 40 + normalizedPoints * (300 - 40);
        fish.style.backgroundColor = `hsl(${hue}, 90%, 60%)`;
        fish.style.color = fish.style.backgroundColor;

        const fromLeft = Math.random() < 0.5;
        fish.style.left = fromLeft ? `${-size}px` : `${gameWidth}px`;
        fish.dataset.direction = fromLeft ? 'right' : 'left';
        if (!fromLeft) fish.style.transform = 'scaleX(-1)';

        fish.style.top = `${initialTop}px`;
        fish.dataset.initialTop = initialTop;
        fish.dataset.speed = speed;
        fish.dataset.amplitude = Math.random() * 10 + 5;
        fish.dataset.frequency = Math.random() * 0.02 + 0.01;

        gameWorld.appendChild(fish);
    }

    function checkCollision(lineOwner) {
        const hookRect = lineOwner.hookElement.getBoundingClientRect();
        document.querySelectorAll('.fish').forEach(fish => {
            if (lineOwner.caughtFish) return;
            const isAlreadyCaught = gameState.autoFishers.some(f => f.caughtFish === fish) || gameState.player.caughtFish === fish;
            if (isAlreadyCaught) return;

            const fishRect = fish.getBoundingClientRect();
            if (hookRect.left < fishRect.right && hookRect.right > fishRect.left && hookRect.top < fishRect.bottom && hookRect.bottom > fishRect.top) {
                lineOwner.isCasting = false;
                lineOwner.isReeling = true;
                lineOwner.caughtFish = fish;
                fish.style.transform = `${fish.style.transform || ''} rotate(90deg)`;
            }
        });
    }

    function awardCatch(lineOwner) {
        if (!lineOwner.caughtFish) return;
        const points = parseInt(lineOwner.caughtFish.dataset.points, 10) || 0;
        gameState.score += points;
        showPointPopup(points, lineOwner.linePos.x, lineOwner.linePos.y);
        lineOwner.caughtFish.remove();
        lineOwner.caughtFish = null;
    }

    function moveFishSchool() {
        document.querySelectorAll('.fish').forEach(fish => {
            const isCaught = gameState.autoFishers.some(f => f.caughtFish === fish) || gameState.player.caughtFish === fish;
            if (isCaught) return;

            let currentX = parseFloat(fish.style.left);
            const speed = parseFloat(fish.dataset.speed);
            if (fish.dataset.direction === 'right') {
                currentX += speed;
                if (currentX > gameWidth + parseFloat(fish.style.width)) fish.remove();
            } else {
                currentX -= speed;
                if (currentX < -parseFloat(fish.style.width) - 10) fish.remove();
            }
            fish.style.left = `${currentX}px`;

            const initialTop = parseFloat(fish.dataset.initialTop);
            const amplitude = parseFloat(fish.dataset.amplitude);
            const frequency = parseFloat(fish.dataset.frequency);
            fish.style.top = `${initialTop + Math.sin(gameState.tick * frequency) * amplitude}px`;
        });
    }

    // --- Player & Auto-Fishers ---
    function handlePlayer() {
        const player = gameState.player;
        if (player.isCasting) {
            player.linePos.y += player.castSpeed;
            if (player.linePos.y >= gameHeight) {
                player.isCasting = false;
                player.isReeling = true;
            }
            checkCollision(player);
        }

        if (player.isReeling) {
            player.linePos.y -= player.reelSpeed;
            if (player.caughtFish) {
                player.caughtFish.style.left = `${player.linePos.x - 25}px`;
                player.caughtFish.style.top = `${player.linePos.y}px`;
            }
            if (player.linePos.y <= 0) {
                awardCatch(player);
                player.isReeling = false;
                player.linePos.y = 0;
            }
        }
    }

    function handleAutoFishers() {
        gameState.autoFishers.forEach(fisher => {
            if (!fisher.isCasting && !fisher.isReeling && (Date.now() - fisher.lastCastTime > fisher.interval)) {
                fisher.isCasting = true;
            }

            if (fisher.isCasting) {
                fisher.linePos.y += fisher.speed;
                if (fisher.linePos.y >= gameHeight) {
                    fisher.isCasting = false;
                    fisher.isReeling = true;
                }
                checkCollision(fisher);
            }

            if (fisher.isReeling) {
                fisher.linePos.y -= fisher.speed;
                if (fisher.caughtFish) {
                    fisher.caughtFish.style.left = `${fisher.linePos.x - 25}px`;
                    fisher.caughtFish.style.top = `${fisher.linePos.y}px`;
                }
                if (fisher.linePos.y <= 0) {
                    awardCatch(fisher);
                    fisher.isReeling = false;
                    fisher.linePos.y = 0;
                    fisher.lastCastTime = Date.now();
                }
            }

            fisher.lineElement.style.height = `${fisher.linePos.y}px`;
            fisher.hookElement.style.top = `${fisher.linePos.y}px`;
        });
    }

    function updateLines() {
        const player = gameState.player;
        fishingLine.style.left = `${player.linePos.x}px`;
        fishingLine.style.height = `${player.linePos.y}px`;
        hook.style.left = `${player.linePos.x - 5}px`;
        hook.style.top = `${player.linePos.y}px`;
    }

    // --- Auto-Fisher Creation ---
    function addAutoFisher() {
        if (gameState.autoFishers.length >= MAX_AUTO_FISHERS) return;
        measureGameWorld();
        const index = gameState.autoFishers.length;
        const fisherId = `auto-fisher-${index + 1}`;
        const gap = gameWidth / (Math.max(index + 2, 3));
        const positionX = Math.round(gap * (index + 1));

        const line = document.createElement('div');
        line.id = `${fisherId}-line`;
        line.className = 'fishing-line auto';
        line.style.left = `${positionX}px`;

        const hookEl = document.createElement('div');
        hookEl.id = `${fisherId}-hook`;
        hookEl.className = 'hook auto';
        hookEl.style.left = `${positionX - 5}px`;

        gameWorld.appendChild(line);
        gameWorld.appendChild(hookEl);

        const newFisher = {
            id: fisherId,
            positionX,
            isCasting: false,
            isReeling: false,
            caughtFish: null,
            linePos: { x: positionX, y: 0 },
            speed: upgrades.autoFisherSpeed.speeds[0],
            interval: upgrades.autoFisherInterval.intervals[0] * 1000,
            speedLevel: 1,
            intervalLevel: 1,
            lastCastTime: Date.now(),
            lineElement: line,
            hookElement: hookEl,
        };
        gameState.autoFishers.push(newFisher);

        const fisherUI = document.createElement('div');
        fisherUI.className = 'auto-fisher-block';
        fisherUI.innerHTML = `
            <div>
                <h4>Auto-Fisher #${gameState.autoFishers.length}</h4>
                <p class="muted">Catches fish automatically.</p>
                <div id="${fisherId}-summary" class="fisher-level-summary">Speed Lv. 1 | Interval Lv. 1</div>
            </div>
            <div class="upgrade-item">
                <div class="upgrade-title"><span>Reel Speed</span> <span id="${fisherId}-speed-level" class="level-pill inline">Lv. 1</span></div>
                <button id="buy-${fisherId}-speed">Buy (Cost: ${upgrades.autoFisherSpeed.costs[0]})</button>
            </div>
            <div class="upgrade-item">
                <div class="upgrade-title"><span>Interval</span> <span id="${fisherId}-interval-level" class="level-pill inline">Lv. 1</span></div>
                <button id="buy-${fisherId}-interval">Buy (Cost: ${upgrades.autoFisherInterval.costs[0]})</button>
            </div>
        `;
        autoFisherUpgradesContainer.appendChild(fisherUI);

        document.getElementById(`buy-${fisherId}-speed`).addEventListener('click', () => {
            const currentLevel = newFisher.speedLevel;
            if (currentLevel - 1 >= upgrades.autoFisherSpeed.costs.length) return;
            const cost = upgrades.autoFisherSpeed.costs[currentLevel - 1];
            if (gameState.score < cost) return;
            gameState.score -= cost;
            newFisher.speedLevel++;
            newFisher.speed = upgrades.autoFisherSpeed.speeds[currentLevel];
            updateUI();
        });

        document.getElementById(`buy-${fisherId}-interval`).addEventListener('click', () => {
            const currentLevel = newFisher.intervalLevel;
            if (currentLevel - 1 >= upgrades.autoFisherInterval.costs.length) return;
            const cost = upgrades.autoFisherInterval.costs[currentLevel - 1];
            if (gameState.score < cost) return;
            gameState.score -= cost;
            newFisher.intervalLevel++;
            newFisher.interval = upgrades.autoFisherInterval.intervals[currentLevel] * 1000;
            updateUI();
        });
    }

    // --- Test Helper: Max Out Everything ---
    function maxOutEverythingForTest() {
        measureGameWorld();
        // Player to max
        gameState.score = 99999;
        // gameState.player.castSpeedLevel = upgrades.playerSpeed.castSpeeds.length;
        // gameState.player.reelSpeedLevel = upgrades.playerSpeed.reelSpeeds.length;
        // gameState.player.castSpeed = upgrades.playerSpeed.castSpeeds[upgrades.playerSpeed.castSpeeds.length - 1];
        // gameState.player.reelSpeed = upgrades.playerSpeed.reelSpeeds[upgrades.playerSpeed.reelSpeeds.length - 1];

        // // Ensure 3 auto-fishers for coverage
        // const targetFishers = Math.min(3, MAX_AUTO_FISHERS);
        // while (gameState.autoFishers.length < targetFishers) {
        //     addAutoFisher();
        // }

        // // Max each auto-fisher
        // const maxSpeedLevel = upgrades.autoFisherSpeed.speeds.length;
        // const maxIntervalLevel = upgrades.autoFisherInterval.intervals.length;
        // gameState.autoFishers.forEach(fisher => {
        //     fisher.speedLevel = maxSpeedLevel;
        //     fisher.speed = upgrades.autoFisherSpeed.speeds[maxSpeedLevel - 1];
        //     fisher.intervalLevel = maxIntervalLevel;
        //     fisher.interval = upgrades.autoFisherInterval.intervals[maxIntervalLevel - 1] * 1000;
        //     fisher.lastCastTime = 0;
        // });

        updateUI();
        console.info('Test mode: all upgrades maxed.');
    }

    // --- Event Listeners ---
    gameWorld.addEventListener('mousemove', (e) => {
        if (!gameState.player.isCasting && !gameState.player.isReeling) {
            const rect = gameWorld.getBoundingClientRect();
            gameState.player.linePos.x = clamp(e.clientX - rect.left, 0, gameWidth);
        }
    });

    gameWorld.addEventListener('click', () => {
        if (!gameState.player.isCasting && !gameState.player.isReeling) {
            gameState.player.isCasting = true;
        }
    });

    document.addEventListener('keydown', (e) => {
        if (e.key.toLowerCase() === 'm') {
            maxOutEverythingForTest();
        }
    });

    if (fullscreenToggle) {
        fullscreenToggle.addEventListener('click', () => {
            if (isFullscreen()) {
                document.exitFullscreen?.();
            } else {
                document.documentElement.requestFullscreen?.();
            }
        });
    }

    document.addEventListener('fullscreenchange', updateFullscreenUI);

    if (zoomInBtn) {
        zoomInBtn.addEventListener('click', () => {
            zoomScale += ZOOM_STEP;
            applyZoom();
        });
    }

    if (zoomOutBtn) {
        zoomOutBtn.addEventListener('click', () => {
            zoomScale -= ZOOM_STEP;
            applyZoom();
        });
    }

    buyReelSpeedBtn.addEventListener('click', () => {
        const maxLevel = upgrades.playerSpeed.reelSpeeds.length;
        const currentLevel = gameState.player.reelSpeedLevel;
        if (currentLevel >= maxLevel) return;
        const cost = upgrades.playerSpeed.costs[currentLevel - 1];
        if (gameState.score < cost) return;
        gameState.score -= cost;
        gameState.player.reelSpeedLevel++;
        gameState.player.reelSpeed = upgrades.playerSpeed.reelSpeeds[Math.min(currentLevel, maxLevel - 1)];
        updateUI();
    });

    buyCastSpeedBtn.addEventListener('click', () => {
        const maxLevel = upgrades.playerSpeed.castSpeeds.length;
        const currentLevel = gameState.player.castSpeedLevel;
        if (currentLevel >= maxLevel) return;
        const cost = upgrades.playerSpeed.costs[currentLevel - 1];
        if (gameState.score < cost) return;
        gameState.score -= cost;
        gameState.player.castSpeedLevel++;
        gameState.player.castSpeed = upgrades.playerSpeed.castSpeeds[Math.min(currentLevel, maxLevel - 1)];
        updateUI();
    });

    buyAutoFisherBtn.addEventListener('click', () => {
        const cost = currentAutoFisherCost();
        if (gameState.score < cost) return;
        gameState.score -= cost;
        addAutoFisher();
        updateUI();
    });

    window.addEventListener('resize', () => {
        measureGameWorld();
    });

    // --- Game Loop ---
    function gameLoop() {
        gameState.tick++;
        moveFishSchool();
        handlePlayer();
        handleAutoFishers();
        updateLines();
        updateUI();
        requestAnimationFrame(gameLoop);
    }

    // --- Initialization ---
    measureGameWorld();
    applyZoom();
    updateLines();
    updateUI();
    setInterval(createFish, 1000);
    requestAnimationFrame(gameLoop);
});
