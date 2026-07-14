export class ScoreManager {
    constructor() {
     this.scores = [
            { name: "Victor 'Shadow' Thorne", points: 98450 },
            { name: "Elena Vance", points: 92100 },
            { name: "Marcus Thorne", points: 89750 }
        ];
    }

    addScore(name, points) {
        const entry = { name, points, date: new Date().toLocaleDateString() };
        this.scores.push(entry);
        this.scores.sort((a, b) => b.points - a.points);
        this.scores = this.scores.slice(0, 10);
        localStorage.setItem('detectiveScores', JSON.stringify(this.scores));
    }

    getScores() {
        return this.scores;
    }
    saveScore(name, points) {
        // Tutaj w przyszłości zrobisz fetch() do swojej bazy danych
        console.log(`Zapisywanie: ${name} z wynikiem ${points}`);
    }
}