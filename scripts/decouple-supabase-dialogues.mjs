import { readFile, writeFile, access } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const root = new URL('../', import.meta.url);

const clientURL = new URL('supabase-client.js', root);
const catalogURL = new URL(
  'assets/data/dialogue/extracted.json',
  root
);
const backupURL = new URL(
  'supabase-client.before-dialogue-decoupling.bak',
  root
);

const sourceName = 'supabase-client.js';
const textId = 't_a9062506cc4d0604c2c0';

function validatePublicKey(key, supabaseURL) {
  if (typeof key !== 'string' || !key.trim()) {
    throw new Error('Nie znaleziono klucza Supabase w katalogu tekstów.');
  }

  if (key !== key.trim()) {
    throw new Error('Klucz zawiera dodatkowe spacje. Przerwano bez zmian.');
  }

  if (key.startsWith('sb_publishable_')) {
    return;
  }

  if (key.startsWith('sb_secret_')) {
    throw new Error(
      'Znaleziono klucz tajny zamiast publicznego. Przerwano bez zmian.'
    );
  }

  const parts = key.split('.');

  if (parts.length !== 3) {
    throw new Error(
      'Nie rozpoznano formatu klucza publicznego. Przerwano bez zmian.'
    );
  }

  let payload;

  try {
    payload = JSON.parse(
      Buffer.from(parts[1], 'base64url').toString('utf8')
    );
  } catch {
    throw new Error('Nie można odczytać danych klucza. Przerwano bez zmian.');
  }

  if (payload.role !== 'anon') {
    throw new Error(
      'Klucz nie ma roli anon. Nie zapisujemy go w kodzie przeglądarki.'
    );
  }

  const projectRef = new URL(supabaseURL).hostname.split('.')[0];

  if (payload.ref && payload.ref !== projectRef) {
    throw new Error(
      'Klucz wskazuje inny projekt Supabase. Przerwano bez zmian.'
    );
  }
}

async function main() {
  const original = await readFile(clientURL, 'utf8');

  if (!original.includes('t_a9062506cc4d0604c2c0')) {
    if (!original.includes('DialogueText')) {
      console.log(
        'Klient nie korzysta już z DialogueText. Niczego nie zmieniono.'
      );
      return;
    }

    throw new Error(
      'supabase-client.js ma inną konfigurację niż oczekiwana. ' +
      'Przerwano bez zmian.'
    );
  }

  const urlMatch = original.match(
    /const\s+SUPABASE_URL\s*=\s*(['"])(https:\/\/[^'"]+)\1\s*;/
  );

  if (!urlMatch) {
    throw new Error(
      'Nie znaleziono adresu projektu Supabase. Przerwano bez zmian.'
    );
  }

  const supabaseURL = urlMatch[2];
  const catalog = JSON.parse(await readFile(catalogURL, 'utf8'));

  if (catalog?.version !== 1) {
    throw new Error(
      'Nieobsługiwana wersja katalogu tekstów. Przerwano bez zmian.'
    );
  }

  const publicKey = catalog.sources?.[sourceName]?.[textId];

  validatePublicKey(publicKey, supabaseURL);

  const replacement = `import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Publiczna konfiguracja klienta — niezależna od katalogu dialogów.
const SUPABASE_URL = ${JSON.stringify(supabaseURL)};
const SUPABASE_ANON_KEY = ${JSON.stringify(publicKey)};

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error('No SUPABASE_URL or SUPABASE_ANON_KEY.');
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: window.localStorage,
  },
});
`;

  let backupExists = false;

  try {
    await access(backupURL);
    backupExists = true;
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }

  if (!backupExists) {
    await writeFile(backupURL, original, {
      encoding: 'utf8',
      flag: 'wx'
    });
  }

  await writeFile(clientURL, replacement, 'utf8');

  console.log('Gotowe: supabase-client.js nie importuje już DialogueText.');
  console.log('Projekt, klucz i ustawienia sesji pozostały bez zmian.');
  console.log('Nie zmieniono katalogu dialogów ani funkcji Supabase.');
  console.log('Kopia poprzedniego pliku: ' + fileURLToPath(backupURL));
}

main().catch(error => {
  console.error('Błąd: ' + error.message);
  process.exitCode = 1;
});