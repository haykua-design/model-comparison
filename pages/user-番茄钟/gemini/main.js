class PomodoroTimer {
    constructor() {
        this.timerText = document.getElementById('timerText');
        this.startBtn = document.getElementById('startBtn');
        this.resetBtn = document.getElementById('resetBtn');
        this.progressCircle = document.getElementById('progressCircle');
        this.workInput = document.getElementById('workDuration');
        this.breakInput = document.getElementById('breakDuration');
        this.notifyCheck = document.getElementById('notifyCheck');
        this.soundToggle = document.getElementById('soundToggle');
        this.typeButtons = document.querySelectorAll('.type-button');

        this.timeLeft = 25 * 60;
        this.currentMode = 'work';
        this.isRunning = false;
        this.timerId = null;
        this.soundEnabled = true;

        this.circumference = 130 * 2 * Math.PI;
        this.progressCircle.style.strokeDasharray = `${this.circumference} ${this.circumference}`;
        this.progressCircle.style.strokeDashoffset = this.circumference;

        this.init();
    }

    init() {
        this.startBtn.addEventListener('click', () => this.toggleTimer());
        this.resetBtn.addEventListener('click', () => this.resetTimer());
        this.soundToggle.addEventListener('click', () => this.toggleSound());

        this.typeButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                this.setMode(btn.dataset.type);
            });
        });

        this.workInput.addEventListener('change', () => {
            if (this.currentMode === 'work' && !this.isRunning) {
                this.timeLeft = this.workInput.value * 60;
                this.updateDisplay();
            }
        });

        this.breakInput.addEventListener('change', () => {
            if (this.currentMode === 'break' && !this.isRunning) {
                this.timeLeft = this.breakInput.value * 60;
                this.updateDisplay();
            }
        });

        // Request notification permission
        if ("Notification" in window) {
            Notification.requestPermission();
        }

        this.updateDisplay();
    }

    toggleTimer() {
        if (this.isRunning) {
            this.pauseTimer();
        } else {
            this.startTimer();
        }
    }

    startTimer() {
        this.isRunning = true;
        this.startBtn.textContent = '暂停';
        this.startBtn.classList.remove('btn-primary');

        this.timerId = setInterval(() => {
            this.timeLeft--;
            this.updateDisplay();
            if (this.timeLeft <= 0) {
                this.timerFinished();
            }
        }, 1000);
    }

    pauseTimer() {
        this.isRunning = false;
        this.startBtn.textContent = '继续';
        this.startBtn.classList.add('btn-primary');
        clearInterval(this.timerId);
    }

    resetTimer() {
        this.pauseTimer();
        this.startBtn.textContent = '开始';
        this.setMode(this.currentMode);
    }

    setMode(mode) {
        this.pauseTimer();
        this.startBtn.textContent = '开始';
        this.currentMode = mode;
        this.typeButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.type === mode);
        });

        const duration = mode === 'work' ? this.workInput.value : this.breakInput.value;
        this.timeLeft = duration * 60;
        this.updateDisplay();
    }

    updateDisplay() {
        const minutes = Math.floor(this.timeLeft / 60);
        const seconds = this.timeLeft % 60;
        this.timerText.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

        // Update progress ring
        const totalTime = (this.currentMode === 'work' ? this.workInput.value : this.breakInput.value) * 60;
        const offset = this.circumference - (this.timeLeft / totalTime) * this.circumference;
        this.progressCircle.style.strokeDashoffset = offset;
    }

    timerFinished() {
        this.pauseTimer();
        this.startBtn.textContent = '开始';

        if (this.soundEnabled) {
            this.playAlarm();
        }

        if (this.notifyCheck.checked && Notification.permission === "granted") {
            const message = this.currentMode === 'work' ? "工作时间结束！休息一下吧 ☕️" : "休息结束！开始工作吧 🚀";
            new Notification("Premium Tomato", { body: message });
        }

        // Switch mode automatically
        this.setMode(this.currentMode === 'work' ? 'break' : 'work');
    }

    toggleSound() {
        this.soundEnabled = !this.soundEnabled;
        this.soundToggle.style.opacity = this.soundEnabled ? '1' : '0.3';
    }

    playAlarm() {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);

        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(440, audioCtx.currentTime); // A4
        oscillator.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.5); // A5

        gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 1);

        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 1);
    }
}

new PomodoroTimer();
