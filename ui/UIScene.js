import { EventBus } from '../EventBus.js';

export default class UIScene extends Phaser.Scene {
    constructor() {
        super({ key: 'UIScene', active: true });
    }

    create() {
        this.scene.bringToTop();
        
        const width = this.cameras.main.width;
        const paddingRight = 40; // Większy odstęp od krawędzi
        const paddingTop = 40;
        
        // ZWIĘKSZONE WYMIARY: Tło w stylu starego papieru/kartki z kalendarza
        const boxWidth = 320;
        const boxHeight = 160;
        const boxX = width - paddingRight - boxWidth;
        const boxY = paddingTop;

        // 1. KARTKA Z KALENDARZA: Ciepły, pergaminowy/kremowy kolor retro (retro beige)
        this.calendarBg = this.add.rectangle(boxX, boxY, boxWidth, boxHeight, 0xf4ecd8, 1.0)
            .setOrigin(0, 0);

        // Klimatyczna podwójna ramka: brązowa i złota (Styl Indiana Jones)
        this.calendarBg.setStrokeStyle(4, 0x4a3728);
        this.innerFrame = this.add.graphics();
        this.innerFrame.lineStyle(2, 0xd4a373, 1);
        this.innerFrame.strokeRect(boxX + 4, boxY + 4, boxWidth - 8, boxHeight - 8);

        // Czerwona linia u góry udająca oderwaną kartkę z notesu detektywa
        this.add.rectangle(boxX + 4, boxY + 4, boxWidth - 8, 8, 0xae2012).setOrigin(0, 0);

        // 2. WIRTUALNY ZEGAR ANALOGOWY (Po lewej stronie kartki)
        const clockX = boxX + 65;
        const clockY = boxY + boxHeight / 2 + 5;
        const clockRadius = 45;

        this.clockGroup = this.add.group();

        // Tarcza zegara (biała z brązową ramką)
        const clockFace = this.add.circle(clockX, clockY, clockRadius, 0xffffff)
            .setStrokeStyle(3, 0x4a3728);
        
        // Kropka na środku zegara
        const clockCenter = this.add.circle(clockX, clockY, 4, 0x4a3728);

        // Wskazówki jako obiekty Graphics (dzięki czemu możemy nimi kręcić!)
        this.hourHand = this.add.graphics();
        this.minuteHand = this.add.graphics();

        // 3. TEKSTY (Po prawej stronie kartki – duże i czytelne)
        const textStyle = {
            fontFamily: 'PressStart2P', // Pikselowa czcionka z Twojej gry
            fill: '#4a3728', // Ciemnobrązowy tusz zamiast komputerowej czerni
            shadow: { offsetX: 1, offsetY: 1, color: '#d4a373', blur: 0, fill: true }
        };

        // Duży napis DNIA
        this.dayText = this.add.text(boxX + 135, boxY + 30, 'DAY 1', {
            ...textStyle,
            fontSize: '28px',
            fill: '#ae2012' // Czerwony tusz dla dnia kalendarzowego
        }).setOrigin(0, 0);

        // Cyfrowy podgląd godziny pod spodem
        this.timeText = this.add.text(boxX + 135, boxY + 75, '08:00', {
            ...textStyle,
            fontSize: '20px'
        }).setOrigin(0, 0);

        // Pora dnia (np. Morning, Evening)
        this.partOfDayText = this.add.text(boxX + 135, boxY + 110, 'Morning', {
            ...textStyle,
            fontSize: '14px',
            fill: '#7f5539'
        }).setOrigin(0, 0);

        // Ustawienie zegara na startową pozycję (08:00)
        this.setClockHands(8, 0);

        // Obsługa eventów z silnika gry
        EventBus.on('timeChanged', this.updateHUD, this);
        EventBus.on('gameOver', this.showGameOver, this);

        this.events.on(Phaser.Scenes.Events.SHUTDOWN, () => {
            EventBus.off('timeChanged', this.updateHUD, this);
            EventBus.off('gameOver', this.showGameOver, this);
        });
    }

    // Funkcja rysująca i obracająca wskazówki zegara
    setClockHands(hour, minute) {
        const clockX = this.dayText.x - 70; // Pozycja X tarczy
        const clockY = this.calendarBg.y + (this.calendarBg.height / 2) + 5;

        // Czyścimy poprzednie rysunki wskazówek
        this.hourHand.clear();
        this.minuteHand.clear();

        // Obliczanie kątów (w radianach)
        // W Phaserze 0 radianów to kierunek w prawo (godzina 3:00), dlatego odejmujemy Math.PI / 2 (90 stopni)
        const minuteAngle = ((minute / 60) * Math.PI * 2) - Math.PI / 2;
        const hourAngle = (((hour % 12) / 12) * Math.PI * 2) + ((minute / 60) * (Math.PI * 2 / 12)) - Math.PI / 2;

        // Rysowanie wskazówki godzinowej (grubsza, krótsza – długość 25px)
        this.hourHand.lineStyle(4, 0x4a3728);
        this.hourHand.lineBetween(
            clockX, clockY, 
            clockX + Math.cos(hourAngle) * 25, 
            clockY + Math.sin(hourAngle) * 25
        );

        // Rysowanie wskazówki minutowej (cieńsza, dłuższa – długość 36px)
        this.minuteHand.lineStyle(2, 0xae2012); // Czerwona dla kontrastu retro
        this.minuteHand.lineBetween(
            clockX, clockY, 
            clockX + Math.cos(minuteAngle) * 36, 
            clockY + Math.sin(minuteAngle) * 36
        );
    }

    updateHUD(timeData) {
        const h = timeData.hour.toString().padStart(2, '0');
        const m = timeData.minute.toString().padStart(2, '0');

        // Aktualizacja tekstów na kartce kalendarza
        this.dayText.setText(`DAY ${timeData.day}`);
        this.timeText.setText(`${h}:${m}`);
        this.partOfDayText.setText(timeData.partOfDay);
        
        // PŁYNNE OBRÓCENIE WSKAZÓWEK:
        // Wywołujemy funkcję aktualizującą pozycję wskazówek na podstawie nowych danych
        this.setClockHands(timeData.hour, timeData.minute);
    }

    showGameOver(reason) {
        this.scene.stop();
        this.scene.start('GameOverScene', { reason: reason });
    }
}