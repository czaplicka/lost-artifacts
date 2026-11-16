import { supabase } from '../supabase-client.js';

const $ = id => document.getElementById(id);

const REQUIRED_CITY_EDITOR_VERSION = 2;

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
let cityEditorVersion = null;

const guardedDocuments = new WeakSet();

function message(text, error = false) {
  $('status').textContent = text;
  $('status').classList.toggle('error', error);
}

function cityEditorReady() {
  return cityEditorVersion === REQUIRED_CITY_EDITOR_VERSION;
}

function cityVersionMessage() {
  const actual = cityEditorVersion === null
    ? 'brak informacji'
    : String(cityEditorVersion);

  return (
    'Miasta: niezgodna wersja funkcji city-editor-online. ' +
    'Wymagana: ' + REQUIRED_CITY_EDITOR_VERSION +
    ', otrzymana: ' + actual + '. ' +
    'Edytor miast pozostaje zablokowany. ' +
    'Pozostałe narzędzia są dostępne. ' +
    'Po aktualizacji funkcji zapisz potrzebne szkice ' +
    'i kliknij „Sprawdź dostęp ponownie” w nagłówku panelu.'
  );
}

function clearWorkspace() {
  authorized = false;
  activeUser = null;
  cityEditorVersion = null;

  $('workspace').hidden = true;
  $('frames').replaceChildren();
  $('account').textContent = '';

  for (const button of $('menu').children) {
    button.setAttribute('aria-pressed', 'false');
    button.removeAttribute('title');
  }
}

function notifyVisibility(frame, visible) {
  if (frame.id === 'frame-case-tester') {
    frame.contentWindow?.postMessage(
      {
        type: 'case-tester-visibility',
        visible
      },
      location.origin
    );
  }

  if (frame.id === 'frame-asset-library') {
    frame.contentWindow?.postMessage(
      {
        type: 'asset-library-visibility',
        visible
      },
      location.origin
    );
  }
}

async function requestLogout() {
  if (loggingOut) return;

  const accepted = confirm(
    'Wylogować ze wspólnej sesji administratora?\n\n' +
    'Niezapisane zmiany we wszystkich otwartych formularzach, ' +
    'także w ukrytych zakładkach panelu i innych kartach ' +
    'przeglądarki korzystających z tej sesji, mogą zostać utracone.\n\n' +
    'Najpierw zapisz potrzebne szkice.\n\n' +
    'Wylogowanie nie anuluje automatycznie operacji, ' +
    'które są już wykonywane na serwerze.'
  );

  if (!accepted) return;

  loggingOut = true;
  checking++;

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
    message(
      'Nie udało się wylogować: ' + error.message,
      true
    );
  } finally {
    loggingOut = false;
    $('logout').disabled = false;
  }
}

function installFrameLogoutGuard(frame) {
  try {
    const child = frame.contentWindow;
    const childDocument = frame.contentDocument;

    if (
      !child ||
      !childDocument ||
      child.location.origin !== location.origin ||
      guardedDocuments.has(childDocument)
    ) {
      return;
    }

    child.addEventListener(
      'click',
      event => {
        const target = event.target?.closest?.('#logout');

        if (!target) return;

        event.preventDefault();
        event.stopImmediatePropagation();

        if (
          target.disabled ||
          !authorized ||
          !frame.isConnected
        ) {
          return;
        }

        void requestLogout();
      },
      true
    );

    guardedDocuments.add(childDocument);
  } catch {
    message(
      'Nie udało się zabezpieczyć wylogowania w formularzu. ' +
      'Użyj przycisku „Wyloguj” w nagłówku głównego panelu.',
      true
    );
  }
}

