import crypto from 'crypto';
import ApiError from '../../core/errors/ApiError.js';
import { ERROR_CODES } from '../../core/errors/errorTypes.js';
import { HTTP } from '../../core/constants/httpStatusCodes.js';
import { ROLES, ROLE_RANK } from '../../core/constants/roles.js';
import { can } from '../../core/constants/permissions.js';
import { slugify } from '../../core/utils/slugify.js';
import { sendEmail } from '../../core/utils/sendEmail.js';
import { hashToken } from '../../core/utils/generateToken.js';
import { env } from '../../config/env.js';
import logger from '../../config/logger.js';
import { eventBus } from '../../events/eventBus.js';
import { EVENTS } from '../../events/eventNames.js';
import { usersService } from '../users/index.js';
import * as workspacesRepository from './workspaces.repository.js';

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // invitations work for 7 days
const MAX_PENDING_INVITES = 50;

// ---- helpers ----

const idOf = (value) => String(value?._id ?? value); // works for ids and for populated documents

export const findMember = (workspace, userId) => workspace.members.find((m) => idOf(m.user) === idOf(userId));

const fieldError = (statusCode, code, field, message) =>
  new ApiError(statusCode, code, message, [{ field, message }]);

const workspaceNotFound = () => new ApiError(HTTP.NOT_FOUND, ERROR_CODES.NOT_FOUND, 'Workspace not found');
const memberNotFound = () => new ApiError(HTTP.NOT_FOUND, ERROR_CODES.NOT_FOUND, 'Member not found');
const forbidden = (message) => new ApiError(HTTP.FORBIDDEN, ERROR_CODES.FORBIDDEN, message);
const invalidInvite = () =>
  new ApiError(HTTP.BAD_REQUEST, ERROR_CODES.INVALID_INVITE, 'This invitation is invalid or has expired');

const toSummary = (workspace, userId) => ({
  _id: workspace.id,
  name: workspace.name,
  slug: workspace.slug,
  description: workspace.description,
  logo: workspace.logo,
  plan: workspace.plan,
  owner: idOf(workspace.owner),
  memberCount: workspace.members.length,
  myRole: findMember(workspace, userId)?.role ?? null,
  createdAt: workspace.createdAt,
  updatedAt: workspace.updatedAt,
});

// Needs the workspace loaded with its members populated (see findWorkspaceByIdWithMembers).
const toDetail = (workspace, userId) => ({
  ...toSummary(workspace, userId),
  members: workspace.members
    .filter((m) => m.user) // skips a membership whose user no longer exists
    .map((m) => ({ user: m.user, role: m.role, joinedAt: m.joinedAt })),
});

const toInvite = (invite) => ({
  _id: invite.id,
  email: invite.email,
  role: invite.role,
  invitedBy: idOf(invite.invitedBy),
  expiresAt: invite.expiresAt,
}); // never includes tokenHash

// ---- API used by the RBAC middleware and other modules ----

export const findWorkspace = (id) => workspacesRepository.findWorkspaceById(id);

// ---- Workspaces ----

const requireFreeSlug = async (slug) => {
  if (await workspacesRepository.slugExists(slug)) {
    throw fieldError(HTTP.CONFLICT, ERROR_CODES.SLUG_TAKEN, 'slug', 'This slug is already taken');
  }
  return slug;
};

const generateUniqueSlug = async (name) => {
  const base = slugify(name);
  if (!(await workspacesRepository.slugExists(base))) return base;

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const candidate = `${base}-${crypto.randomBytes(2).toString('hex')}`;
    if (!(await workspacesRepository.slugExists(candidate))) return candidate;
  }
  return `${base}-${crypto.randomBytes(6).toString('hex')}`;
};

export const createWorkspace = async (userId, { name, description = '', slug }) => {
  const finalSlug = slug ? await requireFreeSlug(slug) : await generateUniqueSlug(name);

  const workspace = await workspacesRepository.createWorkspace({
    name,
    description,
    slug: finalSlug,
    owner: userId,
    members: [{ user: userId, role: ROLES.OWNER }],
  });

  return toSummary(workspace, userId);
};

export const listUserWorkspaces = async (userId) => {
  const workspaces = await workspacesRepository.findWorkspacesByMember(userId);
  return workspaces.map((workspace) => toSummary(workspace, userId));
};

export const getWorkspaceDetails = async (workspaceId, userId) => {
  const workspace = await workspacesRepository.findWorkspaceByIdWithMembers(workspaceId);
  if (!workspace) throw workspaceNotFound();
  return toDetail(workspace, userId);
};

