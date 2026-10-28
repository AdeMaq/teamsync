import ApiError from '../../core/errors/ApiError.js';
import { ERROR_CODES } from '../../core/errors/errorTypes.js';
import { HTTP } from '../../core/constants/httpStatusCodes.js';
import { can } from '../../core/constants/permissions.js';
import { eventBus } from '../../events/eventBus.js';
import { EVENTS } from '../../events/eventNames.js';
import { getMembership } from '../workspaces/index.js';
import * as projectsRepository from './projects.repository.js';

// ---- helpers ----

const idOf = (value) => String(value?._id ?? value); // works for ids and for populated documents

const fieldError = (statusCode, code, field, message) =>
  new ApiError(statusCode, code, message, [{ field, message }]);

const projectNotFound = () => new ApiError(HTTP.NOT_FOUND, ERROR_CODES.NOT_FOUND, 'Project not found');

const leadMember = (project) => project.members.find((m) => m.role === 'lead');

export const isLead = (project, userId) => {
  const lead = leadMember(project);
  return Boolean(lead) && idOf(lead.user) === idOf(userId);
};

// Workspace admins and the owner can manage every project; otherwise only that project's lead can.
export const canManageProject = (workspaceRole, project, userId) =>
  can(workspaceRole, 'project:manage') || isLead(project, userId);

// One place that answers "may this person do this to this project?" (used by projects.middleware.js).
export const canOnProject = (action, workspaceRole, project, userId) =>
  action === 'project:manage' ? canManageProject(workspaceRole, project, userId) : can(workspaceRole, action);

// Needs the project loaded with its members populated (see findProjectByIdWithMembers).
const toProject = (project, userId, workspaceRole) => ({
  _id: project.id,
  name: project.name,
  description: project.description,
  workspace: idOf(project.workspace),
  status: project.status,
  color: project.color,
  startDate: project.startDate ?? null,
  endDate: project.endDate ?? null,
  createdBy: idOf(project.createdBy),
  lead: leadMember(project)?.user ?? null, // null when the lead's account no longer exists
  canManage: canManageProject(workspaceRole, project, userId), // lets the screen hide buttons; the server checks again
  createdAt: project.createdAt,
  updatedAt: project.updatedAt,
});

// The end of a project cannot come before its start. On an update, the other date may already be stored.
const assertDateOrder = (startDate, endDate) => {
  if (startDate && endDate && new Date(endDate) < new Date(startDate)) {
    throw fieldError(HTTP.BAD_REQUEST, ERROR_CODES.VALIDATION_ERROR, 'endDate', 'End date cannot be before the start date');
  }
};

// ---- API used by the access middleware ----

export const findProject = (id) => projectsRepository.findProjectById(id);

// ---- Projects ----

export const createProject = async (workspaceId, userId, workspaceRole, data) => {
  assertDateOrder(data.startDate, data.endDate);

  const created = await projectsRepository.createProject({
    ...data,
    workspace: workspaceId,
    createdBy: userId,
    members: [{ user: userId, role: 'lead' }], // whoever creates a project leads it
  });

  const project = await projectsRepository.findProjectByIdWithMembers(created.id);
  return toProject(project, userId, workspaceRole);
};

export const listProjects = async (workspaceId, userId, workspaceRole, { status, q, sort, page, limit }) => {
  const { projects, total } = await projectsRepository.listProjects(
    workspaceId,
    { status, q, sort },
    { skip: (page - 1) * limit, limit }
  );

  return {
    projects: projects.map((project) => toProject(project, userId, workspaceRole)),
    total,
    page,
    limit,
  };
};

export const getProject = async (projectId, userId, workspaceRole) => {
  const project = await projectsRepository.findProjectByIdWithMembers(projectId);
  if (!project) throw projectNotFound();
  return toProject(project, userId, workspaceRole);
};

export const updateProject = async (project, userId, workspaceRole, { leadId, ...fields }) => {
  assertDateOrder(
    'startDate' in fields ? fields.startDate : project.startDate,
    'endDate' in fields ? fields.endDate : project.endDate
  );

  if (leadId && !(await getMembership(project.workspace, leadId))) {
    throw fieldError(HTTP.BAD_REQUEST, ERROR_CODES.VALIDATION_ERROR, 'leadId', 'The lead must be a member of this workspace');
  }

  if (Object.keys(fields).length > 0) {
    const updated = await projectsRepository.updateProjectById(project.id, fields);
    if (!updated) throw projectNotFound(); // deleted while editing
  }
  if (leadId) await projectsRepository.setLead(project.id, leadId);

  return getProject(project.id, userId, workspaceRole);
};

// Tasks (and later comments) belong to the project and are removed by the modules that own them,
// which listen for PROJECT_DELETED.
export const deleteProject = async (project) => {
  await eventBus.emit(EVENTS.PROJECT_DELETED, { projectId: project.id, workspaceId: idOf(project.workspace) });
  await projectsRepository.deleteProjectById(project.id);
};

// ---- Clean-up after events from other modules (called by projects.events.js) ----

export const handleWorkspaceDeleted = (workspaceId) => projectsRepository.deleteProjectsByWorkspace(workspaceId);

// A deleted account, or someone who left a workspace, stops being a project lead. The project stays,
// and workspace admins and the owner can still manage it and hand it to someone else.
export const handleUserDeleted = (userId) => projectsRepository.pullUserFromProjects(userId);

export const handleMemberRemoved = (workspaceId, userId) =>
  projectsRepository.pullUserFromWorkspaceProjects(workspaceId, userId);
