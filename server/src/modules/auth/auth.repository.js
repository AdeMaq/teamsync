import RefreshToken from './refreshToken.model.js';

export const createRefreshToken = (data) => RefreshToken.create(data);

export const findRefreshTokenByHash = (tokenHash) => RefreshToken.findOne({ tokenHash });

export const revokeRefreshToken = (id, replacedByTokenHash) =>
  RefreshToken.updateOne(
    { _id: id },
    { $set: { revoked: true, revokedAt: new Date(), ...(replacedByTokenHash && { replacedByTokenHash }) } }
  );

// Revokes every still-active token issued from one login (used on reuse detection).
export const revokeTokenFamily = (family) =>
  RefreshToken.updateMany({ family, revoked: false }, { $set: { revoked: true, revokedAt: new Date() } });
