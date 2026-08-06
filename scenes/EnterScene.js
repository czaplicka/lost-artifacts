export class EnterScene extends Phaser.Scene {
    constructor() {
        super({ key: 'EnterScene' });
    }

    preload() {
        // jeśli już ładujesz to gdzie indziej (PreloaderScene), usuń ten preload
        this.load.image('loginbtn', 'assets/login.png');
        this.load.image('registerbtn', 'assets/register.png');
        this.load.image('next', 'assets/next.png');
        this.load.image('enter', 'assets/local/enter.jpg');
    }

    create() {
        const { width, height } = this.scale;

        // wyłącz HUD
        this.scene.sleep('UIScene');

        const centerX = width * 0.23;

        // Tło
        const bg = this.add.image(width / 2, height / 2, 'enter');
        const scaleX = width / bg.width;
        const scaleY = height / bg.height;
        const scale = Math.max(scaleX, scaleY);
        bg.setScale(scale).setScrollFactor(0);

        // LOGIN
        const loginBtn = this.add.image(centerX, height * 0.44, 'loginbtn')
            .setOrigin(0.5)
            .setInteractive({ useHandCursor: true });

        // REGISTER
        const registerBtn = this.add.image(centerX, height * 0.64, 'registerbtn')
            .setOrigin(0.5)
            .setInteractive({ useHandCursor: true });

        // NEXT -> MenuScene
        const nextBtn = this.add.image(centerX, height * 0.84, 'next')
            .setOrigin(0.5)
            .setInteractive({ useHandCursor: true });

        // hover na skali obrazka
        this.addHoverEffect(loginBtn);
        this.addHoverEffect(registerBtn);
        this.addHoverEffect(nextBtn);

        loginBtn.on('pointerdown', () => {
            this.openModal('login.html');
        });

        registerBtn.on('pointerdown', () => {
            this.openModal('register.html');
        });

        nextBtn.on('pointerdown', () => {
            this.closeModal(); // na wszelki wypadek
            this.scene.start('MenuScene');
        });

        // Kontener na modal
        this.modalElement = null;
        this.modalDom = null;
    }

    // UWAGA: teraz to jest hover dla IMAGE, nie TEXT
    addHoverEffect(button, baseScale = 1, hoverScale = 1.05) {
        button.setScale(baseScale);

        button.on('pointerover', () => {
            button.setScale(hoverScale);
        });

        button.on('pointerout', () => {
            button.setScale(baseScale);
        });
    }

    openModal(url) {
        if (this.modalDom) {
            this.closeModal();
        }

        const { width, height } = this.scale;

        // Tło pod modal (ciemny overlay)
        const overlay = document.createElement('div');
        overlay.style.position = 'fixed';
        overlay.style.left = '0';
        overlay.style.top = '0';
        overlay.style.width = '100vw';
        overlay.style.height = '100vh';
        overlay.style.background = 'rgba(0,0,0,0.6)';
        overlay.style.display = 'flex';
        overlay.style.alignItems = 'center';
        overlay.style.justifyContent = 'center';
        overlay.style.zIndex = '9999';

        const frame = document.createElement('iframe');
        frame.src = url;
        frame.style.width = '600px';
        frame.style.maxWidth = '90vw';
        frame.style.height = '70vh';
        frame.style.border = '4px solid #000';
        frame.style.boxShadow = '0 0 20px #000';
        frame.style.background = '#111';

        // Zamknięcie po kliknięciu w tło
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                this.closeModal();
            }
        });

        overlay.appendChild(frame);
        document.body.appendChild(overlay);

        // Phaser DOMElement tylko po to, żeby posprzątać razem ze sceną
        this.modalElement = overlay;
        this.modalDom = this.add.dom(width / 2, height / 2, overlay);
    }

    closeModal() {
        if (this.modalDom) {
            this.modalDom.destroy();
            this.modalDom = null;
        }
        if (this.modalElement && this.modalElement.parentNode) {
            this.modalElement.parentNode.removeChild(this.modalElement);
            this.modalElement = null;
        }
    }

    shutdown() {
        this.closeModal();
    }

    destroy() {
        this.closeModal();
        super.destroy();
    }
}