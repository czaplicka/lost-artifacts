import { supabase } from './supabase-client.js';

export default class SceneAuth extends Phaser.Scene {
    constructor() {
        super({ key: 'SceneAuth' });
    }

    async create() {
        // Sprawdzenie czy agent jest już zalogowany z poprzedniej sesji
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
            console.log("Agent rozpoznany:", user.email);
            this.scene.start('MainGameScene'); // Przejście do gry
        } else {
            // Wyświetlenie formularza logowania z poprzedniego kroku
            this.showLoginForm(); 
        }
    }
    
    // ... reszta logiki formularzy ...

// Przykład dla przycisku Logowania
let loginForm = this.add.dom(400, 300).createFromCache('login_html');

loginForm.addListener('click');
loginForm.on('click', async function (event) {
    if (event.target.id === 'btn-login') {
        const email = this.getChildByID('login-email').value;
        const password = this.getChildByID('login-password').value;
        
        // Wywołanie Supabase
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password,
        });

        if (error) {
            this.getChildByID('login-error').innerText = "Błędne dane lub agent nie istnieje!";
            this.getChildByID('login-error').style.display = 'block';
        } else {
            // Zalogowano! Pobierz profil, schowaj formularz, odpal scenę Gry
            console.log("Witaj agencie!", data.user);
            // this.scene.start('MainMenuScene'); // przejście dalej
        }
    }
    // Obsługa kliknięć w linki do zmiany ekranów (ukryj ten DOM, pokaż formularz rejestracji)
});
}