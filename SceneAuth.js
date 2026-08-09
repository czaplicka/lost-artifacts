import { supabase } from './supabase-client.js';

export default class SceneAuth extends Phaser.Scene {
  constructor() {
    super({ key: 'SceneAuth' });

    this.loginForm = null;
    this.authSubscription = null;
    this.isTransitioning = false;
  }

  preload() {
    this.load.html('login_html', '/login.html');
  }

  async create() {
    this.isTransitioning = false;
    this.cameras.main.setBackgroundColor('#13100c');

    this.add.text(400, 110, 'LOST ARTEFACTS', {
      fontFamily: 'PressStart2P',
      fontSize: '24px',
      color: '#e7c56f',
      align: 'center',
    }).setOrigin(0.5);

    this.add.text(400, 155, 'DETECTIVE AGENCY ARCHIVES', {
      fontFamily: 'Special Elite',
      fontSize: '19px',
      color: '#d8c9ae',
      align: 'center',
    }).setOrigin(0.5);

    // Clean up old subscription when returning to scene
    if (this.authSubscription) {
      this.authSubscription.unsubscribe();
      this.authSubscription = null;
    }

    // Listen to Supabase auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        this.enterGame(session.user);
      }

      if (event === 'SIGNED_OUT') {
        this.isTransitioning = false;
        this.showLoginForm();
      }
    });

    this.authSubscription = subscription;

    // Automatically unsubscribe on scene shutdown
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      if (this.authSubscription) {
        this.authSubscription.unsubscribe();
        this.authSubscription = null;
      }
    });

    // Check existing session on start
    const { data: { session }, error } = await supabase.auth.getSession();

    if (error) {
      console.error('Failed to read session:', error.message);
      this.showLoginForm('Failed to read previous session.');
      return;
    }

    if (session?.user) {
      await this.enterGame(session.user);
      return;
    }

    this.showLoginForm();
  }

  showLoginForm(initialError = '') {
    if (this.loginForm) {
      if (initialError) {
        this.showError(initialError);
      }
      return;
    }

    this.loginForm = this.add.dom(400, 340).createFromCache('login_html');
    this.loginForm.setOrigin(0.5);

    this.loginForm.addListener('click');
    this.loginForm.on('click', async (event) => {
      const loginButton = event.target.closest?.('#btn-login');
      if (loginButton) {
        await this.handleLogin();
      }
    });

    const passwordInput = this.loginForm.getChildByID('login-password');
    passwordInput?.addEventListener('keydown', async (event) => {
      if (event.key === 'Enter') {
        await this.handleLogin();
      }
    });

    if (initialError) {
      this.showError(initialError);
    }
  }

  async handleLogin() {
    if (this.isTransitioning) return;

    const emailInput = this.loginForm?.getChildByID('login-email');
    const passwordInput = this.loginForm?.getChildByID('login-password');

    const email = emailInput?.value?.trim() ?? '';
    const password = passwordInput?.value ?? '';

    this.hideError();

    if (!email || !password) {
      this.showError('Please enter your email and password.');
      return;
    }

    this.setFormBusy(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      this.setFormBusy(false);
      console.error('Login error:', error.message);
      this.showError(this.translateAuthError(error.message));
      return;
    }

    if (data.user) {
      await this.enterGame(data.user);
    }
  }

  async enterGame(user) {
    if (this.isTransitioning) {
      return;
    }

    this.isTransitioning = true;
    console.log('Agent identified:', user.email);

    await this.ensurePlayerProfile(user);

    if (this.loginForm) {
      this.loginForm.destroy();
      this.loginForm = null;
    }

    this.scene.start('MainGameScene', {
      playerId: user.id,
      playerEmail: user.email,
    });
  }

  async ensurePlayerProfile(user) {
    const displayName = user.user_metadata?.display_name
      ?? user.email?.split('@')[0]
      ?? 'Agent';

    const { error } = await supabase
      .from('player_profiles')
      .upsert(
        {
          id: user.id,
          display_name: displayName,
        },
        {
          onConflict: 'id',
        }
      );

    if (error) {
      console.warn('Failed to create/refresh profile:', error.message);
    }
  }

  setFormBusy(isBusy) {
    const button = this.loginForm?.getChildByID('btn-login');
    if (!button) return;

    button.disabled = isBusy;
    button.textContent = isBusy ? 'CONNECTING TO HQ...' : 'LOG IN';
  }

  showError(message) {
    const errorElement = this.loginForm?.getChildByID('login-error');
    if (!errorElement) return;

    errorElement.textContent = message;
    errorElement.style.display = 'block';
  }

  hideError() {
    const errorElement = this.loginForm?.getChildByID('login-error');
    if (!errorElement) return;

    errorElement.textContent = '';
    errorElement.style.display = 'none';
  }

  translateAuthError(message) {
    const normalized = message.toLowerCase();

    if (normalized.includes('invalid login credentials')) {
      return 'Invalid email or password.';
    }

    if (normalized.includes('email not confirmed')) {
      return 'Please confirm your email address before accessing the archives.';
    }

    if (normalized.includes('too many requests')) {
      return 'Too many attempts. HQ is temporarily blocking the line.';
    }

    return 'Failed to log in. Please try again.';
  }
}