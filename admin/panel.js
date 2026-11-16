import { supabase } from '../supabase-client.js';

const $ = id => document.getElementById(id);

const sections = [
  ['cities', 'Miasta'],
  ['city-places', 'Lokalizacje miejskie'],
  ['npcs', 'NPC — postacie'],
  ['thieves', 'Złodzieje'],
  ['npc-dialogues', 'Dialogi NPC'],
  ['motives', 'Motywy przestępstwa'],
  ['publications', 'Gazety i TIME'],
  ['television', 'Telewizja'],
  ['communications', 'E-maile i telefony'],
  ['pi-classifieds', 'Ogłoszenia i zlecenia PI'],
  ['pi-cases', 'Sprawy PI'],
  ['inventory-shops', 'Przedmioty i sklepy'],
  ['crime-scenes', 'Miejsca zbrodni'],
  ['artifacts', 'Artefakty'],
  ['crime-cities', 'Sprawy — edytor łączony'],
  ['asset-library', 'Grafiki i dźwięki'],
  ['case-tester', 'Tester spraw'],
  ['publication-history', 'Historia publikacji'],
  ['music', 'Muzyka']
];

let authorized = false;
let checking = 0;
let activeUser = null;
let loggingOut = false;

function message(text, error = false) {
  $('status').textContent = text;
  $('status').classList.toggle('error', error);
}

function clearWorkspace() {
  authorized = false;
  activeUser = null;

  $('workspace').hidden = true;
  $('frames').replaceChildren();
  $('account').textContent = '';

  for (const button of $('menu').children) {
    button.setAttribute('aria-pressed', 'false');
  }
}

function openSection(id) {
  if (!authorized) return;

  const item = sections.find(section => section[0] === id);
  if (!item) return;

  let frame = document.getElementById('frame-' + id);

  if (!frame) {
    frame = document.createElement('iframe');
    frame.id = 'frame-' + id;
    frame.title = item[1] + ' — formularz administratora';
    frame.src = new URL('./' + id + '/', import.meta.url).href;

    $('frames').append(frame);
  }

  for (const currentFrame of $('frames').children) {
    currentFrame.hidden = currentFrame !== frame;

    if (currentFrame.id === 'frame-case-tester') {
      currentFrame.contentWindow?.postMessage(
        {
          type: 'case-tester-visibility',
          visible: currentFrame === frame
        },
        location.origin
      );
    }

    if (currentFrame.id === 'frame-asset-library') {
      currentFrame.contentWindow?.postMessage(
        {
          type: 'asset-library-visibility',
          visible: currentFrame === frame
        },
        location.origin
      );
    }
  }

  for (const button of $('menu').children) {
    button.setAttribute(
      'aria-pressed',
      String(button.dataset.section === id)
    );
  }
}

for (const [id, label] of sections) {
  const button = document.createElement('button');

  button.type = 'button';
  button.textContent = label;
  button.dataset.section = id;
  button.setAttribute('aria-pressed', 'false');
  button.onclick = () => openSection(id);

  $('menu').append(button);
}

async function checkAccess() {
  const run = ++checking;

  $('workspace').hidden = true;
  $('login').hidden = true;

  message('Sprawdzam sesję i uprawnienia administratora…');

  let session = null;

  try {
    const result = await supabase.auth.getSession();

    if (result.error) throw result.error;

    session = result.data.session;

    if (run !== checking) return;

    $('logout').hidden = !session;

    if (!session) {
      clearWorkspace();
      $('login').hidden = false;
      message('Zaloguj się, aby otworzyć panel.');
      return;
    }

    const { data, error } = await supabase.functions.invoke(
      'city-editor-online',
      {
        body: {
          action: 'access'
        }
      }
    );

    if (run !== checking) return;

    if (error) {
      let text = error.message;

      try {
        text = (await error.context.json()).error || text;
      } catch {}

      throw Error(text);
    }

    if (!data || data.error || data.ok !== true) {
      throw Error(
        data?.error || 'Nie potwierdzono uprawnień administratora.'
      );
    }

    if (activeUser && activeUser !== session.user.id) {
      clearWorkspace();
    }

    authorized = true;
    activeUser = session.user.id;

    $('account').textContent = session.user.email || '';
    $('logout').hidden = false;
    $('login').hidden = true;
    $('workspace').hidden = false;

    message('Dostęp administratora potwierdzony. Wybierz formularz.');

    if (!$('frames').children.length) {
      openSection('cities');
    }
  } catch (error) {
    if (run !== checking) return;

    clearWorkspace();

    $('login').hidden = false;
    $('logout').hidden = !session;

    message('Nie można otworzyć panelu: ' + error.message, true);
  }
}

$('loginForm').onsubmit = async event => {
  event.preventDefault();
  $('submit').disabled = true;

  try {
    const { error } = await supabase.auth.signInWithPassword({
      email: $('email').value.trim(),
      password: $('password').value
    });

    $('password').value = '';

    if (error) throw error;

    await checkAccess();
  } catch (error) {
    message(error.message, true);
  } finally {
    $('submit').disabled = false;
  }
};

$('retry').onclick = () => void checkAccess();

$('logout').onclick = async () => {
  if (loggingOut) return;

  if (
    !confirm(
      'Wylogować? Niezapisane zmiany we wszystkich otwartych formularzach ' +
      'zostaną utracone. Najpierw zapisz potrzebne szkice.'
    )
  ) {
    return;
  }

  loggingOut = true;
  $('logout').disabled = true;

  try {
    const { error } = await supabase.auth.signOut();

    if (error) throw error;

    checking++;
    clearWorkspace();

    $('login').hidden = false;
    $('logout').hidden = true;

    message('Wylogowano.');
  } catch (error) {
    message('Nie udało się wylogować: ' + error.message, true);
  } finally {
    loggingOut = false;
    $('logout').disabled = false;
  }
};

supabase.auth.onAuthStateChange(event => {
  if (event === 'SIGNED_OUT') {
    checking++;
    clearWorkspace();

    $('login').hidden = false;
    $('logout').hidden = true;

    message('Sesja zakończona. Zaloguj się ponownie.');
  } else if (
    event === 'SIGNED_IN' ||
    event === 'TOKEN_REFRESHED' ||
    event === 'USER_UPDATED'
  ) {
    setTimeout(() => {
      if (!loggingOut) void checkAccess();
    }, 0);
  }
});

await checkAccess();