import { EventBus } from './EventBus.js';
import { gameState } from './GameData.js';

export class GameTimeManager {
    constructor(savedState = null) {
        // Jeśli ładujemy grę, bierzemy zapisane wartości, jeśli nie - domyślne
        this.currentDay = savedState?.day || 1;
        this.currentHour = savedState?.hour || 8;
        this.currentMinute = savedState?.minute || 0;
        this.partOfDay = savedState?.partOfDay || 'Morning';
        
        // Zabezpieczenie przed podwójnym nasłuchem przy restarcie sceny
        EventBus.off('advanceTime', this.handleAdvanceTime, this);
        EventBus.on('advanceTime', this.handleAdvanceTime, this);
    }

    handleAdvanceTime(hours, minutes) {
        this.currentMinute += minutes;
        if (this.currentMinute >= 60) {
            this.currentHour += Math.floor(this.currentMinute / 60);
            this.currentMinute = this.currentMinute % 60;
        }

        this.currentHour += hours;

        while (this.currentHour >= 24) {
            this.currentHour -= 24;
            this.currentDay += 1;
        }

        this.updatePartOfDay();

        gameState.currentPartOfDay = this.partOfDay; 
gameState.currentHour = this.currentHour;

        // Emitujemy odświeżenie dla UIScene i HUD!
        EventBus.emit('timeChanged', {
            day: this.currentDay,
            hour: this.currentHour,
            minute: this.currentMinute,
            partOfDay: this.partOfDay
        });
        
        // Ważne - zapisujemy też do globalnego stanu, by przeżyło przeładowania
        EventBus.emit('saveTimeState', {
            day: this.currentDay,
            hour: this.currentHour,
            minute: this.currentMinute,
            partOfDay: this.partOfDay
        });
    }

    updatePartOfDay() {
        if (this.currentHour >= 6 && this.currentHour < 12) this.partOfDay = 'Morning';
        else if (this.currentHour >= 12 && this.currentHour < 18) this.partOfDay = 'Afternoon';
        else if (this.currentHour >= 18 && this.currentHour < 22) this.partOfDay = 'Evening';
        else this.partOfDay = 'Night';
    }
}