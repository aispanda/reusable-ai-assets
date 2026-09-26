const fail = (message, statusCode = 400) => { throw Object.assign(new Error(message), { statusCode }); };
const read = async (tx, ref) => { const s = await tx.get(ref); return s.exists ? s.data() : null; };
const admin = access => { if (!access?.active || access.role !== 'administrator') fail('Administrator access is required.', 403); };

// All grants and invitation claims run on the server. Rules deny direct client
// grants, so invitation use and the final-administrator guard cannot be bypassed.
export async function manageAccess({ db, user, body, now = new Date() }) {
  const uid = user.uid;
  const occurredAt = now.toISOString();
  if (!body || !['invite-admin', 'invite-role', 'list-users', 'claim-invite', 'review-request', 'set-access'].includes(body.action)) fail('Unknown access action.');
  return db.runTransaction(async tx => {
    const actorRef = db.collection('studioAccess').doc(uid);
    const actor = await read(tx, actorRef);
    if (body.action === 'claim-invite') {
      if (!user.email || user.email_verified !== true) fail('Sign in with a verified Google email to claim an invitation.', 403);
      if (user.firebase?.sign_in_provider !== 'google.com') fail('Use Google sign-in to claim an invitation.', 403);
      const inviteRef = db.collection('studioInvites').doc(user.email.toLowerCase());
      const invitation = await read(tx, inviteRef);
      if (!invitation?.active || !['author', 'publisher', 'administrator'].includes(invitation.role) || !Number.isFinite(Date.parse(invitation.expiresAt)) || Date.parse(invitation.expiresAt) <= now.getTime() || invitation.claimedBy) return { claimed: false };
      if (actor?.active === false) return { claimed: false };
      const rank = { viewer: 0, commenter: 0, author: 1, publisher: 2, administrator: 3 };
      if ((rank[actor?.role] ?? 0) > rank[invitation.role]) return { claimed: false };
      const grant = { active: true, role: invitation.role, email: user.email, claimedAt: actor?.claimedAt || occurredAt, approvedAt: occurredAt, approvedBy: invitation.invitedBy };
      tx.set(actorRef, grant);
      tx.update(inviteRef, { active: false, claimedBy: uid, claimedAt: occurredAt });
      tx.create(db.collection('contentAuditEvents').doc(), { action: invitation.role === 'administrator' ? 'admin-invite-claimed' : 'role-invite-claimed', role: invitation.role, actorUid: uid, occurredAt });
      return { claimed: true, role: invitation.role };
    }
    admin(actor);
    if (body.action === 'list-users') {
      if (body.cursor !== undefined && (typeof body.cursor !== 'string' || !body.cursor || body.cursor.length > 128 || body.cursor.includes('/'))) fail('Invalid page cursor.');
      let query = db.collection('studioAccess').orderBy('__name__').limit(51);
      if (body.cursor) query = query.startAfter(body.cursor);
      const page = await tx.get(query);
      const users = page.docs.slice(0, 50).map(doc => {
        const data = doc.data();
        return { uid: doc.id, email: typeof data.email === 'string' ? data.email : '', role: data.role, active: data.active === true };
      });
      return { users, nextCursor: page.docs.length > 50 ? users.at(-1).uid : null };
    }
    if (['invite-admin', 'invite-role'].includes(body.action)) {
      const role = body.action === 'invite-admin' ? 'administrator' : body.role;
      if (!['author', 'publisher', 'administrator'].includes(role)) fail('Choose Author, Publisher or Administrator.');
      const email = String(body.email || '').trim().toLowerCase();
      if (!/^[^\s/@]+@[^\s/@]+\.[^\s/@]+$/.test(email) || email.length > 254) fail('Enter a valid email address.');
      const expiresAt = new Date(now.getTime() + 72 * 3600000).toISOString();
      tx.set(db.collection('studioInvites').doc(email), { email, active: true, role, invitedBy: uid, createdAt: occurredAt, expiresAt });
      tx.create(db.collection('contentAuditEvents').doc(), { action: role === 'administrator' ? 'admin-invited' : 'role-invited', role, actorUid: uid, occurredAt });
      return { email, role, expiresAt };
    }
    if (typeof body.uid !== 'string' || !body.uid || body.uid.length > 128 || body.uid.includes('/')) fail('Choose a valid account.');
    const targetRef = db.collection('studioAccess').doc(body.uid);
    const target = await read(tx, targetRef);
    if (!target) fail('Account not found.', 404);
    if (body.action === 'review-request') {
      if (!['approved', 'denied'].includes(body.decision)) fail('Choose approve or return.');
      const requestRef = db.collection('roleRequests').doc(body.uid);
      const application = await read(tx, requestRef);
      if (application?.status !== 'pending' || !['author', 'publisher'].includes(application.requestedRole)) fail('No eligible pending application.', 409);
      if (target.role !== application.currentRole || !target.active) fail('Account access changed. Reload the application.', 409);
      const feedback = String(body.feedback || '').trim();
      if (feedback.length > 5000 || (body.decision === 'denied' && !feedback)) fail('Provide feedback when returning an application.');
      if (body.decision === 'approved') tx.update(targetRef, { role: application.requestedRole, approvedAt: occurredAt, approvedBy: uid });
      tx.update(requestRef, { status: body.decision, feedback, reviewedAt: occurredAt, reviewedBy: uid });
      tx.create(db.collection('contentAuditEvents').doc(), { action: `role-request-${body.decision}`, actorUid: uid, subjectUid: body.uid, occurredAt });
      return { status: body.decision };
    }
    if (typeof body.active !== 'boolean' || !['commenter', 'viewer', 'author', 'publisher', 'administrator'].includes(body.role)) fail('Invalid access settings.');
    if (body.role === 'administrator' && target.role !== 'administrator') fail('Administrator access requires a claimed invitation.', 403);
    if (target.role === 'administrator' && target.active && (!body.active || body.role !== 'administrator')) {
      const administrators = await tx.get(db.collection('studioAccess').where('role', '==', 'administrator'));
      if (administrators.docs.filter(d => d.data().active === true).length <= 1) fail('The final active administrator cannot be removed.', 409);
    }
    tx.update(targetRef, { active: body.active, role: body.role, approvedAt: occurredAt, approvedBy: uid });
    tx.create(db.collection('contentAuditEvents').doc(), { action: 'access-updated', actorUid: uid, subjectUid: body.uid, occurredAt });
    return { active: body.active, role: body.role };
  });
}
