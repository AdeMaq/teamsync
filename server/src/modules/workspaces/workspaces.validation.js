import Joi from 'joi';
import { emailField, nameField, objectIdField } from '../../core/validation/fields.js';

const workspaceId = Joi.object({ id: objectIdField.required() });
const memberParams = Joi.object({ id: objectIdField.required(), memberId: objectIdField.required() });
const inviteParams = Joi.object({ id: objectIdField.required(), inviteId: objectIdField.required() });

const description = Joi.string().trim().allow('').max(500).label('Description');

export const idParams = { params: workspaceId };

export const createWorkspaceSchema = {
  body: Joi.object({
    name: nameField.required(),
    description: description.default(''),
    // Optional: when omitted, the slug is generated from the name.
    slug: Joi.string()
      .lowercase()
      .min(3)
      .max(40)
      .pattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
      .messages({ 'string.pattern.base': 'Slug may only contain lowercase letters, numbers and single hyphens' })
      .label('Slug'),
  }),
};

export const updateWorkspaceSchema = {
  params: workspaceId,
  body: Joi.object({ name: nameField, description }).min(1),
};

// Deleting is destructive, so the owner must type the workspace name.
export const deleteWorkspaceSchema = {
  params: workspaceId,
  body: Joi.object({ confirmName: Joi.string().required().label('Workspace name') }),
};

export const inviteSchema = {
  params: workspaceId,
  body: Joi.object({
    email: emailField.required(),
    role: Joi.string().valid('admin', 'member').default('member').label('Role'),
  }),
};

export const revokeInviteSchema = { params: inviteParams };

export const acceptInviteSchema = {
  // 32 random bytes, hex encoded (see inviteMember in workspaces.service.js)
  body: Joi.object({ token: Joi.string().hex().length(64).required().label('Invitation token') }),
};

export const changeRoleSchema = {
  params: memberParams,
  body: Joi.object({ role: Joi.string().valid('admin', 'member').required().label('Role') }),
};

export const memberIdParams = { params: memberParams };

export const transferSchema = {
  params: workspaceId,
  body: Joi.object({ userId: objectIdField.required().label('User') }),
};