function openSection(id) {
  if (!authorized || loggingOut) return;

  const item = sections.find(section => section[0] === id);

  if (!item) return;

  if (id === 'cities' && !cityEditorReady()) {
    message(cityVersionMessage(), true);
    return;
  }

  let frame = document.getElementById('frame-' + id);

  if (!frame) {
    frame = document.createElement('iframe');
    frame.id = 'frame-' + id;
    frame.title = item[1] + ' — formularz administratora';

    frame.addEventListener('load', () => {
      installFrameLogoutGuard(frame);

      notifyVisibility(
        frame,
        authorized && !frame.hidden
      );
    });

    frame.src = new URL(
      './' + id + '/',
      import.meta.url
    ).href;

    $('frames').append(frame);
  }

  for (const currentFrame of $('frames').children) {
    const visible = currentFrame === frame;

    currentFrame.hidden = !visible;
    notifyVisibility(currentFrame, visible);
  }

  for (const button of $('menu').children) {
    button.setAttribute(
      'aria-pressed',
      String(button.dataset.section === id)
    );
  }

  if (!cityEditorReady()) {
    message(cityVersionMessage(), true);
  } else {
    message('Otwarty formularz: ' + item[1] + '.');
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

const recheckButton = document.createElement('button');

recheckButton.type = 'button';
recheckButton.id = 'recheckAccess';
recheckButton.textContent = 'Sprawdź dostęp ponownie';

$('logout').insertAdjacentElement(
  'beforebegin',
  recheckButton
);

async function checkAccess() {
  if (loggingOut) return;

  const run = ++checking;

  recheckButton.disabled = true;

  $('workspace').hidden = true;
  $('login').hidden = true;

  message(
    'Sprawdzam sesję, uprawnienia i wersję edytora miast…'
  );

  let session = null;

  try {
    const result = await supabase.auth.getSession();

    if (result.error) throw result.error;

    session = result.data.session;

    if (run !== checking || loggingOut) return;

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

    if (run !== checking || loggingOut) return;

    if (error) {
      let text = error.message;

      try {
        text = (await error.context.json()).error || text;
      } catch {}

      throw Error(text);
    }

    if (!data || data.error || data.ok !== true) {
      throw Error(
        data?.error ||
        'Nie potwierdzono uprawnień administratora.'
      );
    }

    if (
      activeUser &&
      activeUser !== session.user.id
    ) {
      clearWorkspace();
    }

    authorized = true;
    activeUser = session.user.id;
    cityEditorVersion = data.editorVersion ?? null;

    $('account').textContent = session.user.email || '';
    $('logout').hidden = false;
    $('login').hidden = true;
    $('workspace').hidden = false;

    for (const button of $('menu').children) {
      if (button.dataset.section !== 'cities') continue;

      if (cityEditorReady()) {
        button.removeAttribute('title');
      } else {
        button.title = cityVersionMessage();
      }
    }

    if (!cityEditorReady()) {
      const cityFrame = document.getElementById(
        'frame-cities'
      );

      if (cityFrame) {
        cityFrame.hidden = true;
        notifyVisibility(cityFrame, false);
      }

      for (const button of $('menu').children) {
        if (button.dataset.section === 'cities') {
          button.setAttribute('aria-pressed', 'false');
        }
      }

      const hasVisibleFrame = [
        ...$('frames').children
      ].some(frame => !frame.hidden);

      if (!hasVisibleFrame) {
        openSection('npcs');
      }

      message(cityVersionMessage(), true);
      return;
    }

    message(
      'Dostęp administratora i wersja edytora miast ' +
      'potwierdzone. Wybierz formularz.'
    );

    const hasVisibleFrame = [
      ...$('frames').children
    ].some(frame => !frame.hidden);

    if (!hasVisibleFrame) {
      openSection('cities');
    }
  } catch (error) {
    if (run !== checking || loggingOut) return;

    clearWorkspace();

    $('login').hidden = false;
    $('logout').hidden = !session;

    message(
      'Nie można otworzyć panelu: ' + error.message,
      true
    );
  } finally {
    if (run === checking) {
      recheckButton.disabled = false;
    }
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

recheckButton.onclick = () => void checkAccess();

$('logout').onclick = () => void requestLogout();

supabase.auth.onAuthStateChange(event => {
  if (event === 'SIGNED_OUT') {
    checking++;
    clearWorkspace();

    recheckButton.disabled = false;

    $('login').hidden = false;
    $('logout').hidden = true;

    message('Sesja zakończona. Zaloguj się ponownie.');
  } else if (
    ['SIGNED_IN', 'TOKEN_REFRESHED', 'USER_UPDATED'].includes(event)
  ) {
    setTimeout(() => {
      if (!loggingOut) void checkAccess();
    }, 0);
  }
});

await checkAccess();