export const updateWorkspace = async (workspaceId, userId, data) => {
  const workspace = await workspacesRepository.updateWorkspaceById(workspaceId, data);
  if (!workspace) throw workspaceNotFound();
  return toSummary(workspace, userId);
};

// Everything that belongs to the workspace (projects, tasks, ...) is cleaned up by the modules that own it,
// which listen for WORKSPACE_DELETED.
export const deleteWorkspace = async (workspace, { confirmName }) => {
  if (confirmName !== workspace.name) {
    throw fieldError(HTTP.BAD_REQUEST, ERROR_CODES.VALIDATION_ERROR, 'confirmName', 'Type the workspace name to confirm');
  }
  await eventBus.emit(EVENTS.WORKSPACE_DELETED, { workspaceId: workspace.id });
  await workspacesRepository.deleteWorkspaceById(workspace.id);
};

// ---- Invitations ----

export const inviteMember = async (workspace, actor, { email, role }) => {
  if (ROLE_RANK[role] >= ROLE_RANK[actor.role]) {
    throw forbidden('You can only invite people to a role below your own');
  }

  const existingUser = await usersService.findByEmail(email);
  if (existingUser && findMember(workspace, existingUser.id)) {
    throw fieldError(HTTP.CONFLICT, ERROR_CODES.ALREADY_MEMBER, 'email', 'This person is already a member');
  }

  await workspacesRepository.removeExpiredInvites(workspace.id);
  const current = await workspacesRepository.findWorkspaceById(workspace.id);
  const pendingForOthers = current.invites.filter((invite) => invite.email !== email).length;
  if (pendingForOthers >= MAX_PENDING_INVITES) {
    throw new ApiError(
      HTTP.BAD_REQUEST,
      ERROR_CODES.VALIDATION_ERROR,
      `Too many pending invitations (maximum ${MAX_PENDING_INVITES}). Revoke some first.`
    );
  }

  // Inviting the same email again replaces the old invitation, so only the newest link works.
  await workspacesRepository.removeInvitesForEmail(workspace.id, email);

  const token = crypto.randomBytes(32).toString('hex');
  const invite = await workspacesRepository.addInvite(workspace.id, {
    email,
    role,
    tokenHash: hashToken(token),
    invitedBy: actor.user,
    expiresAt: new Date(Date.now() + INVITE_TTL_MS),
  });

  const inviter = await usersService.findById(actor.user);
  const link = `${env.CLIENT_URL}/invites/${token}`;
  sendEmail({
    to: email,
    subject: `${inviter?.name ?? 'Someone'} invited you to ${workspace.name} on TeamSync`,
    text:
      `${inviter?.name ?? 'Someone'} invited you to join "${workspace.name}" on TeamSync as ${role}.\n\n` +
      `Accept the invitation (log in with ${email}): ${link}\n\n` +
      `The link works for 7 days. If you were not expecting this, you can ignore this email.`,
    html:
      `<p>${inviter?.name ?? 'Someone'} invited you to join <strong>${workspace.name}</strong> on TeamSync as ${role}.</p>` +
      `<p><a href="${link}">Accept the invitation</a> (log in with ${email})</p>` +
      `<p>The link works for 7 days. If you were not expecting this, you can ignore this email.</p>`,
  }).catch((err) => logger.error(`Could not send workspace invitation email: ${err.message}`));

  return toInvite(invite);
};

export const listInvites = async (workspaceId) => {
  const workspace = await workspacesRepository.findWorkspaceById(workspaceId);
  if (!workspace) throw workspaceNotFound();

  const now = new Date();
  return workspace.invites.filter((invite) => invite.expiresAt > now).map(toInvite);
};

export const revokeInvite = async (workspaceId, inviteId) => {
  const workspace = await workspacesRepository.findWorkspaceById(workspaceId);
  if (!workspace?.invites.id(inviteId)) {
    throw new ApiError(HTTP.NOT_FOUND, ERROR_CODES.NOT_FOUND, 'Invitation not found');
  }
  await workspacesRepository.removeInviteById(workspaceId, inviteId);
};

