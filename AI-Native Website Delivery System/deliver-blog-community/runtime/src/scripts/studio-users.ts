import { getAuth } from 'firebase/auth';
import { getFirebaseClientApp } from './firebase-client';
import { accessRequest, type StudioBackend } from './studio-firebase';
import './studio-users.css';

type Account = { uid: string; email?: string; role: string; active: boolean };
const text = (tag: string, value: string) => { const element = document.createElement(tag); element.textContent = value; return element; };
const roleLabel = (role: string) => ({ author: 'Author', publisher: 'Publisher', administrator: 'Administrator', commenter: 'Commentator' }[role] || role);
const errorMessage = (error: unknown) => error instanceof Error ? error.message : 'Unable to complete this action. Please try again.';

/** Administrator directory. All responses and actions remain server-authorized. */
export function initializeUsersUI(backend: StudioBackend) {
  if (window.location.pathname !== '/manage/users') return;
  const workspace = document.querySelector('.studio-workspace');
  if (!workspace || document.querySelector('[data-users-manager]')) return;
  document.querySelectorAll<HTMLElement>('[data-content-library], [data-collection-manager], .studio-grid, .studio-actions').forEach(element => { element.hidden = true; });
  const section = document.createElement('section');
  section.className = 'studio-content-library studio-users'; section.dataset.usersManager = ''; section.setAttribute('aria-labelledby', 'users-title');
  workspace.append(section);
  if (backend.role !== 'administrator') {
    section.append(text('h1', 'Administrator access required'), text('p', 'Only Administrators can view users or invite editorial contributors.'));
    return;
  }
  document.querySelectorAll<HTMLElement>('[data-filter]').forEach(button => {
    button.addEventListener('click', event => {
      event.preventDefault(); event.stopImmediatePropagation();
      window.location.assign('/my-articles');
    }, { capture: true });
  });
  section.innerHTML = `
    <header class="studio-users-heading"><div><p class="studio-users-kicker">Site administration</p><h1 id="users-title">Manage users</h1><p>View registered accounts and invite people to contribute across the site.</p></div><button type="button" data-users-requests>Review access requests</button></header>
    <section class="studio-users-panel" aria-labelledby="users-invite-title"><h2 id="users-invite-title">Invite a contributor</h2>
      <p>Choose their site-wide role. Invitations expire after 72 hours and must be accepted using the same Google email.</p>
      <form data-users-invite><div class="studio-users-fields"><label>Google account email<input name="email" type="email" autocomplete="email" required maxlength="254" /></label><div><label for="users-invite-role">Role</label><select id="users-invite-role" name="role" aria-describedby="users-role-help"><option value="author">Author</option><option value="publisher">Publisher</option><option value="administrator">Administrator</option></select></div></div>
      <p id="users-role-help">Authors save drafts and submit them for review. They cannot publish.</p>
      <button type="submit">Create invitation</button><p data-users-invite-status role="status" aria-live="polite"></p></form>
      <p class="studio-users-note">No email is sent automatically. After creating an invitation, share this site's account link with the person. They must sign in on the account page using the invited Google email.</p>
    </section>
    <section class="studio-users-panel" aria-labelledby="users-directory-title"><div class="studio-users-heading"><h2 id="users-directory-title">Registered users</h2><button type="button" data-users-reload>Refresh users</button></div>
      <p data-users-status role="status" aria-live="polite"></p><div class="studio-users-table-wrap" tabindex="0" role="region" aria-label="Registered users table"><table><thead><tr><th scope="col">Google email</th><th scope="col">Role</th><th scope="col">Account status</th></tr></thead><tbody data-users-rows></tbody></table></div><button type="button" data-users-more hidden>Load more users</button>
    </section>`;
  const find = <T extends HTMLElement>(selector: string) => section.querySelector<T>(selector)!;
  const request = async (body: Record<string, unknown>) => {
    const user = getAuth(getFirebaseClientApp()).currentUser;
    if (!user) throw new Error('Your session ended. Sign in again to continue.');
    return accessRequest(user, body);
  };
  find<HTMLButtonElement>('[data-users-requests]').addEventListener('click', () => document.querySelector<HTMLButtonElement>('[data-manage-access]')?.click());
  const role = find<HTMLSelectElement>('[name="role"]');
  role.addEventListener('change', () => {
    find('#users-role-help').textContent = role.value === 'administrator' ? 'Administrators have Publisher rights and can manage users and collections. Invite only people you trust with site administration.' : role.value === 'publisher' ? 'Publishers review and publish submitted articles. They can return feedback but cannot edit another author’s content.' : 'Authors save drafts and submit them for review. They cannot publish.';
  });
  let cursor: string | undefined;
  let loadingUsers = false;
  const seen = new Set<string>();
  const loadUsers = async (reset = false) => {
    if (loadingUsers) return;
    loadingUsers = true;
    const status = find('[data-users-status]'); const more = find<HTMLButtonElement>('[data-users-more]'); const refresh = find<HTMLButtonElement>('[data-users-reload]');
    more.disabled = refresh.disabled = true; status.textContent = 'Loading users…';
    try {
      const result = await request({ action: 'list-users', ...(!reset && cursor ? { cursor } : {}) });
      const rows = find('[data-users-rows]');
      if (reset) { rows.replaceChildren(); seen.clear(); }
      for (const account of result.users as Account[]) {
        if (seen.has(account.uid)) continue;
        seen.add(account.uid);
        const row = document.createElement('tr');
        row.append(text('td', account.email || 'Email unavailable'), text('td', roleLabel(account.role)), text('td', account.active === false ? 'Inactive' : 'Active')); rows.append(row);
      }
      cursor = result.nextCursor || undefined; more.hidden = !cursor;
      status.textContent = seen.size ? `${seen.size} registered ${seen.size === 1 ? 'user' : 'users'} shown${cursor ? '. More users are available below.' : '.'}` : 'No registered users yet.';
    } catch (error) { status.textContent = errorMessage(error); }
    finally { more.disabled = refresh.disabled = false; loadingUsers = false; }
  };
  find<HTMLFormElement>('[data-users-invite]').addEventListener('submit', async event => {
    event.preventDefault(); const button = find<HTMLButtonElement>('[type="submit"]'); const status = find('[data-users-invite-status]');
    if (button.disabled) return;
    const email = find<HTMLInputElement>('[name="email"]'); button.disabled = true; status.textContent = 'Creating invitation…';
    try {
      const result = await request({ action: 'invite-role', email: email.value.trim(), role: role.value });
      status.replaceChildren(text('span', `Invitation created for ${result.email} as ${roleLabel(result.role)}. Expires ${new Date(result.expiresAt).toLocaleString()}. Ask them to sign in at `));
      const link = document.createElement('a'); link.href = '/account'; link.textContent = `${window.location.origin}/account`; status.append(link, text('span', ' using that Google email to accept the invitation. No email was sent.'));
      email.value = '';
    } catch (error) { status.textContent = errorMessage(error); }
    finally { button.disabled = false; }
  });
  find('[data-users-reload]').addEventListener('click', () => void loadUsers(true));
  find('[data-users-more]').addEventListener('click', () => void loadUsers());
  void loadUsers(true);
}
