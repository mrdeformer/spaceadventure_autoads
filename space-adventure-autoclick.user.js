// ==UserScript==
// @name         Space Adventure AutoClick
// @namespace    space.adventure.miniapp
// @version      2.0
// @description  Space Adventure: автопрокликивание и закрытие реклам
// @match        https://space-adventure.online/*
// @match        https://space-adventure.online/telegram/*
// @grant        none
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';

    let isRunning = false;
    let observer = null;
    let intervalId = null;
    let stats = {
        totalClicks: 0,
        adsClosed: 0,
        claimsMade: 0,
        startTime: Date.now()
    };

    // === Панель логов ===
    const logPanel = document.createElement('div');
    Object.assign(logPanel.style, {
        position: 'fixed',
        bottom: '10px',
        left: '10px',
        right: '10px',
        maxHeight: '250px',
        background: 'rgba(0, 0, 0, 0.85)',
        color: '#00ff00',
        fontFamily: 'monospace',
        fontSize: '12px',
        borderRadius: '10px',
        zIndex: '99999',
        boxShadow: '0 4px 20px rgba(0,255,0,0.3)',
        overflow: 'hidden'
    });

    const logHeader = document.createElement('div');
    Object.assign(logHeader.style, {
        padding: '8px 12px',
        background: 'rgba(0, 100, 0, 0.9)',
        cursor: 'pointer',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        userSelect: 'none',
        gap: '10px'
    });

    const titleSpan = document.createElement('span');
    titleSpan.textContent = '🚀 Space Adventure Pro';
    Object.assign(titleSpan.style, {
        fontWeight: 'bold',
        color: '#00ff99',
        flex: '1'
    });

    // Кнопка Старт/Стоп в header
    const controlBtn = document.createElement('button');
    controlBtn.textContent = '▶ Старт';
    Object.assign(controlBtn.style, {
        padding: '4px 12px',
        background: '#4CAF50',
        color: 'white',
        border: 'none',
        borderRadius: '5px',
        cursor: 'pointer',
        fontSize: '11px',
        fontWeight: 'bold',
        transition: 'all 0.3s'
    });

    const clearBtn = document.createElement('span');
    clearBtn.textContent = '🗑';
    Object.assign(clearBtn.style, {
        cursor: 'pointer',
        fontSize: '14px',
        padding: '4px 8px',
        background: 'rgba(255,0,0,0.5)',
        borderRadius: '4px'
    });

    logHeader.appendChild(titleSpan);
    logHeader.appendChild(controlBtn);
    logHeader.appendChild(clearBtn);
    logPanel.appendChild(logHeader);

    const logContent = document.createElement('div');
    Object.assign(logContent.style, {
        padding: '8px',
        maxHeight: '180px',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px'
    });
    logPanel.appendChild(logContent);

    let isLogExpanded = true;

    // Клик по header для сворачивания (кроме кнопок)
    logHeader.onclick = (e) => {
        if (e.target === controlBtn || e.target === clearBtn) return;
        isLogExpanded = !isLogExpanded;
        logContent.style.display = isLogExpanded ? 'flex' : 'none';
        logPanel.style.maxHeight = isLogExpanded ? '250px' : '50px';
    };

    clearBtn.onclick = (e) => {
        e.stopPropagation();
        logContent.innerHTML = '';
        addLog('🗑 Логи очищены');
    };

    controlBtn.onclick = (e) => {
        e.stopPropagation();
        if (isRunning) {
            stopScript();
            controlBtn.style.background = '#4CAF50';
            controlBtn.textContent = '▶ Старт';
            addLog('⏸ Автокликер остановлен');
        } else {
            startScript();
            controlBtn.style.background = '#f44336';
            controlBtn.textContent = '⏸ Стоп';
            addLog('▶ Автокликер запущен');
        }
        saveState();
    };

    function addLog(message) {
        const time = new Date().toLocaleTimeString();
        const entry = document.createElement('div');
        entry.textContent = `[${time}] ${message}`;
        entry.style.wordBreak = 'break-word';
        logContent.appendChild(entry);
        if (isLogExpanded) logContent.scrollTop = logContent.scrollHeight;
        if (logContent.children.length > 100) logContent.removeChild(logContent.children[0]);

        // Статистика
        if (message.includes('Claim') || message.includes('Забрать')) stats.claimsMade++;
        if (message.includes('Закрытие') || message.includes('Удален')) stats.adsClosed++;
        if (message.includes('✅')) stats.totalClicks++;

        updateStatsDisplay();
        console.log('[Space Adventure Pro]', message);
    }

    function updateStatsDisplay() {
        const runtime = Math.floor((Date.now() - stats.startTime) / 60000);
        titleSpan.textContent = `🚀 Pro | 👆${stats.totalClicks} | 🚫${stats.adsClosed} | ⏱${runtime}м`;
    }

    document.body.appendChild(logPanel);

    // === Кнопки игры ===
    const GAME_BUTTONS = [
        { selector: 'div.app__start-start a.btn.btn__yellow-xl', oneTime: true, clicked: false, cooldownUntil: 0 },
        { selector: 'div.app__game-btn button', oneTime: false, cooldownUntil: 0, cooldownDuration: () => 75000 + Math.random() * 25000 },
        { selector: '.giveaways__item-buttons > button', oneTime: false, cooldownUntil: 0, cooldownDuration: () => 70000 + Math.random() * 50000, clickOnlyFirst: true }
    ];

    const CLOSE_AD_SELECTORS = [
        'div.banner__popup-wrapper > div > button > div',
        'body > div:nth-child(3) > div > span > span',
        'body > div:nth-child(2) > svg > path',
        'body > div:nth-child(2) > div > span > span',
        '#adsContainer > div > button > svg > path',
        '#sonar-confirm-close',
        '#sonar-close > path',
        '#sonar-close'
    ].map(sel => ({ selector: sel, cooldownUntil: 0, cooldownDuration: () => 3000 }));

    // Универсальные паттерны для закрытия
    const UNIVERSAL_CLOSE_PATTERNS = [
        '[class*="close"]',
        '[id*="close"]',
        '[class*="dismiss"]',
        '[aria-label*="close" i]',
        '[aria-label*="закрыть" i]',
        'button[class*="ad-close"]',
        'div[class*="ad-close"]',
        '.modal-close',
        '[data-dismiss="modal"]',
        '[class*="popup-close"]'
    ];

    // Зоны для клика в углах (правый верхний угол приоритет)
    const CORNER_ZONES = [
        { name: 'Правый верх', x: () => window.innerWidth - 50, y: () => 50, radius: 80 },
        { name: 'Левый верх', x: () => 50, y: () => 50, radius: 60 },
        { name: 'Правый низ', x: () => window.innerWidth - 50, y: () => window.innerHeight - 50, radius: 60 }
    ];

    const CHECK_INTERVAL_MS = 12000;
    const now = () => Date.now();

    function randomDelay(min = 1200, max = 4500) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    function isVisible(el) {
        if (!el) return false;
        const rect = el.getBoundingClientRect();
        const style = window.getComputedStyle(el);
        return rect.width > 0 && rect.height > 0 &&
               style.visibility !== 'hidden' &&
               style.display !== 'none' &&
               el.offsetParent !== null;
    }

    function humanClick(element, label = '') {
        const delay = randomDelay();
        setTimeout(() => {
            if (!isVisible(element)) return;

            let target = element;
            const tag = element.tagName?.toLowerCase();

            if (tag === 'path') {
                target = element.ownerSVGElement || element.closest('svg') || element.parentElement;
            }

            const rect = target.getBoundingClientRect();
            const x = rect.left + rect.width * (0.3 + Math.random() * 0.4);
            const y = rect.top + rect.height * (0.3 + Math.random() * 0.4);

            ['mouseover', 'mousedown', 'mouseup', 'click'].forEach((ev, i) => {
                setTimeout(() => {
                    target.dispatchEvent(new MouseEvent(ev, {
                        bubbles: true,
                        cancelable: true,
                        view: window,
                        clientX: x,
                        clientY: y
                    }));
                }, i * (30 + Math.random() * 40));
            });

            addLog(`✅ ${label || target.innerText?.slice(0, 20) || 'Клик'}`);
        }, delay);
    }

    // Закрытие iframe рекламы
    function closeIframeAds() {
        const iframes = document.querySelectorAll('iframe');
        iframes.forEach(iframe => {
            try {
                const src = iframe.src.toLowerCase();
                const id = (iframe.id || '').toLowerCase();
                if (src.includes('ad') || src.includes('banner') ||
                    id.includes('ad') || id.includes('banner')) {
                    iframe.remove();
                    addLog('🗑️ Удален iframe с рекламой');
                }
            } catch(e) {}
        });
    }

    // Универсальное закрытие по паттернам
    function closeUniversalAds() {
        UNIVERSAL_CLOSE_PATTERNS.forEach(pattern => {
            try {
                const elements = document.querySelectorAll(pattern);
                elements.forEach(el => {
                    if (isVisible(el) && el.offsetWidth < 100 && el.offsetHeight < 100) {
                        const text = (el.innerText || el.getAttribute('aria-label') || '').toLowerCase();
                        if (text.includes('close') || text.includes('закрыть') || text === '×' || text === '') {
                            humanClick(el, 'Закрытие (паттерн)');
                        }
                    }
                });
            } catch(e) {}
        });
    }

    // Клик по углам экрана (поиск крестиков)
    function clickCornerAreas() {
        CORNER_ZONES.forEach(zone => {
            const centerX = zone.x();
            const centerY = zone.y();
            const radius = zone.radius;

            // Ищем все кликабельные элементы в зоне
            const allElements = document.querySelectorAll('button, div[onclick], span, svg, path, a, [role="button"]');

            allElements.forEach(el => {
                if (!isVisible(el)) return;

                const rect = el.getBoundingClientRect();
                const elCenterX = rect.left + rect.width / 2;
                const elCenterY = rect.top + rect.height / 2;

                // Проверяем попадание в радиус
                const distance = Math.sqrt(
                    Math.pow(elCenterX - centerX, 2) +
                    Math.pow(elCenterY - centerY, 2)
                );

                if (distance <= radius) {
                    // Дополнительные проверки на "крестик"
                    const text = (el.innerText || el.textContent || '').trim().toLowerCase();
                    const classes = (el.className || '').toLowerCase();
                    const id = (el.id || '').toLowerCase();

                    const isCloseButton =
                        text === '×' ||
                        text === '✕' ||
                        text === 'x' ||
                        text === '' && (el.offsetWidth < 50 && el.offsetHeight < 50) ||
                        classes.includes('close') ||
                        classes.includes('dismiss') ||
                        id.includes('close');

                    if (isCloseButton) {
                        humanClick(el, `Крестик (${zone.name})`);
                    }
                }
            });
        });
    }

    // Агрессивный клик по правому верхнему углу (последняя надежда)
    function forceClickTopRight() {
        const x = window.innerWidth - 30;
        const y = 30;

        // Несколько кликов в область
        for (let i = 0; i < 3; i++) {
            setTimeout(() => {
                const offsetX = x + (Math.random() * 40 - 20);
                const offsetY = y + (Math.random() * 40 - 20);

                const element = document.elementFromPoint(offsetX, offsetY);
                if (element) {
                    element.dispatchEvent(new MouseEvent('click', {
                        bubbles: true,
                        cancelable: true,
                        view: window,
                        clientX: offsetX,
                        clientY: offsetY
                    }));

                    if (i === 0) addLog('🎯 Форс-клик правый верх');
                }
            }, i * 300);
        }
    }

    function checkButtons(buttonsArray, isAdButtons = false) {
        if (!isRunning) return;

        buttonsArray.forEach(btn => {
            if (btn.oneTime && btn.clicked) return;
            if (now() < btn.cooldownUntil) return;

            const elements = btn.clickOnlyFirst
                ? Array.from(document.querySelectorAll(btn.selector))
                : [document.querySelector(btn.selector)].filter(Boolean);

            let clicked = false;

            if (btn.clickOnlyFirst) {
                for (const el of elements) {
                    if (isVisible(el) && !el.disabled) {
                        const label = isAdButtons ? 'Закрытие рекламы' : (el.innerText?.trim() || 'Claim');
                        humanClick(el, label);
                        clicked = true;
                        break;
                    }
                }
            } else {
                elements.forEach(el => {
                    if (isVisible(el) && !el.disabled) {
                        const label = isAdButtons ? 'Закрытие рекламы' : (el.innerText?.trim() || 'Кнопка');
                        humanClick(el, label);
                        clicked = true;
                    }
                });
            }

            if (clicked && !btn.oneTime && btn.cooldownDuration) {
                const duration = btn.cooldownDuration();
                btn.cooldownUntil = now() + duration;
                addLog(`⏳ Кулдаун ${Math.round(duration/1000)}с`);
            }
            if (clicked && btn.oneTime) btn.clicked = true;
        });
    }

    function checkAll() {
        checkButtons(GAME_BUTTONS, false);
        checkButtons(CLOSE_AD_SELECTORS, true);
        closeIframeAds();
        closeUniversalAds();
        clickCornerAreas();

        // Агрессивный метод раз в 30 секунд
        if (Math.random() < 0.05) { // ~5% вероятность = примерно раз в 30 сек при CHECK_INTERVAL_MS=12000
            forceClickTopRight();
        }
    }

    function startScript() {
        if (observer) observer.disconnect();
        if (intervalId) clearInterval(intervalId);

        observer = new MutationObserver(() => {
            if (isRunning) checkAll();
        });
        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true
        });

        intervalId = setInterval(checkAll, CHECK_INTERVAL_MS);
        isRunning = true;
        stats.startTime = Date.now();

        checkAll(); // Первая проверка сразу
    }

    function stopScript() {
        if (observer) observer.disconnect();
        if (intervalId) clearInterval(intervalId);
        isRunning = false;
    }

    // Сохранение/загрузка состояния
    function saveState() {
        try {
            localStorage.setItem('spaceAdv_running', isRunning);
            localStorage.setItem('spaceAdv_stats', JSON.stringify(stats));
        } catch(e) {}
    }

    function loadState() {
        try {
            const savedRunning = localStorage.getItem('spaceAdv_running') === 'true';
            const savedStats = localStorage.getItem('spaceAdv_stats');

            if (savedStats) {
                const parsed = JSON.parse(savedStats);
                stats = { ...stats, ...parsed };
            }

            if (savedRunning) {
                setTimeout(() => {
                    startScript();
                    controlBtn.style.background = '#f44336';
                    controlBtn.textContent = '⏸ Стоп';
                    addLog('♻️ Автозапуск из сохранённого состояния');
                }, 2000);
            }
        } catch(e) {}
    }

    // Автосохранение каждые 30 секунд
    setInterval(saveState, 30000);

    addLog('🚀 Space Adventure Pro загружен');
    addLog('ℹ️ Нажми "▶ Старт" для запуска');

    loadState();
    updateStatsDisplay();

})();