// The invitation is tied to an email address: it can only be accepted while logged in with that address,
// so a forwarded link is useless to anyone else.
export const acceptInvite = async (userId, token) => {
  const tokenHash = hashToken(token);
  const workspace = await workspacesRepository.findWorkspaceByInviteHash(tokenHash);
  const invite = workspace?.invites.find((i) => i.tokenHash === tokenHash);
  if (!invite || invite.expiresAt <= new Date()) throw invalidInvite();

  const user = await usersService.findById(userId);
  if (!user || user.email !== invite.email) {
    throw new ApiError(
      HTTP.FORBIDDEN,
      ERROR_CODES.INVITE_EMAIL_MISMATCH,
      `This invitation was sent to ${invite.email}. Log in with that address to accept it.`
    );
  }

  if (findMember(workspace, userId)) {
    // Already inside (e.g. clicked twice): just use up the invitation.
    await workspacesRepository.removeInviteById(workspace.id, invite.id);
    return toSummary(workspace, userId);
  }

  const result = await workspacesRepository.acceptInvite(workspace.id, invite.id, userId, invite.role);
  if (result.modifiedCount === 0) throw invalidInvite(); // used up by a parallel request

  return toSummary(await workspacesRepository.findWorkspaceById(workspace.id), userId);
};

// ---- Members ----
// Rank rule: you may only act on people ranked below you, and only hand out roles below your own.

export const changeMemberRole = async (workspace, actor, targetUserId, role) => {
  const target = findMember(workspace, targetUserId);
  if (!target) throw memberNotFound();

  if (target.role === ROLES.OWNER) {
    throw forbidden("The owner's role cannot be changed. Transfer ownership instead.");
  }
  if (idOf(targetUserId) === idOf(actor.user)) throw forbidden('You cannot change your own role');
  if (ROLE_RANK[actor.role] <= ROLE_RANK[target.role]) {
    throw forbidden('You can only change the role of people ranked below you');
  }
  if (ROLE_RANK[role] >= ROLE_RANK[actor.role]) {
    throw forbidden('You can only grant a role below your own');
  }

  if (target.role !== role) {
    await workspacesRepository.setMemberRole(workspace.id, targetUserId, role);
  }
  return getWorkspaceDetails(workspace.id, actor.user);
};

// Removes a member, or lets someone leave (target === themselves). The owner can do neither.
export const removeMember = async (workspace, actor, targetUserId) => {
  const target = findMember(workspace, targetUserId);
  if (!target) throw memberNotFound();

  const isSelf = idOf(targetUserId) === idOf(actor.user);

  if (target.role === ROLES.OWNER) {
    throw forbidden('The owner cannot be removed or leave. Transfer ownership first, or delete the workspace.');
  }
  if (!isSelf) {
    if (!can(actor.role, 'members:manage')) throw forbidden('You do not have permission to remove members');
    if (ROLE_RANK[actor.role] <= ROLE_RANK[target.role]) {
      throw forbidden('You can only remove people ranked below you');
    }
  }

  await workspacesRepository.removeMember(workspace.id, targetUserId);
};

export const transferOwnership = async (workspace, actor, newOwnerId) => {
  if (idOf(newOwnerId) === idOf(actor.user)) throw forbidden('You already own this workspace');
  if (!findMember(workspace, newOwnerId)) throw memberNotFound();

  await workspacesRepository.transferOwnership(workspace.id, actor.user, newOwnerId);
  return getWorkspaceDetails(workspace.id, actor.user);
};

// ---- Account deletion (called by workspaces.events.js) ----

// Highest rank first, then whoever joined earliest.
const pickSuccessor = (workspace, leavingUserId) =>
  workspace.members
    .filter((m) => idOf(m.user) !== idOf(leavingUserId))
    .sort((a, b) => ROLE_RANK[b.role] - ROLE_RANK[a.role] || a.joinedAt - b.joinedAt)[0];

// A deleted account must not leave a workspace without an owner, and must not destroy a team's workspace:
// ownership passes to the most senior remaining member. A workspace with nobody else in it is deleted.
export const handleUserDeleted = async (userId) => {
  const owned = await workspacesRepository.findWorkspacesOwnedBy(userId);

  for (const workspace of owned) {
    const successor = pickSuccessor(workspace, userId);
    if (successor) {
      await workspacesRepository.promoteToOwner(workspace.id, successor.user);
    } else {
      await eventBus.emit(EVENTS.WORKSPACE_DELETED, { workspaceId: workspace.id });
      await workspacesRepository.deleteWorkspaceById(workspace.id);
    }
  }

  await workspacesRepository.pullUserFromAllWorkspaces(userId);
  await workspacesRepository.pullInvitesSentBy(userId);
};
